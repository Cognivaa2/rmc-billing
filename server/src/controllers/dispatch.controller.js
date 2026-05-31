import { z } from 'zod';
import { DispatchForm } from '../models/DispatchForm.js';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { nextDispatchNumber } from '../utils/sequence.js';
import { notifyLevels } from '../services/notification.service.js';

// ── Schemas ──────────────────────────────────────────────────────────────────

export const createDispatchSchema = z.object({
  order: z.string({ required_error: 'order is required' }),
  quantity: z.coerce.number().positive(),
  vehicleNumber: z.coerce.string().min(1),
  mixDetails: z.string().optional().nullable(),
  driverName: z.string().optional().nullable(),
  dispatchDateTime: z.string().optional().nullable(),
});

// ── Populate helper ───────────────────────────────────────────────────────────

const populateDispatch = (q) =>
  q
    .populate('client', 'clientName officeAddress contactNumber email taxInformation')
    .populate('site', 'siteName siteAddress')
    .populate('grade', 'gradeCode description')
    .populate('order', 'orderNumber status negotiatedRate')
    .populate('filledByLevel4', 'name');

// ── Controllers ───────────────────────────────────────────────────────────────

export const listDispatches = asyncHandler(async (req, res) => {
  const { status, client, from, to, page, limit } = req.query;
  const filter = {};
  const andClauses = [];

  // Filter by order
  if (req.query.order) {
    andClauses.push({ order: req.query.order });
  }

  // Filter by status
  if (status) {
    andClauses.push({ status });
  }

  if (client) filter.client = client;
  if (from || to) {
    filter.dispatchDateTime = {};
    if (from) filter.dispatchDateTime.$gte = new Date(from);
    if (to) filter.dispatchDateTime.$lte = new Date(to);
  }

  if (andClauses.length > 0) {
    filter.$and = andClauses;
  }
  
  let query = DispatchForm.find(filter).sort({ createdAt: -1 });
  let total = await DispatchForm.countDocuments(filter);
  let totalPages = 1;
  let currentPage = 1;

  if (page || limit) {
    currentPage = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (currentPage - 1) * limitNum;
    query = query.skip(skip).limit(limitNum);
    totalPages = Math.ceil(total / limitNum);
  }

  const dispatches = await populateDispatch(query);
  res.json({ dispatches, total, page: currentPage, totalPages });
});

export const getDispatch = asyncHandler(async (req, res) => {
  const dispatch = await populateDispatch(DispatchForm.findById(req.params.id));
  if (!dispatch) throw ApiError.notFound();
  res.json({ dispatch });
});

/**
 * POST /dispatches
 * L4 fills a dispatch form.
 */
export const createDispatch = asyncHandler(async (req, res) => {
  const { order: orderId, quantity, vehicleNumber, mixDetails, driverName, dispatchDateTime } = req.body;

  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== ORDER_STATUS.APPROVED) {
    throw ApiError.badRequest(`Dispatch requires APPROVED order. Current: ${order.status}`);
  }

  // Resolve grade: Order.grade is a gradeCode string → find or auto-create
  const { ConcreteGrade } = await import('../models/ConcreteGrade.js');
  const gradeCode = order.grade.toUpperCase().trim();
  const gradeDoc = await ConcreteGrade.findOneAndUpdate(
    { gradeCode },
    { $setOnInsert: { gradeCode, description: `Auto-created from order ${order.orderNumber}` } },
    { upsert: true, new: true },
  );

  const client = order.client;
  const site = order.site;
  const gradeId = gradeDoc._id;
  const linkedOrderId = order._id;

  order.status = ORDER_STATUS.SALE_AUTHORIZED;
  await order.save();

  const dispatchNumber = await nextDispatchNumber();
  const dispatch = await DispatchForm.create({
    dispatchNumber,
    order: linkedOrderId,
    client,
    site,
    grade: gradeId,
    quantity,
    vehicleNumber: vehicleNumber.toUpperCase(),
    mixDetails,
    driverName,
    dispatchDateTime: dispatchDateTime || new Date(),
    filledByLevel4: req.user.id,
    status: 'sale_authorized',
  });

  await notifyLevels([2], {
    type: 'sale_authorized',
    message: `Dispatch ${dispatch.dispatchNumber} filled and sale authorized — invoice can be generated`,
    relatedEntity: { kind: 'DispatchForm', id: dispatch._id },
  });

  const populated = await populateDispatch(DispatchForm.findById(dispatch._id));
  res.status(201).json({ dispatch: populated });
});

/**
 * PATCH /dispatches/:id/authorize
 * L2 authorizes sale for a specific dispatch (works for both SO-based and order-based).
 */
export const authorizeSaleByDispatch = asyncHandler(async (req, res) => {
  const dispatch = await populateDispatch(DispatchForm.findById(req.params.id));
  if (!dispatch) throw ApiError.notFound('Dispatch not found');
  if (dispatch.status !== 'dispatched') {
    throw ApiError.badRequest(`Dispatch is already ${dispatch.status}`);
  }

  dispatch.status = 'sale_authorized';
  await dispatch.save();

  // If linked to a parent order, update its status too
  if (dispatch.order?._id || dispatch.order) {
    const orderId = dispatch.order?._id || dispatch.order;
    await Order.findByIdAndUpdate(orderId, {
      status: ORDER_STATUS.SALE_AUTHORIZED,
      saleAuthorizedByLevel2: req.user.id,
      saleAuthorizedAt: new Date(),
    });
  }

  await notifyLevels([4], {
    type: 'sale_authorized',
    message: `Sale authorised for dispatch ${dispatch.dispatchNumber} — invoice can be generated`,
    relatedEntity: { kind: 'DispatchForm', id: dispatch._id },
  });

  const updated = await populateDispatch(DispatchForm.findById(dispatch._id));
  res.json({ dispatch: updated });
});
