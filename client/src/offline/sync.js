import { invoices } from '../api/endpoints.js';
import { listPending, markSynced, markError } from './db.js';

let syncInFlight = false;

export async function syncPendingInvoices() {
  if (syncInFlight) return { skipped: true };
  if (!navigator.onLine) return { skipped: true };
  const pending = await listPending();
  if (pending.length === 0) return { synced: 0 };

  syncInFlight = true;
  try {
    const payload = pending.map((p) => ({
      invoiceNumber: p.invoiceNumber,
      dispatch: p.dispatch,
      order: p.order,
      showRateOnInvoice: p.showRateOnInvoice,
      quantity: p.quantity,
      rate: p.rate,
      amount: p.amount,
      idempotencyKey: p.idempotencyKey,
      generatedAt: p.generatedAt,
      pdfUrl: p.pdfUrl,
    }));
    const results = await invoices.sync(payload);
    for (const r of results) {
      if (r.status === 'created' || r.status === 'deduped') {
        await markSynced(r.idempotencyKey);
      } else {
        await markError(r.idempotencyKey, r.status);
      }
    }
    return { synced: results.filter((r) => r.status === 'created').length, results };
  } finally {
    syncInFlight = false;
  }
}

export function installSyncListeners() {
  window.addEventListener('online', () => {
    syncPendingInvoices().catch(() => {});
  });
  setInterval(() => {
    if (navigator.onLine) syncPendingInvoices().catch(() => {});
  }, 60_000);
}
