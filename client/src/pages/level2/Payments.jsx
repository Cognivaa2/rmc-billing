import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { payments, clients, invoices } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime, fmtMoney } from '../../utils/format.js';

export default function L2Payments() {
  const qc = useQueryClient();
  const { state } = useLocation();
  const [clientFilter, setClientFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(!!state?.prefill);
  const [editingPayment, setEditingPayment] = useState(null);

  const { data: paymentsList = [], isLoading: pLoad } = useQuery({
    queryKey: ['payments_all'],
    queryFn: () => payments.list({ limit: 10000 }),
  });

  const { data: clientsList = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clients.list(),
  });

  const { data: invoicesList = [], isLoading: iLoad } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoices.list(),
  });

  const isLoading = pLoad || iLoad;

  const allRecords = useMemo(() => {
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

  const filteredRecords = useMemo(() => {
    let filtered = allRecords;
    if (clientFilter) {
      filtered = filtered.filter(p => (p.client?._id || p.client) === clientFilter);
    }
    return filtered;
  }, [allRecords, clientFilter]);

  const totalRecords = filteredRecords.length;
  const limit = 6;
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  const paginatedList = filteredRecords.slice((page - 1) * limit, page * limit);

  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: state?.prefill ? {
      client: state.prefill.client,
      invoice: state.prefill.invoice,
      amount: state.prefill.amount,
      paymentReceived: 'true',
    } : { paymentReceived: 'true' },
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
        amount: Number(d.amount),
        paymentReceived: d.paymentReceived === 'true' || d.paymentReceived === true,
        receivedAt: d.receivedAt || undefined,
        remarks: d.remarks || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments_all'] });
      setShowNew(false);
      reset({ paymentReceived: 'true' });
    },
  });

  const updatePayment = useMutation({
    mutationFn: (d) =>
      payments.update(editingPayment._id, {
        client: d.client,
        invoice: d.invoice || undefined,
        amount: Number(d.amount),
        paymentReceived: d.paymentReceived === 'true' || d.paymentReceived === true,
        receivedAt: d.receivedAt || undefined,
        remarks: d.remarks || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments_all'] });
      setEditingPayment(null);
      reset({ paymentReceived: 'true' });
    },
  });

  const markReceived = useMutation({
    mutationFn: ({ id, data, isVirtual, virtualData }) => {
      if (isVirtual) {
        return payments.create({
          client: virtualData.client?._id || virtualData.client,
          invoice: virtualData.invoice?._id || virtualData.invoice,
          amount: virtualData.amount,
          paymentReceived: true,
          receivedAt: new Date(),
        });
      }
      return payments.update(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments_all'] }),
  });

  const totalReceived = allRecords
    .filter((p) => p.paymentReceived)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPending = allRecords
    .filter((p) => !p.paymentReceived)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Record and track payment status against invoices."
        actions={
          <button className="btn-primary" onClick={() => {
            setShowNew((v) => !v);
            if (!showNew) {
              setEditingPayment(null);
              reset({ paymentReceived: 'true', client: '', invoice: '', amount: '', remarks: '', receivedAt: '' });
            }
          }}>
            {showNew ? 'Cancel' : '+ Record Payment'}
          </button>
        }
      />

      {/* KPI chips */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card card-body">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Records
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{allRecords.length}</div>
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

      {/* New/Edit payment form */}
      {(showNew || editingPayment) && (
        <form
          className="card card-body mb-5 grid grid-cols-1 gap-3 md:grid-cols-3"
          onSubmit={handleSubmit((d) => {
            if (editingPayment && !editingPayment.isVirtual) {
              updatePayment.mutate(d);
            } else {
              create.mutate(d);
            }
          })}
        >
          <div className="md:col-span-3 flex justify-between items-center mb-1">
            <h3 className="font-semibold text-slate-700">
              {editingPayment ? (editingPayment.isVirtual ? 'Record Pending Payment' : 'Edit Payment Record') : 'Record New Payment'}
            </h3>
            {editingPayment && (
              <button
                type="button"
                onClick={() => {
                  setEditingPayment(null);
                  reset({ paymentReceived: 'true', client: '', invoice: '', amount: '', remarks: '', receivedAt: '' });
                }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            )}
          </div>
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
          <div className="md:col-span-3 flex justify-end gap-3">
            {(create.isSuccess || updatePayment.isSuccess) && (
              <span className="text-sm text-emerald-600 self-center">Saved ✓</span>
            )}
            <button className="btn-primary" disabled={create.isPending || updatePayment.isPending || markReceived.isPending}>
              {create.isPending || updatePayment.isPending ? 'Saving…' : editingPayment && !editingPayment.isVirtual ? 'Update Payment' : 'Record Payment'}
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={clientFilter}
          onChange={(e) => {
            setClientFilter(e.target.value);
            setPage(1);
          }}
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

      <div className="card overflow-hidden">
        {isLoading && (
          <div className="p-6 text-center text-sm text-slate-400">Loading…</div>
        )}
        <div className="overflow-x-auto">
          <table className="table-clean min-w-[1000px]">
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
              {paginatedList.map((p) => (
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
                  <td className="text-right flex items-center justify-end gap-3">
                    {!p.paymentReceived && (
                      <button
                        className="text-xs text-emerald-600 hover:underline"
                        onClick={() =>
                          markReceived.mutate({
                            id: p._id,
                            isVirtual: p.isVirtual,
                            virtualData: p,
                            data: { paymentReceived: true, receivedAt: new Date() },
                          })
                        }
                      >
                        Mark received
                      </button>
                    )}
                    <button
                      className="text-xs text-brand-600 hover:underline font-medium"
                      onClick={() => {
                        setEditingPayment(p);
                        setShowNew(true);
                        reset({
                          client: p.client?._id || p.client,
                          invoice: p.invoice?._id || p.invoice || '',
                          amount: p.amount,
                          paymentReceived: String(p.paymentReceived),
                          receivedAt: p.receivedAt ? new Date(p.receivedAt).toISOString().slice(0, 16) : '',
                          remarks: p.remarks || '',
                        });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      {p.isVirtual ? 'Record' : 'Edit'}
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && paginatedList.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-sm text-slate-400">
                    No payment records yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-xs px-3 py-1"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary text-xs px-3 py-1"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
