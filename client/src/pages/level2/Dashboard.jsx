import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { orders, dispatches, salesOrders, clients, payments } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { KpiCard } from '../../components/KpiCard.jsx';
import { statusBadge, fmtDateTime, fmtMoney } from '../../utils/format.js';

export default function L2Dashboard() {
  const { data: pending = [] } = useQuery({
    queryKey: ['orders', 'PENDING'],
    queryFn: () => orders.list({ status: 'PENDING' }),
  });
  const { data: awaitingAuth = [] } = useQuery({
    queryKey: ['dispatches', 'awaiting'],
    queryFn: () => dispatches.list({ status: 'dispatched' }),
  });
  const { data: openSos = [] } = useQuery({
    queryKey: ['sales-orders', 'open'],
    queryFn: () => salesOrders.list({ status: 'open' }),
  });
  const { data: clientsList = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clients.list(),
  });
  const { data: paymentList = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => payments.list(),
  });

  const pendingKyc = clientsList.filter((c) => c.kycStatus !== 'verified').length;
  const unpaidCount = paymentList.filter((p) => !p.paymentReceived).length;

  return (
    <>
      <PageHeader title="Manager Overview" subtitle="Approvals, clients, dispatches, and payments." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard title="Pending Orders" value={pending.length} hint="Awaiting approval" accent />
        <KpiCard title="Awaiting Sale Auth." value={awaitingAuth.length} hint="Ready to authorise" />
        <KpiCard title="Open Sales Orders" value={openSos.length} hint={fmtMoney(openSos.reduce((a, s) => a + (s.rate || 0) * (s.remainingQuantity || 0), 0))} />
        <KpiCard title="Pending KYC" value={pendingKyc} hint={`of ${clientsList.length} clients`} />
        <KpiCard title="Unpaid Invoices" value={unpaidCount} hint="Payment not recorded" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Orders awaiting approval */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="font-semibold">Orders awaiting approval</div>
            <Link to="/l2/orders" className="text-xs text-brand-600 hover:underline">View all →</Link>
          </div>
          <table className="table-clean">
            <thead>
              <tr><th>Order</th><th>Client</th><th>Qty</th><th>Rate</th></tr>
            </thead>
            <tbody>
              {pending.slice(0, 6).map((o) => (
                <tr key={o._id}>
                  <td className="font-medium">{o.orderNumber}</td>
                  <td>{o.client?.clientName}</td>
                  <td>{o.quantity}</td>
                  <td>{fmtMoney(o.negotiatedRate)}</td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr><td colSpan="4" className="p-6 text-center text-sm text-slate-400">All caught up ✓</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dispatches awaiting sale auth */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="font-semibold">Dispatches awaiting sale authorisation</div>
            <Link to="/l2/dispatches" className="text-xs text-brand-600 hover:underline">View all →</Link>
          </div>
          <table className="table-clean">
            <thead>
              <tr><th>Dispatch</th><th>Client</th><th>Qty</th><th>When</th></tr>
            </thead>
            <tbody>
              {awaitingAuth.slice(0, 6).map((d) => (
                <tr key={d._id}>
                  <td className="font-medium">{d.dispatchNumber}</td>
                  <td>{d.client?.clientName}</td>
                  <td>{d.quantity}</td>
                  <td className="text-slate-500">{fmtDateTime(d.dispatchDateTime)}</td>
                </tr>
              ))}
              {awaitingAuth.length === 0 && (
                <tr><td colSpan="4" className="p-6 text-center text-sm text-slate-400">None pending</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Clients needing KYC */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="font-semibold">Clients pending KYC</div>
            <Link to="/l2/clients" className="text-xs text-brand-600 hover:underline">Manage →</Link>
          </div>
          <table className="table-clean">
            <thead>
              <tr><th>Client</th><th>KYC</th><th>Credit</th></tr>
            </thead>
            <tbody>
              {clientsList.filter((c) => c.kycStatus !== 'verified').slice(0, 6).map((c) => (
                <tr key={c._id}>
                  <td className="font-medium">{c.clientName}</td>
                  <td><span className={statusBadge(c.kycStatus)}>{c.kycStatus}</span></td>
                  <td><span className={statusBadge(c.creditStatus)}>{c.creditStatus}</span></td>
                </tr>
              ))}
              {pendingKyc === 0 && (
                <tr><td colSpan="3" className="p-6 text-center text-sm text-slate-400">All KYC verified ✓</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent payments */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="font-semibold">Recent payment records</div>
            <Link to="/l2/payments" className="text-xs text-brand-600 hover:underline">Record →</Link>
          </div>
          <table className="table-clean">
            <thead>
              <tr><th>Client</th><th>Invoice</th><th>Status</th></tr>
            </thead>
            <tbody>
              {paymentList.slice(0, 6).map((p) => (
                <tr key={p._id}>
                  <td className="font-medium">{p.client?.clientName}</td>
                  <td className="text-slate-500">{p.invoice?.invoiceNumber || '—'}</td>
                  <td>
                    {p.paymentReceived ? (
                      <span className="badge-green">Received</span>
                    ) : (
                      <span className="badge-red">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
              {paymentList.length === 0 && (
                <tr><td colSpan="3" className="p-6 text-center text-sm text-slate-400">No records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
