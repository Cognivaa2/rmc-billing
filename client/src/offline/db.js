import Dexie from 'dexie';

export const db = new Dexie('rmcBilling');

db.version(1).stores({
  pendingInvoices: '&idempotencyKey, syncStatus, generatedAt',
  invoiceBlocks: '&id, financialYear, status',
});

export async function addPendingInvoice(payload) {
  await db.pendingInvoices.put({ ...payload, syncStatus: 'pending' });
}

export async function listPending() {
  return db.pendingInvoices.where('syncStatus').equals('pending').toArray();
}

export async function markSynced(idempotencyKey) {
  await db.pendingInvoices.update(idempotencyKey, { syncStatus: 'synced' });
}

export async function markError(idempotencyKey, error) {
  await db.pendingInvoices.update(idempotencyKey, { syncStatus: 'error', error });
}

export async function saveBlock(block) {
  await db.invoiceBlocks.put({
    id: block._id || block.id,
    financialYear: block.financialYear,
    status: block.status,
    rangeStart: block.rangeStart,
    rangeEnd: block.rangeEnd,
    usedNumbers: block.usedNumbers || [],
    fyShort: block.financialYear.slice(2, 4),
  });
}

export async function consumeNumberFromBlock() {
  const active = await db.invoiceBlocks.where('status').equals('active').first();
  if (!active) return null;
  const used = new Set(active.usedNumbers || []);
  for (let n = active.rangeStart; n <= active.rangeEnd; n += 1) {
    if (!used.has(n)) {
      active.usedNumbers = [...(active.usedNumbers || []), n];
      if (active.usedNumbers.length === active.rangeEnd - active.rangeStart + 1) {
        active.status = 'exhausted';
      }
      await db.invoiceBlocks.put(active);
      return { raw: n, formatted: `INV-${active.fyShort}-${String(n).padStart(5, '0')}` };
    }
  }
  return null;
}
