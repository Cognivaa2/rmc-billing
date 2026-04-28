import jwt from 'jsonwebtoken';
import { env, isProd } from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign({ sub: String(user._id), level: user.level }, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl,
  });

export const signRefreshToken = (user) =>
  jwt.sign({ sub: String(user._id), level: user.level, type: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: env.refreshTokenTtl,
  });

const baseCookie = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'strict',
  domain: env.cookieDomain === 'localhost' ? undefined : env.cookieDomain,
  path: '/',
};

export const setAuthCookies = (res, access, refresh) => {
  res.cookie('access_token', access, { ...baseCookie, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refresh, { ...baseCookie, maxAge: 7 * 24 * 60 * 60 * 1000 });
};

export const clearAuthCookies = (res) => {
  res.clearCookie('access_token', baseCookie);
  res.clearCookie('refresh_token', baseCookie);
};
