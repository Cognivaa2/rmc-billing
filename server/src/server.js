import http from 'http';
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

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import clientRoutes from './routes/client.routes.js';
import siteRoutes from './routes/site.routes.js';
import gradeRoutes from './routes/grade.routes.js';
import salesOrderRoutes from './routes/salesOrder.routes.js';
import orderRoutes from './routes/order.routes.js';
import dispatchRoutes from './routes/dispatch.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import batchsheetTemplateRoutes from './routes/batchsheetTemplate.routes.js';
import batchsheetRoutes from './routes/batchsheet.routes.js';
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
    // Accept standard origin, or any localhost/local-network origin in development
    if (!origin || origin === env.clientOrigin || env.nodeEnv !== 'production') {
      cb(null, origin || true);
    } else {
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

app.get('/health', (req, res) => res.json({ ok: true, env: env.nodeEnv }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/sites', siteRoutes);
app.use('/api/v1/grades', gradeRoutes);
app.use('/api/v1/sales-orders', salesOrderRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/dispatches', dispatchRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/batchsheet-templates', batchsheetTemplateRoutes);
app.use('/api/v1/batchsheets', batchsheetRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

initSocket(httpServer);

async function start() {
  await connectDb();
  httpServer.listen(env.port, () => {
    logger.info(`RMC Billing API listening on :${env.port}`);
  });
}

start().catch((e) => {
  logger.error('Fatal boot error', e);
  process.exit(1);
});
