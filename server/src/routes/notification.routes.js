import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  listMyNotifications,
  markRead,
  markAllRead,
} from '../controllers/notification.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', listMyNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

export default router;
