import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { orders, clients, sites } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';

const GRADES = ['M10', 'M15', 'M20', 'M25', 'M30', 'M35', 'M40', 'M45', 'M50'];

export default function L3NewOrder() {
  const nav = useNavigate();
  const qc = useQueryClient();
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      nav('/l3/orders');
    },
  });

  return (
    <>
      <PageHeader title="New Order" subtitle="Enter a daily order with negotiated rate." />

      <form
        className="card card-body grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
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

        {/* Concrete Grade */}
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

        {/* Remarks — full width */}
        <div className="sm:col-span-2 md:col-span-3">
          <label className="label">Remarks</label>
          <textarea rows="2" className="input" placeholder="Optional notes…" {...register('remarks')} />
        </div>

        {/* Error */}
        {create.isError && (
          <div className="sm:col-span-2 md:col-span-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {create.error?.response?.data?.message || 'Failed to submit order.'}
          </div>
        )}

        {/* Actions — full width, stacked on mobile */}
        <div className="sm:col-span-2 md:col-span-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            className="btn-secondary w-full sm:w-auto"
            onClick={() => nav('/l3/orders')}
          >
            Cancel
          </button>
          <button
            className="btn-primary w-full sm:w-auto"
            disabled={create.isPending}
          >
            {create.isPending ? 'Submitting…' : 'Submit Order'}
          </button>
        </div>
      </form>
    </>
  );
}
