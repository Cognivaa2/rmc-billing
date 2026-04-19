import { z } from 'zod';
import { SalesOrder } from '../models/SalesOrder.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { nextSoNumber } from '../utils/sequence.js';

export const createSoSchema = z.object({
  client: z.string(),
  site: z.string().optional(),
  grade: z.string(),
  rate: z.number().nonnegative(),
  totalQuantity: z.number().positive(),
  notes: z.string().optional(),
});

export const listSalesOrders = asyncHandler(async (req, res) => {
  const { client, status, q } = req.query;
  const filter = {};
  if (client) filter.client = client;
  if (status) filter.status = status;
  if (q) filter.soNumber = new RegExp(q, 'i');
  const sos = await SalesOrder.find(filter)
    .populate('client', 'clientName creditStatus kycStatus')
    .populate('site', 'siteName')
    .populate('grade', 'gradeCode')
    .populate('createdByLevel2', 'name')
    .populate('closedByLevel2', 'name')
    .sort({ createdAt: -1 });
  res.json({ salesOrders: sos });
});

export const getSalesOrder = asyncHandler(async (req, res) => {
  const so = await SalesOrder.findById(req.params.id)
    .populate('client')
    .populate('site')
    .populate('grade')
    .populate('createdByLevel2', 'name')
    .populate('closedByLevel2', 'name');
  if (!so) throw ApiError.notFound();
  res.json({ salesOrder: so });
});

export const createSalesOrder = asyncHandler(async (req, res) => {
  const soNumber = await nextSoNumber();
  const so = await SalesOrder.create({
    ...req.body,
    soNumber,
    remainingQuantity: req.body.totalQuantity,
    createdByLevel2: req.user.id,
  });
  res.status(201).json({ salesOrder: so });
});

export const closeSalesOrder = asyncHandler(async (req, res) => {
  const so = await SalesOrder.findById(req.params.id);
  if (!so) throw ApiError.notFound();
  if (so.status === 'closed') throw ApiError.badRequest('Sales Order already closed');
  so.status = 'closed';
  so.closedByLevel2 = req.user.id;
  so.closedAt = new Date();
  await so.save();
  res.json({ salesOrder: so });
});
