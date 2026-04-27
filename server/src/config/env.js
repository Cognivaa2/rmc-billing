import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || process.env.MONGO_URL || process.env.MONGODB_URL || 'mongodb://localhost:27017/rmc_billing',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
  cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  accessTokenTtl: '15m',
  refreshTokenTtl: '7d',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'RMC Billing <no-reply@rmc.local>',
  },
  smsProvider: process.env.SMS_PROVIDER || 'stub',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
};

export const isProd = env.nodeEnv === 'production';
