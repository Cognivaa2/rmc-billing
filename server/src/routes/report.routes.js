import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import {
  dailyDispatchReport,
  salesOrderReport,
  clientDatabaseReport,
  orderReport,
  paymentReport,
} from '../controllers/report.controller.js';

const router = Router();

// Reports are Level 1 only per brief.
router.use(authMiddleware, rbac(1));

router.get('/daily-dispatch', dailyDispatchReport);
router.get('/sales-orders', salesOrderReport);
router.get('/clients', clientDatabaseReport);
router.get('/orders', orderReport);
router.get('/payments', paymentReport);

export default router;
