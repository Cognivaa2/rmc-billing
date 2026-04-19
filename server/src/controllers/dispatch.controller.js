import { z } from 'zod';
import { DispatchForm } from '../models/DispatchForm.js';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { SalesOrder } from '../models/SalesOrder.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { nextDispatchNumber } from '../utils/sequence.js';
import { notifyLevels } from '../services/notification.service.js';

export const createDispatchSchema = z.object({
  order: z.string(),
  quantity: z.number().positive(),
  vehicleNumber: z.string().min(3),
  dispatchDateTime: z.string().optional(),
});

export const listDispatches = asyncHandler(async (req, res) => {
  const { status, client, from, to } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (client) filter.client = client;
  if (from || to) {
    filter.dispatchDateTime = {};
    if (from) filter.dispatchDateTime.$gte = new Date(from);
    if (to) filter.dispatchDateTime.$lte = new Date(to);
  }
  const dispatches = await DispatchForm.find(filter)
    .populate('client', 'clientName officeAddress contactNumber email taxInformation')
    .populate('site', 'siteName')
    .populate('grade', 'gradeCode description')
    .populate('order', 'orderNumber status negotiatedRate')
    .populate('filledByLevel4', 'name')
    .sort({ createdAt: -1 });
  res.json({ dispatches });
});

export const getDispatch = asyncHandler(async (req, res) => {
  const dispatch = await DispatchForm.findById(req.params.id)
    .populate('client')
    .populate('site')
    .populate('grade')
    .populate('order')
    .populate('filledByLevel4', 'name');
  if (!dispatch) throw ApiError.notFound();
  res.json({ dispatch });
});

export const createDispatch = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.body.order);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== ORDER_STATUS.APPROVED) {
    throw ApiError.badRequest(`Dispatch requires APPROVED order. Current: ${order.status}`);
  }

  const dispatchNumber = await nextDispatchNumber();
  const dispatch = await DispatchForm.create({
    dispatchNumber,
    order: order._id,
    client: order.client,
    site: order.site,
    grade: order.grade,
    quantity: req.body.quantity,
    vehicleNumber: req.body.vehicleNumber,
    dispatchDateTime: req.body.dispatchDateTime || new Date(),
    filledByLevel4: req.user.id,
  });

  order.status = ORDER_STATUS.DISPATCHED;
  await order.save();

  if (order.salesOrder) {
    const so = await SalesOrder.findById(order.salesOrder);
    if (so) {
      so.dispatchedQuantity += req.body.quantity;
      so.remainingQuantity = Math.max(0, so.totalQuantity - so.dispatchedQuantity);
      await so.save();
    }
  }

  await notifyLevels([2], {
    type: 'dispatch_ready',
    message: `Dispatch ${dispatch.dispatchNumber} filled — awaiting sale authorisation`,
    relatedEntity: { kind: 'DispatchForm', id: dispatch._id },
  });

  res.status(201).json({ dispatch });
});
