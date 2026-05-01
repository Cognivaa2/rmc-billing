import { useState } from 'react';
import { reports } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';

const REPORTS = [
  {
    id: 'daily-dispatch',
    title: 'Daily Dispatch Report',
    fields: 'Date/Time · L4 · L3 · Client · Site · Grade · Qty · Rate · L2',
    dateable: true,
  },
  {
    id: 'sales-orders',
    title: 'Sales Order Report',
    fields: 'Client · Grade · Status · Rate · Qty · L4 · L2 · KYC · Credit · Dispatched · Remaining',
    dateable: false,
  },
  {
    id: 'clients',
    title: 'Client Database Report',
    fields: 'Client · L3 · Address · KYC · Tax Info · Contact · Email',
    dateable: false,
  },
  {
    id: 'payments',
    title: 'Payment Report',
    fields: 'Date · Client · Invoice · Amount · Received · Received At · Recorded By',
    dateable: true,
  },
];

export default function L1Reports() {
  const [range, setRange] = useState({ from: '', to: '' });

  const download = async (id, format) => {
    const params = { format };
    if (range.from) params.from = range.from;
    if (range.to) params.to = range.to;
    const url = reports.downloadUrl(id, params);
    const res = await fetch(url, { credentials: 'include' });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${id}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Downloads restricted to Level 1." />

      <div className="card card-body mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">From</label>
          <input
            type="date"
            className="input"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">To</label>
          <input
            type="date"
            className="input"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </div>
        <div className="text-xs text-slate-500">Date filter applies to date-aware reports.</div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {REPORTS.map((r) => (
          <div key={r.id} className="card card-body">
            <div className="text-lg font-semibold">{r.title}</div>
            <div className="mt-2 text-xs text-slate-500">{r.fields}</div>
            <div className="mt-5 flex gap-2">
              <button className="btn-primary flex-1" onClick={() => download(r.id, 'pdf')}>PDF</button>
              <button className="btn-secondary flex-1" onClick={() => download(r.id, 'xlsx')}>Excel</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
