import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { invoices, payments, clients } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney, fmtDateTime } from '../../utils/format.js';

export default function L2Invoices() {
  const nav = useNavigate();
  const [clientFilter, setClientFilter] = useState('');

  const { data: invoicesList = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices', clientFilter],
    queryFn: () => invoices.list(clientFilter ? { client: clientFilter } : {}),
  });

  const { data: paymentsList = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payments', 'all'],
    queryFn: () => payments.list(), // passing no pagination to get all
  });

  const { data: clientsList = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clients.list(),
  });

  // Calculate payment status for each invoice
  const enrichedInvoices = invoicesList.map((inv) => {
    const invPayments = paymentsList.filter(
      (p) => p.invoice?._id === inv._id && p.paymentReceived
    );
    const paidAmount = invPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const isPaid = paidAmount >= (inv.amount || 0);
    const isPartial = paidAmount > 0 && !isPaid;

    return {
      ...inv,
      paidAmount,
      isPaid,
      isPartial,
    };
  });

  const isLoading = isLoadingInvoices || isLoadingPayments;

  const totalBilled = enrichedInvoices.reduce((a, b) => a + (b.amount || 0), 0);
  const totalPaid = enrichedInvoices.reduce((a, b) => a + b.paidAmount, 0);
  const totalDue = totalBilled - totalPaid;

  const handleRecordPayment = (inv) => {
    nav('/l2/payments', {
      state: {
        prefill: {
          client: inv.client?._id || inv.client,
          invoice: inv._id,
          amount: Math.max(0, (inv.amount || 0) - inv.paidAmount),
        },
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Track generated invoices and record payments against them."
      />

      {/* KPI chips */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card card-body">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Billed
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{fmtMoney(totalBilled)}</div>
        </div>
        <div className="card card-body">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Total Paid
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{fmtMoney(totalPaid)}</div>
        </div>
        <div className="card card-body">
          <div className="text-xs font-semibold uppercase tracking-wide text-rose-500">
            Total Due
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-600">{fmtMoney(totalDue)}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="select w-full sm:w-64"
        >
          <option value="">All Clients</option>
          {clientsList.map((c) => (
            <option key={c._id} value={c._id}>
              {c.clientName}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        {isLoading && (
          <div className="p-6 text-center text-sm text-slate-400">Loading…</div>
        )}
        <table className="table-clean min-w-[1000px]">
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Client</th>
              <th>Generated On</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {enrichedInvoices.map((inv) => (
              <tr key={inv._id}>
                <td className="font-medium">{inv.invoiceNumber}</td>
                <td>{inv.client?.clientName}</td>
                <td className="text-slate-500">{fmtDateTime(inv.generatedAt)}</td>
                <td className="font-semibold text-slate-800">{fmtMoney(inv.amount)}</td>
                <td className="text-slate-600">{fmtMoney(inv.paidAmount)}</td>
                <td>
                  {inv.isPaid ? (
                    <span className="badge-green">Paid</span>
                  ) : inv.isPartial ? (
                    <span className="badge-yellow">Partial</span>
                  ) : (
                    <span className="badge-red">Unpaid</span>
                  )}
                </td>
                <td className="text-right">
                  {!inv.isPaid && (
                    <button
                      className="btn-primary py-1 px-3 text-xs"
                      onClick={() => handleRecordPayment(inv)}
                    >
                      Record Payment
                    </button>
                  )}
                  {inv.isPaid && (
                    <span className="text-xs text-slate-400 font-medium px-3">Fully Paid ✓</span>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && enrichedInvoices.length === 0 && (
              <tr>
                <td colSpan="7" className="p-6 text-center text-sm text-slate-400">
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
