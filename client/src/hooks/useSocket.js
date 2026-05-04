import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../store/auth.js';

const socketUrl =
  (import.meta.env.VITE_API_URL || 'https://rmc-billing.onrender.com/api/v1').replace(/\/api\/v1\/?$/, '') ||
  'https://rmc-billing.onrender.com';

export function useSocket(onEvent) {
  const user = useAuth((s) => s.user);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;
    const s = io(socketUrl, { withCredentials: true, transports: ['websocket', 'polling'] });
    socketRef.current = s;
    if (onEvent) s.onAny(onEvent);
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [user, onEvent]);

  return socketRef;
}
