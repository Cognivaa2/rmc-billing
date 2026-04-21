import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { orders, clients, sites } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';

const GRADES = [
  'M5', 'M7.5', 'M10', 'M15', 'M20', 'M25',
  'M30', 'M35', 'M40', 'M45', 'M50', 'M55', 'M60',
];

export default function L3EditOrder() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orders.get(id),
  });

  const { register, handleSubmit, watch, reset } = useForm();
  const clientId = watch('client');

  // Pre-fill form when order loads
  useEffect(() => {
    if (order) {
      reset({
        client:         order.client?._id || order.client,
        site:           order.site?._id   || order.site || '',
        grade:          order.grade,
        quantity:       order.quantity,
        negotiatedRate: order.negotiatedRate,
        deliveryDate:   order.deliveryDate
          ? new Date(order.deliveryDate).toISOString().slice(0, 10)
          : '',
        remarks:        order.remarks || '',
      });
    }
  }, [order, reset]);

  const { data: sitesList = [] } = useQuery({
    queryKey: ['sites', clientId],
    queryFn: () => sites.list({ client: clientId }),
    enabled: Boolean(clientId),
  });

  const update = useMutation({
    mutationFn: (d) =>
      orders.update(id, {
        ...d,
        quantity:       Number(d.quantity),
        negotiatedRate: Number(d.negotiatedRate),
        site:           d.site || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      nav('/l3/orders');
    },
  });

  if (isLoading) {
    return <div className="card card-body text-center text-slate-400">Loading…</div>;
  }

  if (!order) {
    return <div className="card card-body text-center text-red-500">Order not found.</div>;
  }

  if (order.status !== 'PENDING') {
    return (
      <div className="card card-body text-center text-amber-600">
        <div className="text-2xl mb-2">🔒</div>
        <div className="font-semibold">Cannot Edit</div>
        <div className="text-sm mt-1">Only <strong>PENDING</strong> orders can be edited. This order is <strong>{order.status}</strong>.</div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Edit Order — ${order.orderNumber}`}
        subtitle="You can only edit orders that are still pending approval."
      />

      <form
        className="card card-body grid grid-cols-1 gap-4 md:grid-cols-3"
        onSubmit={handleSubmit((d) => update.mutate(d))}
      >
        {/* Client — read only, cannot change after creation */}
        <div>
          <label className="label">Client</label>
          <div className="input bg-slate-50 text-slate-500 cursor-not-allowed select-none">
            {order.client?.clientName}
          </div>
          <input type="hidden" {...register('client')} />
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

        {/* Grade */}
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
          <textarea rows="2" className="input" {...register('remarks')} />
        </div>

        {update.isError && (
          <div className="md:col-span-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {update.error?.response?.data?.message || 'Failed to update order.'}
          </div>
        )}

        <div className="md:col-span-3 flex justify-end gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => nav('/l3/orders')}
          >
            Cancel
          </button>
          <button className="btn-primary" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </>
  );
}
