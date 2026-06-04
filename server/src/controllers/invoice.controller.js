import { z } from 'zod';
import { Invoice } from '../models/Invoice.js';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { DispatchForm } from '../models/DispatchForm.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { notifyLevels } from '../services/notification.service.js';
import { getOrCreateSettings } from '../models/CompanySettings.js';
import { renderInvoicePdf } from '../pdf/invoicePdf.js';

function currentFinancialYear() {
  const now = new Date();
  const y = now.getFullYear();
  // Indian FY: Apr-Mar. Kept simple as YYYY-YY.
  const start = now.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

const pad5 = (n) => String(n).padStart(5, '0');
const formatInvoiceNumber = (fy, n) => `INV-${fy.slice(2, 4)}-${pad5(n)}`;



export const createInvoiceSchema = z.object({
  dispatch: z.string(),
  showRateOnInvoice: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
});

export const createInvoiceFromOrderSchema = z.object({
  order: z.string(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  showRateOnInvoice: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
});

async function allocateInvoiceNumber() {
  const fy = currentFinancialYear();
  const last = await Invoice.findOne({ invoiceNumber: new RegExp(`^INV-${fy.slice(2, 4)}-`) })
    .sort({ invoiceNumber: -1 })
    .lean();

  let nextNum = 1;
  if (last && last.invoiceNumber) {
    const parts = last.invoiceNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return { number: formatInvoiceNumber(fy, nextNum) };
}

export const createInvoice = asyncHandler(async (req, res) => {
  const dispatch = await DispatchForm.findById(req.body.dispatch)
    .populate('order client grade');
  if (!dispatch) throw ApiError.notFound('Dispatch not found');

  // Enforce Workflow: Dispatch must be sale_authorized or beyond
  if (dispatch.status === 'dispatched' || dispatch.status === 'pending') {
    throw ApiError.badRequest(
      `Invoices can only be generated after the dispatch is authorized by Level 2. Current status: ${dispatch.status}`,
    );
  }

  // Legacy Rule: If linked to an Order (and no SO), it must be sale_authorized.
  if (req.body.idempotencyKey) {
    const existing = await Invoice.findOne({ idempotencyKey: req.body.idempotencyKey });
    if (existing) return res.status(200).json({ invoice: existing, deduped: true });
  }

  const alloc = await allocateInvoiceNumber();
  const invoiceNumber = alloc.number;

  const order = dispatch.order;
  const rate = dispatch.order?.negotiatedRate || 0;
  const amount = rate * dispatch.quantity;

  const invoice = await Invoice.create({
    invoiceNumber,
    dispatch: dispatch._id,
    order: dispatch.order?._id,
    client: dispatch.client,
    grade: dispatch.grade,
    quantity: dispatch.quantity,
    rate,
    amount,
    showRateOnInvoice: req.body.showRateOnInvoice ?? true,
    generatedByLevel4: req.user.id,
    generatedAt: new Date(),
    idempotencyKey: req.body.idempotencyKey,
    syncStatus: 'synced',
  });

  if (order) {
    order.status = ORDER_STATUS.INVOICED;
    await order.save();
  }

  dispatch.status = 'invoiced';
  await dispatch.save();

  await notifyLevels([1, 2], {
    type: 'invoice_generated',
    message: `Invoice ${invoice.invoiceNumber} generated for dispatch ${dispatch.dispatchNumber}`,
    relatedEntity: { kind: 'Invoice', id: invoice._id },
  });

  res.status(201).json({ invoice });
});

/**
 * POST /api/v1/invoices/from-order
 * Level-4 generates an invoice directly from an approved order (no dispatch required).
 * Supports partial invoicing: pass `quantity` to invoice only part of the order.
 */
export const createInvoiceFromOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.body.order)
    .populate('client')
    .populate('site');
  if (!order) throw ApiError.notFound('Order not found');

  const allowedStatuses = [ORDER_STATUS.APPROVED, ORDER_STATUS.PARTIALLY_INVOICED];
  if (!allowedStatuses.includes(order.status)) {
    throw ApiError.badRequest(
      `Invoice can only be generated for APPROVED or PARTIALLY_INVOICED orders. Current status: ${order.status}`,
    );
  }

  // Idempotency check
  if (req.body.idempotencyKey) {
    const existing = await Invoice.findOne({ idempotencyKey: req.body.idempotencyKey });
    if (existing) return res.status(200).json({ invoice: existing, deduped: true });
  }

  // Validate requested quantity against remaining
  const alreadyInvoiced = order.invoicedQuantity || 0;
  const remaining = order.quantity - alreadyInvoiced;
  const invoiceQty = Number(req.body.quantity);

  if (invoiceQty <= 0) {
    throw ApiError.badRequest('Invoice quantity must be greater than 0');
  }
  if (invoiceQty > remaining + 0.001) { // small float tolerance
    throw ApiError.badRequest(
      `Cannot invoice ${invoiceQty} m³ — only ${remaining} m³ remaining on this order`,
    );
  }

  // Try to resolve the grade ObjectId from the grade string stored on Order
  const { ConcreteGrade } = await import('../models/ConcreteGrade.js');
  let gradeDoc = null;
  if (order.grade) {
    gradeDoc = await ConcreteGrade.findOne({ gradeCode: order.grade.toUpperCase() }).lean();
  }

  const alloc = await allocateInvoiceNumber();
  const rate = order.negotiatedRate || 0;
  const amount = rate * invoiceQty;

  // Build the invoice payload — only include `grade` ref when we have a matching doc
  const invoicePayload = {
    invoiceNumber: alloc.number,
    order: order._id,
    client: order.client._id,
    gradeLabel: order.grade || '',
    quantity: invoiceQty,
    rate,
    amount,
    showRateOnInvoice: req.body.showRateOnInvoice ?? true,
    generatedByLevel4: req.user.id,
    generatedAt: new Date(),
    idempotencyKey: req.body.idempotencyKey,
    syncStatus: 'synced',
  };
  if (gradeDoc) invoicePayload.grade = gradeDoc._id;

  const invoice = await Invoice.create(invoicePayload);

  // Update order's invoiced quantity and status
  const newInvoicedQty = alreadyInvoiced + invoiceQty;
  order.invoicedQuantity = newInvoicedQty;

  if (newInvoicedQty >= order.quantity - 0.001) {
    // Fully invoiced
    order.status = ORDER_STATUS.INVOICED;
  } else {
    // Still has remaining quantity
    order.status = ORDER_STATUS.PARTIALLY_INVOICED;
  }
  await order.save();

  await notifyLevels([1, 2], {
    type: 'invoice_generated',
    message: `Invoice ${invoice.invoiceNumber} generated for ${invoiceQty} m³ of order ${order.orderNumber} (${newInvoicedQty}/${order.quantity} m³ invoiced)`,
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
    .populate({
      path: 'dispatch',
      populate: { path: 'site' }
    })
    .populate('order')
    .populate('generatedByLevel4', 'name');
  if (!invoice) throw ApiError.notFound();
  res.json({ invoice });
});

export const getInvoicePdf = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('client')
    .populate('grade')
    .populate({
      path: 'dispatch',
      populate: { path: 'site' }
    })
    .populate({
      path: 'order',
      populate: { path: 'site' }
    })
    .populate('generatedByLevel4', 'name');

  if (!invoice) throw ApiError.notFound('Invoice not found');

  const company = await getOrCreateSettings();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`,
  );

  renderInvoicePdf(res, { invoice, company });
});


