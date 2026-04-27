import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { salesOrders, dispatches, clients, sites, grades } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney, fmtDateTime } from '../../utils/format.js';

/* ─── Close Sale Confirmation Modal ─────────────────────────────────────── */
function CloseSaleModal({ so, onClose, onConfirm, isPending }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <h2 className="text-lg font-semibold text-slate-800">Close Sale</h2>
        </div>
        <p className="mt-2 mb-4 text-sm text-slate-500">
          You are closing <strong>{so.soNumber}</strong> for{' '}
          <strong>{so.client?.clientName}</strong>.
        </p>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mb-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-400">Grade</p>
            <p className="font-semibold text-slate-800">{so.grade?.gradeCode ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Qty</p>
            <p className="font-semibold text-slate-800">{so.totalQuantity} m³</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Dispatched</p>
            <p className="font-semibold text-emerald-700">{so.dispatchedQuantity ?? 0} m³</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Remaining</p>
            <p className={`font-semibold ${(so.remainingQuantity ?? 0) > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {so.remainingQuantity ?? 0} m³
            </p>
          </div>
        </div>
        {(so.remainingQuantity ?? 0) > 0 && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
            ⚠ There is still <strong>{so.remainingQuantity} m³</strong> remaining. Closing this SO will mark it as complete regardless.
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-60"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Closing…' : '✅ Confirm Close Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Dispatches sub-panel ───────────────────────────────────────────────── */
function SoDispatchPanel({ soId }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['dispatches', 'so', soId],
    queryFn: () => dispatches.list({ salesOrder: soId }),
  });

  if (isLoading) return <p className="text-xs text-slate-400 mt-2">Loading dispatches…</p>;
  if (data.length === 0)
    return <p className="text-xs text-slate-400 mt-2 italic">No dispatches yet for this SO.</p>;

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500">
            <th className="px-3 py-2">Dispatch #</th>
            <th className="px-3 py-2">Vehicle</th>
            <th className="px-3 py-2">Driver</th>
            <th className="px-3 py-2">Qty (m³)</th>
            <th className="px-3 py-2">Mix Details</th>
            <th className="px-3 py-2">L4 By</th>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d._id} className="border-t border-slate-100 hover:bg-slate-50 transition">
              <td className="px-3 py-2 font-medium text-slate-700">{d.dispatchNumber}</td>
              <td className="px-3 py-2 font-mono text-slate-600">{d.vehicleNumber}</td>
              <td className="px-3 py-2 text-slate-500">{d.driverName || '—'}</td>
              <td className="px-3 py-2 text-slate-700 font-semibold">{d.quantity}</td>
              <td className="px-3 py-2 text-slate-400 max-w-[160px] truncate" title={d.mixDetails}>
                {d.mixDetails || '—'}
              </td>
              <td className="px-3 py-2 text-slate-500">{d.filledByLevel4?.name}</td>
              <td className="px-3 py-2 text-slate-400">{fmtDateTime(d.dispatchDateTime)}</td>
              <td className="px-3 py-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  d.status === 'dispatched' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  d.status === 'sale_authorized' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {d.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function L2SalesOrders() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [expandedSo, setExpandedSo] = useState(null);
  const [closeTarget, setCloseTarget] = useState(null);

  const { data = [] } = useQuery({
    queryKey: ['sales-orders'],
    queryFn: () => salesOrders.list(),
  });

  const { data: clientsList = [] } = useQuery({ queryKey: ['clients'], queryFn: () => clients.list() });
  const { data: gradesList = [] } = useQuery({ queryKey: ['grades'], queryFn: () => grades.list() });
  const { register, handleSubmit, watch, reset } = useForm();
  const selectedClient = watch('client');
  const { data: sitesList = [] } = useQuery({
    queryKey: ['sites', selectedClient],
    queryFn: () => sites.list({ client: selectedClient }),
    enabled: Boolean(selectedClient),
  });

  const create = useMutation({
    mutationFn: (d) => salesOrders.create({
      ...d,
      rate: Number(d.rate),
      totalQuantity: Number(d.totalQuantity),
      site: d.site || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      setShowNew(false);
      reset();
    },
  });

  const closeSale = useMutation({
    mutationFn: (id) => salesOrders.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      setCloseTarget(null);
    },
  });

  const openCount = data.filter((s) => s.status === 'open').length;
  const closedCount = data.filter((s) => s.status === 'closed').length;

  return (
    <>
      <PageHeader
        title="Sales Orders"
        subtitle="Monitor dispatches and close sales when delivery is complete."
        actions={
          <button className="btn-primary" onClick={() => setShowNew((v) => !v)}>
            {showNew ? 'Cancel' : 'New SO'}
          </button>
        }
      />

      {/* Stats bar */}
      <div className="mb-5 flex gap-3">
        <div className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-400">Open</p>
          <p className="text-2xl font-bold text-emerald-600">{openCount}</p>
        </div>
        <div className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-400">Closed</p>
          <p className="text-2xl font-bold text-slate-500">{closedCount}</p>
        </div>
        <div className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-400">Total</p>
          <p className="text-2xl font-bold text-slate-700">{data.length}</p>
        </div>
      </div>

      {/* New SO form */}
      {showNew && (
        <form
          className="card card-body mb-5 grid grid-cols-1 gap-3 md:grid-cols-6"
          onSubmit={handleSubmit((d) => create.mutate(d))}
        >
          <div className="md:col-span-2">
            <label className="label">Client *</label>
            <select className="select" required {...register('client')}>
              <option value="">Select…</option>
              {clientsList.map((c) => <option key={c._id} value={c._id}>{c.clientName}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Site</label>
            <select className="select" {...register('site')}>
              <option value="">—</option>
              {sitesList.map((s) => <option key={s._id} value={s._id}>{s.siteName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Grade *</label>
            <select className="select" required {...register('grade')}>
              <option value="">—</option>
              {gradesList.map((g) => <option key={g._id} value={g._id}>{g.gradeCode}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Rate (₹) *</label>
            <input type="number" step="0.01" className="input" required {...register('rate')} />
          </div>
          <div>
            <label className="label">Total Qty (m³) *</label>
            <input type="number" step="0.01" className="input" required {...register('totalQuantity')} />
          </div>
          <div className="md:col-span-5">
            <label className="label">Notes</label>
            <input className="input" {...register('notes')} />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" disabled={create.isPending}>Create</button>
          </div>
        </form>
      )}

      {/* SO cards */}
      <div className="space-y-3">
        {data.map((so) => {
          const pct = so.totalQuantity
            ? Math.round(((so.dispatchedQuantity ?? 0) / so.totalQuantity) * 100)
            : 0;
          const isExpanded = expandedSo === so._id;

          return (
            <div key={so._id} className="card card-body">
              {/* Top row */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800">{so.soNumber}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                      so.status === 'open'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {so.status === 'open' ? '● Open' : '✓ Closed'}
                    </span>
                    {so.numberOfVehicles && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
                        🚛 {so.numberOfVehicles} vehicles
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600">
                    <span className="font-medium text-slate-700">{so.client?.clientName}</span>
                    {so.site?.siteName && <span className="text-slate-400"> · {so.site.siteName}</span>}
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
                  <div className="mt-1 text-xs text-slate-400">{fmtDateTime(so.createdAt)}</div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                    onClick={() => setExpandedSo(isExpanded ? null : so._id)}
                  >
                    {isExpanded ? '▲ Hide Dispatches' : '▼ View Dispatches'}
                  </button>
                  {so.status === 'open' && (
                    <button
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition"
                      onClick={() => setCloseTarget(so)}
                    >
                      ✅ Close Sale
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Dispatched: <strong>{so.dispatchedQuantity ?? 0} m³</strong></span>
                  <span>Remaining: <strong className={(so.remainingQuantity ?? 0) > 0 ? 'text-amber-600' : 'text-slate-500'}>{so.remainingQuantity ?? 0} m³</strong></span>
                  <span>Total: <strong>{so.totalQuantity} m³</strong></span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 100 ? 'bg-emerald-500' : pct > 60 ? 'bg-amber-400' : 'bg-brand-500'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="mt-0.5 text-right text-xs text-slate-400">{pct}% dispatched</div>
              </div>

              {/* Expanded dispatches */}
              {isExpanded && <SoDispatchPanel soId={so._id} />}
            </div>
          );
        })}

        {data.length === 0 && (
          <div className="card card-body text-center py-10 text-slate-400">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm">No Sales Orders yet. Create one from an approved order.</p>
          </div>
        )}
      </div>

      {/* Close Sale Modal */}
      {closeTarget && (
        <CloseSaleModal
          so={closeTarget}
          onClose={() => setCloseTarget(null)}
          onConfirm={() => closeSale.mutate(closeTarget._id)}
          isPending={closeSale.isPending}
        />
      )}
    </>
  );
}
