import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { dispatches, invoices, batchsheets } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime, fmtMoney } from '../../utils/format.js';

const STATUS_STEPS = ['dispatched', 'sale_authorized', 'batchsheet', 'invoiced'];

function StatusPipeline({ current }) {
  const labels = {
    dispatched: 'Dispatched',
    sale_authorized: 'Sale Auth.',
    batchsheet: 'Batchsheet',
    invoiced: 'Invoiced',
  };
  // Map actual status to step index
  const stepMap = { dispatched: 0, sale_authorized: 1, batchsheet: 2, invoiced: 3 };
  const idx = stepMap[current] ?? -1;
  return (
    <div className="flex items-center gap-1">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className={`h-2 w-2 rounded-full ${
              i < idx ? 'bg-emerald-500' : i === idx ? 'bg-brand-600' : 'bg-slate-200'
            }`}
          />
          <span
            className={`text-xs ${
              i === idx
                ? 'font-semibold text-brand-700'
                : i < idx
                ? 'text-emerald-500'
                : 'text-slate-300'
            }`}
          >
            {labels[s]}
          </span>
          {i < STATUS_STEPS.length - 1 && (
            <div className={`mx-1 h-px w-4 ${i < idx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Batchsheet Modal (Replicated from Batchsheets.jsx) ────────────────── */
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

function BatchsheetModal({ dispatch, existingBatchsheet, onClose, onSaved }) {
  const qc = useQueryClient();
  const { register, control, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      batches: existingBatchsheet?.mixDesignData?.batches || [{}],
      mix: existingBatchsheet?.mixDesignData || {}
    }
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: 'batches' });

  // Auto-fill from grade mix design if new
  useEffect(() => {
    if (!existingBatchsheet && dispatch?.grade?.defaultMixDesign) {
      const mix = dispatch.grade.defaultMixDesign;
      setValue('mix.recipeCode', dispatch.grade.gradeCode);
      setValue('mix.recipeName', dispatch.grade.gradeCode);
      STANDARD_FIELDS.forEach(f => {
        if (mix[f]) setValue(`mix.target_${f}`, mix[f]);
      });
    }
  }, [dispatch, existingBatchsheet, setValue]);

  const saveMutation = useMutation({
    mutationFn: (d) => {
      if (existingBatchsheet) {
        return batchsheets.update(existingBatchsheet._id, { 
          mixDesignData: { ...d.mix, batches: d.batches } 
        });
      } else {
        return batchsheets.create({
          dispatch: dispatch._id,
          isCustom: true,
          mixDesignData: { ...d.mix, batches: d.batches },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      qc.invalidateQueries({ queryKey: ['batchsheets'] });
      onSaved();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col my-8">
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">
            {existingBatchsheet ? 'Edit Batchsheet' : 'Fill Batchsheet'} — {dispatch.dispatchNumber}
          </h2>
          <button onClick={onClose} className="text-white hover:text-indigo-200">✕</button>
        </div>

        <form className="p-6 overflow-y-auto space-y-6" onSubmit={handleSubmit(saveMutation.mutate)}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            {META_FIELDS.slice(0, 4).map(f => (
              <div key={f}>
                <label className="label uppercase text-[10px] text-slate-400">{f.replace(/([A-Z])/g, ' $1')}</label>
                <input className="input py-1 bg-white" {...register(`mix.${f}`)} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            {STANDARD_FIELDS.map((f) => (
              <div key={f} className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Target {f}</label>
                <input className="input py-1 text-sm bg-white" {...register(`mix.target_${f}`)} />
              </div>
            ))}
          </div>

          <div className="border rounded-xl overflow-hidden">
            <div className="bg-slate-50 p-3 border-b flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-slate-500">Mixer Cycles</span>
              <button type="button" className="btn-primary text-[10px] py-1 px-3" onClick={() => append({})}>+ Add Cycle</button>
            </div>
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-400">
                    <th className="p-2 border-r w-10">#</th>
                    {STANDARD_FIELDS.map(f => <th key={f} className="p-2 border-r min-w-[80px]">{f.toUpperCase()}</th>)}
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.id} className="border-b hover:bg-slate-50">
                      <td className="p-2 text-center text-xs text-slate-400 border-r">{index + 1}</td>
                      {STANDARD_FIELDS.map(f => (
                        <td key={f} className="p-1 border-r">
                          <input className="w-full border-none bg-transparent text-sm py-1 px-1 text-right" {...register(`batches.${index}.${f}`)} />
                        </td>
                      ))}
                      <td className="p-2 text-center">
                        <button type="button" className="text-rose-400 hover:text-rose-600" onClick={() => remove(index)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary px-8" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Batchsheet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Invoice Modal ────────────────────────────────────────────────────── */
function InvoiceModal({ dispatch, onClose, onGenerated }) {
  const qc = useQueryClient();
  const [showRate, setShowRate] = useState(true);

  const generate = useMutation({
    mutationFn: () => invoices.create({
      dispatch: dispatch._id,
      showRateOnInvoice: showRate,
      idempotencyKey: crypto.randomUUID(),
    }),
    onSuccess: (created) => {
      window.open(invoices.pdfUrl(created._id), '_blank');
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      onGenerated();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden p-6 text-center">
        <div className="text-4xl mb-3">🧾</div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Generate Invoice</h2>
        <p className="text-sm text-slate-500 mb-6">Dispatch {dispatch.dispatchNumber} for {dispatch.client?.clientName}</p>
        
        <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left border border-slate-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showRate} 
              onChange={e => setShowRate(e.target.checked)} 
              className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-slate-700">Show negotiated rate on invoice</span>
          </label>
          <div className="mt-2 text-[10px] text-slate-400">
            Current Rate: {fmtMoney(dispatch.order?.negotiatedRate || 0)} per m³
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button 
            onClick={() => generate.mutate()} 
            className="btn-primary bg-emerald-600 hover:bg-emerald-700"
            disabled={generate.isPending}
          >
            {generate.isPending ? 'Generating...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    dispatched: 'badge-yellow',
    sale_authorized: 'badge-blue',
    invoiced: 'badge-green',
  };
  const labels = {
    dispatched: 'Dispatched',
    sale_authorized: 'Sale Auth.',
    batchsheet: 'Batchsheet Done',
    invoiced: 'Invoiced',
  };
  return <span className={cfg[status] || 'badge-gray'}>{labels[status] || status}</span>;
}

export default function L4Dispatches() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [batchModalTarget, setBatchModalTarget] = useState(null);
  const [invoiceModalTarget, setInvoiceModalTarget] = useState(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['dispatches', statusFilter],
    queryFn: () =>
      statusFilter === 'all' ? dispatches.list() : dispatches.list({ status: statusFilter }),
  });

  const { data: batchsheetsList = [] } = useQuery({
    queryKey: ['batchsheets'],
    queryFn: () => batchsheets.list(),
  });

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'sale_authorized', label: 'Sale Authorized' },
    { key: 'batchsheet', label: 'Batchsheet Done' },
    { key: 'invoiced', label: 'Invoiced' },
  ];

  return (
    <>
      <PageHeader
        title="My Dispatches"
        subtitle="Track every dispatch through sale authorisation and invoice generation."
      />

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === f.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Action hint banner */}
      {data.filter((d) => d.status === 'sale_authorized').length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-brand-50 border border-brand-100 p-3 text-sm text-brand-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
          </svg>
          <span>
            <strong>{data.filter((d) => d.status === 'sale_authorized').length}</strong> dispatch(es) are sale authorized.
            You can now generate batchsheets and invoices.{' '}
            <a href="/l4/batchsheets" className="font-semibold underline">Batchsheets →</a>
            {' · '}
            <a href="/l4/invoices" className="font-semibold underline">Invoices →</a>
          </span>
        </div>
      )}

      <div className="space-y-3">
        {isLoading && (
          <div className="card card-body text-center text-sm text-slate-400">Loading…</div>
        )}

        {data.map((d) => (
          <div key={d._id} className="card card-body">
            <div className="flex flex-wrap items-start justify-between gap-3">
              {/* Left: dispatch info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-slate-800">{d.dispatchNumber}</div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {d.client?.clientName}
                  {d.grade?.gradeCode && <> · <span className="font-medium text-slate-700">{d.grade.gradeCode}</span></>}
                  {' '}· {d.quantity} m³
                  {' '}· <span className="font-mono">{d.vehicleNumber}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {d.salesOrder?.soNumber ? `SO: ${d.salesOrder.soNumber}` : `Order: ${d.order?.orderNumber || '—'}`} · {fmtDateTime(d.dispatchDateTime)}
                </div>
                <div className="mt-2">
                  <StatusPipeline current={d.status} />
                </div>
              </div>

              {/* Right: action buttons */}
              <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center">

                {/* STEP 1 — Dispatched: waiting for L2 sale auth */}
                {d.status === 'dispatched' && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                      Awaiting L2 Sale Auth
                    </div>
                    <p className="text-[10px] text-slate-400">Level 2 must authorize sale before batchsheet &amp; invoice</p>
                  </div>
                )}

                {/* STEP 2 — Sale authorized */}
                {d.status === 'sale_authorized' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('/l4/batchsheets', { state: { dispatchId: d._id } })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-sm"
                    >
                      📋 Fill Batchsheet
                    </button>
                    <button
                      onClick={() => navigate('/l4/invoices', { state: { dispatchId: d._id } })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition shadow-sm"
                    >
                      🧾 Generate Invoice / Challan
                    </button>
                  </div>
                )}

                {/* STEP 3 — Batchsheet Done: can do Invoice */}
                {d.status === 'batchsheet' && (
                  <>
                    <button
                      onClick={() => navigate('/l4/batchsheets', { state: { dispatchId: d._id } })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                      📋 Edit Batchsheet
                    </button>
                    <button
                      onClick={() => navigate('/l4/invoices', { state: { dispatchId: d._id } })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-sm"
                    >
                      🧾 Generate Invoice / Challan
                    </button>
                  </>
                )}

                {/* STEP 4 — Invoiced: readonly */}
                {d.status === 'invoiced' && (
                  <Link
                    to="/l4/invoices"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    View Invoice
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}

        {!isLoading && data.length === 0 && (
          <div className="card card-body text-center text-slate-400">
            <div className="text-2xl mb-2">🚛</div>
            <div className="text-sm">No dispatches found for this filter.</div>
            <Link to="/l4/approved-orders" className="mt-3 inline-block btn-primary text-xs">
              Fill a Dispatch Form
            </Link>
          </div>
        )}
      </div>

      {batchModalTarget && (
        <BatchsheetModal
          dispatch={batchModalTarget}
          existingBatchsheet={batchsheetsList.find(b => b.dispatch?._id === batchModalTarget._id || b.dispatch === batchModalTarget._id)}
          onClose={() => setBatchModalTarget(null)}
          onSaved={() => setBatchModalTarget(null)}
        />
      )}

      {invoiceModalTarget && (
        <InvoiceModal
          dispatch={invoiceModalTarget}
          onClose={() => setInvoiceModalTarget(null)}
          onGenerated={() => setInvoiceModalTarget(null)}
        />
      )}
    </>
  );
}
