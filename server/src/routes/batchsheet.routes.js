import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listBatchsheets,
  createBatchsheet,
  getBatchsheetPdf,
  createBatchsheetSchema,
  updateBatchsheet,
  updateBatchsheetSchema,
} from '../controllers/batchsheet.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listBatchsheets);
router.post('/', rbac(4), validate(createBatchsheetSchema), createBatchsheet);
router.patch('/:id', rbac(4), validate(updateBatchsheetSchema), updateBatchsheet);
router.get('/:id/pdf', getBatchsheetPdf);

export default router;
