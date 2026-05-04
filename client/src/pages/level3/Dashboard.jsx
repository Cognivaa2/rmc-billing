import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { orders } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { KpiCard } from '../../components/KpiCard.jsx';
import { statusBadge, fmtDateTime } from '../../utils/format.js';

const getNormalizedStatus = (status) => {
  if (['SALE_AUTHORIZED', 'INVOICED', 'CLOSED'].includes(status)) return 'CLOSED';
  return status;
};

const STATUS_LABEL = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DISPATCHED: 'Dispatched',
  CLOSED: 'Closed',
};

const STATUS_BADGE = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border border-blue-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
  DISPATCHED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  CLOSED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

export default function L3Dashboard() {
  const [page, setPage] = useState(1);

  const { data: mineAll = [] } = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: () => orders.list({ mine: 'true' }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'mine', 'paginated', page],
    queryFn: () => orders.listPaginated({ mine: 'true', page, limit: 10 }),
    keepPreviousData: true,
  });

  const minePaginated = data?.orders || [];
  const totalPages = data?.totalPages || 1;

  const counts = mineAll.reduce((acc, o) => {
    const s = getNormalizedStatus(o.status);
    acc.ALL = (acc.ALL || 0) + 1;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, { ALL: 0 });

  return (
    <>
      <PageHeader
        title="Your Dashboard"
        subtitle="Order entry and status tracking."
        actions={
          <Link to="/l3/orders/new" className="btn-primary text-sm px-4 py-2">
            + New Order
          </Link>
        }
      />

      {/* KPI cards — 2-col on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <KpiCard title="Pending" value={counts.PENDING || 0} accent to="/l3/orders" state={{ filter: 'PENDING' }} />
        <KpiCard title="Total Orders" value={counts.ALL || 0} to="/l3/orders" state={{ filter: 'ALL' }} />
        <KpiCard title="Approved" value={counts.APPROVED || 0} to="/l3/orders" state={{ filter: 'APPROVED' }} />
        <KpiCard title="Rejected" value={counts.REJECTED || 0} to="/l3/orders" state={{ filter: 'REJECTED' }} />
      </div>

      {/* Recent orders */}
      <div className="mt-5 card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-800 flex items-center justify-between">
          <span>Recent Orders</span>
          <Link to="/l3/orders" className="text-xs font-medium text-brand-600 hover:underline">
            View all →
          </Link>
        </div>

        {/* ── Mobile: card list ─────────────────────────────────────────── */}
        <div className="md:hidden divide-y divide-slate-100">
          {isLoading && (
            <div className="p-6 text-center text-sm text-slate-400">Loading…</div>
          )}
          {!isLoading && minePaginated.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">No orders found.</div>
          )}
          {minePaginated.map((o) => (
            <div key={o._id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{o.orderNumber}</p>
                <p className="text-xs text-slate-500 truncate">{o.client?.clientName} · {o.quantity} m³</p>
                <p className="text-xs text-slate-400 mt-0.5">{fmtDateTime(o.createdAt)}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[getNormalizedStatus(o.status)] || 'bg-slate-100 text-slate-600'}`}>
                {STATUS_LABEL[getNormalizedStatus(o.status)] || o.status}
              </span>
            </div>
          ))}
        </div>

        {/* ── Desktop: table ────────────────────────────────────────────── */}
        <table className="hidden md:table table-clean w-full">
          <thead>
            <tr>
              <th>Order</th>
              <th>Client</th>
              <th>Qty</th>
              <th>Status</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {minePaginated.map((o) => (
              <tr key={o._id}>
                <td className="font-medium">{o.orderNumber}</td>
                <td>{o.client?.clientName}</td>
                <td>{o.quantity} m³</td>
                <td>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[getNormalizedStatus(o.status)] || 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABEL[getNormalizedStatus(o.status)] || o.status}
                  </span>
                </td>
                <td className="text-slate-500">{fmtDateTime(o.createdAt)}</td>
              </tr>
            ))}
            {minePaginated.length === 0 && !isLoading && (
              <tr><td colSpan="5" className="p-6 text-center text-sm text-slate-400">No orders found.</td></tr>
            )}
            {isLoading && (
              <tr><td colSpan="5" className="p-6 text-center text-sm text-slate-400">Loading…</td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages >= 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-sm text-slate-500">
              Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
            </p>
            <div className="isolate inline-flex -space-x-px rounded-md shadow-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center rounded-l-md px-3 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="relative inline-flex items-center rounded-r-md px-3 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
