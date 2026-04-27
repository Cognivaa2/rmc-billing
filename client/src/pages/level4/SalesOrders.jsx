import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesOrders, dispatches } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney, fmtDateTime } from '../../utils/format.js';

/* ─── Dispatch Form Modal ────────────────────────────────────────────────── */
function DispatchFormModal({ so, onClose, isPending, onSubmit, error }) {
  const [form, setForm] = useState({
    quantity: so.remainingQuantity ?? so.totalQuantity,
    vehicleNumber: '',
    driverName: '',
    mixDetails: '',
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

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
              <label className="label mb-1 block">Driver Name</label>
              <input
                type="text"
                className="input w-full"
                placeholder="Optional"
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
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition disabled:opacity-60 flex items-center gap-2"
            disabled={isPending || !form.quantity || !form.vehicleNumber}
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

  const { data = [], isLoading } = useQuery({
    queryKey: ['sales-orders', 'open'],
    queryFn: () => salesOrders.list({ status: 'open' }),
  });

  const submitDispatch = useMutation({
    mutationFn: ({ soId, data: d }) => dispatches.createFromSalesOrder(soId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      setDispatchTarget(null);
      setDispatchError('');
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
            ? Math.round((so.dispatchedQuantity / so.totalQuantity) * 100)
            : 0;

          return (
            <div key={so._id} className="card card-body">
              {/* Top row */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* SO number + status */}
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800">{so.soNumber}</span>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
                      Open
                    </span>
                    {so.numberOfVehicles && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
                        🚛 {so.numberOfVehicles} vehicles
                      </span>
                    )}
                  </div>

                  {/* Client / Grade / Rate */}
                  <div className="text-sm text-slate-600">
                    <span className="font-medium text-slate-700">{so.client?.clientName}</span>
                    {so.site?.siteName && (
                      <span className="text-slate-400"> · {so.site.siteName}</span>
                    )}
                    {so.grade?.gradeCode && (
                      <>
                        {' · '}
                        <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                          {so.grade.gradeCode}
                        </span>
                      </>
                    )}
                    <span className="text-slate-400"> · {fmtMoney(so.rate)}/m³</span>
                  </div>

                  {/* Created at */}
                  <div className="mt-1 text-xs text-slate-400">
                    Created {fmtDateTime(so.createdAt)}
                  </div>
                </div>

                {/* Action */}
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
                  onClick={() => { setDispatchError(''); setDispatchTarget(so); }}
                  disabled={so.remainingQuantity <= 0}
                  title={so.remainingQuantity <= 0 ? 'All quantity dispatched' : 'Fill dispatch form'}
                >
                  🚛 Fill Dispatch
                </button>
              </div>

              {/* Quantity progress bar */}
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Dispatched: <strong>{so.dispatchedQuantity ?? 0} m³</strong></span>
                  <span>Remaining: <strong className={so.remainingQuantity <= 0 ? 'text-red-500' : 'text-emerald-600'}>{so.remainingQuantity} m³</strong></span>
                  <span>Total: <strong>{so.totalQuantity} m³</strong></span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-400' : pct > 60 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="mt-0.5 text-right text-xs text-slate-400">{pct}% dispatched</div>
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
