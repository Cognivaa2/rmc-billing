import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listSites,
  createSite,
  updateSite,
  deleteSite,
  siteSchema,
} from '../controllers/site.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listSites);
router.post('/', rbac(1, 2), validate(siteSchema), createSite);
router.patch('/:id', rbac(1, 2), updateSite);
router.delete('/:id', rbac(1), deleteSite);

export default router;
