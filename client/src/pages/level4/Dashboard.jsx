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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Ready to Dispatch"
          value={approved.length}
          accent
          to="/l4/approved-orders"
          hint="Approved orders"
        />
        <KpiCard
          title="Ready to Invoice"
          value={saleAuthorized.length}
          hint="Sale authorised dispatches"
          to="/l4/dispatches"
          state={{ filter: 'sale_authorized' }}
        />
        <KpiCard
          title="Dispatches Today"
          value={dispatchesToday}
          to="/l4/dispatches"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Approved Orders Section */}
        <div className="card overflow-hidden border-none shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/30 px-5 py-4">
            <div className="text-sm font-black uppercase tracking-widest text-slate-500">Approved orders</div>
            <Link to="/l4/approved-orders" className="text-[10px] font-bold text-brand-600 hover:text-brand-700 transition-colors uppercase tracking-wider">All →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table-clean">
              <thead>
                <tr className="text-[10px] uppercase tracking-tighter text-slate-400 font-black">
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3 text-right">Qty (m³)</th>
                </tr>
              </thead>
              <tbody>
                {approved.slice(0, 5).map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-900 text-xs">{o.orderNumber}</td>
                    <td className="px-5 py-3 text-xs text-slate-600 font-medium">{o.client?.clientName}</td>
                    <td className="px-5 py-3 text-xs font-black text-slate-900 text-right">{o.quantity}</td>
                  </tr>
                ))}
                {approved.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-10 text-center">
                      <div className="text-2xl mb-2 opacity-20">📦</div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nothing approved</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Invoices Section */}
        <div className="card overflow-hidden border-none shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/30 px-5 py-4">
            <div className="text-sm font-black uppercase tracking-widest text-slate-500">Recent invoices</div>
            <Link to="/l4/invoices" className="text-[10px] font-bold text-brand-600 hover:text-brand-700 transition-colors uppercase tracking-wider">All →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table-clean">
              <thead>
                <tr className="text-[10px] uppercase tracking-tighter text-slate-400 font-black">
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoicesList.slice(0, 5).map((i) => (
                  <tr key={i._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-900 text-xs">{i.invoiceNumber}</td>
                    <td className="px-5 py-3 text-xs text-slate-600 font-medium truncate max-w-[120px]">{i.client?.clientName}</td>
                    <td className="px-5 py-3 text-xs font-black text-slate-900 text-right">{fmtMoney(i.amount)}</td>
                  </tr>
                ))}
                {invoicesList.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-10 text-center">
                      <div className="text-2xl mb-2 opacity-20">🧾</div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">No invoices yet</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
