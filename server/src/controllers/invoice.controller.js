import { z } from 'zod';
import { Invoice } from '../models/Invoice.js';
import { InvoiceNumberBlock } from '../models/InvoiceNumberBlock.js';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { DispatchForm } from '../models/DispatchForm.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { notifyLevels } from '../services/notification.service.js';

function currentFinancialYear() {
  const now = new Date();
  const y = now.getFullYear();
  // Indian FY: Apr-Mar. Kept simple as YYYY-YY.
  const start = now.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

const pad5 = (n) => String(n).padStart(5, '0');
const formatInvoiceNumber = (fy, n) => `INV-${fy.slice(2, 4)}-${pad5(n)}`;

export const reserveBlockSchema = z.object({
  count: z.number().int().min(1).max(500).default(50),
});

export const reserveBlock = asyncHandler(async (req, res) => {
  const { count } = req.body;
  const fy = currentFinancialYear();

  const last = await InvoiceNumberBlock.findOne({ financialYear: fy })
    .sort({ rangeEnd: -1 })
    .lean();
  const rangeStart = last ? last.rangeEnd + 1 : 1;
  const rangeEnd = rangeStart + count - 1;

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const block = await InvoiceNumberBlock.create({
    user: req.user.id,
    financialYear: fy,
    rangeStart,
    rangeEnd,
    expiresAt,
  });

  res.status(201).json({
    block,
    format: {
      pattern: 'INV-YY-#####',
      fyShort: fy.slice(2, 4),
      example: formatInvoiceNumber(fy, rangeStart),
    },
  });
});

export const listMyBlocks = asyncHandler(async (req, res) => {
  const blocks = await InvoiceNumberBlock.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ blocks });
});

export const createInvoiceSchema = z.object({
  dispatch: z.string(),
  showRateOnInvoice: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
  generatedOffline: z.boolean().optional(),
  invoiceNumber: z.string().optional(),
  generatedAt: z.string().optional(),
  pdfUrl: z.string().optional(),
});

async function allocateInvoiceNumber(userId) {
  const fy = currentFinancialYear();
  const block = await InvoiceNumberBlock.findOne({
    user: userId,
    financialYear: fy,
    status: 'active',
  }).sort({ createdAt: 1 });
  if (!block) return { number: null };
  const next = block.nextAvailable();
  if (!next) {
    block.status = 'exhausted';
    await block.save();
    return { number: null };
  }
  block.usedNumbers.push(next);
  if (block.usedNumbers.length === block.rangeEnd - block.rangeStart + 1) {
    block.status = 'exhausted';
  }
  await block.save();
  return { number: formatInvoiceNumber(fy, next), raw: next, fy };
}

export const createInvoice = asyncHandler(async (req, res) => {
  const dispatch = await DispatchForm.findById(req.body.dispatch);
  if (!dispatch) throw ApiError.notFound('Dispatch not found');

  const order = await Order.findById(dispatch.order);
  if (!order) throw ApiError.notFound('Order not found');

  if (order.status !== ORDER_STATUS.SALE_AUTHORIZED) {
    throw ApiError.badRequest(
      `Invoice can only be generated after L2 sale authorisation. Order status: ${order.status}`,
    );
  }

  if (req.body.idempotencyKey) {
    const existing = await Invoice.findOne({ idempotencyKey: req.body.idempotencyKey });
    if (existing) return res.status(200).json({ invoice: existing, deduped: true });
  }

  let invoiceNumber = req.body.invoiceNumber;
  if (!invoiceNumber) {
    const alloc = await allocateInvoiceNumber(req.user.id);
    if (!alloc.number) {
      throw ApiError.conflict(
        'No invoice numbers available. Reserve a block before generating invoices.',
      );
    }
    invoiceNumber = alloc.number;
  }

  const rate = order.negotiatedRate;
  const amount = rate * dispatch.quantity;

  const invoice = await Invoice.create({
    invoiceNumber,
    dispatch: dispatch._id,
    order: order._id,
    client: order.client,
    grade: order.grade,
    quantity: dispatch.quantity,
    rate,
    amount,
    showRateOnInvoice: req.body.showRateOnInvoice ?? true,
    generatedByLevel4: req.user.id,
    generatedAt: req.body.generatedAt ? new Date(req.body.generatedAt) : new Date(),
    pdfUrl: req.body.pdfUrl,
    idempotencyKey: req.body.idempotencyKey,
    generatedOffline: Boolean(req.body.generatedOffline),
    syncStatus: 'synced',
  });

  order.status = ORDER_STATUS.INVOICED;
  await order.save();

  dispatch.status = 'invoiced';
  await dispatch.save();

  await notifyLevels([1, 2], {
    type: 'invoice_generated',
    message: `Invoice ${invoice.invoiceNumber} generated for dispatch ${dispatch.dispatchNumber}`,
    relatedEntity: { kind: 'Invoice', id: invoice._id },
  });

  res.status(201).json({ invoice });
});

