import { useState } from 'react';
import { reports } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';

const REPORTS = [
  {
    id: 'sales-orders',
    title: 'Sales Order Report',
    description: 'Comprehensive overview of all sales orders including status, rates, and dispatch tracking.',
    fields: ['Client Name', 'Grade', 'SO Status', 'Rate', 'Quantity', 'Level 4', 'Level 2', 'KYC', 'Credit', 'Dispatched', 'Remaining'],
    dateable: false,
    color: 'blue'
  },
  {
    id: 'clients',
    title: 'Client Database',
    description: 'Master list of all clients with contact details, tax information, and KYC status.',
    fields: ['Client', 'L3 Manager', 'Address', 'KYC', 'GSTIN/PAN', 'Contact', 'Email'],
    dateable: false,
    color: 'indigo'
  },
  {
    id: 'payments',
    title: 'Payment Report',
    description: 'Detailed log of all recorded payments, invoice links, and recording authorities.',
    fields: ['Date', 'Client', 'Invoice', 'Amount', 'Received Status', 'Recorded By'],
    dateable: true,
    color: 'emerald'
  },
];

const PdfIcon = () => (
  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h1m4 0h1m-5 4h5m-5 4h5" />
  </svg>
);

const ExcelIcon = () => (
  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const COLOR_MAP = {
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500'
};

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
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Reporting Center" subtitle="Generate and export system-wide data reports." />

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Global Date Filter</h3>
            <p className="text-xs text-slate-500">Applies to date-sensitive reports like Payments.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-medium text-slate-400">FROM</label>
              <input
                type="date"
                className="input h-11 pt-2 w-40"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              />
            </div>
            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-white text-[10px] font-medium text-slate-400">TO</label>
              <input
                type="date"
                className="input h-11 pt-2 w-40"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              />
            </div>
            <button
              className="text-xs text-blue-600 font-medium hover:underline"
              onClick={() => setRange({ from: '', to: '' })}
            >
              Clear Filter
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <div key={r.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
            <div className={`h-2 w-full ${COLOR_MAP[r.color] || 'bg-slate-500'}`} />
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-slate-900">{r.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed flex-1">
                {r.description}
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {r.fields.slice(0, 4).map(f => (
                    <span key={f} className="px-2 py-0.5 bg-slate-50 text-[10px] font-medium text-slate-500 rounded-md border border-slate-100">
                      {f}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 text-[10px] font-medium text-slate-400 italic">
                    +{r.fields.length - 4} more
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    className="flex-1 h-10 flex items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                    onClick={() => download(r.id, 'pdf')}
                  >
                    <PdfIcon /> PDF
                  </button>
                  <button
                    className="flex-1 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                    onClick={() => download(r.id, 'xlsx')}
                  >
                    <ExcelIcon /> Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
