import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtp.host) {
    transporter = {
      sendMail: async (opts) => {
        logger.info('[mail:stub]', opts.to, '-', opts.subject);
        return { messageId: 'stub' };
      },
    };
  } else {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  if (!to) return;
  try {
    await getTransporter().sendMail({ from: env.smtp.from, to, subject, text, html });
  } catch (err) {
    logger.warn('sendMail failed', err.message);
  }
}
