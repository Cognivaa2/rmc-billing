import { useQuery } from '@tanstack/react-query';
import { clients, invoices, orders, dispatches } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { KpiCard } from '../../components/KpiCard.jsx';
import { fmtMoney, fmtDateTime, statusBadge } from '../../utils/format.js';

export default function L1Dashboard() {
  const { data: clientsList = [] } = useQuery({ queryKey: ['clients'], queryFn: () => clients.list() });
  const { data: invoicesList = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => invoices.list() });
  const { data: ordersList = [] } = useQuery({ queryKey: ['orders'], queryFn: () => orders.list() });
  const { data: dispatchesList = [] } = useQuery({ queryKey: ['dispatches'], queryFn: () => dispatches.list() });

  const totalInvoiced = invoicesList.reduce((a, i) => a + (i.amount || 0), 0);
  const pendingKyc = clientsList.filter((c) => c.kycStatus !== 'verified').length;
  const today = new Date().toDateString();
  const dispatchesToday = dispatchesList.filter(
    (d) => new Date(d.dispatchDateTime).toDateString() === today,
  ).length;

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="All operational data — read-only (Level 1 scope)"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard
          title="Total Clients"
          value={clientsList.length}
          hint={`${pendingKyc} pending KYC`}
          accent
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </svg>
          }
        />
        <KpiCard
          title="Invoiced (Total)"
          value={fmtMoney(totalInvoiced)}
          hint={`${invoicesList.length} invoices`}
          icon={<span className="font-bold">₹</span>}
        />
        <KpiCard
          title="Dispatches Today"
          value={dispatchesToday}
          hint={`${dispatchesList.length} all-time`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z" />
            </svg>
          }
        />
        <KpiCard
          title="Open Orders"
          value={ordersList.filter((o) => o.status !== 'INVOICED').length}
          hint={`${ordersList.length} total`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="font-semibold">Recent Invoices</div>
          </div>
          <table className="table-clean">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Amount</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {invoicesList.slice(0, 8).map((i) => (
                <tr key={i._id}>
                  <td className="font-medium">{i.invoiceNumber}</td>
                  <td>{i.client?.clientName}</td>
                  <td>{fmtMoney(i.amount)}</td>
                  <td className="text-slate-500">{fmtDateTime(i.generatedAt)}</td>
                </tr>
              ))}
              {invoicesList.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-sm text-slate-400">
                    No invoices yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="font-semibold">Active Orders</div>
          </div>
          <table className="table-clean">
            <thead>
              <tr>
                <th>Order</th>
                <th>Client</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ordersList.slice(0, 8).map((o) => (
                <tr key={o._id}>
                  <td className="font-medium">{o.orderNumber}</td>
                  <td>{o.client?.clientName}</td>
                  <td>
                    <span className={statusBadge(o.status)}>{o.status}</span>
                  </td>
                </tr>
              ))}
              {ordersList.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-6 text-center text-sm text-slate-400">
                    No orders
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
