import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { invoices, dispatches, companySettings } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney, fmtDateTime } from '../../utils/format.js';

function newIdempotencyKey() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function L4Invoices() {
  const qc = useQueryClient();

  const { data: invoicesList = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => invoices.list() });
  const { data: ready = [] } = useQuery({
    queryKey: ['dispatches', 'ready_for_invoice'],
    queryFn: async () => {
      const all = await dispatches.list();
      return all.filter(d => ['sale_authorized', 'batchsheet'].includes(d.status));
    },
  });

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['invoices'] });
  }, [qc]);

  const viewPdf = async (id) => {
    try {
      const url = invoices.pdfUrl(id);
      // Fetch the PDF with credentials via axios
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      // Note: we don't revoke the URL immediately so the tab can load it.
      // In a real app, you might want to manage this better.
    } catch (err) {
      console.error('Failed to load PDF:', err);
      alert('Failed to load PDF. Please ensure you are logged in.');
    }
  };

  const generate = async (dispatch, { showRate }) => {
    try {
      const created = await invoices.create({
        dispatch: dispatch._id,
        showRateOnInvoice: showRate,
        idempotencyKey: newIdempotencyKey(),
      });

      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dispatches'] });

      // Use the helper to fetch and view
      await viewPdf(created._id);
    } catch (err) {
      console.error('Invoice Generation Error:', err.response?.data || err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to generate invoice. Please check your internet connection.';
      alert(msg);
    }
  };

  const downloadExisting = (inv) => {
    viewPdf(inv._id);
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Manage and generate delivery challans and invoices."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        {/* Ready to invoice */}
        <div className="card flex flex-col">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Ready to Invoice</h2>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{ready.length}</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {ready.map((d) => (
              <div key={d._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="font-semibold text-slate-800">{d.dispatchNumber}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {d.client?.clientName} · {d.quantity} m³ · {d.vehicleNumber}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => generate(d, { showRate: false })}>
                    Hide Amount
                  </button>
                  <button className="btn-primary text-xs px-3 py-1.5 bg-brand-600 hover:bg-brand-700" onClick={() => generate(d, { showRate: true })}>
                    Show Amount
                  </button>
                </div>
              </div>
            ))}
            {ready.length === 0 && (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 h-32">
                <div className="text-2xl mb-2 opacity-50">🧾</div>
                <p className="text-sm">No dispatches awaiting invoice.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent invoices */}
        <div className="card flex flex-col">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">Recent Invoices</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table-clean w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs">
                  <th className="font-medium text-left">Invoice</th>
                  <th className="font-medium text-left">Client</th>
                  <th className="font-medium text-left">Amount</th>
                  <th className="font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoicesList.map((i) => (
                  <tr key={i._id} className="hover:bg-slate-50 transition-colors">
                    <td className="font-medium text-slate-700 whitespace-nowrap">{i.invoiceNumber}</td>
                    <td className="text-slate-600 truncate max-w-[150px]" title={i.client?.clientName}>{i.client?.clientName}</td>
                    <td className="text-slate-600 whitespace-nowrap">{i.showRateOnInvoice ? fmtMoney(i.amount) : '—'}</td>
                    <td className="text-right">
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                        onClick={() => downloadExisting(i)}
                        title="Download Invoice"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {invoicesList.length === 0 && (
                  <tr><td colSpan="4" className="p-8 text-center text-sm text-slate-400">No invoices generated yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
