import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handler = () => setOnline(navigator.onLine);
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);
    return () => {
      window.removeEventListener('online', handler);
      window.removeEventListener('offline', handler);
    };
  }, []);

  if (online) {
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
      <span className="h-2 w-2 rounded-full bg-amber-500" /> Offline
    </span>
  );
}
