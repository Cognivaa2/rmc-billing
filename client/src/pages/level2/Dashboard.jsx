import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { orders, dispatches, salesOrders, clients, payments, invoices } from '../../api/endpoints.js';
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
  const { data: closedSos = [] } = useQuery({
    queryKey: ['sales-orders', 'closed'],
    queryFn: () => salesOrders.list({ status: 'closed' }),
  });
  const { data: clientsList = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clients.list(),
  });
  const { data: paymentsList = [] } = useQuery({
    queryKey: ['payments_all'],
    queryFn: () => payments.list({ limit: 10000 }),
  });
  const { data: invoicesList = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoices.list(),
  });

  const allPaymentRecords = useMemo(() => {
    const paidInvoiceIds = new Set(
      paymentsList
        .filter((p) => p.paymentReceived && p.invoice)
        .map((p) => p.invoice._id || p.invoice)
    );

    const virtualPayments = invoicesList
      .filter((inv) => !paidInvoiceIds.has(inv._id))
      .map((inv) => ({
        _id: 'v_' + inv._id,
        isVirtual: true,
        createdAt: inv.generatedAt,
        client: inv.client,
        invoice: inv,
        amount: inv.amount,
        paymentReceived: false,
        recordedByLevel2: null,
      }));

    const combined = [...paymentsList, ...virtualPayments];
    combined.sort((a, b) => new Date(b.createdAt || b.receivedAt || Date.now()) - new Date(a.createdAt || a.receivedAt || Date.now()));
    return combined;
  }, [paymentsList, invoicesList]);

  const pendingKyc = clientsList.filter((c) => c.kycStatus !== 'verified').length;
  const receivedPaymentSum = allPaymentRecords.filter((p) => p.paymentReceived).reduce((a, b) => a + (b.amount || 0), 0);
  const pendingPaymentSum = allPaymentRecords.filter((p) => !p.paymentReceived).reduce((a, b) => a + (b.amount || 0), 0);
  const unpaidCount = allPaymentRecords.filter((p) => !p.paymentReceived).length;

  return (
    <>
      <PageHeader title="Manager Overview" subtitle="Approvals, clients, dispatches, and payments." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          title="Pending Approval"
          value={pending.length}
          hint="Orders awaiting approval"
          accent
          to="/l2/orders"
          state={{ filter: 'PENDING' }}
        />
        <KpiCard
          title="Total Received Payment"
          value={fmtMoney(receivedPaymentSum)}
          hint={`${allPaymentRecords.filter(p => p.paymentReceived).length} records`}
          to="/l2/payments"
        />
        <KpiCard
          title="Total Close Order"
          value={closedSos.length}
          hint="Fully closed sales orders"
          to="/l2/sales-orders"
          state={{ filter: 'closed' }}
        />
        <KpiCard
          title="Not Received / Pending Payment"
          value={fmtMoney(pendingPaymentSum)}
          hint={`${unpaidCount} unpaid records`}
          to="/l2/payments"
        />
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
            <Link to="/l2/orders" state={{ filter: 'DISPATCHED' }} className="text-xs text-brand-600 hover:underline">View all →</Link>
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
              {allPaymentRecords.slice(0, 6).map((p) => (
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
              {allPaymentRecords.length === 0 && (
                <tr><td colSpan="3" className="p-6 text-center text-sm text-slate-400">No records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}