import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listInvoices,
  getInvoice,
  createInvoice,
  reserveBlock,
  listMyBlocks,
  syncOfflineInvoices,
  createInvoiceSchema,
  reserveBlockSchema,
  syncOfflineSchema,
} from '../controllers/invoice.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listInvoices);
router.get('/blocks', rbac(4), listMyBlocks);
router.post('/reserve-block', rbac(4), validate(reserveBlockSchema), reserveBlock);
router.post('/sync', rbac(4), validate(syncOfflineSchema), syncOfflineInvoices);
router.post('/', rbac(4), validate(createInvoiceSchema), createInvoice);
router.get('/:id', getInvoice);

export default router;
