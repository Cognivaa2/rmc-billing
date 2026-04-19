import { useEffect, useState } from 'react';
import { db } from '../offline/db.js';
import { syncPendingInvoices } from '../offline/sync.js';

export function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const update = async () => {
      const n = await db.pendingInvoices.where('syncStatus').equals('pending').count();
      setPending(n);
    };
    update();
    const handler = () => {
      setOnline(navigator.onLine);
      update();
    };
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);
    const id = setInterval(update, 10_000);
    return () => {
      window.removeEventListener('online', handler);
      window.removeEventListener('offline', handler);
      clearInterval(id);
    };
  }, []);

  if (online && pending === 0) {
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online
      </span>
    );
  }
  if (!online) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
        <span className="h-2 w-2 rounded-full bg-amber-500" /> Offline — invoices will queue locally
      </span>
    );
  }
  return (
    <button
      onClick={() => syncPendingInvoices()}
      className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
      title="Sync now"
    >
      <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" /> {pending} invoice{pending === 1 ? '' : 's'} pending sync
    </button>
  );
}
