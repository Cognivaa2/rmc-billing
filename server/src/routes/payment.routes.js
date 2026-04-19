import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listPayments,
  createPayment,
  updatePayment,
  paymentSchema,
} from '../controllers/payment.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listPayments);
// L1 and L2 can record/update payments (brief: Manager records payment received/not received)
router.post('/', rbac(1, 2), validate(paymentSchema), createPayment);
router.patch('/:id', rbac(1, 2), updatePayment);

export default router;
