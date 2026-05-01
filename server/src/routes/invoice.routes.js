import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listInvoices,
  getInvoice,
  getInvoicePdf,
  createInvoice,
  createInvoiceSchema,
} from '../controllers/invoice.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listInvoices);
router.post('/', rbac(4), validate(createInvoiceSchema), createInvoice);
router.get('/:id', getInvoice);
router.get('/:id/pdf', getInvoicePdf);

export default router;
