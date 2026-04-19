import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listOrders,
  getOrder,
  createOrder,
  approveOrder,
  authorizeSale,
  createOrderSchema,
} from '../controllers/order.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listOrders);
router.get('/:id', getOrder);
router.post('/', rbac(3), validate(createOrderSchema), createOrder);
router.patch('/:id/approve', rbac(2), approveOrder);
router.patch('/:id/authorize-sale', rbac(2), authorizeSale);

export default router;
