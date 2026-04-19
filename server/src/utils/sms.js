import { env } from '../config/env.js';
import { logger } from './logger.js';

export async function sendSms({ to, body }) {
  if (!to) return;
  if (env.smsProvider === 'stub') {
    logger.info(`[sms:stub] to=${to} body="${body}"`);
    return { ok: true, provider: 'stub' };
  }
  logger.warn(`SMS provider ${env.smsProvider} not implemented — skipping`);
  return { ok: false };
}
