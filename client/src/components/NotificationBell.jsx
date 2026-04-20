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

  const [selected, setSelected] = useState(null);

  const handleSelect = (n) => {
    setSelected(n);
    if (!n.isRead) onRead(n._id);
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
                className={`w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                  n.isRead ? 'opacity-60' : ''
                }`}
                onClick={() => handleSelect(n)}
              >
                <div className="text-sm font-medium text-slate-800">{n.message}</div>
                <div className="text-xs text-slate-400 mt-1">
                  <span className="capitalize">{n.type.replace(/_/g, ' ')}</span> · {fmtDateTime(n.sentAt)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Notification Detail</h3>
              <button 
                onClick={() => setSelected(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Close modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Message</div>
                <div className="text-base text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-100">{selected.message}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Type</div>
                  <div className="text-sm font-medium text-brand-600 capitalize bg-brand-50 inline-flex px-2 py-1 rounded-md">
                    {selected.type.replace(/_/g, ' ')}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Time</div>
                  <div className="text-sm text-slate-700">{fmtDateTime(selected.sentAt)}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setSelected(null)}
                className="btn-primary w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
