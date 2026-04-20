import { z } from 'zod';
import { Payment } from '../models/Payment.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { notifyLevels } from '../services/notification.service.js';

export const paymentSchema = z.object({
  client: z.string(),
  invoice: z.string().optional(),
  order: z.string().optional(),
  amount: z.number().nonnegative(),
  paymentReceived: z.boolean().optional(),
  receivedAt: z.string().optional(),
  remarks: z.string().optional(),
});

export const listPayments = asyncHandler(async (req, res) => {
  const { client, page, limit } = req.query;
  const filter = {};
  if (client) filter.client = client;
  
  let query = Payment.find(filter)
    .populate('client', 'clientName')
    .populate('invoice', 'invoiceNumber amount')
    .populate('order', 'orderNumber')
    .populate('recordedByLevel2', 'name')
    .sort({ createdAt: -1 });

  const total = await Payment.countDocuments(filter);
  let totalPages = 1;
  let currentPage = 1;

  if (page || limit) {
    currentPage = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 6;
    const skip = (currentPage - 1) * limitNum;
    query = query.skip(skip).limit(limitNum);
    totalPages = Math.ceil(total / limitNum);
  }

  const payments = await query;
  res.json({ payments, total, page: currentPage, totalPages });
});

export const createPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.create({
    ...req.body,
    receivedAt: req.body.paymentReceived ? new Date(req.body.receivedAt || Date.now()) : undefined,
    recordedByLevel2: req.user.id,
  });
  await notifyLevels([2], {
    type: 'payment_recorded',
    message: `Payment recorded for client${req.body.invoice ? ` (invoice linked)` : ''}`,
    relatedEntity: { kind: 'Client', id: payment.client },
  });
  res.status(201).json({ payment });
});

export const updatePayment = asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  if (updates.paymentReceived && !updates.receivedAt) {
    updates.receivedAt = new Date();
  }
  const payment = await Payment.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!payment) throw ApiError.notFound();
  res.json({ payment });
});
