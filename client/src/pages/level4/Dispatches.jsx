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
  const stepMap = { dispatched: 0, sale_authorized: 1, batchsheet: 2, invoiced: 3 };
  const idx = stepMap[current] ?? -1;
  return (
    <div className="flex items-center justify-between gap-1 w-full max-w-md overflow-x-auto pb-1 no-scrollbar">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-shrink-0">
          <div
            className={`h-2 w-2 rounded-full flex-shrink-0 ${i < idx ? 'bg-emerald-500' : i === idx ? 'bg-brand-600' : 'bg-slate-200'
              }`}
          />
          <span
            className={`text-[10px] sm:text-xs whitespace-nowrap ${i === idx
              ? 'font-bold text-brand-700'
              : i < idx
                ? 'text-emerald-600 font-medium'
                : 'text-slate-400'
              }`}
          >
            {labels[s]}
          </span>
          {i < STATUS_STEPS.length - 1 && (
            <div className={`mx-0.5 sm:mx-1 h-px w-2 sm:w-4 flex-shrink-0 ${i < idx ? 'bg-emerald-400' : 'bg-slate-200'}`} />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        <div className="bg-brand-700 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-sm sm:text-lg font-bold text-white truncate">
            {existingBatchsheet ? 'Edit Batchsheet' : 'Fill Batchsheet'} — {dispatch.dispatchNumber}
          </h2>
          <button onClick={onClose} className="text-white hover:text-slate-200 p-1">✕</button>
        </div>

        <form className="p-3 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6" onSubmit={handleSubmit(saveMutation.mutate)}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100">
            {META_FIELDS.slice(0, 4).map(f => (
              <div key={f}>
                <label className="label uppercase text-[9px] sm:text-[10px] text-slate-400 font-bold tracking-wider">{f.replace(/([A-Z])/g, ' $1')}</label>
                <input className="input py-1.5 sm:py-2 text-xs sm:text-sm bg-white" {...register(`mix.${f}`)} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100">
            {STANDARD_FIELDS.map((f) => (
              <div key={f} className="space-y-1">
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Target {f}</label>
                <input className="input py-1 sm:py-1.5 text-xs bg-white text-right" {...register(`mix.target_${f}`)} />
              </div>
            ))}
          </div>

          <div className="border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 p-3 border-b flex justify-between items-center">
              <span className="text-[10px] sm:text-xs font-black uppercase text-slate-500 tracking-widest">Mixer Cycles</span>
              <button type="button" className="btn-primary text-[9px] sm:text-[10px] py-1 px-3" onClick={() => append({})}>+ Add Cycle</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="bg-slate-50 border-b text-[9px] sm:text-[10px] font-black text-slate-400">
                    <th className="p-2 border-r w-8">#</th>
                    {STANDARD_FIELDS.map(f => <th key={f} className="p-2 border-r min-w-[60px] sm:min-w-[80px]">{f.toUpperCase()}</th>)}
                    <th className="p-2 w-10 text-center">X</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-2 text-center text-[10px] font-bold text-slate-400 border-r">{index + 1}</td>
                      {STANDARD_FIELDS.map(f => (
                        <td key={f} className="p-0 border-r">
                          <input className="w-full border-none bg-transparent text-xs sm:text-sm py-2 px-1 text-right focus:bg-white focus:ring-1 focus:ring-brand-500 transition-all" {...register(`batches.${index}.${f}`)} />
                        </td>
                      ))}
                      <td className="p-2 text-center">
                        <button type="button" className="text-rose-400 hover:text-rose-600 transition-colors p-1" onClick={() => remove(index)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2 sm:pt-4">
            <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto text-xs sm:text-sm py-2">Cancel</button>
            <button type="submit" className="btn-primary px-6 sm:px-8 w-full sm:w-auto text-xs sm:text-sm py-2 shadow-lg shadow-brand-200" disabled={saveMutation.isPending}>
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
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${statusFilter === f.key
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

      <div className="space-y-4">
        {isLoading && (
          <div className="card card-body text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-3"></div>
            <span className="text-sm text-slate-500 font-medium tracking-tight">Syncing dispatches...</span>
          </div>
        )}

        {data.map((d) => (
          <div key={d._id} className="card card-body border-none shadow-xl shadow-slate-200/50 hover:shadow-slate-200/80 transition-shadow duration-300">
            <div className="flex flex-col gap-4">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 tracking-tighter">{d.dispatchNumber}</span>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-brand-700 uppercase tracking-tighter">
                    {d.client?.clientName}
                  </div>
                </div>
                <div className="text-[10px] sm:text-xs text-slate-400 font-medium text-left sm:text-right">
                  {d.salesOrder?.soNumber ? `SO: ${d.salesOrder.soNumber}` : `Order: ${d.order?.orderNumber || '—'}`}
                  <br />
                  {fmtDateTime(d.dispatchDateTime)}
                </div>
              </div>

              {/* Status Pipeline - Scrollable on mobile */}
              <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                <StatusPipeline current={d.status} />
              </div>

              {/* Detailed Specs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2 border-y border-slate-50">
                <div>
                  <div className="text-[9px] uppercase font-black text-slate-400 tracking-tight">Grade</div>
                  <div className="text-xs font-bold text-slate-700">{d.grade?.gradeCode || '—'}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-black text-slate-400 tracking-tight">Quantity</div>
                  <div className="text-xs font-bold text-slate-700">{d.quantity} m³</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-black text-slate-400 tracking-tight">Vehicle</div>
                  <div className="text-xs font-mono font-bold text-slate-700">{d.vehicleNumber}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase font-black text-slate-400 tracking-tight">Wait Time</div>
                  <div className="text-xs font-bold text-slate-700">{d.waitTime || 0} min</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-2 pt-2">
                {/* STEP 1 — Dispatched: waiting for L2 sale auth */}
                {d.status === 'dispatched' && (
                  <div className="flex flex-row items-center justify-between sm:justify-end gap-2 bg-amber-50/50 px-3 py-2 rounded-xl border border-amber-100 w-full sm:w-auto">
                    <span className="text-[10px] sm:text-xs font-bold text-amber-700 flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
                      Awaiting L2 Sale Auth
                    </span>
                  </div>
                )}

                {/* STEP 2 — Sale authorized */}
                {d.status === 'sale_authorized' && (
                  <>
                    <button
                      onClick={() => navigate('/l4/batchsheets', { state: { dispatchId: d._id } })}
                      className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-[11px] py-2.5 px-4 shadow-lg shadow-indigo-100"
                    >
                      📋 Fill Batchsheet
                    </button>
                    <button
                      onClick={() => navigate('/l4/invoices', { state: { dispatchId: d._id } })}
                      className="btn-secondary border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] py-2.5 px-4"
                    >
                      🧾 Generate Invoice
                    </button>
                  </>
                )}

                {/* STEP 3 — Batchsheet Done: can do Invoice */}
                {d.status === 'batchsheet' && (
                  <>
                    <button
                      onClick={() => navigate('/l4/batchsheets', { state: { dispatchId: d._id } })}
                      className="btn-secondary border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-[11px] py-2.5 px-4"
                    >
                      📋 Edit Batchsheet
                    </button>
                    <button
                      onClick={() => navigate('/l4/invoices', { state: { dispatchId: d._id } })}
                      className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-[11px] py-2.5 px-4 shadow-lg shadow-emerald-100"
                    >
                      🧾 Generate Invoice
                    </button>
                  </>
                )}

                {/* STEP 4 — Invoiced: readonly */}
                {d.status === 'invoiced' && (
                  <Link
                    to="/l4/invoices"
                    className="btn-secondary border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-[11px] py-2.5 px-4 text-center"
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
