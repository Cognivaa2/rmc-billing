import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { orders, invoices } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney } from '../../utils/format.js';

function newIdempotencyKey() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── Per-order invoice form ────────────────────────────────────────────────────
function InvoiceForm({ order, onDone, onError }) {
  const remaining = order.quantity - (order.invoicedQuantity || 0);
  const [qty, setQty] = useState(remaining);
  const [showRate, setShowRate] = useState(true);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const vehicleNumberRegex = /^[A-Za-z]{2}[0-9]{2}[A-Za-z]{1,2}[0-9]{4}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!qty) {
      onError('Invoice Quantity is required');
      return;
    }

    const parsed = parseFloat(qty);
    if (isNaN(parsed) || parsed <= 0) {
      onError('Enter a valid quantity greater than 0');
      return;
    }
    if (parsed > remaining + 0.001) {
      onError(`Max ${remaining} m³ remaining`);
      return;
    }

    const cleanVehicle = vehicleNumber.trim().toUpperCase();
    if (!cleanVehicle) {
      onError('Vehicle Number is required');
      return;
    }

    if (!vehicleNumberRegex.test(cleanVehicle)) {
      onError('Invalid Vehicle Number. Format: AA11BB1234');
      return;
    }

    setLoading(true);
    onError(null);
    try {
      const invoice = await invoices.createFromOrder({
        order: order._id,
        quantity: parsed,
        showRateOnInvoice: showRate,
        vehicleNumber: cleanVehicle,
        idempotencyKey: newIdempotencyKey(),
      });

      qc.invalidateQueries({ queryKey: ['orders', 'active'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });

      // Open PDF
      const url = invoices.pdfUrl(invoice._id);
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob), '_blank');

      onDone();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to generate invoice.';
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const previewAmount = (parseFloat(qty) || 0) * (order.negotiatedRate || 0);

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-5 md:grid-cols-12 items-start animate-fadeIn"
    >
      {/* Quantity input */}
      <div className="md:col-span-4">
        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Invoice Quantity (m³)
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={remaining}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="input w-full pr-16 py-2.5 font-mono text-base font-bold focus:border-brand-500 focus:ring-brand-500 bg-white"
            placeholder={`Max ${remaining}`}
            required
          />
          <button
            type="button"
            onClick={() => setQty(remaining)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded transition-colors"
          >
            MAX
          </button>
        </div>
        <div className="h-4 mt-2">
          {parseFloat(qty) > 0 && (
            <p className="text-xs text-slate-500 font-medium">
              Invoice value: <span className="font-bold text-emerald-600">{fmtMoney(previewAmount)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Vehicle Number Input */}
      <div className="md:col-span-4">
        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Vehicle Number
        </label>
        <input
          type="text"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
          className="input w-full py-2.5 font-mono text-base font-bold focus:border-brand-500 focus:ring-brand-500 bg-white"
          placeholder="AA11BB1234"
          required
        />
        <div className="h-4 mt-2">
          <p className="text-[10px] text-slate-400 font-medium uppercase">Format: AA11BB1234</p>
        </div>
      </div>

      {/* Show rate toggle */}
      <div className="md:col-span-4 flex flex-col">
        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Amount on Invoice
        </label>
        <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-100/80 text-sm font-bold w-full">
          <button
            type="button"
            onClick={() => setShowRate(true)}
            className={`flex-1 py-1.5 px-3 rounded-md transition-all ${showRate ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Show
          </button>
          <button
            type="button"
            onClick={() => setShowRate(false)}
            className={`flex-1 py-1.5 px-3 rounded-md transition-all ${!showRate ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Hide
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="md:col-span-12 flex flex-col-reverse md:flex-row gap-3 mt-6 justify-end">
        <button
          type="button"
          onClick={onDone}
          disabled={loading}
          className="w-full md:w-auto btn py-2.5 px-5 font-bold text-sm rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto btn py-2.5 px-6 font-bold text-sm rounded-xl bg-brand-600 hover:bg-brand-700 text-white border border-brand-700 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            '🧾 Generate Invoice'
          )}
        </button>
      </div>
    </form>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ invoiced, total }) {
  const pct = Math.min(100, ((invoiced || 0) / total) * 100);
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[10px] font-bold mb-1">
        <span className="text-slate-400 uppercase tracking-widest">Invoiced</span>
        <span className="text-slate-600">
          <span className="text-brand-600">{invoiced || 0}</span> / {total} m³
          <span className="ml-2 text-slate-400">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 100
              ? 'linear-gradient(90deg, #10b981, #059669)'
              : 'linear-gradient(90deg, #6366f1, #3b82f6)',
          }}
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function L4ApprovedOrders() {
  const [openFor, setOpenFor] = useState(null);
  const [error, setError] = useState(null);

  // Fetch both APPROVED and PARTIALLY_INVOICED orders
  const { data: approvedList = [], isLoading: loadingApproved } = useQuery({
    queryKey: ['orders', 'active', 'APPROVED'],
    queryFn: () => orders.list({ status: 'APPROVED' }),
  });
  const { data: partialList = [], isLoading: loadingPartial } = useQuery({
    queryKey: ['orders', 'active', 'PARTIALLY_INVOICED'],
    queryFn: () => orders.list({ status: 'PARTIALLY_INVOICED' }),
  });

  const isLoading = loadingApproved || loadingPartial;
  // Partially invoiced first, then fresh approvals
  const data = [...partialList, ...approvedList];

  return (
    <>
      <PageHeader
        title="Approved Orders"
        subtitle="Generate full or partial invoices for approved orders. Remaining quantity is tracked automatically."
      />

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 font-medium flex items-center gap-2">
          <span>⚠️</span> {error}
          <button className="ml-auto text-rose-400 hover:text-rose-600" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="space-y-4">
        {isLoading && (
          <div className="card card-body text-center py-16">
            <div className="relative flex justify-center items-center mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
              <div className="absolute animate-ping h-8 w-8 rounded-full border-2 border-brand-100" />
            </div>
            <span className="text-sm text-slate-500 font-bold tracking-wide">Syncing orders…</span>
          </div>
        )}

        {data.map((o) => {
          const invoicedQty = o.invoicedQuantity || 0;
          const remaining = o.quantity - invoicedQty;
          const totalValue = o.quantity * (o.negotiatedRate || 0);
          const remainingValue = remaining * (o.negotiatedRate || 0);
          const isPartial = invoicedQty > 0;
          const isOpen = openFor === o._id;

          return (
            <div
              key={o._id}
              className={`card overflow-hidden transition-all duration-300 border-l-4 ${isOpen
                ? 'border-l-brand-600 shadow-lg ring-1 ring-brand-100'
                : isPartial
                  ? 'border-l-amber-400 hover:border-l-amber-500 hover:shadow-md'
                  : 'border-l-slate-300 hover:border-l-brand-400 hover:shadow-md'
                }`}
            >
              <div className="p-5 md:p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center justify-between">

                  {/* Left: order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-md">
                        {o.orderNumber}
                      </span>
                      {isPartial ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20">
                          ⚡ Partially Invoiced
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20">
                          ✓ Approved
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{o.client?.clientName}</h3>

                    {o.site?.siteName && (
                      <div className="text-sm font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                        <span className="text-slate-400">📍</span>{o.site.siteName}
                      </div>
                    )}

                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="flex flex-col bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Grade</span>
                        <span className="text-sm font-black text-slate-700 mt-1">{o.grade}</span>
                      </div>
                      <div className="flex flex-col bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Qty</span>
                        <span className="text-sm font-black text-slate-700 mt-1">{o.quantity} m³</span>
                      </div>
                      <div className="flex flex-col bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rate</span>
                        <span className="text-sm font-black text-slate-700 mt-1">{fmtMoney(o.negotiatedRate)}/m³</span>
                      </div>
                      {isPartial && (
                        <div className="flex flex-col bg-amber-50/80 p-3.5 rounded-xl border border-amber-100">
                          <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Remaining</span>
                          <span className="text-sm font-black text-amber-800 mt-1">{remaining} m³</span>
                        </div>
                      )}
                    </div>

                    {/* Progress bar — only shown for partially invoiced */}
                    {isPartial && (
                      <div className="mt-5">
                        <ProgressBar invoiced={invoicedQty} total={o.quantity} />
                      </div>
                    )}
                  </div>

                  {/* Right: value + action */}
                  <div className="flex flex-col items-start lg:items-end gap-5 lg:pl-8 lg:border-l lg:border-slate-100 shrink-0 mt-4 lg:mt-0 pt-6 lg:pt-0 border-t lg:border-t-0 border-slate-100 w-full lg:w-56">
                    <div className="text-left lg:text-right w-full flex flex-row lg:flex-col justify-between lg:justify-start items-center lg:items-end">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                          {isPartial ? 'Remaining Value' : 'Total Value'}
                        </div>
                        <div className="text-2xl font-black tracking-tight mt-1 text-emerald-600">
                          {fmtMoney(isPartial ? remainingValue : totalValue)}
                        </div>
                        {isPartial && (
                          <div className="text-xs font-medium text-slate-400 mt-1">
                            of {fmtMoney(totalValue)} total
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => { setOpenFor(isOpen ? null : o._id); setError(null); }}
                      className={`w-full lg:w-auto btn px-6 py-2.5 font-bold text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] whitespace-nowrap ${isOpen
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        : 'bg-brand-600 hover:bg-brand-700 text-white border border-brand-700'
                        }`}
                    >
                      {isOpen ? '✕ Close' : '🧾 Invoice'}
                    </button>
                  </div>
                </div>

                {/* Expandable invoice form */}
                {isOpen && (
                  <div className="mt-6 -mx-5 -mb-5 p-5 bg-slate-50/80 border-t border-slate-100 md:-mx-6 md:-mb-6 md:p-6 shadow-inner">
                    <InvoiceForm
                      order={o}
                      onDone={() => setOpenFor(null)}
                      onError={setError}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!isLoading && data.length === 0 && (
          <div className="card card-body text-center py-16 border-2 border-dashed border-slate-200 bg-slate-50/50">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-base font-black text-slate-700">All Cleared!</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
              No approved orders waiting for invoicing at the moment.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
