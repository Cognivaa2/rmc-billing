import { Router } from 'express';
import { authMiddleware, rbac } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listUsers,
  createUser,
  updateUser,
  getUser,
  createUserSchema,
  updateUserSchema,
} from '../controllers/user.controller.js';

const router = Router();

router.use(authMiddleware, rbac(1));
router.get('/', listUsers);
router.post('/', validate(createUserSchema), createUser);
router.get('/:id', getUser);
router.patch('/:id', validate(updateUserSchema), updateUser);

export default router;
