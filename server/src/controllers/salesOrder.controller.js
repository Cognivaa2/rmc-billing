import { z } from 'zod';
import { SalesOrder } from '../models/SalesOrder.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { nextSoNumber } from '../utils/sequence.js';
import { ConcreteGrade } from '../models/ConcreteGrade.js';
import { Order } from '../models/Order.js';

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

/**
 * POST /sales-orders/from-order/:orderId
 * L2 creates a Sales Order from an approved Order.
 * Body: { numberOfVehicles: number, quantity: number }
 * Grade, client, site, rate are taken from the source order automatically.
 */
export const createSalesOrderFromOrder = asyncHandler(async (req, res) => {
  const { numberOfVehicles, quantity } = req.body;
  const requestedQty = Number(quantity);

  if (!numberOfVehicles || numberOfVehicles < 1) {
    throw ApiError.badRequest('Number of vehicles must be at least 1');
  }
  if (!requestedQty || requestedQty <= 0) {
    throw ApiError.badRequest('Quantity must be greater than 0');
  }

  const order = await Order.findById(req.params.orderId);
  if (!order) throw ApiError.notFound('Order not found');

  if (order.status !== 'APPROVED') {
    throw ApiError.badRequest('Sales Order can only be created from an APPROVED order');
  }

  // Resolve grade: Order.grade is a gradeCode string → find ConcreteGrade ObjectId
  const gradeDoc = await ConcreteGrade.findOne({
    gradeCode: order.grade.toUpperCase().trim(),
  });
  if (!gradeDoc) {
    throw ApiError.badRequest(
      `Grade "${order.grade}" not found in grade master. Please add it first.`,
    );
  }

  // Calculate remaining unallocated quantity for this Order
  const existingSOs = await SalesOrder.find({ sourceOrder: order._id });
  const allocatedQty = existingSOs.reduce((sum, so) => sum + so.totalQuantity, 0);
  const remainingOrderQty = order.quantity - allocatedQty;

  if (requestedQty > remainingOrderQty) {
    throw ApiError.badRequest(
      `Cannot create SO for ${requestedQty} m³. Only ${remainingOrderQty} m³ remains unallocated for this order.`
    );
  }

  const soNumber = await nextSoNumber();
  const so = await SalesOrder.create({
    soNumber,
    client: order.client,
    site: order.site,
    grade: gradeDoc._id,
    rate: order.negotiatedRate,
    totalQuantity: requestedQty,
    remainingQuantity: requestedQty,
    notes: order.remarks,
    sourceOrder: order._id,
    numberOfVehicles: Number(numberOfVehicles),
    createdByLevel2: req.user.id,
  });

  const populated = await SalesOrder.findById(so._id)
    .populate('client', 'clientName')
    .populate('site', 'siteName')
    .populate('grade', 'gradeCode');

  res.status(201).json({ salesOrder: populated });
});

