import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { orders } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime, fmtMoney } from '../../utils/format.js';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const STATUS_BADGE = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border border-blue-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
  DISPATCHED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  SALE_AUTHORIZED: 'bg-violet-50 text-violet-700 border border-violet-200',
  INVOICED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const STATUS_DESC = {
  PENDING: 'Waiting for Manager approval',
  APPROVED: 'Manager approved — ready for dispatch',
  REJECTED: 'Order rejected by Manager',
  DISPATCHED: 'Plant has filled dispatch form',
  SALE_AUTHORIZED: 'Manager authorized sale',
  INVOICED: 'Invoice generated',
};

const PIPELINE_STEPS = ['PENDING', 'APPROVED', 'DISPATCHED', 'SALE_AUTHORIZED', 'INVOICED'];

function PipelineBar({ status }) {
  const idx = PIPELINE_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0.5 flex-1">
      {PIPELINE_STEPS.map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div
            title={s}
            className={`h-2 rounded-full flex-1 transition-all ${i < idx
              ? 'bg-emerald-400'
              : i === idx
                ? 'bg-brand-600'
                : 'bg-slate-200'
              }`}
          />
          {i < PIPELINE_STEPS.length - 1 && <div className="w-1" />}
        </div>
      ))}
    </div>
  );
}

export default function L3MyOrders() {
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState(location.state?.filter || 'ALL');
  const [page, setPage] = useState(1);

  // For counts
  const { data: allData = [] } = useQuery({
    queryKey: ['orders', 'mine', 'ALL'],
    queryFn: () => orders.list({ mine: 'true' }),
  });

  const counts = allData.reduce((acc, o) => {
    acc.ALL = (acc.ALL || 0) + 1;
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, { ALL: 0 });

  // Paginated list
  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'mine', activeFilter, page],
    queryFn: () =>
      orders.listPaginated({
        mine: 'true',
        page,
        limit: 10,
        ...(activeFilter !== 'ALL' && { status: activeFilter }),
      }),
    keepPreviousData: true,
  });

  const ordersList = data?.orders || [];
  const totalPages = data?.totalPages || 1;

  return (
    <>
      <PageHeader
        title="My Orders"
        subtitle="Track and manage all your concrete orders."
        actions={<Link to="/l3/orders/new" className="btn-primary">+ New Order</Link>}
      />

      {/* Filter chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => { setActiveFilter(f.key); setPage(1); }}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${activeFilter === f.key
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            {f.label}
            {counts[f.key] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
              >
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {isLoading && (
          <div className="card card-body text-center text-sm text-slate-400">Loading…</div>
        )}

        {ordersList.map((o) => (
          <div key={o._id} className="card card-body">
            <div className="flex flex-wrap items-start justify-between gap-3">
              {/* Left: order info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-800">{o.orderNumber}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[o.status] || 'bg-slate-100 text-slate-600'
                      }`}
                  >
                    {FILTERS.find((f) => f.key === o.status)?.label || o.status}
                  </span>
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  <span className="font-medium">{o.client?.clientName}</span>
                  {o.grade && (
                    <span className="ml-2 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                      {o.grade}
                    </span>
                  )}
                  <span className="ml-2 text-slate-500">{o.quantity} m³</span>
                  <span className="ml-2 font-medium text-slate-700">{fmtMoney(o.negotiatedRate)}/m³</span>
                </div>

                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                  {o.site?.siteName && <span>📍 {o.site.siteName}</span>}
                  {o.deliveryDate && (
                    <span>🗓 {new Date(o.deliveryDate).toLocaleDateString('en-IN')}</span>
                  )}
                  {o.remarks && (
                    <span className="truncate max-w-xs">💬 {o.remarks}</span>
                  )}
                </div>
              </div>

              {/* Right: time + actions */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-xs text-slate-400">{fmtDateTime(o.createdAt)}</div>

                {o.approvedByLevel2?.name && (
                  <div className="text-xs text-slate-500">
                    ✅ Approved by <span className="font-medium">{o.approvedByLevel2.name}</span>
                  </div>
                )}

                {/* Edit — only for PENDING */}
                {o.status === 'PENDING' && (
                  <Link
                    to={`/l3/orders/${o._id}/edit`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    ✏️ Edit
                  </Link>
                )}
              </div>
            </div>

            {/* Pipeline progress bar */}
            <div className="mt-3 border-t border-slate-50 pt-3">
              <div className="flex items-center gap-3">
                <PipelineBar status={o.status} />
                <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                  {STATUS_DESC[o.status]}
                </span>
              </div>
            </div>
          </div>
        ))}

        {!isLoading && ordersList.length === 0 && (
          <div className="card card-body text-center text-slate-400 py-10">
            <div className="text-3xl mb-3">📋</div>
            <div className="text-sm font-medium">
              {activeFilter === 'ALL'
                ? 'No orders yet.'
                : `No ${FILTERS.find((f) => f.key === activeFilter)?.label} orders.`}
            </div>
            {activeFilter === 'ALL' && (
              <Link to="/l3/orders/new" className="mt-4 inline-block btn-primary text-xs">
                + Submit First Order
              </Link>
            )}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-xl shadow-sm">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
