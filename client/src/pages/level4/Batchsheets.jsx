import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { api } from '../../api/client.js';
import { batchsheets, dispatches } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime } from '../../utils/format.js';

const MATERIALS = [
  { key: 'sand1', label: 'Sand 1' },
  { key: 'sand2', label: 'Sand 2' },
  { key: 'agg_10mm1', label: 'Agg 10mm 1' },
  { key: 'agg_10mm2', label: 'Agg 10mm 2' },
  { key: 'agg5', label: 'Agg 5mm' },
  { key: 'agg6', label: 'Agg 6mm' },
  { key: 'opc', label: 'OPC' },
  { key: 'ppc2', label: 'PPC 2' },
  { key: 'cem3', label: 'Cement 3' },
  { key: 'cem4', label: 'Cement 4' },
  { key: 'flyAsh', label: 'Fly Ash' },
  { key: 'water', label: 'Water' },
  { key: 'wtr2', label: 'Water 2' },
  { key: 'wtr3', label: 'Water 3' },
  { key: 'admi1', label: 'Admixture 1' },
  { key: 'adm', label: 'Admixture' },
  { key: 'admi2', label: 'Admixture 2' },
];

export default function L4Batchsheets() {
  const qc = useQueryClient();
  const location = useLocation();
  const [editingId, setEditingId] = useState(null);

  const [page, setPage] = useState(1);

  const { data: allBatchsheets = [] } = useQuery({
    queryKey: ['batchsheets', 'all'],
    queryFn: () => batchsheets.list(),
  });

  const { data: pageData } = useQuery({
    queryKey: ['batchsheets', { page }],
    queryFn: () => batchsheets.list({ page, limit: 6 }),
  });

  const list = pageData?.batchsheets || [];
  const totalPages = pageData?.pages || 1;
  const { data: dispatchList = [] } = useQuery({
    queryKey: ['dispatches'],
    queryFn: () => dispatches.list(),
  });

  const initialDispatchId = location.state?.dispatchId || '';
  const { register, control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { dispatch: initialDispatchId, batches: [{}] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'batches' });
  const selectedDispatchId = watch('dispatch');
  const selectedDispatch = dispatchList.find((d) => d._id === selectedDispatchId);

  const eligibleDispatches = dispatchList.filter((d) => {
    if (!['sale_authorized', 'invoiced'].includes(d.status)) return false;
    const alreadyHasBatchsheet = allBatchsheets.some((b) => (b.dispatch?._id || b.dispatch) === d._id);
    return !alreadyHasBatchsheet;
  });

  useEffect(() => {
    // Only auto-fill if we are NOT editing an existing batchsheet
    if (!editingId && selectedDispatch) {
      if (selectedDispatch.grade?.defaultMixDesign) {
        const mix = selectedDispatch.grade.defaultMixDesign;
        setValue('mix.recipeCode', selectedDispatch.grade.gradeCode);
        setValue('mix.recipeName', selectedDispatch.grade.gradeCode);
        MATERIALS.forEach(({ key }) => {
          if (mix[key]) setValue(`mix.target_${key}`, mix[key]);
        });
      }
      // Auto-fill Truck Driver from Dispatch
      if (selectedDispatch.driverName) {
        setValue('mix.truckDriver', selectedDispatch.driverName);
      }
    }
  }, [selectedDispatchId, selectedDispatch, setValue, editingId]);

  const create = useMutation({
    mutationFn: (d) =>
      batchsheets.create({
        dispatch: d.dispatch,
        isCustom: true,
        mixDesignData: { ...d.mix, batches: d.batches },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batchsheets'] });
      reset({ dispatch: '', batches: [{}], mix: {} });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, d }) =>
      batchsheets.update(id, { mixDesignData: { ...d.mix, batches: d.batches } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batchsheets'] });
      reset({ dispatch: '', batches: [{}], mix: {} });
      setEditingId(null);
    },
  });

  const handleEdit = (b) => {
    setEditingId(b._id);
    const { batches, ...restMix } = b.mixDesignData || {};
    reset({
      dispatch: b.dispatch?._id,
      mix: restMix,
      batches: batches || [{}],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset({ dispatch: '', batches: [{}] });
  };

  const onSubmit = (d) => {
    if (editingId) {
      update.mutate({ id: editingId, d });
    } else {
      create.mutate(d);
    }
  };

  const isBusy = create.isPending || update.isPending;

  const viewPdf = async (id) => {
    try {
      const url = batchsheets.pdfUrl(id);
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Failed to load PDF:', err);
      alert('Failed to load PDF.');
    }
  };

  return (
    <>
      <PageHeader
        title="Batchsheets"
        subtitle="Record concrete batch data for each sale-authorized dispatch."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">

        {/* ── LEFT: Form ── */}
        <div className="xl:col-span-3 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Step 1 — Select Dispatch */}
            <div className="card card-body">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-800">
                  {editingId ? '✏️ Editing Batchsheet' : '1 — Select Dispatch'}
                </h2>
                {editingId && (
                  <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={cancelEdit}>
                    Cancel Edit
                  </button>
                )}
              </div>
              <select className="select" required {...register('dispatch')} disabled={!!editingId}>
                <option value="">Choose a sale-authorized dispatch…</option>
                {eligibleDispatches.length === 0 && (
                  <option disabled>No eligible dispatches — needs L2 authorization</option>
                )}
                {eligibleDispatches.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.dispatchNumber} · {d.client?.clientName} · {d.grade?.gradeCode}
                  </option>
                ))}
              </select>
              {selectedDispatch && (
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Vehicle: <strong>{selectedDispatch.vehicleNumber}</strong></span>
                  <span>Qty: <strong>{selectedDispatch.quantity} m³</strong></span>
                  <span>Grade: <strong>{selectedDispatch.grade?.gradeCode}</strong></span>
                </div>
              )}
            </div>

            {/* Step 2 — Recipe Targets */}
            <div className="card card-body">
              <h2 className="font-semibold text-slate-800 mb-3">2 — Recipe Target Values (kg)</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {MATERIALS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="label text-[11px]">{label}</label>
                    <input
                      className="input py-1.5 text-sm"
                      placeholder="0.00"
                      {...register(`mix.target_${key}`)}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 border-t border-slate-100 pt-3">
                <div>
                  <label className="label text-[11px]">Recipe Code</label>
                  <input className="input py-1.5 text-sm" {...register('mix.recipeCode')} />
                </div>
                <div>
                  <label className="label text-[11px]">Recipe Name</label>
                  <input className="input py-1.5 text-sm" {...register('mix.recipeName')} />
                </div>
                <div>
                  <label className="label text-[11px]">Batcher Name</label>
                  <input className="input py-1.5 text-sm" {...register('mix.batcherName')} />
                </div>
                <div>
                  <label className="label text-[11px]">Truck Driver</label>
                  <input className="input py-1.5 text-sm bg-slate-50" {...register('mix.truckDriver')} readOnly />
                </div>
                <div>
                  <label className="label text-[11px]">Adj / Manual Qty</label>
                  <input className="input py-1.5 text-sm" {...register('mix.adjQuantity')} />
                </div>
                <div>
                  <label className="label text-[11px]">Plant Serial No</label>
                  <input className="input py-1.5 text-sm" {...register('mix.plantSerialNumber')} placeholder="BP-1" />
                </div>
              </div>
            </div>

            {/* Step 3 — Mixer Cycles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800 text-lg">3 — Mixer Cycles</h2>
                <button
                  type="button"
                  className="btn-primary text-sm px-4 py-2"
                  onClick={() => append({})}
                >
                  + Add Cycle
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="card border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cycle #{index + 1}</span>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                        onClick={() => remove(index)}
                        title="Remove Cycle"
                      >
                        <span className="text-xl font-bold">×</span>
                      </button>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {MATERIALS.map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-[10px] font-medium text-slate-400 uppercase mb-0.5 truncate" title={label}>
                            {label}
                          </label>
                          <input
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-brand-500 focus:border-brand-400 text-right font-mono"
                            placeholder="0"
                            {...register(`batches.${index}.${key}`)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {fields.length === 0 && (
                  <div className="card card-body py-10 text-center border-dashed border-2 border-slate-200 bg-slate-50">
                    <div className="text-4xl mb-2 grayscale opacity-20">🔄</div>
                    <p className="text-sm text-slate-400">No mixer cycles added. Click "+ Add Cycle" to begin.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                className="btn-primary px-8 py-2.5 font-semibold disabled:opacity-60"
                disabled={isBusy}
              >
                {isBusy ? 'Saving…' : editingId ? 'Update Batchsheet' : 'Save Batchsheet'}
              </button>
            </div>
          </form>
        </div>

        {/* ── RIGHT: History ── */}
        <div className="xl:col-span-2">
          <div className="card overflow-hidden sticky top-4">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Saved Batchsheets</h2>
              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-0.5 rounded-full">{pageData?.total || 0} Total</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
              {list.map((b) => (
                <div key={b._id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{b.dispatch?.dispatchNumber}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {(b.mixDesignData?.batches || []).length} cycle{(b.mixDesignData?.batches || []).length !== 1 ? 's' : ''} &middot; {b.generatedByLevel4?.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{fmtDateTime(b.generatedAt)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        className="text-xs font-medium text-brand-600 hover:text-brand-800 bg-brand-50 px-3 py-1 rounded transition-colors"
                        onClick={() => handleEdit(b)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 px-3 py-1 rounded transition-colors text-center"
                        onClick={() => viewPdf(b._id)}
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {list.length === 0 && (
                <div className="py-12 text-center">
                  <div className="text-3xl mb-2 opacity-30">📋</div>
                  <p className="text-sm text-slate-400">No batchsheets recorded yet.</p>
                </div>
              )}
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-slate-50">
                <button
                  type="button"
                  className="btn-secondary px-3 py-1 text-xs"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="text-xs font-medium text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-secondary px-3 py-1 text-xs"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
