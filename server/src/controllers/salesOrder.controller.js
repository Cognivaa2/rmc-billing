import { z } from 'zod';
import { SalesOrder } from '../models/SalesOrder.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { nextSoNumber } from '../utils/sequence.js';
import { ConcreteGrade } from '../models/ConcreteGrade.js';
import { Order } from '../models/Order.js';
import { DispatchForm } from '../models/DispatchForm.js';

export const createSoSchema = z.object({
  client: z.string(),
  site: z.string().optional(),
  grade: z.string(),
  rate: z.number().nonnegative(),
  totalQuantity: z.number().positive(),
  notes: z.string().optional(),
});

export const listSalesOrders = asyncHandler(async (req, res) => {
  const { client, status, q, page, limit } = req.query;
  const filter = {};
  if (client) filter.client = client;
  if (status) filter.status = status;
  if (q) filter.soNumber = new RegExp(q, 'i');
  
  let query = SalesOrder.find(filter).sort({ createdAt: -1 });
  let total = await SalesOrder.countDocuments(filter);
  let totalPages = 1;
  let currentPage = 1;

  if (page || limit) {
    currentPage = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (currentPage - 1) * limitNum;
    query = query.skip(skip).limit(limitNum);
    totalPages = Math.ceil(total / limitNum);
  }

  const sos = await query
    .populate('client', 'clientName creditStatus kycStatus')
    .populate('site', 'siteName')
    .populate('grade', 'gradeCode')
    .populate('createdByLevel2', 'name')
    .populate('closedByLevel2', 'name')
    .populate('sourceOrder', 'orderNumber status');
    
  res.json({ salesOrders: sos, total, page: currentPage, totalPages });
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

  // Enforce Workflow: All dispatches must be invoiced before closing
  const allDispatches = await DispatchForm.find({ salesOrder: so._id });
  if (allDispatches.length > 0) {
    const uninvoiced = allDispatches.filter(d => d.status !== 'invoiced');
    if (uninvoiced.length > 0) {
      throw ApiError.badRequest(
        `Cannot close: ${uninvoiced.length} dispatch(es) have not been invoiced yet. Level 4 must generate invoices for all dispatches first.`
      );
    }
  }

  so.status = 'closed';
  so.closedByLevel2 = req.user.id;
  so.closedAt = new Date();
  await so.save();

  // If this SO originated from an Order, check if we should close the parent Order
  if (so.sourceOrder) {
    const { Order, ORDER_STATUS } = await import('../models/Order.js');
    const allSos = await SalesOrder.find({ sourceOrder: so.sourceOrder });
    const allClosed = allSos.every((s) => s.status === 'closed');
    if (allClosed) {
      await Order.findByIdAndUpdate(so.sourceOrder, { status: ORDER_STATUS.CLOSED });
    }
  }

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

  // Resolve grade: Order.grade is a gradeCode string → find or auto-create ConcreteGrade
  const gradeCode = order.grade.toUpperCase().trim();
  const gradeDoc = await ConcreteGrade.findOneAndUpdate(
    { gradeCode },
    { $setOnInsert: { gradeCode, description: `Auto-created from order ${order.orderNumber}` } },
    { upsert: true, new: true },
  );

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

