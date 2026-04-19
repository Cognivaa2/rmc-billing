import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { payments, clients, invoices } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime, fmtMoney } from '../../utils/format.js';

export default function L1Payments() {
  const qc = useQueryClient();
  const { data: list = [] } = useQuery({ queryKey: ['payments'], queryFn: () => payments.list() });
  const { data: clientsList = [] } = useQuery({ queryKey: ['clients'], queryFn: () => clients.list() });
  const { data: invoicesList = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => invoices.list() });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { paymentReceived: true },
  });

  const create = useMutation({
    mutationFn: (d) => payments.create({
      ...d,
      paymentReceived: Boolean(d.paymentReceived),
      invoice: d.invoice || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      reset({ paymentReceived: true });
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, v }) => payments.update(id, { paymentReceived: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });

  return (
    <>
      <PageHeader title="Payments" subtitle="Record payment-received status per client / invoice." />

      <form
        className="card card-body mb-5 grid grid-cols-1 gap-3 md:grid-cols-5"
        onSubmit={handleSubmit((d) => create.mutate(d))}
      >
        <div className="md:col-span-2">
          <label className="label">Client *</label>
          <select className="select" required {...register('client')}>
            <option value="">Select…</option>
            {clientsList.map((c) => (
              <option key={c._id} value={c._id}>{c.clientName}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Invoice (optional)</label>
          <select className="select" {...register('invoice')}>
            <option value="">—</option>
            {invoicesList.map((i) => (
              <option key={i._id} value={i._id}>
                {i.invoiceNumber} · {fmtMoney(i.amount)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('paymentReceived')} /> Received
          </label>
        </div>
        <div className="md:col-span-4">
          <label className="label">Remarks</label>
          <input className="input" {...register('remarks')} />
        </div>
        <div className="flex items-end justify-end">
          <button className="btn-primary" disabled={create.isPending}>Record</button>
        </div>
      </form>

      <div className="card">
        <table className="table-clean">
          <thead>
            <tr>
              <th>When</th>
              <th>Client</th>
              <th>Invoice</th>
              <th>Received</th>
              <th>Recorded By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p._id}>
                <td className="text-slate-500">{fmtDateTime(p.createdAt)}</td>
                <td>{p.client?.clientName}</td>
                <td>{p.invoice?.invoiceNumber || '—'}</td>
                <td>
                  {p.paymentReceived ? (
                    <span className="badge-green">Yes</span>
                  ) : (
                    <span className="badge-gray">No</span>
                  )}
                </td>
                <td>{p.recordedByLevel1?.name}</td>
                <td className="text-right">
                  <button
                    className="text-xs text-brand-600 hover:underline"
                    onClick={() => toggle.mutate({ id: p._id, v: !p.paymentReceived })}
                  >
                    Toggle
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan="6" className="p-6 text-center text-sm text-slate-400">No records</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
