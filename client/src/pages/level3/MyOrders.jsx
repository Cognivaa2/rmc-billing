import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { orders } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime, fmtMoney } from '../../utils/format.js';

const PIPELINE = [
  { key: 'PENDING', label: 'Pending', desc: 'Waiting for Manager approval', color: 'amber' },
  { key: 'APPROVED', label: 'Approved', desc: 'Manager approved', color: 'blue' },
  { key: 'DISPATCHED', label: 'Dispatched', desc: 'Plant filled dispatch form', color: 'indigo' },
  { key: 'SALE_AUTHORIZED', label: 'Sale Auth.', desc: 'Manager authorized sale', color: 'violet' },
  { key: 'INVOICED', label: 'Invoiced', desc: 'Invoice generated', color: 'emerald' },
];

function PipelineDot({ status }) {
  const idx = PIPELINE.findIndex((p) => p.key === status);
  return (
    <div className="flex items-center gap-0.5">
      {PIPELINE.map((p, i) => (
        <div key={p.key} className="flex items-center">
          <div
            title={p.label}
            className={`h-2.5 w-2.5 rounded-full border-2 transition-all ${
              i < idx
                ? 'border-emerald-400 bg-emerald-400'
                : i === idx
                ? 'border-brand-600 bg-brand-600 scale-125'
                : 'border-slate-200 bg-white'
            }`}
          />
          {i < PIPELINE.length - 1 && (
            <div className={`h-px w-5 mx-0.5 ${i < idx ? 'bg-emerald-300' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

const STATUS_BADGE = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border border-blue-200',
  DISPATCHED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  SALE_AUTHORIZED: 'bg-violet-50 text-violet-700 border border-violet-200',
  INVOICED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

export default function L3MyOrders() {
  const [status, setStatus] = useState('ALL');

  const { data = [], isLoading } = useQuery({
    queryKey: ['orders', 'mine', status],
    queryFn: () => orders.list({ mine: 'true', ...(status !== 'ALL' && { status }) }),
  });

  const counts = data.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="My Orders"
        subtitle="Track every order through the full approval and dispatch pipeline."
        actions={<Link to="/l3/orders/new" className="btn-primary">+ New Order</Link>}
      />

      {/* Pipeline overview */}
      {status === 'ALL' && data.length > 0 && (
        <div className="mb-5 grid grid-cols-5 gap-2">
          {PIPELINE.map((p) => (
            <button
              key={p.key}
              onClick={() => setStatus(p.key)}
              className="card card-body text-center hover:shadow-md transition cursor-pointer"
            >
              <div className="text-2xl font-bold text-slate-800">{counts[p.key] || 0}</div>
              <div className="mt-0.5 text-xs font-semibold text-slate-500">{p.label}</div>
              <div className="mt-0.5 text-xs text-slate-400 hidden sm:block">{p.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {['ALL', ...PIPELINE.map((p) => p.key)].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              status === s
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s === 'ALL' ? 'All' : PIPELINE.find((p) => p.key === s)?.label || s}
            {s !== 'ALL' && counts[s] ? (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{counts[s]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {isLoading && (
          <div className="card card-body text-center text-sm text-slate-400">Loading…</div>
        )}

        {data.map((o) => (
          <div key={o._id} className="card card-body">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-800">{o.orderNumber}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_BADGE[o.status] || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {PIPELINE.find((p) => p.key === o.status)?.label || o.status}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {o.client?.clientName}
                  {o.grade?.gradeCode && (
                    <> · <span className="font-medium text-slate-700">{o.grade.gradeCode}</span></>
                  )}
                  {' '}· {o.quantity} m³
                  {' '}· <span className="font-medium text-slate-700">{fmtMoney(o.negotiatedRate)}/m³</span>
                </div>
                {o.site?.siteName && (
                  <div className="mt-0.5 text-xs text-slate-400">Site: {o.site.siteName}</div>
                )}
                {o.salesOrder?.soNumber && (
                  <div className="mt-0.5 text-xs text-slate-400">SO: {o.salesOrder.soNumber}</div>
                )}
                {o.deliveryDate && (
                  <div className="mt-0.5 text-xs text-slate-400">
                    Delivery: {new Date(o.deliveryDate).toLocaleDateString('en-IN')}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">{fmtDateTime(o.createdAt)}</div>
                {o.approvedByLevel2?.name && (
                  <div className="mt-1 text-xs text-slate-500">
                    Approved by: <span className="font-medium">{o.approvedByLevel2.name}</span>
                  </div>
                )}
                {o.remarks && (
                  <div className="mt-1 max-w-48 text-xs text-slate-400 truncate" title={o.remarks}>
                    {o.remarks}
                  </div>
                )}
              </div>
            </div>

            {/* Pipeline progress indicator */}
            <div className="mt-3 flex items-center gap-3 border-t border-slate-50 pt-3">
              <PipelineDot status={o.status} />
              <span className="text-xs text-slate-400">
                {PIPELINE.find((p) => p.key === o.status)?.desc}
              </span>
            </div>
          </div>
        ))}

        {!isLoading && data.length === 0 && (
          <div className="card card-body text-center text-slate-400">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm">
              {status === 'ALL' ? 'No orders submitted yet.' : `No ${status.toLowerCase()} orders.`}
            </div>
            <Link to="/l3/orders/new" className="mt-3 inline-block btn-primary text-xs">
              Submit New Order
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
