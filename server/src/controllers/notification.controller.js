import { Notification } from '../models/Notification.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const listMyNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly } = req.query;
  const filter = { recipient: req.user.id };
  if (unreadOnly === 'true') filter.isRead = false;
  const notifications = await Notification.find(filter).sort({ sentAt: -1 }).limit(200);
  res.json({ notifications });
});

export const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { isRead: true },
    { new: true },
  );
  if (!n) throw ApiError.notFound();
  res.json({ notification: n });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
  res.json({ ok: true });
});
