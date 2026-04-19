import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { orders, dispatches } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney } from '../../utils/format.js';

function DispatchForm({ order, onDone }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { quantity: order.quantity, vehicleNumber: '' },
  });
  const create = useMutation({
    mutationFn: (d) => dispatches.create({
      order: order._id,
      quantity: Number(d.quantity),
      vehicleNumber: d.vehicleNumber.toUpperCase(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      reset();
      onDone?.();
    },
  });

  return (
    <form
      className="mt-3 grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-4"
      onSubmit={handleSubmit((d) => create.mutate(d))}
    >
      <div>
        <label className="label">Quantity (m³) *</label>
        <input type="number" step="0.01" className="input" required {...register('quantity')} />
      </div>
      <div className="md:col-span-2">
        <label className="label">Vehicle Number *</label>
        <input className="input uppercase" required placeholder="MH12AB1234" {...register('vehicleNumber')} />
      </div>
      <div className="flex items-end">
        <button className="btn-primary w-full" disabled={create.isPending}>
          {create.isPending ? 'Filling…' : 'Fill Dispatch'}
        </button>
      </div>
    </form>
  );
}

export default function L4ApprovedOrders() {
  const [openFor, setOpenFor] = useState(null);
  const { data = [] } = useQuery({
    queryKey: ['orders', 'APPROVED'],
    queryFn: () => orders.list({ status: 'APPROVED' }),
  });

  return (
    <>
      <PageHeader title="Approved orders" subtitle="Fill a dispatch form to move each order forward." />

      <div className="space-y-3">
        {data.map((o) => (
          <div key={o._id} className="card card-body">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{o.orderNumber}</div>
                <div className="text-sm text-slate-500">
                  {o.client?.clientName} · {o.grade?.gradeCode} · {o.quantity} m³ · {fmtMoney(o.negotiatedRate)}
                </div>
              </div>
              <button
                className={openFor === o._id ? 'btn-secondary' : 'btn-primary'}
                onClick={() => setOpenFor(openFor === o._id ? null : o._id)}
              >
                {openFor === o._id ? 'Close' : 'Fill Dispatch'}
              </button>
            </div>
            {openFor === o._id && <DispatchForm order={o} onDone={() => setOpenFor(null)} />}
          </div>
        ))}
        {data.length === 0 && <div className="card card-body text-center text-slate-400">No approved orders waiting</div>}
      </div>
    </>
  );
}
