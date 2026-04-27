import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listSalesOrders,
  getSalesOrder,
  createSalesOrder,
  closeSalesOrder,
  createSalesOrderFromOrder,
  createSoSchema,
} from '../controllers/salesOrder.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listSalesOrders);
router.post('/', rbac(2), validate(createSoSchema), createSalesOrder);
router.post('/from-order/:orderId', rbac(2), createSalesOrderFromOrder);
router.get('/:id', getSalesOrder);
router.patch('/:id/close', rbac(2), closeSalesOrder);

export default router;
