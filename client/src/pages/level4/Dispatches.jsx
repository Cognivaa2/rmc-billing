import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dispatches } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime } from '../../utils/format.js';

const STATUS_STEPS = ['dispatched', 'sale_authorized', 'invoiced'];

function StatusPipeline({ current }) {
  const labels = {
    dispatched: 'Dispatched',
    sale_authorized: 'Sale Auth.',
    invoiced: 'Invoiced',
  };
  const idx = STATUS_STEPS.indexOf(current);
  return (
    <div className="flex items-center gap-1">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className={`h-2 w-2 rounded-full ${
              i <= idx ? 'bg-brand-600' : 'bg-slate-200'
            }`}
          />
          <span
            className={`text-xs ${
              i === idx
                ? 'font-semibold text-brand-700'
                : i < idx
                ? 'text-slate-400'
                : 'text-slate-300'
            }`}
          >
            {labels[s]}
          </span>
          {i < STATUS_STEPS.length - 1 && (
            <div className={`mx-1 h-px w-4 ${i < idx ? 'bg-brand-400' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    dispatched: 'badge-yellow',
    sale_authorized: 'badge-blue',
    invoiced: 'badge-green',
  };
  const labels = {
    dispatched: 'Dispatched',
    sale_authorized: 'Sale Auth.',
    invoiced: 'Invoiced',
  };
  return <span className={cfg[status] || 'badge-gray'}>{labels[status] || status}</span>;
}

export default function L4Dispatches() {
  const [statusFilter, setStatusFilter] = useState('all');

  const { data = [], isLoading } = useQuery({
    queryKey: ['dispatches', statusFilter],
    queryFn: () =>
      statusFilter === 'all' ? dispatches.list() : dispatches.list({ status: statusFilter }),
  });

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'sale_authorized', label: 'Sale Authorized' },
    { key: 'invoiced', label: 'Invoiced' },
  ];

  return (
    <>
      <PageHeader
        title="My Dispatches"
        subtitle="Track every dispatch through sale authorisation and invoice generation."
      />

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === f.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Action hint banner */}
      {data.filter((d) => d.status === 'sale_authorized').length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-brand-50 border border-brand-100 p-3 text-sm text-brand-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
          </svg>
          <span>
            <strong>{data.filter((d) => d.status === 'sale_authorized').length}</strong> dispatch(es) are sale-authorized and ready to invoice.{' '}
            <Link to="/l4/invoices" className="font-semibold underline">
              Go to Invoices →
            </Link>
          </span>
        </div>
      )}

      <div className="space-y-3">
        {isLoading && (
          <div className="card card-body text-center text-sm text-slate-400">Loading…</div>
        )}

        {data.map((d) => (
          <div key={d._id} className="card card-body">
            <div className="flex flex-wrap items-start justify-between gap-3">
              {/* Left: dispatch info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-slate-800">{d.dispatchNumber}</div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {d.client?.clientName}
                  {d.grade?.gradeCode && <> · <span className="font-medium text-slate-700">{d.grade.gradeCode}</span></>}
                  {' '}· {d.quantity} m³
                  {' '}· <span className="font-mono">{d.vehicleNumber}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Order: {d.order?.orderNumber || '—'} · {fmtDateTime(d.dispatchDateTime)}
                </div>
                <div className="mt-2">
                  <StatusPipeline current={d.status} />
                </div>
              </div>

              {/* Right: action buttons */}
              <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                {/* Always: Batchsheet */}
                <Link
                  to="/l4/batchsheets"
                  className="btn-secondary text-xs"
                >
                  Batchsheet
                </Link>

                {/* Sale authorized → can generate invoice */}
                {d.status === 'sale_authorized' && (
                  <Link
                    to="/l4/invoices"
                    className="btn-primary text-xs"
                  >
                    Generate Invoice →
                  </Link>
                )}

                {/* Dispatched → waiting for L2 auth */}
                {d.status === 'dispatched' && (
                  <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200">
                    Awaiting L2 Sale Auth
                  </div>
                )}

                {/* Invoiced → view invoice */}
                {d.status === 'invoiced' && (
                  <Link
                    to="/l4/invoices"
                    className="btn-secondary text-xs"
                  >
                    View Invoice
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}

        {!isLoading && data.length === 0 && (
          <div className="card card-body text-center text-slate-400">
            <div className="text-2xl mb-2">🚛</div>
            <div className="text-sm">No dispatches found for this filter.</div>
            <Link to="/l4/approved-orders" className="mt-3 inline-block btn-primary text-xs">
              Fill a Dispatch Form
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
