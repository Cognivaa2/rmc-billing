import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dispatches } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime, fmtMoney } from '../../utils/format.js';

const FILTER_TABS = [
  { key: 'dispatched',      label: 'Awaiting Auth',    dot: 'bg-amber-400' },
  { key: 'sale_authorized', label: 'Sale Authorized',  dot: 'bg-violet-400' },
  { key: 'invoiced',        label: 'Invoiced',         dot: 'bg-emerald-400' },
  { key: 'all',             label: 'All',              dot: 'bg-slate-300' },
];

const STATUS_STYLES = {
  dispatched:      { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   label: '⏳ Awaiting Authorization' },
  sale_authorized: { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  label: '✅ Sale Authorized' },
  invoiced:        { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: '🧾 Invoiced' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: status };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}

export default function L2Dispatches() {
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('dispatched');
  const [authSuccess, setAuthSuccess] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['dispatches', activeFilter],
    queryFn: () => dispatches.list(activeFilter === 'all' ? {} : { status: activeFilter }),
  });

  const authorize = useMutation({
    mutationFn: (dispatchId) => dispatches.authorize(dispatchId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      setAuthSuccess(`Dispatch ${result?.dispatchNumber || ''} sale authorized successfully!`);
      setTimeout(() => setAuthSuccess(''), 4000);
    },
  });

  return (
    <>
      <PageHeader
        title="Dispatches"
        subtitle="Review dispatch details and authorize sales before invoice generation."
      />

      {/* Success toast */}
      {authSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700">
          ✅ {authSuccess}
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTER_TABS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeFilter === f.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${f.dot}`} />
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="card card-body text-center text-sm text-slate-400">Loading dispatches…</div>
      )}

      {/* Empty state */}
      {!isLoading && data.length === 0 && (
        <div className="card card-body py-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm font-medium text-slate-500">No dispatches here</p>
          <p className="text-xs text-slate-400 mt-1">
            {activeFilter === 'dispatched'
              ? 'No dispatches awaiting authorization.'
              : `No ${FILTER_TABS.find(f => f.key === activeFilter)?.label} dispatches.`}
          </p>
        </div>
      )}

      {/* Dispatch cards */}
      <div className="space-y-4">
        {data.map((d) => (
          <div key={d._id} className="card card-body">
            {/* Top row: dispatch # + status + authorize button */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-base font-bold text-slate-800">{d.dispatchNumber}</span>
                  <StatusBadge status={d.status} />
                  {/* SO or Order reference */}
                  {d.salesOrder?.soNumber && (
                    <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      SO: {d.salesOrder.soNumber}
                    </span>
                  )}
                  {d.order?.orderNumber && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {d.order.orderNumber}
                    </span>
                  )}
                </div>

                {/* Client / Grade */}
                <div className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{d.client?.clientName}</span>
                  {d.grade?.gradeCode && (
                    <span className="ml-2 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                      {d.grade.gradeCode}
                    </span>
                  )}
                  <span className="ml-2 text-slate-500">{d.quantity} m³</span>
                  {d.order?.negotiatedRate && (
                    <span className="ml-2 text-slate-500">{fmtMoney(d.order.negotiatedRate)}/m³</span>
                  )}
                </div>

                <div className="mt-0.5 text-xs text-slate-400">
                  {fmtDateTime(d.dispatchDateTime)}
                  {d.filledByLevel4?.name && (
                    <span className="ml-2">· Filled by <span className="font-medium text-slate-500">{d.filledByLevel4.name}</span></span>
                  )}
                </div>
              </div>

              {/* Authorize Sale button */}
              {d.status === 'dispatched' && (
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition disabled:opacity-60"
                  onClick={() => authorize.mutate(d._id)}
                  disabled={authorize.isPending}
                >
                  {authorize.isPending ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Authorizing…
                    </>
                  ) : (
                    '✅ Authorize Sale'
                  )}
                </button>
              )}

              {/* Already authorized badge */}
              {d.status === 'sale_authorized' && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 border border-violet-200 px-4 py-2 text-sm font-medium text-violet-700">
                  ✅ Sale Authorized
                </span>
              )}
            </div>

            {/* ── Dispatch Detail Cards ─────────────────────────────────── */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {/* Vehicle Number */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">🚛 Vehicle No.</p>
                <p className="font-bold text-slate-800 font-mono tracking-wide uppercase text-sm">
                  {d.vehicleNumber || '—'}
                </p>
              </div>

              {/* Driver Name */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">👤 Driver Name</p>
                <p className="font-semibold text-slate-800 text-sm">
                  {d.driverName || '—'}
                </p>
              </div>

              {/* Quantity */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
                <p className="text-xs text-blue-400 mb-0.5">📦 Quantity</p>
                <p className="font-bold text-blue-700 text-sm">{d.quantity} m³</p>
              </div>

              {/* Site */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                <p className="text-xs text-slate-400 mb-0.5">📍 Site</p>
                <p className="font-semibold text-slate-800 text-sm truncate">
                  {d.site?.siteName || '—'}
                </p>
              </div>
            </div>

            {/* Mix details (if any) */}
            {d.mixDetails && (
              <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
                🧪 Mix: {d.mixDetails}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
