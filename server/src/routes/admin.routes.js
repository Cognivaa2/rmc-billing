import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  deleteDispatchData,
  deleteRangeSchema,
  getCompanySettings,
  updateCompanySettings,
  companySettingsSchema,
} from '../controllers/admin.controller.js';

const router = Router();
router.use(authMiddleware);

// Company settings: any authenticated user can read (needed for invoice PDF generation)
router.get('/settings', getCompanySettings);
// Only Level 1 can update company settings and delete data
router.patch('/settings', rbac(1), validate(companySettingsSchema), updateCompanySettings);
router.delete('/dispatch-data', rbac(1), validate(deleteRangeSchema), deleteDispatchData);

export default router;

