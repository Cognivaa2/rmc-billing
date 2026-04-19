import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { emitToUser } from '../sockets/index.js';
import { sendMail } from '../utils/mailer.js';
import { sendSms } from '../utils/sms.js';
import { logger } from '../utils/logger.js';

export async function notify({
  recipients,
  type,
  message,
  relatedEntity,
  channels = ['inapp'],
}) {
  if (!recipients || recipients.length === 0) return [];
  const docs = recipients.map((r) => ({
    recipient: r._id,
    recipientLevel: r.level,
    type,
    message,
    relatedEntity,
    channels,
  }));
  const created = await Notification.insertMany(docs);
  for (const doc of created) {
    emitToUser(String(doc.recipient), 'notification', doc);
  }
  if (channels.includes('email')) {
    await Promise.all(
      recipients
        .filter((r) => r.email)
        .map((r) => sendMail({ to: r.email, subject: `[RMC] ${type}`, text: message })),
    );
  }
  if (channels.includes('sms')) {
    await Promise.all(
      recipients.filter((r) => r.phone).map((r) => sendSms({ to: r.phone, body: message })),
    );
  }
  return created;
}

export async function notifyLevels(levels, opts) {
  const users = await User.find({ level: { $in: levels }, status: 'active' }).lean();
  return notify({ ...opts, recipients: users });
}

export async function notifyUser(userId, opts) {
  const user = await User.findById(userId).lean();
  if (!user) {
    logger.warn(`notifyUser: user ${userId} not found`);
    return [];
  }
  return notify({ ...opts, recipients: [user] });
}
