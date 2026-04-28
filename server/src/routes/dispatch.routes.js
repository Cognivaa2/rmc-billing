import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listDispatches,
  getDispatch,
  createDispatch,
  createDispatchSchema,
  authorizeSaleByDispatch,
} from '../controllers/dispatch.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listDispatches);
router.get('/:id', getDispatch);
router.post('/', rbac(4), validate(createDispatchSchema), createDispatch);
router.patch('/:id/authorize', rbac(2), authorizeSaleByDispatch);

export default router;
