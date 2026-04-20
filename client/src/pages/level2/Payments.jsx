import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { payments, clients, invoices } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime, fmtMoney } from '../../utils/format.js';

export default function L2Payments() {
  const qc = useQueryClient();
  const [clientFilter, setClientFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);

  const { data: paymentsData = { payments: [], totalPages: 1, page: 1 }, isLoading } = useQuery({
    queryKey: ['payments', clientFilter, page],
    queryFn: () => payments.list(clientFilter ? { client: clientFilter, page, limit: 6 } : { page, limit: 6 }),
  });
  const paymentList = paymentsData.payments || [];

  const { data: clientsList = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clients.list(),
  });

  const { data: invoicesList = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoices.list(),
  });

  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: { paymentReceived: 'true' },
  });

  const selectedClient = watch('client');
  const clientInvoices = invoicesList.filter(
    (i) => (i.client?._id || i.client) === selectedClient,
  );

  const create = useMutation({
    mutationFn: (d) =>
      payments.create({
        client: d.client,
        invoice: d.invoice || undefined,
        paymentReceived: d.paymentReceived === 'true',
        receivedAt: d.receivedAt || undefined,
        remarks: d.remarks || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      setShowNew(false);
      reset({ paymentReceived: 'true' });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => payments.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });

  const totalReceived = paymentList
    .filter((p) => p.paymentReceived)
    .reduce((sum, p) => sum + (p.invoice?.amount || 0), 0);

  const totalPending = paymentList
    .filter((p) => !p.paymentReceived)
    .reduce((sum, p) => sum + (p.invoice?.amount || 0), 0);

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Record and track payment status against invoices."
        actions={
          <button className="btn-primary" onClick={() => setShowNew((v) => !v)}>
            {showNew ? 'Cancel' : '+ Record Payment'}
          </button>
        }
      />

      {/* KPI chips */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="card card-body">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Records
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{paymentList.length}</div>
        </div>
        <div className="card card-body">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Received
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{fmtMoney(totalReceived)}</div>
        </div>
        <div className="card card-body">
          <div className="text-xs font-semibold uppercase tracking-wide text-rose-500">
            Pending
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-600">{fmtMoney(totalPending)}</div>
        </div>
      </div>

      {/* New payment form */}
      {showNew && (
        <form
          className="card card-body mb-5 grid grid-cols-1 gap-3 md:grid-cols-3"
          onSubmit={handleSubmit((d) => create.mutate(d))}
        >
          <div>
            <label className="label">Client *</label>
            <select className="select" required {...register('client')}>
              <option value="">Select client…</option>
              {clientsList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.clientName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount *</label>
            <input type="number" step="0.01" className="input" required {...register('amount', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="label">Invoice (optional)</label>
            <select className="select" {...register('invoice')}>
              <option value="">— none —</option>
              {clientInvoices.map((i) => (
                <option key={i._id} value={i._id}>
                  {i.invoiceNumber} · {fmtMoney(i.amount)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Payment Status *</label>
            <select className="select" required {...register('paymentReceived')}>
              <option value="true">Received</option>
              <option value="false">Not Received</option>
            </select>
          </div>
          <div>
            <label className="label">Date Received</label>
            <input type="datetime-local" className="input" {...register('receivedAt')} />
          </div>
          <div className="md:col-span-1">
            <label className="label">Remarks</label>
            <input className="input" {...register('remarks')} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button className="btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="select w-60"
        >
          <option value="">All Clients</option>
          {clientsList.map((c) => (
            <option key={c._id} value={c._id}>
              {c.clientName}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        {isLoading && (
          <div className="p-6 text-center text-sm text-slate-400">Loading…</div>
        )}
        <table className="table-clean">
          <thead>
            <tr>
              <th>Client</th>
              <th>Invoice</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Received At</th>
              <th>Recorded By</th>
              <th>Remarks</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paymentList.map((p) => (
              <tr key={p._id}>
                <td className="font-medium">{p.client?.clientName}</td>
                <td className="text-slate-500">{p.invoice?.invoiceNumber || '—'}</td>
                <td className="font-semibold text-slate-800">{p.amount ? fmtMoney(p.amount) : '—'}</td>
                <td>
                  {p.paymentReceived ? (
                    <span className="badge-green">Received</span>
                  ) : (
                    <span className="badge-red">Pending</span>
                  )}
                </td>
                <td className="text-slate-500">
                  {p.receivedAt ? fmtDateTime(p.receivedAt) : '—'}
                </td>
                <td>{p.recordedByLevel2?.name || '—'}</td>
                <td className="text-slate-500">{p.remarks || '—'}</td>
                <td className="text-right">
                  {!p.paymentReceived && (
                    <button
                      className="text-xs text-emerald-600 hover:underline"
                      onClick={() =>
                        update.mutate({
                          id: p._id,
                          data: { paymentReceived: true, receivedAt: new Date() },
                        })
                      }
                    >
                      Mark received
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && paymentList.length === 0 && (
              <tr>
                <td colSpan="8" className="p-6 text-center text-sm text-slate-400">
                  No payment records yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
