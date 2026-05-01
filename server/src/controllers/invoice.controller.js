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
    .populate('salesOrder order client grade');
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

  const order = dispatch.salesOrder || dispatch.order;
  const rate = dispatch.salesOrder?.rate || dispatch.order?.negotiatedRate || 0;
  const amount = rate * dispatch.quantity;

  const invoice = await Invoice.create({
    invoiceNumber,
    dispatch: dispatch._id,
    order: dispatch.order?._id,
    salesOrder: dispatch.salesOrder?._id,
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

  if (order && !dispatch.salesOrder) {
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
    .populate('order')
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


