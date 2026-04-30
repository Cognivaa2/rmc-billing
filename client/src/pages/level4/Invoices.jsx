import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoices, dispatches, clients, companySettings } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney, fmtDateTime } from '../../utils/format.js';
import {
  saveBlock,
  consumeNumberFromBlock,
  addPendingInvoice,
  db,
} from '../../offline/db.js';
import { syncPendingInvoices } from '../../offline/sync.js';
import { downloadInvoicePdf } from '../../pdf/invoicePdf.js';

function newIdempotencyKey() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function L4Invoices() {
  const qc = useQueryClient();
  const [reserveCount, setReserveCount] = useState(50);
  const [blocks, setBlocks] = useState([]);
  const [pendingOffline, setPendingOffline] = useState([]);

  const { data: invoicesList = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => invoices.list() });
  const { data: ready = [] } = useQuery({
    queryKey: ['dispatches', 'ready_for_invoice'],
    queryFn: async () => {
      const all = await dispatches.list();
      return all.filter(d => ['sale_authorized', 'batchsheet'].includes(d.status));
    },
  });
  const { data: settings = {} } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => companySettings.get(),
  });

  const refreshLocal = async () => {
    setBlocks(await db.invoiceBlocks.toArray());
    setPendingOffline(await db.pendingInvoices.toArray());
  };
  useEffect(() => {
    refreshLocal();
    const id = setInterval(refreshLocal, 5000);
    return () => clearInterval(id);
  }, []);

  const reserve = useMutation({
    mutationFn: () => invoices.reserveBlock(reserveCount),
    onSuccess: async (data) => {
      await saveBlock(data.block);
      refreshLocal();
    },
  });

  const generate = async (dispatch, { showRate }) => {
    const online = navigator.onLine;
    const order = dispatch.order;
    const client = dispatch.client;
    const grade = dispatch.grade;
    const quantity = dispatch.quantity;
    const rate = order?.negotiatedRate || 0;

    try {
      if (online) {
        const created = await invoices.create({
          dispatch: dispatch._id,
          showRateOnInvoice: showRate,
          idempotencyKey: newIdempotencyKey(),
        });
        window.open(invoices.pdfUrl(created._id), '_blank');
        qc.invalidateQueries({ queryKey: ['invoices'] });
        qc.invalidateQueries({ queryKey: ['dispatches'] });
        return;
      }
    } catch (err) {
      if (!confirm('Server rejected or unreachable. Generate offline and queue for sync?')) return;
    }

    const allocated = await consumeNumberFromBlock();
    if (!allocated) {
      alert('No invoice numbers available locally. Reserve a block while online before going offline.');
      return;
    }
    const invoicePayload = {
      invoiceNumber: allocated.formatted,
      dispatch: dispatch._id,
      order: order?._id || order,
      showRateOnInvoice: showRate,
      quantity,
      rate,
      amount: rate * quantity,
      idempotencyKey: newIdempotencyKey(),
      generatedAt: new Date().toISOString(),
      generatedOffline: true,
    };

    await addPendingInvoice(invoicePayload);
    downloadInvoicePdf(
      { invoice: invoicePayload, client, dispatch, grade, companySettings: settings },
      `${invoicePayload.invoiceNumber}.pdf`,
    );
    refreshLocal();
    if (navigator.onLine) syncPendingInvoices();
  };

  const downloadExisting = async (inv) => {
    if (navigator.onLine) {
      window.open(invoices.pdfUrl(inv._id), '_blank');
    } else {
      const full = await invoices.get(inv._id);
      const clientDoc = await clients.get(full.client?._id || full.client);
      downloadInvoicePdf(
        { invoice: full, client: clientDoc, dispatch: full.dispatch, grade: full.grade, companySettings: settings },
        `${full.invoiceNumber}.pdf`,
      );
    }
  };

  const activeNumbersLeft = blocks
    .filter((b) => b.status === 'active')
    .reduce((a, b) => a + (b.rangeEnd - b.rangeStart + 1 - (b.usedNumbers?.length || 0)), 0);

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Generate invoices — only available after Level 2 authorizes the sale."
      />

      {/* Workflow Banner */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Workflow — How to generate an Invoice</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 font-semibold text-indigo-700">✓ L4 fills Dispatch Form</span>
          <span className="text-slate-300">→</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 font-semibold text-indigo-700">✓ L2 authorizes Sale</span>
          <span className="text-slate-300">→</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-500">L4 creates Batchsheet</span>
          <span className="text-slate-300">→</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 font-bold text-emerald-700">★ L4 generates Invoice (now)</span>
          <span className="text-slate-300">→</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-500">L2 closes Order</span>
        </div>
        {ready.length === 0 && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-700">
            ⚠️ <strong>No sale-authorized dispatches found.</strong> Level 2 must authorize the sale before you can generate an invoice.
          </div>
        )}
      </div>

      <div className="card card-body mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Offline invoice numbers</div>
            <div className="text-sm text-slate-500">
              {activeNumbersLeft} number{activeNumbersLeft === 1 ? '' : 's'} left in active blocks · {pendingOffline.filter((p) => p.syncStatus === 'pending').length} pending sync
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="label">Reserve count</label>
              <input
                type="number"
                min="1"
                max="500"
                className="input w-28"
                value={reserveCount}
                onChange={(e) => setReserveCount(Number(e.target.value))}
              />
            </div>
            <button
              className="btn-primary"
              onClick={() => reserve.mutate()}
              disabled={reserve.isPending}
            >
              {reserve.isPending ? 'Reserving…' : 'Reserve block'}
            </button>
            <button className="btn-secondary" onClick={() => syncPendingInvoices()}>
              Sync now
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="border-b border-slate-100 px-5 py-4 font-semibold">Ready to invoice</div>
          <div className="divide-y divide-slate-100">
            {ready.map((d) => (
              <div key={d._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">{d.dispatchNumber}</div>
                  <div className="text-xs text-slate-500">
                    {d.client?.clientName} · {d.grade?.gradeCode} · {d.quantity} m³ · {d.vehicleNumber}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary text-xs" onClick={() => generate(d, { showRate: false })}>
                    Generate (hide rate)
                  </button>
                  <button className="btn-primary text-xs" onClick={() => generate(d, { showRate: true })}>
                    Generate (show rate)
                  </button>
                </div>
              </div>
            ))}
            {ready.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-400">Nothing awaiting invoice</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="border-b border-slate-100 px-5 py-4 font-semibold">Recent invoices</div>
          <table className="table-clean">
            <thead>
              <tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Rate?</th><th>Source</th><th>When</th><th></th></tr>
            </thead>
            <tbody>
              {invoicesList.map((i) => (
                <tr key={i._id}>
                  <td className="font-medium">{i.invoiceNumber}</td>
                  <td>{i.client?.clientName}</td>
                  <td>{fmtMoney(i.amount)}</td>
                  <td>
                    {i.showRateOnInvoice ? <span className="badge-blue">Shown</span> : <span className="badge-gray">Hidden</span>}
                  </td>
                  <td>
                    {i.generatedOffline ? <span className="badge-yellow">Offline</span> : <span className="badge-green">Online</span>}
                  </td>
                  <td className="text-slate-500">{fmtDateTime(i.generatedAt)}</td>
                  <td className="text-right">
                    <button className="text-xs text-brand-600 hover:underline" onClick={() => downloadExisting(i)}>
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
              {invoicesList.length === 0 && (
                <tr><td colSpan="7" className="p-6 text-center text-sm text-slate-400">No invoices</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pendingOffline.filter((p) => p.syncStatus === 'pending').length > 0 && (
        <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          <div className="font-semibold">Offline queue</div>
          {pendingOffline
            .filter((p) => p.syncStatus === 'pending')
            .map((p) => (
              <div key={p.idempotencyKey} className="mt-2 flex justify-between">
                <span>{p.invoiceNumber} · {fmtMoney(p.amount)}</span>
                <span className="text-xs text-amber-600">pending</span>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
