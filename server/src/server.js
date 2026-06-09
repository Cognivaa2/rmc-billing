import http from 'http';
import https from 'https';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initSocket } from './sockets/index.js';
import { initNotificationCron } from './cron/notification.cron.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import clientRoutes from './routes/client.routes.js';
import siteRoutes from './routes/site.routes.js';
import gradeRoutes from './routes/grade.routes.js';
import orderRoutes from './routes/order.routes.js';
import dispatchRoutes from './routes/dispatch.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import reportRoutes from './routes/report.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();
const httpServer = http.createServer(app);

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    // Allow if no origin (e.g. server-to-server or tools like Postman)
    if (!origin) return cb(null, true);

    const allowedOrigins = env.clientOrigin.split(',').map(o => o.trim().replace(/\/$/, ''));

    if (
      env.clientOrigin === '*' ||
      allowedOrigins.includes(origin.replace(/\/$/, '')) ||
      env.nodeEnv !== 'production' ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      cb(null, true);
    } else {
      logger.error(`CORS blocked for origin: ${origin}. Allowed: ${env.clientOrigin}`);
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use('/api/', rateLimit({ windowMs: 60_000, max: 300 }));

// Fallback path rewriter for clients missing the /api/v1 prefix
app.use((req, res, next) => {
  if (!req.url.startsWith('/api/v1') && req.url !== '/health' && !req.url.startsWith('/health')) {
    req.url = `/api/v1${req.url}`;
  }
  next();
});

app.get('/health', (req, res) => res.json({ ok: true, env: env.nodeEnv }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/sites', siteRoutes);
app.use('/api/v1/grades', gradeRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/dispatches', dispatchRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

initSocket(httpServer);
initNotificationCron();

async function start() {
  logger.info('Starting server...');
  try {
    await connectDb();
  } catch (err) {
    logger.error('Failed to connect to database:', err.message);
    throw err;
  }

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(
        `\n\n  ✗ Port ${env.port} is already in use.\n` +
        `    Another server instance is running in the background.\n\n` +
        `  → To fix, run:  lsof -ti :${env.port} | xargs kill -9\n` +
        `    Then start again: npm run start\n`
      );
      process.exit(1);
    } else {
      logger.error('HTTP server error:', err.message);
      process.exit(1);
    }
  });

  httpServer.listen(env.port, () => {
    logger.info(`RMC Billing API listening on :${env.port}`);

    // Self-ping to prevent Render from sleeping (triggers every 14 minutes)
    const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
    if (RENDER_EXTERNAL_URL) {
      setInterval(() => {
        https.get(`${RENDER_EXTERNAL_URL}/health`, (resp) => {
          if (resp.statusCode === 200) {
            logger.info('Keep-alive ping successful');
          } else {
            logger.warn(`Keep-alive ping failed with status: ${resp.statusCode}`);
          }
        }).on("error", (err) => {
          logger.error(`Keep-alive error: ${err.message}`);
        });
      }, 1 * 60 * 1000); // 14 minutes in milliseconds

      logger.info(`Keep-alive self-ping initialized for ${RENDER_EXTERNAL_URL}`);
    }
  });
}

start().catch((e) => {
  logger.error('Fatal boot error', e);
  process.exit(1);
});
