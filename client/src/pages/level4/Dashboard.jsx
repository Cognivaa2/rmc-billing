import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { orders, invoices, dispatches } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { KpiCard } from '../../components/KpiCard.jsx';
import { fmtMoney, statusBadge, fmtDateTime } from '../../utils/format.js';

export default function L4Dashboard() {
  const { data: approved = [] } = useQuery({
    queryKey: ['orders', 'APPROVED'],
    queryFn: () => orders.list({ status: 'APPROVED' }),
  });
  const { data: saleAuthorized = [] } = useQuery({
    queryKey: ['dispatches', 'sale_authorized'],
    queryFn: () => dispatches.list({ status: 'sale_authorized' }),
  });
  const { data: invoicesList = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => invoices.list() });
  const { data: dispatchesList = [] } = useQuery({ queryKey: ['dispatches'], queryFn: () => dispatches.list() });



  const today = new Date().toDateString();
  const dispatchesToday = dispatchesList.filter(
    (d) => new Date(d.dispatchDateTime).toDateString() === today,
  ).length;



  return (
    <>
      <PageHeader
        title="Dispatch & Invoicing"
        subtitle="Fill dispatch forms, generate invoices, and manage batchsheets."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard title="Approved — ready to dispatch" value={approved.length} accent />
        <KpiCard title="Ready to invoice" value={saleAuthorized.length} hint="Sale authorised dispatches" />
        <KpiCard title="Dispatches today" value={dispatchesToday} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="font-semibold">Approved orders</div>
            <Link to="/l4/approved-orders" className="text-xs text-brand-600 hover:underline">All →</Link>
          </div>
          <table className="table-clean">
            <thead><tr><th>Order</th><th>Client</th><th>Qty</th></tr></thead>
            <tbody>
              {approved.slice(0, 5).map((o) => (
                <tr key={o._id}><td className="font-medium">{o.orderNumber}</td><td>{o.client?.clientName}</td><td>{o.quantity}</td></tr>
              ))}
              {approved.length === 0 && <tr><td colSpan="3" className="p-6 text-center text-sm text-slate-400">Nothing approved</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="font-semibold">Recent invoices</div>
            <Link to="/l4/invoices" className="text-xs text-brand-600 hover:underline">All →</Link>
          </div>
          <table className="table-clean">
            <thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>When</th></tr></thead>
            <tbody>
              {invoicesList.slice(0, 5).map((i) => (
                <tr key={i._id}>
                  <td className="font-medium">{i.invoiceNumber}</td>
                  <td>{i.client?.clientName}</td>
                  <td>{fmtMoney(i.amount)}</td>
                  <td className="text-slate-500">{fmtDateTime(i.generatedAt)}</td>
                </tr>
              ))}
              {invoicesList.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-sm text-slate-400">No invoices yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
