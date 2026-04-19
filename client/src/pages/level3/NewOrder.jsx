import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { orders, clients, sites, grades, salesOrders } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney } from '../../utils/format.js';

export default function L3NewOrder() {
  const nav = useNavigate();
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: { deliveryDate: new Date().toISOString().slice(0, 10) },
  });
  const clientId = watch('client');
  const soId = watch('salesOrder');

  const { data: clientsList = [] } = useQuery({ queryKey: ['clients'], queryFn: () => clients.list() });
  const { data: gradesList = [] } = useQuery({ queryKey: ['grades'], queryFn: () => grades.list() });
  const { data: sitesList = [] } = useQuery({
    queryKey: ['sites', clientId],
    queryFn: () => sites.list({ client: clientId }),
    enabled: Boolean(clientId),
  });
  const { data: sosList = [] } = useQuery({
    queryKey: ['sales-orders', clientId, 'open'],
    queryFn: () => salesOrders.list({ client: clientId, status: 'open' }),
    enabled: Boolean(clientId),
  });
  const selectedSo = sosList.find((s) => s._id === soId);

  const create = useMutation({
    mutationFn: (d) => orders.create({
      ...d,
      quantity: Number(d.quantity),
      negotiatedRate: Number(d.negotiatedRate),
      salesOrder: d.salesOrder || undefined,
      site: d.site || undefined,
    }),
    onSuccess: () => nav('/l3/orders'),
  });

  return (
    <>
      <PageHeader title="New Order" subtitle="Enter a daily order with negotiated rate." />

      <form
        className="card card-body grid grid-cols-1 gap-4 md:grid-cols-3"
        onSubmit={handleSubmit((d) => create.mutate(d))}
      >
        <div>
          <label className="label">Client *</label>
          <select className="select" required {...register('client')}>
            <option value="">Select…</option>
            {clientsList.map((c) => (
              <option key={c._id} value={c._id}>{c.clientName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Site</label>
          <select className="select" {...register('site')}>
            <option value="">—</option>
            {sitesList.map((s) => (<option key={s._id} value={s._id}>{s.siteName}</option>))}
          </select>
        </div>
        <div>
          <label className="label">Sales Order (optional)</label>
          <select
            className="select"
            {...register('salesOrder', {
              onChange: (e) => {
                const so = sosList.find((s) => s._id === e.target.value);
                if (so) {
                  setValue('grade', so.grade?._id);
                  setValue('negotiatedRate', so.rate);
                }
              },
            })}
          >
            <option value="">—</option>
            {sosList.map((s) => (
              <option key={s._id} value={s._id}>
                {s.soNumber} · {s.grade?.gradeCode} · {fmtMoney(s.rate)} · {s.remainingQuantity} m³ left
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Grade *</label>
          <select className="select" required {...register('grade')}>
            <option value="">—</option>
            {gradesList.map((g) => (<option key={g._id} value={g._id}>{g.gradeCode}</option>))}
          </select>
        </div>
        <div>
          <label className="label">Quantity (m³) *</label>
          <input type="number" step="0.01" className="input" required {...register('quantity')} />
        </div>
        <div>
          <label className="label">Negotiated Rate (₹/m³) *</label>
          <input type="number" step="0.01" className="input" required {...register('negotiatedRate')} />
          {selectedSo && (
            <div className="mt-1 text-xs text-slate-500">SO rate: {fmtMoney(selectedSo.rate)}</div>
          )}
        </div>
        <div>
          <label className="label">Delivery Date</label>
          <input type="date" className="input" {...register('deliveryDate')} />
        </div>
        <div className="md:col-span-3">
          <label className="label">Remarks</label>
          <textarea rows="2" className="input" {...register('remarks')} />
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button className="btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Submitting…' : 'Submit Order'}
          </button>
        </div>
      </form>
    </>
  );
}
