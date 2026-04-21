import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { orders, clients, sites } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';

const GRADES = [
  'M5', 'M7.5', 'M10', 'M15', 'M20', 'M25',
  'M30', 'M35', 'M40', 'M45', 'M50', 'M55', 'M60',
];

export default function L3NewOrder() {
  const nav = useNavigate();
  const { register, handleSubmit, watch } = useForm({
    defaultValues: { deliveryDate: new Date().toISOString().slice(0, 10) },
  });
  const clientId = watch('client');

  const { data: clientsList = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clients.list(),
  });

  const { data: sitesList = [] } = useQuery({
    queryKey: ['sites', clientId],
    queryFn: () => sites.list({ client: clientId }),
    enabled: Boolean(clientId),
  });

  const create = useMutation({
    mutationFn: (d) =>
      orders.create({
        ...d,
        quantity: Number(d.quantity),
        negotiatedRate: Number(d.negotiatedRate),
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
        {/* Client */}
        <div>
          <label className="label">Client *</label>
          <select className="select" required {...register('client')}>
            <option value="">Select client…</option>
            {clientsList.map((c) => (
              <option key={c._id} value={c._id}>{c.clientName}</option>
            ))}
          </select>
        </div>

        {/* Site */}
        <div>
          <label className="label">Site</label>
          <select className="select" {...register('site')}>
            <option value="">— (optional)</option>
            {sitesList.map((s) => (
              <option key={s._id} value={s._id}>{s.siteName}</option>
            ))}
          </select>
        </div>

        {/* Concrete Grade — hardcoded list, no DB needed */}
        <div>
          <label className="label">Concrete Grade *</label>
          <select className="select" required {...register('grade')}>
            <option value="">Select grade…</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="label">Quantity (m³) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="input"
            required
            placeholder="e.g. 25"
            {...register('quantity')}
          />
        </div>

        {/* Rate */}
        <div>
          <label className="label">Negotiated Rate (₹/m³) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            required
            placeholder="e.g. 5500"
            {...register('negotiatedRate')}
          />
        </div>

        {/* Delivery Date */}
        <div>
          <label className="label">Delivery Date</label>
          <input type="date" className="input" {...register('deliveryDate')} />
        </div>

        {/* Remarks */}
        <div className="md:col-span-3">
          <label className="label">Remarks</label>
          <textarea rows="2" className="input" placeholder="Optional notes…" {...register('remarks')} />
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
