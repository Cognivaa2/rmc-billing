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
    <div className="border-t border-slate-100">
      <button
        className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-400 hover:text-brand-600 hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        {open ? 'Hide Recent Dispatches' : 'View My Dispatches'}
      </button>

      {open && (
        <div className="p-4 bg-slate-50/50">
          {isLoading ? (
            <p className="text-xs text-slate-400 italic text-center py-2">Loading dispatches…</p>
          ) : data.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-2">No dispatches submitted yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <th className="px-3 py-2 font-bold uppercase tracking-wider">Number</th>
                    <th className="px-3 py-2 font-bold uppercase tracking-wider">Vehicle</th>
                    <th className="px-3 py-2 font-bold uppercase tracking-wider text-right">Qty (m³)</th>
                    <th className="px-3 py-2 font-bold uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((d) => (
                    <tr key={d._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-medium text-slate-700">{d.dispatchNumber}</td>
                      <td className="px-3 py-2 text-slate-600 uppercase font-mono">{d.vehicleNumber}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800">{d.quantity}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          d.status === 'dispatched' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          d.status === 'sale_authorized' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {d.status === 'dispatched' ? 'Pending' : d.status === 'sale_authorized' ? 'Authorized' : 'Invoiced'}
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
    quantity: (so.remainingQuantity != null && !isNaN(so.remainingQuantity) && so.remainingQuantity > 0)
      ? so.remainingQuantity
      : '',
    vehicleNumber: '',
    driverName: '',
    mixDetails: '',
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const parsedQty = parseFloat(form.quantity);
  const isValid = !isNaN(parsedQty) && parsedQty > 0 && form.vehicleNumber.trim().length >= 3 && form.driverName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 px-6 py-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🚛</span> New Dispatch
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-medium">{so.soNumber} &bull; {so.client?.clientName}</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Grade</p>
              <p className="text-sm font-bold text-slate-800">{so.grade?.gradeCode || 'N/A'}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Remaining</p>
              <p className="text-sm font-bold text-emerald-700">{so.remainingQuantity} m³</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label text-[11px] font-bold text-slate-500 uppercase">Dispatch Quantity (m³)</label>
              <input
                type="number" step="0.01" min="0.01" max={so.remainingQuantity}
                className="input" value={form.quantity} onChange={(e) => set('quantity', e.target.value)}
              />
            </div>
            <div>
              <label className="label text-[11px] font-bold text-slate-500 uppercase">Vehicle Number</label>
              <input
                type="text" className="input uppercase" placeholder="MH12AB1234"
                value={form.vehicleNumber} onChange={(e) => set('vehicleNumber', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="label text-[11px] font-bold text-slate-500 uppercase">Driver Name</label>
              <input
                type="text" className="input" placeholder="e.g. Rahul Singh"
                value={form.driverName} onChange={(e) => set('driverName', e.target.value)}
              />
            </div>
            <div>
              <label className="label text-[11px] font-bold text-slate-500 uppercase">Additional Notes</label>
              <input
                type="text" className="input" placeholder="Mix or Site specific details"
                value={form.mixDetails} onChange={(e) => set('mixDetails', e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs text-rose-500 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-100">⚠ {error}</p>}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button className="btn-secondary flex-1 py-2.5" onClick={onClose} disabled={isPending}>Cancel</button>
          <button 
            className="btn-primary flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 font-bold" 
            disabled={isPending || !isValid}
            onClick={() => onSubmit(so._id, {
              quantity: parseFloat(form.quantity),
              vehicleNumber: form.vehicleNumber.trim(),
              driverName: form.driverName.trim() || undefined,
              mixDetails: form.mixDetails.trim() || undefined,
            })}
          >
            {isPending ? 'Submitting…' : 'Submit Dispatch'}
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
      const data = err?.response?.data;
      if (data?.details?.fieldErrors) {
        const firstField = Object.keys(data.details.fieldErrors)[0];
        const msg = data.details.fieldErrors[firstField][0];
        setDispatchError(`${firstField}: ${msg}`);
      } else if (data?.error) {
        setDispatchError(data.error);
      } else {
        setDispatchError('Failed to submit dispatch');
      }
    },
  });

  return (
    <>
      <PageHeader
        title="Open Orders"
        subtitle="View your active sales orders and record new concrete dispatches."
      />

      {successMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 animate-in fade-in slide-in-from-top-2">
          <span>✅</span> {successMsg}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Loading orders…</div>
      ) : data.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-4xl mb-4 opacity-20">📋</p>
          <h3 className="font-bold text-slate-800">No active Sales Orders</h3>
          <p className="text-sm text-slate-500 mt-1">Orders will appear here once authorized by Level 2.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((so) => {
            const pct = so.totalQuantity ? Math.round(((so.dispatchedQuantity ?? 0) / so.totalQuantity) * 100) : 0;
            const isFull = so.remainingQuantity <= 0;

            return (
              <div key={so._id} className="card overflow-hidden flex flex-col border-l-4 border-l-brand-600 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex flex-col md:flex-row md:items-center p-5 gap-6">
                  {/* Info Column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-lg font-black text-slate-900 tracking-tight">{so.soNumber}</span>
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-widest border border-emerald-200">Open</span>
                      {so.site?.siteName && (
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {so.site.siteName}
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold text-slate-700">{so.client?.clientName}</div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      <div className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold">{so.grade?.gradeCode}</div>
                      <div className="text-slate-400 font-medium">
                        Remaining: <span className={`font-bold ${isFull ? 'text-rose-500' : 'text-slate-800'}`}>{so.remainingQuantity} m³</span>
                      </div>
                      <div className="text-slate-400 font-medium">
                        Total: <span className="font-bold text-slate-800">{so.totalQuantity} m³</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Column */}
                  <div className="w-full md:w-56 shrink-0">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fulfillment</span>
                      <span className="text-xs font-bold text-slate-600">{pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${pct >= 100 ? 'bg-rose-500' : 'bg-brand-600'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Column */}
                  <div className="shrink-0 flex items-center md:pl-4 border-l-0 md:border-l border-slate-100">
                    <button
                      className="btn-primary w-full md:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20 font-bold tracking-tight disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                      onClick={() => { setDispatchError(''); setDispatchTarget(so); }}
                      disabled={isFull}
                    >
                      Fill Dispatch
                    </button>
                  </div>
                </div>

                {/* Sub-history Toggle */}
                <SoDispatchHistory soId={so._id} />
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
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
