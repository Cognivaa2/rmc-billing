import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { admin, companySettings } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';

export default function L1Admin() {
  const qc = useQueryClient();
  const [dispatchRange, setDispatchRange] = useState({ from: '', to: '' });
  const [batchRange, setBatchRange] = useState({ from: '', to: '' });
  const [result, setResult] = useState(null);

  // ── Company Settings ──────────────────────────────────────────
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => companySettings.get(),
  });

  const { register, handleSubmit, reset } = useForm();

  // Pre-fill form when settings load
  useState(() => {
    if (settings) reset(settings);
  });

  const updateSettings = useMutation({
    mutationFn: (d) => companySettings.update(d),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['company-settings'] });
      reset(updated);
    },
  });

  // ── Dispatch / Batchsheet deletion ───────────────────────────
  const deleteDispatch = async () => {
    const confirmed = window.prompt('Type DELETE to permanently remove matching dispatch records.');
    if (confirmed !== 'DELETE') return;
    const r = await admin.deleteDispatchData(dispatchRange);
    setResult(`Deleted ${r.deletedCount} dispatch record(s)`);
  };

  const deleteBatch = async () => {
    const confirmed = window.prompt('Type DELETE to permanently remove matching batchsheet records.');
    if (confirmed !== 'DELETE') return;
    const r = await admin.deleteBatchsheetData(batchRange);
    setResult(`Deleted ${r.deletedCount} batchsheet record(s)`);
  };

  return (
    <>
      <PageHeader
        title="Admin Panel"
        subtitle="Company settings, data retention controls. Client master is permanent."
      />

      {/* ── Company Settings ───────────────────────────────────────── */}
      <div className="card card-body mb-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="text-lg font-semibold text-slate-800">Company Settings</div>
          <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            Used in Invoice PDF
          </span>
        </div>

        {settingsLoading ? (
          <div className="text-sm text-slate-400">Loading settings…</div>
        ) : (
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={handleSubmit((d) => updateSettings.mutate(d))}
          >
            <div>
              <label className="label">Company Name *</label>
              <input className="input" defaultValue={settings?.companyName} {...register('companyName')} />
            </div>
            <div>
              <label className="label">GSTIN</label>
              <input className="input" placeholder="22AAAAA0000A1Z5" defaultValue={settings?.gstin} {...register('gstin')} />
            </div>
            <div>
              <label className="label">Registered Address</label>
              <input className="input" defaultValue={settings?.regAddress} {...register('regAddress')} />
            </div>
            <div>
              <label className="label">Dispatch Address</label>
              <input className="input" defaultValue={settings?.dispatchAddress} {...register('dispatchAddress')} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" defaultValue={settings?.phone} {...register('phone')} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" defaultValue={settings?.email} {...register('email')} />
            </div>
            <div className="md:col-span-2 flex items-center justify-between">
              {updateSettings.isSuccess && (
                <span className="text-sm text-emerald-600">Settings saved ✓</span>
              )}
              {updateSettings.isError && (
                <span className="text-sm text-rose-600">Failed to save</span>
              )}
              <div className="ml-auto">
                <button className="btn-primary" disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? 'Saving…' : 'Save Company Settings'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ── Data Retention ─────────────────────────────────────────── */}
      <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
        <div className="font-semibold">⚠ Data Retention Warning</div>
        Level 1 has exclusive authority to delete dispatch and batchsheet records.
        The master client database cannot be affected in any way.
      </div>

      {result && (
        <div className="mb-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{result}</div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="card card-body">
          <div className="text-lg font-semibold">Dispatch data</div>
          <p className="mt-1 text-sm text-slate-500">
            Deletes dispatch form records within the selected date range.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label">From</label>
              <input
                type="date"
                className="input"
                value={dispatchRange.from}
                onChange={(e) => setDispatchRange((r) => ({ ...r, from: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">To</label>
              <input
                type="date"
                className="input"
                value={dispatchRange.to}
                onChange={(e) => setDispatchRange((r) => ({ ...r, to: e.target.value }))}
              />
            </div>
          </div>
          <button className="btn-danger mt-4" onClick={deleteDispatch}>Delete matching dispatch records</button>
        </div>

        <div className="card card-body">
          <div className="text-lg font-semibold">Batchsheet data</div>
          <p className="mt-1 text-sm text-slate-500">
            Deletes batchsheet records within the selected date range.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label">From</label>
              <input
                type="date"
                className="input"
                value={batchRange.from}
                onChange={(e) => setBatchRange((r) => ({ ...r, from: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">To</label>
              <input
                type="date"
                className="input"
                value={batchRange.to}
                onChange={(e) => setBatchRange((r) => ({ ...r, to: e.target.value }))}
              />
            </div>
          </div>
          <button className="btn-danger mt-4" onClick={deleteBatch}>Delete matching batchsheet records</button>
        </div>
      </div>
    </>
  );
}