export const listInvoices = asyncHandler(async (req, res) => {
  const { client, from, to } = req.query;
  const filter = {};
  if (client) filter.client = client;
  if (from || to) {
    filter.generatedAt = {};
    if (from) filter.generatedAt.$gte = new Date(from);
    if (to) filter.generatedAt.$lte = new Date(to);
  }
  const invoices = await Invoice.find(filter)
    .populate('client', 'clientName')
    .populate('grade', 'gradeCode')
    .populate('dispatch', 'dispatchNumber vehicleNumber')
    .populate('order', 'orderNumber')
    .populate('generatedByLevel4', 'name')
    .sort({ generatedAt: -1 });
  res.json({ invoices });
});

export const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('client')
    .populate('grade')
    .populate('dispatch')
    .populate('order')
    .populate('generatedByLevel4', 'name');
  if (!invoice) throw ApiError.notFound();
  res.json({ invoice });
});

export const syncOfflineSchema = z.object({
  invoices: z.array(
    z.object({
      invoiceNumber: z.string(),
      dispatch: z.string(),
      order: z.string(),
      showRateOnInvoice: z.boolean().optional(),
      quantity: z.number().positive(),
      rate: z.number().nonnegative(),
      amount: z.number().nonnegative(),
      idempotencyKey: z.string(),
      generatedAt: z.string().optional(),
      pdfUrl: z.string().optional(),
    }),
  ),
});

export const syncOfflineInvoices = asyncHandler(async (req, res) => {
  const results = [];
  for (const payload of req.body.invoices) {
    const existing = await Invoice.findOne({ idempotencyKey: payload.idempotencyKey });
    if (existing) {
      results.push({ idempotencyKey: payload.idempotencyKey, status: 'deduped', id: existing._id });
      continue;
    }
    const order = await Order.findById(payload.order);
    const dispatch = await DispatchForm.findById(payload.dispatch);
    if (!order || !dispatch) {
      results.push({ idempotencyKey: payload.idempotencyKey, status: 'invalid_refs' });
      continue;
    }
    if (order.status !== ORDER_STATUS.SALE_AUTHORIZED && order.status !== ORDER_STATUS.INVOICED) {
      results.push({ idempotencyKey: payload.idempotencyKey, status: 'not_authorized' });
      continue;
    }
    try {
      const invoice = await Invoice.create({
        invoiceNumber: payload.invoiceNumber,
        dispatch: dispatch._id,
        order: order._id,
        client: order.client,
        grade: order.grade,
        quantity: payload.quantity,
        rate: payload.rate,
        amount: payload.amount,
        showRateOnInvoice: payload.showRateOnInvoice ?? true,
        generatedByLevel4: req.user.id,
        generatedAt: payload.generatedAt ? new Date(payload.generatedAt) : new Date(),
        pdfUrl: payload.pdfUrl,
        idempotencyKey: payload.idempotencyKey,
        generatedOffline: true,
        syncStatus: 'synced',
      });
      if (order.status !== ORDER_STATUS.INVOICED) {
        order.status = ORDER_STATUS.INVOICED;
        await order.save();
      }
      if (dispatch.status !== 'invoiced') {
        dispatch.status = 'invoiced';
        await dispatch.save();
      }
      results.push({ idempotencyKey: payload.idempotencyKey, status: 'created', id: invoice._id });
    } catch (err) {
      results.push({
        idempotencyKey: payload.idempotencyKey,
        status: 'error',
        error: err.message,
      });
    }
  }
  res.json({ results });
});
