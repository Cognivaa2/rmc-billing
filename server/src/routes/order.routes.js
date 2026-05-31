import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listOrders,
  getOrder,
  createOrder,
  approveOrder,
  rejectOrder,
  authorizeSale,
  closeOrder,
  updateOrder,
  updateOrderSchema,
  createOrderSchema,
} from '../controllers/order.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listOrders);
router.post('/', rbac(3), validate(createOrderSchema), createOrder);

// Named sub-routes MUST come before the generic /:id route
router.patch('/:id/approve', rbac(2), approveOrder);
router.patch('/:id/reject', rbac(2), rejectOrder);
router.patch('/:id/authorize-sale', rbac(2), authorizeSale);
router.patch('/:id/close', rbac(2), closeOrder);

// Generic /:id routes last
router.get('/:id', getOrder);
router.patch('/:id', rbac(3), validate(updateOrderSchema), updateOrder);

export default router;
