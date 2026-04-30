import { z } from 'zod';
import { DispatchForm } from '../models/DispatchForm.js';
import { Order, ORDER_STATUS } from '../models/Order.js';
import { SalesOrder } from '../models/SalesOrder.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { nextDispatchNumber } from '../utils/sequence.js';
import { notifyLevels } from '../services/notification.service.js';

// ── Schemas ──────────────────────────────────────────────────────────────────

export const createDispatchSchema = z.object({
  order: z.string().optional(),
  salesOrder: z.string().optional(),
  quantity: z.number().positive(),
  vehicleNumber: z.string().min(3),
  mixDetails: z.string().optional(),
  driverName: z.string().optional(),
  dispatchDateTime: z.string().optional(),
}).refine((d) => d.order || d.salesOrder, {
  message: 'Either order or salesOrder is required',
});

// ── Populate helper ───────────────────────────────────────────────────────────

const populateDispatch = (q) =>
  q
    .populate('client', 'clientName officeAddress contactNumber email taxInformation')
    .populate('site', 'siteName')
    .populate('grade', 'gradeCode description')
    .populate('order', 'orderNumber status negotiatedRate')
    .populate('salesOrder', 'soNumber status totalQuantity remainingQuantity')
    .populate('filledByLevel4', 'name');

// ── Controllers ───────────────────────────────────────────────────────────────

export const listDispatches = asyncHandler(async (req, res) => {
  const { status, client, from, to, salesOrder, page, limit } = req.query;
  const filter = {};
  const andClauses = [];

  // Filter by order (supports both direct order link and via Sales Orders)
  if (req.query.order) {
    const sos = await SalesOrder.find({ sourceOrder: req.query.order }).select('_id').lean();
    andClauses.push({
      $or: [
        { order: req.query.order },
        { salesOrder: { $in: sos.map((s) => s._id) } },
      ]
    });
  }

  // Filter by status
  if (status) {
    if (status === 'sale_authorized') {
      const closedSos = await SalesOrder.find({ status: 'closed' }).select('_id').lean();
      const closedSoIds = closedSos.map((s) => s._id);
      andClauses.push({
        $or: [
          { status: 'sale_authorized' },
          { salesOrder: { $in: closedSoIds }, status: 'dispatched' },
        ]
      });
    } else if (status === 'dispatched') {
      const closedSos = await SalesOrder.find({ status: 'closed' }).select('_id').lean();
      const closedSoIds = closedSos.map((s) => s._id);
      andClauses.push({ status: 'dispatched' });
      andClauses.push({ salesOrder: { $nin: closedSoIds } });
    } else {
      andClauses.push({ status });
    }
  }

  if (client) filter.client = client;
  if (salesOrder) filter.salesOrder = salesOrder;
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
 * Supports two modes:
 *   1. salesOrder-based (new flow): body has salesOrder ID
 *   2. order-based (legacy flow):   body has order ID
 */
export const createDispatch = asyncHandler(async (req, res) => {
  const { salesOrder: soId, order: orderId, quantity, vehicleNumber, mixDetails, driverName, dispatchDateTime } = req.body;

  let client, site, gradeId, linkedOrderId, linkedSoId;

  // ── Mode 1: SO-based dispatch ─────────────────────────────────────────────
  if (soId) {
    const so = await SalesOrder.findById(soId).populate('grade', '_id gradeCode');
    if (!so) throw ApiError.notFound('Sales Order not found');
    if (so.status === 'closed') throw ApiError.badRequest('Sales Order is already closed');
    if (so.remainingQuantity <= 0) throw ApiError.badRequest('No remaining quantity on this Sales Order');
    if (quantity > so.remainingQuantity) {
      throw ApiError.badRequest(
        `Quantity (${quantity}) exceeds remaining (${so.remainingQuantity} m³)`,
      );
    }

    client = so.client;
    site = so.site;
    gradeId = so.grade?._id || so.grade;
    linkedSoId = so._id;
    linkedOrderId = so.sourceOrder;

    // Update SO quantities
    so.dispatchedQuantity += quantity;
    so.remainingQuantity = Math.max(0, so.totalQuantity - so.dispatchedQuantity);
    await so.save();

    // ── Auto-advance parent Order to DISPATCHED when ALL its SOs are fully dispatched ──
    if (so.remainingQuantity === 0 && so.sourceOrder) {
      const allSosForOrder = await SalesOrder.find({ sourceOrder: so.sourceOrder });
      const allFullyDispatched = allSosForOrder.every((s) => s.remainingQuantity === 0);
      if (allFullyDispatched) {
        await Order.findByIdAndUpdate(so.sourceOrder, { status: ORDER_STATUS.DISPATCHED });
      }
    }

  // ── Mode 2: Order-based dispatch (legacy) ─────────────────────────────────
  } else {
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

    client = order.client;
    site = order.site;
    gradeId = gradeDoc._id;
    linkedOrderId = order._id;

    order.status = ORDER_STATUS.DISPATCHED;
    await order.save();
  }

  const dispatchNumber = await nextDispatchNumber();
  const dispatch = await DispatchForm.create({
    dispatchNumber,
    salesOrder: linkedSoId,
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
  });

  await notifyLevels([2], {
    type: 'dispatch_ready',
    message: `Dispatch ${dispatch.dispatchNumber} filled — awaiting sale authorisation`,
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
