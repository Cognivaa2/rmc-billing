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
      vehicleNumber: String(d.vehicleNumber),
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
      className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner grid grid-cols-1 gap-4 md:grid-cols-3 animate-fadeIn"
      onSubmit={handleSubmit((d) => create.mutate(d))}
    >
      <div className="md:col-span-3 pb-1 border-b border-slate-200/60">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <span>🚚</span> Dispatch Details
        </h4>
      </div>

      {/* Total Vehicle (maps to vehicleNumber in API) */}
      <div>
        <label className="label flex items-center gap-1 text-slate-600 font-bold">
          Total Vehicle <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="1"
          step="1"
          className={`input font-mono tracking-wider ${errors.vehicleNumber ? 'border-rose-300 focus:ring-rose-300 focus:border-rose-400' : 'focus:border-brand-500 focus:ring-brand-500'}`}
          placeholder="e.g. 1, 2, or 3"
          {...register('vehicleNumber', {
            required: 'Total vehicle count is required',
            min: { value: 1, message: 'Must be at least 1' },
          })}
        />
        {errors.vehicleNumber && (
          <p className="mt-1.5 text-xs text-rose-500 font-medium flex items-center gap-1">
            <span>⚠️</span> {errors.vehicleNumber.message}
          </p>
        )}
      </div>

      {/* Driver Name */}
      <div>
        <label className="label text-slate-600 font-bold">Driver Name</label>
        <input
          className="input focus:border-brand-500 focus:ring-brand-500"
          placeholder="e.g. Ramesh Kumar"
          {...register('driverName')}
        />
      </div>

      {/* Submit Button */}
      <div className="flex items-end">
        <button 
          className="w-full btn bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold shadow-md shadow-brand-500/10 active:scale-[0.98] transition-all py-2 rounded-lg" 
          disabled={create.isPending}
        >
          {create.isPending ? 'Dispatching…' : '🚛 Submit Dispatch'}
        </button>
      </div>

      {create.isError && (
        <div className="md:col-span-3 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 font-medium flex items-center gap-2">
          <span>⚠️</span> {create.error?.response?.data?.error || 'Failed to create dispatch'}
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
        subtitle="Manage dispatches for approved orders. Fill out the vehicle and driver details to send dispatches."
      />

      <div className="space-y-4">
        {isLoading && (
          <div className="card card-body text-center py-16">
            <div className="relative flex justify-center items-center mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
              <div className="absolute animate-ping h-8 w-8 rounded-full border-2 border-brand-100" />
            </div>
            <span className="text-sm text-slate-500 font-bold tracking-wide">Syncing approved orders…</span>
          </div>
        )}

        {data.map((o) => {
          const totalValue = (o.quantity || 0) * (o.negotiatedRate || 0);
          const isOpen = openFor === o._id;

          return (
            <div 
              key={o._id} 
              className={`card overflow-hidden transition-all duration-300 border-l-4 ${isOpen ? 'border-l-brand-600 shadow-md ring-1 ring-slate-100' : 'border-l-slate-300 hover:border-l-brand-400 hover:shadow-md'}`}
            >
              <div className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between">
                  
                  {/* Left Column: Order Identity and Main Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-black text-slate-700 tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
                        {o.orderNumber}
                      </span>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Approved
                      </span>
                    </div>

                    <div className="mt-3">
                      <h3 className="text-lg font-black text-slate-800 tracking-tight">{o.client?.clientName}</h3>
                      
                      <div className="mt-2 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-semibold text-slate-500">
                        {o.site?.siteName && (
                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            <span className="text-slate-400">📍</span>
                            {o.site.siteName}
                          </span>
                        )}
                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          <span className="text-slate-400">🏗️</span>
                          Grade: <strong className="text-slate-700">{o.grade}</strong>
                        </span>
                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          <span className="text-slate-400">📦</span>
                          Qty: <strong className="text-brand-600">{o.quantity} m³</strong>
                        </span>
                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          <span className="text-slate-400">💰</span>
                          Rate: <strong className="text-slate-700">{fmtMoney(o.negotiatedRate)}/m³</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Section: Total Order Value */}
                  <div className="flex items-center gap-3 lg:px-8 lg:border-r lg:border-slate-100 shrink-0">
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estimated Value</div>
                      <div className="text-lg font-black text-emerald-600 tracking-tight mt-0.5">
                        {fmtMoney(totalValue)}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center lg:justify-end gap-3 shrink-0">
                    <button
                      className={`btn w-full lg:w-auto px-4 py-2 font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] ${isOpen 
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' 
                        : 'bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200'}`}
                      onClick={() => setOpenFor(isOpen ? null : o._id)}
                    >
                      {isOpen ? '✕ Close' : '🚛 Fill Dispatch'}
                    </button>
                  </div>

                </div>

                {/* Dispatch Form section */}
                {isOpen && (
                  <div className="border-t border-slate-100 mt-4">
                    <DispatchForm order={o} onDone={() => setOpenFor(null)} />
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {!isLoading && data.length === 0 && (
          <div className="card card-body text-center py-16 border-2 border-dashed border-slate-200 bg-slate-50/50">
            <div className="text-5xl mb-4 filter drop-shadow-sm">📋</div>
            <h3 className="text-base font-black text-slate-700">All Cleared!</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
              No approved orders waiting for dispatch at the moment. When orders are approved by managers, they will appear here.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
