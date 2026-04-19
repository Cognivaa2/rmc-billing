import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listSalesOrders,
  getSalesOrder,
  createSalesOrder,
  closeSalesOrder,
  createSoSchema,
} from '../controllers/salesOrder.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listSalesOrders);
router.get('/:id', getSalesOrder);
router.post('/', rbac(2), validate(createSoSchema), createSalesOrder);
router.patch('/:id/close', rbac(2), closeSalesOrder);

export default router;
