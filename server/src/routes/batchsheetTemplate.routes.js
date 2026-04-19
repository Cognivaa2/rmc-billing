import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deactivateTemplate,
  templateSchema,
} from '../controllers/batchsheetTemplate.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listTemplates);
router.get('/:id', getTemplate);
router.post('/', rbac(4), validate(templateSchema), createTemplate);
router.patch('/:id', rbac(4), updateTemplate);
router.patch('/:id/deactivate', rbac(4), deactivateTemplate);

export default router;
