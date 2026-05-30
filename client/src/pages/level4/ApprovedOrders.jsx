import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { orders, dispatches } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney } from '../../utils/format.js';

function DispatchForm({ order, onDone }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { vehicleNumber: '', driverName: '' },
  });
  const create = useMutation({
    mutationFn: (d) => dispatches.create({
      order: order._id,
      quantity: order.quantity,           // auto-taken from order
      vehicleNumber: d.vehicleNumber.toUpperCase(),
      driverName: d.driverName || '',
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
      className="mt-3 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 border border-slate-100 p-4 md:grid-cols-3"
      onSubmit={handleSubmit((d) => create.mutate(d))}
    >
      {/* Vehicle Number */}
      <div>
        <label className="label">Vehicle Number <span className="text-red-500">*</span></label>
        <input
          className={`input uppercase ${errors.vehicleNumber ? 'border-rose-300 focus:ring-rose-300' : ''}`}
          placeholder="e.g. GJ01AB1234"
          {...register('vehicleNumber', {
            required: 'Vehicle number is required',
            minLength: { value: 5, message: 'Enter a valid vehicle number' },
          })}
        />
        {errors.vehicleNumber && (
          <p className="mt-1 text-xs text-rose-500">{errors.vehicleNumber.message}</p>
        )}
      </div>

      {/* Driver Name */}
      <div>
        <label className="label">Driver Name</label>
        <input
          className="input"
          placeholder="e.g. Ramesh Kumar"
          {...register('driverName')}
        />
      </div>

      {/* Submit */}
      <div className="flex items-end">
        <button className="btn-primary w-full" disabled={create.isPending}>
          {create.isPending ? 'Dispatching…' : '🚛 Submit Dispatch'}
        </button>
      </div>

      {create.isError && (
        <div className="md:col-span-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          ⚠ {create.error?.response?.data?.error || 'Failed to create dispatch'}
        </div>
      )}
    </form>
  );
}

export default function L4ApprovedOrders() {
  const [openFor, setOpenFor] = useState(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ['orders', 'APPROVED'],
    queryFn: () => orders.list({ status: 'APPROVED' }),
  });

  return (
    <>
      <PageHeader
        title="Approved Orders"
        subtitle="Fill a dispatch form for each approved order — enter vehicle number and driver name."
      />

      <div className="space-y-3">
        {isLoading && (
          <div className="card card-body text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-3" />
            <span className="text-sm text-slate-500 font-medium">Loading orders…</span>
          </div>
        )}

        {data.map((o) => (
          <div key={o._id} className="card card-body border-l-4 border-l-brand-500">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800">{o.orderNumber}</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  {o.client?.clientName}
                  {o.site?.siteName && <span> · {o.site.siteName}</span>}
                  {' · '}
                  <span className="font-semibold">{o.grade}</span>
                  {' · '}
                  <span className="font-bold text-brand-600">{o.quantity} m³</span>
                  {' · '}
                  {fmtMoney(o.negotiatedRate)}/m³
                </div>
              </div>
              <button
                className={openFor === o._id ? 'btn-secondary' : 'btn-primary'}
                onClick={() => setOpenFor(openFor === o._id ? null : o._id)}
              >
                {openFor === o._id ? '✕ Close' : '🚛 Fill Dispatch'}
              </button>
            </div>

            {openFor === o._id && (
              <DispatchForm order={o} onDone={() => setOpenFor(null)} />
            )}
          </div>
        ))}

        {!isLoading && data.length === 0 && (
          <div className="card card-body text-center py-12">
            <div className="text-4xl mb-2">📋</div>
            <div className="text-sm text-slate-400 font-medium">No approved orders waiting for dispatch.</div>
          </div>
        )}
      </div>
    </>
  );
}
