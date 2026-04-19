import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';

export async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.access_token;
    if (!token) throw ApiError.unauthorized('Missing access token');
    const payload = jwt.verify(token, env.jwtAccessSecret);
    const user = await User.findById(payload.sub).lean();
    if (!user || user.status !== 'active') throw ApiError.unauthorized('User inactive');
    req.user = { id: String(user._id), level: user.level, name: user.name, email: user.email };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(ApiError.unauthorized('Invalid token'));
  }
}

export const rbac = (...allowedLevels) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!allowedLevels.includes(req.user.level)) {
    return next(ApiError.forbidden(`Requires level ${allowedLevels.join('/')} access`));
  }
  next();
};
