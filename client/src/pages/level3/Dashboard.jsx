import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { orders } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { KpiCard } from '../../components/KpiCard.jsx';
import { statusBadge, fmtDateTime } from '../../utils/format.js';

export default function L3Dashboard() {
  const [page, setPage] = useState(1);

  // Unpaginated for counts
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
    acc.ALL = (acc.ALL || 0) + 1;
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, { ALL: 0 });

  return (
    <>
      <PageHeader
        title="Your dashboard"
        subtitle="Order entry and status tracking."
        actions={<Link to="/l3/orders/new" className="btn-primary">+ New Order</Link>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard title="Total Orders" value={counts.ALL || 0} to="/l3/orders" state={{ filter: 'ALL' }} />
        <KpiCard title="Pending" value={counts.PENDING || 0} accent to="/l3/orders" state={{ filter: 'PENDING' }} />
        <KpiCard title="Approved" value={counts.APPROVED || 0} to="/l3/orders" state={{ filter: 'APPROVED' }} />
        <KpiCard title="Rejected" value={counts.REJECTED || 0} to="/l3/orders" state={{ filter: 'REJECTED' }} />
      </div>

      <div className="card mt-6">
        <div className="border-b border-slate-100 px-5 py-4 font-semibold">Recent orders</div>
        <table className="table-clean">
          <thead>
            <tr><th>Order</th><th>Client</th><th>Qty</th><th>Status</th><th>When</th></tr>
          </thead>
          <tbody>
            {minePaginated.map((o) => (
              <tr key={o._id}>
                <td className="font-medium">{o.orderNumber}</td>
                <td>{o.client?.clientName}</td>
                <td>{o.quantity}</td>
                <td><span className={statusBadge(o.status)}>{o.status}</span></td>
                <td className="text-slate-500">{fmtDateTime(o.createdAt)}</td>
              </tr>
            ))}
            {minePaginated.length === 0 && !isLoading && (
              <tr><td colSpan="5" className="p-6 text-center text-sm text-slate-400">No orders yet</td></tr>
            )}
            {isLoading && (
              <tr><td colSpan="5" className="p-6 text-center text-sm text-slate-400">Loading…</td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination controls */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 mt-2">
            <div>
              <p className="text-sm text-slate-500">
                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
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
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
