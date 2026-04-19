import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

export function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err?.name === 'ValidationError') {
    return res.status(422).json({ error: 'Validation failed', details: err.errors });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id', details: err.message });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'Duplicate key', details: err.keyValue });
  }
  logger.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
