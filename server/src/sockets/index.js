import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let io;

function parseCookies(raw) {
  const out = {};
  if (!raw) return out;
  for (const pair of raw.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const parsed = parseCookies(socket.handshake.headers?.cookie);
      const token = parsed.access_token;
      if (!token) return next(new Error('No token'));
      const payload = jwt.verify(token, env.jwtAccessSecret);
      socket.userId = payload.sub;
      socket.level = payload.level;
      next();
    } catch (err) {
      logger.warn('Socket auth failed', err.message);
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    socket.join(`level:${socket.level}`);
    logger.debug(`Socket connected user=${socket.userId} level=${socket.level}`);
  });

  return io;
}

export function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToLevel(level, event, payload) {
  io?.to(`level:${level}`).emit(event, payload);
}
