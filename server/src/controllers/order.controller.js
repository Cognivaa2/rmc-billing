import { z } from 'zod';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { nextOrderNumber } from '../utils/sequence.js';
import { notifyLevels } from '../services/notification.service.js';

export const createOrderSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  site: z.string().optional().or(z.literal('')),
  grade: z.string().min(1, 'Grade is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  negotiatedRate: z.coerce.number().nonnegative('Rate must be 0 or more'),
  deliveryDate: z.string().optional().or(z.literal('')),
  remarks: z.string().optional(),
});

const populateOrder = (q) =>
  q
    .populate('client', 'clientName creditStatus kycStatus')
    .populate('site', 'siteName siteAddress')
    .populate('createdByLevel3', 'name')
    .populate('approvedByLevel2', 'name')
    .populate('saleAuthorizedByLevel2', 'name');

export const listOrders = asyncHandler(async (req, res) => {
  const { status, client, mine, page, limit } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (client) filter.client = client;
  if (mine === 'true' && req.user.level === 3) filter.createdByLevel3 = req.user.id;

  let query = Order.find(filter).sort({ createdAt: -1 });
  let total = await Order.countDocuments(filter);
  let totalPages = 1;
  let currentPage = 1;

  if (page || limit) {
    currentPage = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (currentPage - 1) * limitNum;
    query = query.skip(skip).limit(limitNum);
    totalPages = Math.ceil(total / limitNum);
  }

  const orders = await populateOrder(query);
  res.json({ orders, total, page: currentPage, totalPages });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await populateOrder(Order.findById(req.params.id));
  if (!order) throw ApiError.notFound();
  res.json({ order });
});

export const createOrder = asyncHandler(async (req, res) => {
  const orderNumber = await nextOrderNumber();
  const order = await Order.create({
    ...req.body,
    orderNumber,
    status: ORDER_STATUS.PENDING,
    createdByLevel3: req.user.id,
  });

  await notifyLevels([2], {
    type: 'new_order',
    message: `New order ${order.orderNumber} submitted for approval`,
    relatedEntity: { kind: 'Order', id: order._id },
  });

  res.status(201).json({ order });
});

export const approveOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound();
  if (order.status !== ORDER_STATUS.PENDING) {
    throw ApiError.badRequest(`Cannot approve from status ${order.status}`);
  }
  order.status = ORDER_STATUS.APPROVED;
  order.approvedByLevel2 = req.user.id;
  order.approvedAt = new Date();
  await order.save();

  await notifyLevels([4], {
    type: 'order_approved',
    message: `Order ${order.orderNumber} approved — ready for dispatch`,
    relatedEntity: { kind: 'Order', id: order._id },
  });

  res.json({ order });
});



export const rejectOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound();
  if (order.status !== ORDER_STATUS.PENDING) {
    throw ApiError.badRequest(`Cannot reject from status ${order.status}`);
  }
  order.status = 'REJECTED';
  order.rejectedByLevel2 = req.user.id;
  order.rejectedAt = new Date();
  order.rejectionReason = req.body.reason || 'No reason provided';
  await order.save();

  // Non-fatal — notification failure must not roll back the rejection
  notifyLevels([3], {
    type: 'order_rejected',
    message: `Order ${order.orderNumber} was rejected: ${order.rejectionReason}`,
    relatedEntity: { kind: 'Order', id: order._id },
  }).catch((e) => console.warn('Notify failed (rejectOrder):', e.message));

  res.json({ order });
});

export const authorizeSale = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound();
  if (!['DISPATCHED', 'SALE_AUTHORIZED'].includes(order.status)) {
    throw ApiError.badRequest(
      `Sale can only be authorised from DISPATCHED state. Current: ${order.status}`,
    );
  }
  const { dispatchIds } = req.body;
  const { DispatchForm } = await import('../models/DispatchForm.js');

  let updateResult;

  if (dispatchIds && dispatchIds.length > 0) {
    // Direct update using selected dispatch IDs from the modal
    updateResult = await DispatchForm.updateMany(
      { _id: { $in: dispatchIds }, status: 'dispatched' },
      { $set: { status: 'sale_authorized' } }
    );
    console.log(`[authorizeSale] Updated ${updateResult.modifiedCount} of ${dispatchIds.length} dispatches by ID`);
  } else {
    // Fallback: update ALL pending dispatches linked to this order
    const updateResult2 = await DispatchForm.updateMany(
      {
        order: order._id,
        status: 'dispatched'
      },
      { $set: { status: 'sale_authorized' } }
    );
    console.log(`[authorizeSale] Fallback updated ${updateResult2.modifiedCount} dispatches for order ${order.orderNumber}`);
    updateResult = updateResult2;
  }

  // Check remaining pending dispatches across this order
  const remainingCount = await DispatchForm.countDocuments({
    order: order._id,
    status: 'dispatched'
  });

  // Transition order status when ALL dispatches are authorized
  if (remainingCount === 0) {
    order.status = ORDER_STATUS.SALE_AUTHORIZED;
    order.saleAuthorizedByLevel2 = req.user.id;
    order.saleAuthorizedAt = new Date();
    await order.save();
    console.log(`[authorizeSale] Order ${order.orderNumber} fully authorized → SALE_AUTHORIZED`);
  } else {
    console.log(`[authorizeSale] ${remainingCount} dispatch(es) still pending for order ${order.orderNumber}`);
  }

  await notifyLevels([4], {
    type: 'sale_authorized',
    message: `Sale authorised for ${order.orderNumber} — invoice can be generated`,
    relatedEntity: { kind: 'Order', id: order._id },
  });

  res.json({ order, updatedCount: updateResult?.modifiedCount || 0 });
});

export const updateOrderSchema = z.object({
  site: z.string().optional().or(z.literal('')),
  grade: z.string().min(1, 'Grade is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  negotiatedRate: z.coerce.number().nonnegative('Rate must be 0 or more'),
  deliveryDate: z.string().optional().or(z.literal('')),
  remarks: z.string().optional(),
});

export const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound();
  if (order.status !== ORDER_STATUS.PENDING) {
    throw ApiError.badRequest('Only PENDING orders can be edited');
  }
  if (String(order.createdByLevel3) !== String(req.user.id)) {
    throw ApiError.forbidden('You can only edit your own orders');
  }

  const { site, grade, quantity, negotiatedRate, deliveryDate, remarks } = req.body;
  if (site !== undefined) order.site = site || undefined;
  if (grade) order.grade = grade;
  if (quantity) order.quantity = quantity;
  if (negotiatedRate !== undefined) order.negotiatedRate = negotiatedRate;
  if (deliveryDate !== undefined) order.deliveryDate = deliveryDate || undefined;
  if (remarks !== undefined) order.remarks = remarks;

  await order.save();
  const updated = await populateOrder(Order.findById(order._id));
  res.json({ order: updated });
});

export const closeOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound();
  order.status = ORDER_STATUS.CLOSED;
  await order.save();
  const updated = await populateOrder(Order.findById(order._id));
  res.json({ order: updated });
});

