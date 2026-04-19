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
