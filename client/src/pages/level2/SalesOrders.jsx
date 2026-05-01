import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { salesOrders, dispatches } from '../../api/endpoints.js';
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

/* ─── Close Sale Button ─────────────────────────────────────────────── */
function SoCloseButton({ so, onRequestClose }) {
  const { data: soDispatches = [], isLoading } = useQuery({
    queryKey: ['dispatches', 'so', so._id],
    queryFn: () => dispatches.list({ salesOrder: so._id }),
    enabled: so.status === 'open',
  });

  if (so.status !== 'open') return null;
  if (isLoading) return <span className="text-xs text-slate-400">Checking...</span>;

  const total = soDispatches.length;
  const invoiced = soDispatches.filter(d => d.status === 'invoiced').length;
  const allInvoiced = total > 0 && invoiced === total;
  const hasDispatches = total > 0;

  if (!hasDispatches) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700 font-medium">
        ⚠ No dispatches yet
      </div>
    );
  }

  if (!allInvoiced) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700 font-medium">
          ⏳ {invoiced}/{total} invoiced
        </div>
        <p className="text-[10px] text-slate-400">Level 4 must invoice all dispatches first</p>
      </div>
    );
  }

  return (
    <button
      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition shadow-sm"
      onClick={() => onRequestClose(so)}
    >
      ✅ Close Sale
    </button>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function L2SalesOrders() {
  const location = useLocation();
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState(location.state?.filter || 'ALL');
  const [expandedSo, setExpandedSo] = useState(null);
  const [closeTarget, setCloseTarget] = useState(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['sales-orders', activeFilter],
    queryFn: () => salesOrders.list(activeFilter === 'ALL' ? {} : { status: activeFilter }),
  });

  const closeSale = useMutation({
    mutationFn: (id) => salesOrders.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      setCloseTarget(null);
    },
  });

  const { data: allData = [] } = useQuery({
    queryKey: ['sales-orders', 'all-counts'],
    queryFn: () => salesOrders.list(),
  });

  const openCount = allData.filter((s) => s.status === 'open').length;
  const closedCount = allData.filter((s) => s.status === 'closed').length;

  return (
    <>
      <PageHeader
        title="Sales Orders"
        subtitle="Monitor dispatches and close sales when delivery is complete."
      />

      {/* Interactive KPI Filters */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          className={`rounded-xl bg-white p-5 cursor-pointer border-2 transition-all ${
            activeFilter === 'open' ? 'border-emerald-500 shadow-md' : 'border-slate-100 hover:border-emerald-300 shadow-sm'
          }`}
          onClick={() => setActiveFilter('open')}
        >
          <div className="flex justify-between items-center">
            <p className={`text-xs font-bold uppercase tracking-wider ${activeFilter === 'open' ? 'text-emerald-600' : 'text-slate-500'}`}>Open Orders</p>
            {activeFilter === 'open' && <span className="text-emerald-500">●</span>}
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-800">{openCount}</p>
        </div>

        <div
          className={`rounded-xl bg-white p-5 cursor-pointer border-2 transition-all ${
            activeFilter === 'closed' ? 'border-slate-500 shadow-md' : 'border-slate-100 hover:border-slate-300 shadow-sm'
          }`}
          onClick={() => setActiveFilter('closed')}
        >
          <div className="flex justify-between items-center">
            <p className={`text-xs font-bold uppercase tracking-wider ${activeFilter === 'closed' ? 'text-slate-700' : 'text-slate-500'}`}>Closed Orders</p>
            {activeFilter === 'closed' && <span className="text-slate-500">●</span>}
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-800">{closedCount}</p>
        </div>

        <div
          className={`rounded-xl bg-white p-5 cursor-pointer border-2 transition-all ${
            activeFilter === 'ALL' ? 'border-brand-500 shadow-md' : 'border-slate-100 hover:border-brand-300 shadow-sm'
          }`}
          onClick={() => setActiveFilter('ALL')}
        >
          <div className="flex justify-between items-center">
            <p className={`text-xs font-bold uppercase tracking-wider ${activeFilter === 'ALL' ? 'text-brand-600' : 'text-slate-500'}`}>Total Orders</p>
            {activeFilter === 'ALL' && <span className="text-brand-500">●</span>}
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-800">{allData.length}</p>
        </div>
      </div>

      {/* SO cards */}
      <div className="space-y-3">
        {data.map((so) => {
          const pct = so.totalQuantity
            ? Math.round(((so.dispatchedQuantity ?? 0) / so.totalQuantity) * 100)
            : 0;
          const isExpanded = expandedSo === so._id;

          return (
            <div key={so._id} className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition duration-200">
              <div className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info Section */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-slate-800">{so.soNumber}</span>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wide ${
                        so.status === 'open'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {so.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-slate-700">{so.client?.clientName}</span>
                      <span className="text-slate-300">|</span>
                      <span>{so.site?.siteName || 'No Site'}</span>
                      <span className="text-slate-300">|</span>
                      <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{so.grade?.gradeCode || 'N/A'}</span>
                      <span className="text-slate-300">|</span>
                      <span>{fmtMoney(so.rate)}/m³</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-400">{fmtDateTime(so.createdAt)}</span>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="flex-1 lg:max-w-md w-full">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-500">Dispatched: <span className="text-slate-800">{so.dispatchedQuantity ?? 0}</span></span>
                      <span className="font-medium text-slate-500">Remaining: <span className={(so.remainingQuantity ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}>{so.remainingQuantity ?? 0}</span></span>
                      <span className="font-medium text-slate-500">Total: <span className="text-slate-800">{so.totalQuantity} m³</span></span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden relative">
                      <div
                        className={`h-full transition-all duration-500 ${
                          pct >= 100 ? 'bg-emerald-500' : pct > 60 ? 'bg-brand-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="flex items-center gap-3 shrink-0 mt-4 lg:mt-0">
                    <button
                      className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition focus:ring-2 focus:ring-slate-200"
                      onClick={() => setExpandedSo(isExpanded ? null : so._id)}
                    >
                      {isExpanded ? 'Hide Details' : 'View Dispatches'}
                    </button>
                    <SoCloseButton so={so} onRequestClose={setCloseTarget} />
                  </div>
                </div>
              </div>

              {/* Expanded dispatches */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 p-5">
                  <SoDispatchPanel soId={so._id} />
                </div>
              )}
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
