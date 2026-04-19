import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { orders } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { KpiCard } from '../../components/KpiCard.jsx';
import { statusBadge, fmtDateTime } from '../../utils/format.js';

export default function L3Dashboard() {
  const { data: mine = [] } = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: () => orders.list({ mine: 'true' }),
  });

  const counts = mine.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Your dashboard"
        subtitle="Order entry and status tracking."
        actions={<Link to="/l3/orders/new" className="btn-primary">+ New Order</Link>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <KpiCard title="Pending" value={counts.PENDING || 0} accent />
        <KpiCard title="Approved" value={counts.APPROVED || 0} />
        <KpiCard title="Dispatched" value={counts.DISPATCHED || 0} />
        <KpiCard title="Sale Auth." value={counts.SALE_AUTHORIZED || 0} />
        <KpiCard title="Invoiced" value={counts.INVOICED || 0} />
      </div>

      <div className="card mt-6">
        <div className="border-b border-slate-100 px-5 py-4 font-semibold">Recent orders</div>
        <table className="table-clean">
          <thead>
            <tr><th>Order</th><th>Client</th><th>Qty</th><th>Status</th><th>When</th></tr>
          </thead>
          <tbody>
            {mine.slice(0, 15).map((o) => (
              <tr key={o._id}>
                <td className="font-medium">{o.orderNumber}</td>
                <td>{o.client?.clientName}</td>
                <td>{o.quantity}</td>
                <td><span className={statusBadge(o.status)}>{o.status}</span></td>
                <td className="text-slate-500">{fmtDateTime(o.createdAt)}</td>
              </tr>
            ))}
            {mine.length === 0 && (
              <tr><td colSpan="5" className="p-6 text-center text-sm text-slate-400">No orders yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
