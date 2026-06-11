import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { orders, dispatches, payments, invoices } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney, fmtMoneyShort, fmtDate, fmtDateTime } from '../../utils/format.js';

const FILTERS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'SALE_AUTHORIZED', label: 'Sale Auth.' },
  { key: 'INVOICED', label: 'Invoiced' },
  { key: 'ALL', label: 'All' },
];

const STATUS_BADGE = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border border-blue-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
  DISPATCHED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  SALE_AUTHORIZED: 'bg-violet-50 text-violet-700 border border-violet-200',
  INVOICED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

/* ─── Client Payment History Modal ───────────────────────────────────── */
function ClientPaymentHistoryModal({ order, onClose, onConfirmApprove, isApproving }) {
  const clientId = order.client?._id || order.client;
  const clientName = order.client?.clientName || 'Client';

  const { data: paymentsList = [], isLoading: pLoad } = useQuery({
    queryKey: ['payments', 'client', clientId],
    queryFn: () => payments.list({ limit: 10000 }),
    staleTime: 30_000,
  });

  const { data: invoicesList = [], isLoading: iLoad } = useQuery({
    queryKey: ['invoices', 'client', clientId],
    queryFn: () => invoices.list({ client: clientId }),
    staleTime: 30_000,
  });

  const isLoading = pLoad || iLoad;

  // Build combined records for this client only
  const { rows, totalPaid, totalPending } = useMemo(() => {
    const clientPayments = paymentsList.filter(
      (p) => (p.client?._id || p.client) === clientId
    );
    const clientInvoices = invoicesList.filter(
      (i) => (i.client?._id || i.client) === clientId
    );

    // Calculate paid per invoice
    const invoicePaid = {};
    const invoicePendingRecorded = {};
    for (const p of clientPayments) {
      if (p.invoice) {
        const invId = p.invoice._id || p.invoice;
        if (p.paymentReceived) {
          invoicePaid[invId] = (invoicePaid[invId] || 0) + (p.amount || 0);
        } else {
          invoicePendingRecorded[invId] = (invoicePendingRecorded[invId] || 0) + (p.amount || 0);
        }
      }
    }

    let totalPaid = 0;
    let totalPending = 0;
    const rows = [];

    for (const inv of clientInvoices) {
      const paid = invoicePaid[inv._id] || 0;
      const pending = invoicePendingRecorded[inv._id] || 0;
      const due = Math.max(0, (inv.amount || 0) - paid - pending);
      totalPaid += paid;
      totalPending += due + pending;

      rows.push({
        invoiceNumber: inv.invoiceNumber,
        invoiceAmount: inv.amount || 0,
        paid,
        pending,
        due,
        generatedAt: inv.generatedAt,
      });
    }

    // Also include payments not linked to an invoice
    const unlinked = clientPayments.filter((p) => !p.invoice);
    for (const p of unlinked) {
      if (p.paymentReceived) totalPaid += p.amount || 0;
      else totalPending += p.amount || 0;
      rows.push({
        invoiceNumber: '— (No invoice)',
        invoiceAmount: p.amount || 0,
        paid: p.paymentReceived ? p.amount || 0 : 0,
        pending: !p.paymentReceived ? p.amount || 0 : 0,
        due: 0,
        generatedAt: p.createdAt,
      });
    }

    rows.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    return { rows, totalPaid, totalPending };
  }, [paymentsList, invoicesList, clientId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h2 className="text-lg font-bold text-white">Payment History</h2>
                <p className="text-xs text-brand-200">{clientName} · Before approving {order.orderNumber}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-brand-200 hover:text-white text-xl leading-none">×</button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-px bg-slate-100 flex-shrink-0">
          <div className="bg-white px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Invoiced</p>
            <p className="text-xl font-black text-slate-800 mt-1">
              {isLoading ? '…' : fmtMoneyShort(rows.reduce((s, r) => s + r.invoiceAmount, 0))}
            </p>
          </div>
          <div className="bg-white px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Total Paid</p>
            <p className="text-xl font-black text-emerald-600 mt-1">
              {isLoading ? '…' : fmtMoneyShort(totalPaid)}
            </p>
          </div>
          <div className="bg-white px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Outstanding Due</p>
            <p className="text-xl font-black text-rose-600 mt-1">
              {isLoading ? '…' : fmtMoneyShort(totalPending)}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading payment history…</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">💳</div>
              <p className="text-sm font-medium text-slate-500">No payment records found for this client.</p>
              <p className="text-xs text-slate-400 mt-1">This may be their first order.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Invoice</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Invoice Amt</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-emerald-500">Paid</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-rose-500">Due</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono font-semibold text-slate-700">{r.invoiceNumber}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmtMoneyShort(r.invoiceAmount)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-bold ${r.paid > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                        {r.paid > 0 ? fmtMoneyShort(r.paid) : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.due + r.pending > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 px-2 py-0.5 text-xs font-bold">
                          {fmtMoneyShort(r.due + r.pending)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-bold">✓ Clear</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-slate-400">
                      {r.generatedAt ? fmtDate(r.generatedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="text-xs text-slate-500">
            {totalPending > 0 ? (
              <span className="text-rose-600 font-semibold">⚠️ {fmtMoneyShort(totalPending)} outstanding — review before approving</span>
            ) : (
              <span className="text-emerald-600 font-semibold">✓ No outstanding dues</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isApproving}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmApprove}
              disabled={isApproving}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 transition disabled:opacity-60 flex items-center gap-2"
            >
              {isApproving ? (
                <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Approving…</>
              ) : (
                '✓ Approve Order'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Reject Modal ─────────────────────────────────────────────────────── */
function RejectModal({ order, onClose, onConfirm, isPending }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xl">❌</span>
          <h2 className="text-lg font-semibold text-slate-800">Reject Order</h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Rejecting <strong>{order.orderNumber}</strong> for{' '}
          <strong>{order.client?.clientName}</strong>. The sales person will be notified
          and can resubmit a new order.
        </p>
        <label className="label mb-1 block">Reason for rejection</label>
        <textarea
          className="input w-full"
          rows={3}
          placeholder="e.g. Credit limit exceeded, KYC incomplete…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60"
            onClick={() => onConfirm(reason)}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? 'Rejecting…' : 'Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Authorize Sale Modal ─────────────────────────────────────────────── */
function AuthorizeSaleModal({ order, onClose, onConfirm, isPending }) {
  const [selectedDispatches, setSelectedDispatches] = useState(new Set());
  const { data: dispatchesData = [], isLoading } = useQuery({
    queryKey: ['dispatches', 'order', order._id],
    queryFn: () => dispatches.list({ order: order._id, status: 'dispatched' }),
  });

  // Select all by default when data loads
  useEffect(() => {
    if (dispatchesData.length > 0 && selectedDispatches.size === 0) {
      setSelectedDispatches(new Set(dispatchesData.map(d => d._id)));
    }
  }, [dispatchesData]);

  const toggleSelection = (id) => {
    const next = new Set(selectedDispatches);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDispatches(next);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedDispatches));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <div>
              <h2 className="text-lg font-semibold text-white">Authorize Sale</h2>
              <p className="text-xs text-brand-200">{order.orderNumber} · {order.client?.clientName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto">
          <p className="mb-4 text-sm text-slate-600">
            You are about to authorize the following pending dispatches. This will allow the Plant Worker (Level 4) to generate invoices.
          </p>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading dispatches...</div>
          ) : dispatchesData.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No pending dispatches found for this order.</div>
          ) : (
            <div className="space-y-3">
              {dispatchesData.map((d) => (
                <div
                  key={d._id}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${selectedDispatches.has(d._id) ? 'bg-brand-50 border-brand-200 shadow-sm' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                  onClick={() => toggleSelection(d._id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-slate-800">{d.dispatchNumber}</div>
                    <div className={`h-5 w-5 rounded border flex items-center justify-center ${selectedDispatches.has(d._id) ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-300'}`}>
                      {selectedDispatches.has(d._id) && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mt-1 opacity-90">
                    <div>
                      <p className="text-xs text-slate-400">Vehicle Number</p>
                      <p className="font-semibold font-mono text-slate-700 uppercase">{d.vehicleNumber || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Driver Name</p>
                      <p className="font-medium text-slate-700">{d.driverName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Quantity</p>
                      <p className="font-bold text-violet-700">{d.quantity} m³</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Site Name</p>
                      <p className="font-medium text-slate-700 truncate" title={d.site?.siteName}>{d.site?.siteName || '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 transition disabled:opacity-60 flex items-center gap-2"
            onClick={handleConfirm}
            disabled={isPending || dispatchesData.length === 0 || selectedDispatches.size === 0}
          >
            {isPending ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Authorizing…
              </>
            ) : (
              '✅ Confirm Authorize Sale'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────── */
export default function L2Orders() {
  const location = useLocation();
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState(location.state?.filter || 'PENDING');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [authTarget, setAuthTarget] = useState(null);
  const [paymentHistoryTarget, setPaymentHistoryTarget] = useState(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['orders', activeFilter],
    queryFn: () => orders.list(activeFilter === 'ALL' ? {} : { status: activeFilter }),
  });

  const approve = useMutation({
    mutationFn: (id) => orders.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setPaymentHistoryTarget(null);
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }) => orders.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setRejectTarget(null);
    },
  });

  const authorizeSale = useMutation({
    mutationFn: ({ id, dispatchIds }) => orders.authorizeSale(id, { dispatchIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      setAuthTarget(null);
    },
  });

  const closeOrder = useMutation({
    mutationFn: (id) => orders.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // count by status for badges
  const { data: allData = [] } = useQuery({
    queryKey: ['orders', 'ALL'],
    queryFn: () => orders.list({}),
  });
  const counts = allData.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Approve or reject orders submitted by sales team."
      />

      {/* Filter chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${activeFilter === f.key
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            {f.label}
            {counts[f.key] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${activeFilter === f.key
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-500'
                  }`}
              >
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Mobile View: Card list */}
      <div className="md:hidden space-y-4">
        {isLoading && (
          <div className="card card-body text-center text-sm text-slate-400">Loading…</div>
        )}
        {!isLoading && data.length === 0 && (
          <div className="card card-body text-center text-sm text-slate-400 py-12">
            <div className="text-4xl mb-2">📋</div>
            <p>No orders in this category.</p>
          </div>
        )}
        {data.map((o) => (
          <div key={o._id} className="card card-body border-l-4 border-l-brand-500">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{o.orderNumber}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[o.status] || 'bg-slate-100 text-slate-600'}`}>
                    {FILTERS.find((f) => f.key === o.status)?.label || o.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-700 mt-1">{o.client?.clientName}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold uppercase">{o.grade}</span>
                  <span className="text-xs font-medium text-slate-600">{o.quantity} m³</span>
                </div>
                <div className="text-xs text-slate-400 mt-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="grayscale opacity-60">📍</span>
                    <span className="truncate">{o.site?.siteName || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="grayscale opacity-60">🗓</span>
                    <span>Del: {fmtDate(o.deliveryDate)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-brand-600">{fmtMoney(o.negotiatedRate)}</div>
                <div className="text-[10px] text-slate-400 mt-1">per m³</div>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="mt-4 pt-3 border-t border-slate-50 flex gap-2">
              {o.status === 'PENDING' && (
                <>
                  <button
                    className="flex-1 rounded-lg bg-brand-600 py-2 text-xs font-bold text-white hover:bg-brand-700 transition shadow-sm"
                    onClick={() => setPaymentHistoryTarget(o)}
                    disabled={approve.isPending}
                  >
                    Approve
                  </button>
                  <button
                    className="flex-1 rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                    onClick={() => setRejectTarget(o)}
                  >
                    Reject
                  </button>
                </>
              )}
              {o.status === 'APPROVED' && (
                <div className="w-full rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-600 font-medium text-center">
                  ✓ Approved — awaiting L4 dispatch
                </div>
              )}
              {o.status === 'DISPATCHED' && (
                <button
                  className="w-full rounded-lg bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700 transition shadow-sm flex items-center justify-center gap-2"
                  onClick={() => setAuthTarget(o)}
                >
                  ✅ Authorize Sale
                </button>
              )}
              {o.status === 'INVOICED' && (
                <button
                  className="w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2"
                  onClick={() => closeOrder.mutate(o._id)}
                  disabled={closeOrder.isPending}
                >
                  🔒 Close Order
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block card overflow-x-auto">
        <table className="table-clean w-full min-w-[1100px]">
          <thead>
            <tr>
              <th className="w-32">Order</th>
              <th>Client / Site</th>
              <th>Details</th>
              <th>Rate</th>
              <th>Delivery</th>
              <th>Sales Person</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="8" className="p-8 text-center text-sm text-slate-400">
                  Loading orders…
                </td>
              </tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan="8" className="p-12 text-center text-sm text-slate-400">
                  <div className="text-3xl mb-2">📋</div>
                  No orders found in this category.
                </td>
              </tr>
            )}
            {data.map((o) => (
              <tr key={o._id} className="group hover:bg-slate-50/50">
                <td className="font-bold text-slate-900">{o.orderNumber}</td>
                <td>
                  <div className="font-semibold text-slate-800">{o.client?.clientName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{o.site?.siteName || 'No site specified'}</div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                      {o.grade}
                    </span>
                    <span className="font-medium text-slate-700">{o.quantity} m³</span>
                  </div>
                </td>
                <td>
                  <div className="font-bold text-slate-800">{fmtMoney(o.negotiatedRate)}</div>
                </td>
                <td>
                  <div className="text-slate-600 text-xs font-semibold">{fmtDate(o.deliveryDate)}</div>
                </td>
                <td className="text-slate-500 text-sm">{o.createdByLevel3?.name}</td>
                <td>
                  <div className="flex flex-col">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[o.status] || 'bg-slate-100 text-slate-600'}`}>
                      {FILTERS.find((f) => f.key === o.status)?.label || o.status}
                    </span>
                    {o.status === 'REJECTED' && o.rejectionReason && (
                      <span className="mt-1 text-[10px] text-red-400 max-w-[120px] truncate" title={o.rejectionReason}>
                        {o.rejectionReason}
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {o.status === 'PENDING' && (
                      <>
                        <button
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700 transition-all shadow-sm active:scale-95"
                          onClick={() => setPaymentHistoryTarget(o)}
                          disabled={approve.isPending}
                        >
                          Approve
                        </button>
                        <button
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-all active:scale-95"
                          onClick={() => setRejectTarget(o)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {o.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-600">
                        ✓ Awaiting L4 Dispatch
                      </span>
                    )}
                    {o.status === 'DISPATCHED' && (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 transition-all shadow-sm active:scale-95"
                        onClick={() => setAuthTarget(o)}
                      >
                        ✅ Authorize Sale
                      </button>
                    )}
                    {o.status === 'INVOICED' && (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                        onClick={() => closeOrder.mutate(o._id)}
                        disabled={closeOrder.isPending}
                      >
                        🔒 Close Order
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment History Modal (shown before Approve) */}
      {paymentHistoryTarget && (
        <ClientPaymentHistoryModal
          order={paymentHistoryTarget}
          onClose={() => setPaymentHistoryTarget(null)}
          onConfirmApprove={() => approve.mutate(paymentHistoryTarget._id)}
          isApproving={approve.isPending}
        />
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          order={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => reject.mutate({ id: rejectTarget._id, reason })}
          isPending={reject.isPending}
        />
      )}

      {/* Authorize Sale Modal */}
      {authTarget && (
        <AuthorizeSaleModal
          order={authTarget}
          onClose={() => setAuthTarget(null)}
          onConfirm={(dispatchIds) => authorizeSale.mutate({ id: authTarget._id, dispatchIds })}
          isPending={authorizeSale.isPending}
        />
      )}
    </>
  );
}
