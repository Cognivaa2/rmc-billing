import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { batchsheets, dispatches } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime } from '../../utils/format.js';

const STANDARD_FIELDS = [
  'sand1', 'sand2', 'agg_10mm1', 'agg_10mm2', 'agg5', 'agg6',
  'opc', 'ppc2', 'cem3', 'cem4', 'flyAsh',
  'water', 'wtr2', 'wtr3',
  'admi1', 'adm', 'admi2'
];

const META_FIELDS = [
  'batchNumber', 'batcherName', 'recipeCode', 'recipeName',
  'truckDriver', 'plantSerialNumber', 'mixerCapacity', 'batchSize'
];

export default function L4Batchsheets() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);

  const { data: list = [] } = useQuery({ queryKey: ['batchsheets'], queryFn: () => batchsheets.list() });
  const { data: dispatchList = [] } = useQuery({
    queryKey: ['dispatches'],
    queryFn: () => dispatches.list(),
  });

  const { register, control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { batches: [{}] }
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: 'batches' });
  const selectedDispatchId = watch('dispatch');
  const selectedDispatch = dispatchList.find(d => d._id === selectedDispatchId);

  // Auto-fill from grade mix design when dispatch changes
  useEffect(() => {
    if (selectedDispatch?.grade?.defaultMixDesign) {
      const mix = selectedDispatch.grade.defaultMixDesign;
      // Pre-fill metadata
      setValue('mix.recipeCode', selectedDispatch.grade.gradeCode);
      setValue('mix.recipeName', selectedDispatch.grade.gradeCode);
      // Pre-fill target values in the mix object
      STANDARD_FIELDS.forEach(f => {
        if (mix[f]) setValue(`mix.target_${f}`, mix[f]);
      });
    }
  }, [selectedDispatchId, selectedDispatch, setValue]);

  const create = useMutation({
    mutationFn: (d) => {
      return batchsheets.create({
        dispatch: d.dispatch,
        isCustom: true,
        mixDesignData: { ...d.mix, batches: d.batches },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batchsheets'] });
      reset({ batches: [{}] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, d }) => {
      return batchsheets.update(id, { mixDesignData: { ...d.mix, batches: d.batches } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batchsheets'] });
      reset({ batches: [{}] });
      setEditingId(null);
    },
  });

  const handleEdit = (b) => {
    setEditingId(b._id);
    setValue('dispatch', b.dispatch?._id);
    setValue('mix', b.mixDesignData);
    reset({ ...b.mixDesignData, dispatch: b.dispatch?._id, batches: b.mixDesignData.batches || [{}] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = (d) => {
    if (editingId) {
      update.mutate({ id: editingId, d });
    } else {
      create.mutate(d);
    }
  };

  return (
    <>
      <PageHeader
        title="Batchsheets"
        subtitle="Spreadsheet-mode for high-speed batch data entry."
      />

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {/* Header Metadata Card */}
        <div className="card card-body">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="font-bold text-slate-800">{editingId ? 'Updating Batchsheet' : 'New Batchsheet Record'}</h3>
            {editingId && (
              <button type="button" className="btn-secondary text-xs" onClick={() => { setEditingId(null); reset(); }}>
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="label">Select Dispatch *</label>
              <select className="select" required {...register('dispatch')} disabled={!!editingId}>
                <option value="">Choose dispatch...</option>
                {dispatchList.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.dispatchNumber} · {d.client?.clientName} · {d.grade?.gradeCode}
                  </option>
                ))}
              </select>
            </div>
            {META_FIELDS.slice(0, 4).map(f => (
              <div key={f}>
                <label className="label uppercase text-[10px] text-slate-400">{f.replace(/([A-Z])/g, ' $1')}</label>
                <input className="input py-1" {...register(`mix.${f}`)} />
              </div>
            ))}
          </div>
        </div>

        {/* Target Values Section */}
        <div className="card card-body bg-slate-50/50">
          <div className="label font-bold text-slate-600 uppercase tracking-wider text-xs mb-3">Recipe Target Values (Kgs)</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {STANDARD_FIELDS.map((f) => (
              <div key={f} className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">
                  Target {f.replace(/sand/i, 'SAND').replace(/agg/i, 'AGG').replace(/_/g, ' ')}
                </label>
                <input 
                  className="input py-1 text-sm bg-white" 
                  placeholder="0.00"
                  {...register(`mix.target_${f}`)} 
                />
              </div>
            ))}
          </div>
        </div>

        {/* Mixer Cycles / Batches Table */}
        <div className="card overflow-hidden">
          <div className="bg-slate-50 border-b p-3 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Mixer Cycles (Batches)</span>
            <button type="button" className="btn-primary text-xs py-1" onClick={() => append({})}>
              + Add Cycle
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="p-2 text-[10px] font-bold text-slate-500 border-r min-w-[40px]">#</th>
                  {STANDARD_FIELDS.map(f => (
                    <th key={f} className="p-2 text-[10px] font-bold text-slate-500 border-r min-w-[80px] uppercase">
                      {f.replace(/sand/i, 'SAND').replace(/agg/i, 'AGG')}
                    </th>
                  ))}
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-2 text-center text-xs font-mono text-slate-400 border-r">{index + 1}</td>
                    {STANDARD_FIELDS.map(f => (
                      <td key={f} className="p-1 border-r">
                        <input 
                          className="w-full border-none bg-transparent focus:ring-1 focus:ring-brand-500 text-sm py-1 px-1 text-right"
                          placeholder="0"
                          {...register(`batches.${index}.${f}`)} 
                        />
                      </td>
                    ))}
                    <td className="p-2 text-center">
                      <button type="button" className="text-rose-400 hover:text-rose-600" onClick={() => remove(index)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-400 max-w-md">
            Tip: Values are automatically saved for each mixer cycle. You can add as many cycles as needed to match the autographic record.
          </p>
          <button className="btn-primary px-12 py-3 font-bold" disabled={create.isPending || update.isPending}>
            {editingId ? 'Update Record' : 'Save Batchsheet'}
          </button>
        </div>
      </form>

      {/* History Table */}
      <div className="mt-8 card overflow-hidden">
        <table className="table-clean">
          <thead className="bg-slate-50">
            <tr><th>Dispatch</th><th>Cycles</th><th>By</th><th>Date</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b._id}>
                <td className="font-bold text-slate-700">{b.dispatch?.dispatchNumber}</td>
                <td><span className="badge-blue">{(b.mixDesignData?.batches || []).length} cycles</span></td>
                <td className="text-sm text-slate-500">{b.generatedByLevel4?.name}</td>
                <td className="text-sm text-slate-400">{fmtDateTime(b.generatedAt)}</td>
                <td className="text-right space-x-3">
                  <button className="text-xs font-bold text-brand-600 hover:underline" onClick={() => handleEdit(b)}>Edit</button>
                  <a className="text-xs font-bold text-slate-500 hover:underline" href={batchsheets.pdfUrl(b._id)} target="_blank" rel="noreferrer">PDF View</a>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="5" className="p-10 text-center text-sm text-slate-400 italic">No batchsheet records found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
