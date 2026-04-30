import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesOrders, dispatches } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney, fmtDateTime } from '../../utils/format.js';

/* ─── Dispatch History Sub-panel ─────────────────────────────────────────── */
function SoDispatchHistory({ soId }) {
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ['dispatches', 'so', soId],
    queryFn: () => dispatches.list({ salesOrder: soId }),
    enabled: open,
  });

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition"
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        {open ? '▲ Hide Dispatches' : '▼ View My Dispatches'}
      </button>

      {open && (
        <div className="mt-2">
          {isLoading && (
            <p className="text-xs text-slate-400 italic">Loading dispatches…</p>
          )}
          {!isLoading && data.length === 0 && (
            <p className="text-xs text-slate-400 italic">No dispatches submitted yet for this Sales Order.</p>
          )}
          {data.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-500">
                    <th className="px-3 py-2">Dispatch #</th>
                    <th className="px-3 py-2">Vehicle</th>
                    <th className="px-3 py-2">Driver</th>
                    <th className="px-3 py-2">Qty (m³)</th>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => (
                    <tr key={d._id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-3 py-2 font-medium text-slate-700">{d.dispatchNumber}</td>
                      <td className="px-3 py-2 font-mono text-slate-600 uppercase">{d.vehicleNumber}</td>
                      <td className="px-3 py-2 text-slate-500">{d.driverName || '—'}</td>
                      <td className="px-3 py-2 font-semibold text-slate-700">{d.quantity}</td>
                      <td className="px-3 py-2 text-slate-400">{fmtDateTime(d.dispatchDateTime)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          d.status === 'dispatched'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : d.status === 'sale_authorized'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {d.status === 'dispatched'
                            ? '⏳ Awaiting Auth'
                            : d.status === 'sale_authorized'
                            ? '✅ Sale Auth.'
                            : '🧾 Invoiced'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Dispatch Form Modal ────────────────────────────────────────────────── */
function DispatchFormModal({ so, onClose, isPending, onSubmit, error }) {
  const [form, setForm] = useState({
    quantity: so.remainingQuantity ?? so.totalQuantity,
    vehicleNumber: '',
    driverName: '',
    mixDetails: '',
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const isValid = form.quantity && Number(form.quantity) > 0 && form.vehicleNumber.trim() && form.driverName.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚛</span>
            <div>
              <h2 className="text-lg font-semibold text-white">Fill Dispatch Form</h2>
              <p className="text-xs text-indigo-200">
                {so.soNumber} · {so.client?.clientName}
              </p>
            </div>
          </div>
        </div>

        {/* Pre-filled info (read-only) */}
        <div className="px-6 pt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Auto-filled from Sales Order
          </p>
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-xs text-slate-400 mb-0.5">Concrete Grade</p>
              <p className="font-semibold text-slate-800 text-sm">{so.grade?.gradeCode ?? '—'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-xs text-slate-400 mb-0.5">Total Qty</p>
              <p className="font-semibold text-slate-800 text-sm">{so.totalQuantity} m³</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
              <p className="text-xs text-emerald-500 mb-0.5">Remaining</p>
              <p className="font-semibold text-emerald-700 text-sm">{so.remainingQuantity} m³</p>
            </div>
          </div>

          {/* Editable fields */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Dispatch Details
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label mb-1 block">
                Quantity Dispatched (m³) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={so.remainingQuantity}
                className="input w-full"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
              />
            </div>
            <div>
              <label className="label mb-1 block">
                Vehicle Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input w-full uppercase"
                placeholder="MH12AB1234"
                value={form.vehicleNumber}
                onChange={(e) => set('vehicleNumber', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="label mb-1 block">
                Driver Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. Ramesh Kumar"
                value={form.driverName}
                onChange={(e) => set('driverName', e.target.value)}
              />
            </div>
            <div>
              <label className="label mb-1 block">Mix Details / Grade Spec</label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. w/c ratio 0.45, slump 120mm"
                value={form.mixDetails}
                onChange={(e) => set('mixDetails', e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-5 bg-slate-50 border-t border-slate-100">
          <button
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 text-sm font-bold text-white hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-60 disabled:shadow-none active:scale-95 flex items-center gap-2"
            disabled={isPending || !isValid}
            onClick={() => onSubmit(so._id, {
              quantity: Number(form.quantity),
              vehicleNumber: form.vehicleNumber,
              driverName: form.driverName || undefined,
              mixDetails: form.mixDetails || undefined,
            })}
          >
            {isPending ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Submitting…
              </>
            ) : (
              '🚛 Submit Dispatch'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function L4SalesOrders() {
  const qc = useQueryClient();
  const [dispatchTarget, setDispatchTarget] = useState(null);
  const [dispatchError, setDispatchError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['sales-orders', 'open'],
    queryFn: () => salesOrders.list({ status: 'open' }),
  });

  const submitDispatch = useMutation({
    mutationFn: ({ soId, data: d }) => dispatches.createFromSalesOrder(soId, d),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      setDispatchTarget(null);
      setDispatchError('');
      setSuccessMsg(`Dispatch ${result?.dispatchNumber || ''} submitted successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err) => {
      setDispatchError(err?.response?.data?.error || 'Failed to submit dispatch');
    },
  });

  return (
    <>
      <PageHeader
        title="Sales Orders"
        subtitle="View open sales orders and fill dispatch forms to track concrete delivery."
      />

      {/* Success toast */}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700">
          <span>✅</span>
          <span>{successMsg}</span>
        </div>
      )}

      {isLoading && (
        <div className="card card-body text-center text-sm text-slate-400">Loading…</div>
      )}

      {!isLoading && data.length === 0 && (
        <div className="card card-body text-center py-12">
          <div className="text-3xl mb-3">📋</div>
          <div className="text-slate-500 font-medium">No open Sales Orders</div>
          <div className="text-slate-400 text-sm mt-1">
            Sales Orders will appear here once Level 2 creates them.
          </div>
        </div>
      )}

      <div className="space-y-4">
        {data.map((so) => {
          const pct = so.totalQuantity
            ? Math.round(((so.dispatchedQuantity ?? 0) / so.totalQuantity) * 100)
            : 0;

          return (
            <div key={so._id} className="card card-body transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden bg-white/80 backdrop-blur-sm border border-slate-100/60">
              {/* Subtle top gradient accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-400 to-emerald-400 opacity-80" />
              
              {/* Top row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                <div className="min-w-0 flex-1">
                  {/* SO number + status */}
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-lg font-bold text-slate-800 tracking-tight">{so.soNumber}</span>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200 shadow-sm">
                      ● Open
                    </span>
                    {so.numberOfVehicles && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50/80 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/50 backdrop-blur-sm">
                        🚛 {so.numberOfVehicles} vehicles
                      </span>
                    )}
                    {so.sourceOrder?.orderNumber && (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border backdrop-blur-sm ${
                        so.sourceOrder.status === 'SALE_AUTHORIZED' 
                        ? 'bg-violet-50/80 text-violet-700 border-violet-200/50' 
                        : 'bg-slate-50/80 text-slate-500 border-slate-200/50'
                      }`}>
                        Order: {so.sourceOrder.orderNumber} 
                        {so.sourceOrder.status === 'SALE_AUTHORIZED' && ' (Sale Auth.)'}
                      </span>
                    )}
                  </div>

                  {/* Client / Grade / Rate */}
                  <div className="text-sm text-slate-600 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{so.client?.clientName}</span>
                    {so.site?.siteName && (
                      <span className="text-slate-500 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        {so.site.siteName}
                      </span>
                    )}
                    {so.grade?.gradeCode && (
                      <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                        {so.grade.gradeCode}
                      </span>
                    )}
                    <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/50">
                      {fmtMoney(so.rate)}/m³
                    </span>
                  </div>

                  {/* Created at */}
                  <div className="mt-2.5 text-xs font-medium text-slate-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    Created {fmtDateTime(so.createdAt)}
                  </div>
                </div>

                {/* Action button */}
                <button
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-bold text-white hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  onClick={() => { setDispatchError(''); setDispatchTarget(so); }}
                  disabled={so.remainingQuantity <= 0}
                  title={so.remainingQuantity <= 0 ? 'All quantity already dispatched' : 'Fill dispatch form'}
                >
                  <span className="text-lg">🚛</span> Fill Dispatch
                </button>
              </div>

              {/* Quantity stats cards */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 p-3 sm:p-4 text-center shadow-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 relative z-10">Total Ordered</p>
                  <p className="text-lg sm:text-2xl font-black text-slate-800 relative z-10">
                    {so.totalQuantity} <span className="text-xs sm:text-sm font-bold text-slate-400">m³</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/60 p-3 sm:p-4 text-center shadow-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1 relative z-10">Dispatched</p>
                  <p className="text-lg sm:text-2xl font-black text-emerald-700 relative z-10">
                    {so.dispatchedQuantity ?? 0} <span className="text-xs sm:text-sm font-bold text-emerald-500/80">m³</span>
                  </p>
                </div>
                <div className={`rounded-2xl border p-3 sm:p-4 text-center shadow-sm relative overflow-hidden group ${
                  (so.remainingQuantity ?? 0) <= 0
                    ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200/60'
                    : 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/60'
                }`}>
                  <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 relative z-10 ${(so.remainingQuantity ?? 0) <= 0 ? 'text-red-500' : 'text-amber-600'}`}>
                    Remaining
                  </p>
                  <p className={`text-lg sm:text-2xl font-black relative z-10 ${(so.remainingQuantity ?? 0) <= 0 ? 'text-red-600' : 'text-amber-700'}`}>
                    {so.remainingQuantity ?? 0} <span className="text-xs sm:text-sm font-bold opacity-70">m³</span>
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-5 relative">
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fulfillment Progress</span>
                  <span className="text-xs font-bold text-slate-500">{pct}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                      pct >= 100 ? 'bg-gradient-to-r from-red-400 to-red-500' : pct > 60 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  >
                    {/* Animated shine effect on progress bar */}
                    <div className="absolute top-0 left-0 bottom-0 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
              </div>

              {/* Dispatch history */}
              <div className="mt-2">
                <SoDispatchHistory soId={so._id} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dispatch Form Modal */}
      {dispatchTarget && (
        <DispatchFormModal
          so={dispatchTarget}
          onClose={() => { setDispatchTarget(null); setDispatchError(''); }}
          isPending={submitDispatch.isPending}
          onSubmit={(soId, d) => submitDispatch.mutate({ soId, data: d })}
          error={dispatchError}
        />
      )}
    </>
  );
}
