import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { signAccessToken, signRefreshToken, setAuthCookies, clearAuthCookies } from '../utils/tokens.js';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.badRequest('Email already in use');

  const count = await User.countDocuments();
  if (count > 0) {
    throw ApiError.forbidden('Admin already registered. Please login.');
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash: hash,
    level: 1, // First user is always L1 Admin
    status: 'active',
  });

  setAuthCookies(res, signAccessToken(user), signRefreshToken(user));
  res.json({ user: user.toPublic() });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.status !== 'active') throw ApiError.unauthorized('Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');
  user.lastLoginAt = new Date();
  await user.save();
  setAuthCookies(res, signAccessToken(user), signRefreshToken(user));
  res.json({ user: user.toPublic() });
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) throw ApiError.unauthorized('Missing refresh token');
  let payload;
  try {
    payload = jwt.verify(token, env.jwtRefreshSecret);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') throw ApiError.unauthorized();
  setAuthCookies(res, signAccessToken(user), signRefreshToken(user));
  res.json({ user: user.toPublic() });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.unauthorized();
  res.json({ user: user.toPublic() });
});
