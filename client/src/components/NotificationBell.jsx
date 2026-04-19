import { useEffect, useState, useCallback, useRef } from 'react';
import { notifications as apiNotifications } from '../api/endpoints.js';
import { useSocket } from '../hooks/useSocket.js';
import { fmtDateTime } from '../utils/format.js';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const dropdownRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const list = await apiNotifications.list({ unreadOnly: false });
      setItems(list);
      setCount(list.filter((n) => !n.isRead).length);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  useSocket(
    useCallback(
      (event, payload) => {
        if (event === 'notification') {
          setItems((prev) => [payload, ...prev].slice(0, 200));
          setCount((c) => c + 1);
        }
      },
      [],
    ),
  );

  const onRead = async (id) => {
    await apiNotifications.markRead(id);
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setCount((c) => Math.max(0, c - 1));
  };

  const onReadAll = async () => {
    await apiNotifications.markAll();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setCount(0);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-semibold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg z-20">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="font-semibold">Notifications</div>
            <button className="text-xs text-brand-600 hover:underline" onClick={onReadAll}>
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">No notifications</div>
            )}
            {items.map((n) => (
              <button
                key={n._id}
                className={`w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${
                  n.isRead ? 'opacity-60' : ''
                }`}
                onClick={() => !n.isRead && onRead(n._id)}
              >
                <div className="text-sm font-medium">{n.message}</div>
                <div className="text-xs text-slate-400">
                  {n.type} · {fmtDateTime(n.sentAt)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
