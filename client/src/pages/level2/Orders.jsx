import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { orders, salesOrders, dispatches } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney, fmtDateTime, fmtDate } from '../../utils/format.js';

const FILTERS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'SALE_AUTHORIZED', label: 'Sale Auth.' },
  { key: 'INVOICED', label: 'Invoiced' },
  { key: 'ALL', label: 'All' },
];

const STATUS_BADGE = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border border-blue-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
  DISPATCHED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  SALE_AUTHORIZED: 'bg-violet-50 text-violet-700 border border-violet-200',
  INVOICED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

/* ─── Reject Modal ─────────────────────────────────────────────────────── */
function RejectModal({ order, onClose, onConfirm, isPending }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xl">❌</span>
          <h2 className="text-lg font-semibold text-slate-800">Reject Order</h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Rejecting <strong>{order.orderNumber}</strong> for{' '}
          <strong>{order.client?.clientName}</strong>. The sales person will be notified
          and can resubmit a new order.
        </p>
        <label className="label mb-1 block">Reason for rejection</label>
        <textarea
          className="input w-full"
          rows={3}
          placeholder="e.g. Credit limit exceeded, KYC incomplete…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60"
            onClick={() => onConfirm(reason)}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? 'Rejecting…' : 'Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Create SO Modal ──────────────────────────────────────────────────── */
function CreateSoModal({ order, onClose, onConfirm, isPending, error }) {
  const { data: sos = [] } = useQuery({
    queryKey: ['sales-orders'],
    queryFn: () => salesOrders.list(),
  });

  const allocated = sos
    .filter(so => so.sourceOrder === order._id || so.sourceOrder?._id === order._id)
    .reduce((sum, so) => sum + so.totalQuantity, 0);
  const remaining = order.quantity - allocated;

  const [vehicles, setVehicles] = useState('');
  const [quantity, setQuantity] = useState(remaining > 0 ? remaining : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <div>
              <h2 className="text-lg font-semibold text-white">Create Sales Order</h2>
              <p className="text-xs text-blue-200">{order.orderNumber} · {order.client?.clientName}</p>
            </div>
          </div>
        </div>

        {/* Pre-filled fields (read-only) */}
        <div className="px-6 pt-5 pb-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Order Context
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-xs text-slate-400 mb-0.5">Grade</p>
              <p className="font-semibold text-slate-800 text-sm">{order.grade || '—'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-xs text-slate-400 mb-0.5">Total Qty</p>
              <p className="font-semibold text-slate-800 text-sm">{order.quantity} m³</p>
            </div>
            <div className={`rounded-xl border px-3 py-2.5 ${remaining > 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
              <p className={`text-xs mb-0.5 ${remaining > 0 ? 'text-blue-500' : 'text-red-400'}`}>Remaining</p>
              <p className={`font-bold text-sm ${remaining > 0 ? 'text-blue-700' : 'text-red-600'}`}>
                {remaining} m³
              </p>
            </div>
          </div>

          {/* Already-allocated SOs for this order */}
          {sos.filter(so => so.sourceOrder === order._id || so.sourceOrder?._id === order._id).length > 0 && (
            <div className="mb-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-xs font-semibold text-slate-400 mb-1.5">Existing Sales Orders for this Order</p>
              <div className="space-y-1">
                {sos.filter(so => so.sourceOrder === order._id || so.sourceOrder?._id === order._id).map(so => (
                  <div key={so._id} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{so.soNumber}</span>
                    <span className="text-slate-500">{so.totalQuantity} m³</span>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${so.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>{so.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {remaining <= 0 && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              ⚠ All {order.quantity} m³ has already been allocated to Sales Orders. No remaining quantity available.
            </div>
          )}

          {/* Site info */}
          {order.site?.siteName && (
            <div className="mb-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 flex items-center gap-2">
              <span className="text-xs text-slate-400">Site:</span>
              <span className="text-xs font-medium text-slate-700">{order.site.siteName}</span>
            </div>
          )}

          {/* Editable fields */}
          <div className="mb-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              New SO Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label mb-1 block font-medium text-slate-700">
                  Quantity (m³) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  max={remaining > 0 ? remaining : 0}
                  className="input w-full font-semibold"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <label className="label mb-1 block font-medium text-slate-700">
                  Number of Vehicles <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="input w-full font-semibold"
                  placeholder="e.g. 4"
                  value={vehicles}
                  onChange={(e) => setVehicles(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            id="so-create-btn"
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-60 flex items-center gap-2"
            onClick={() => onConfirm(Number(vehicles), Number(quantity))}
            disabled={isPending || !vehicles || Number(vehicles) < 1 || !quantity || Number(quantity) <= 0 || remaining <= 0}
          >
            {isPending ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Creating…
              </>
            ) : (
              '📋 Create Sales Order'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Authorize Sale Modal ─────────────────────────────────────────────── */
function AuthorizeSaleModal({ order, onClose, onConfirm, isPending }) {
  const [selectedDispatches, setSelectedDispatches] = useState(new Set());

  const { data: dispatchesData = [], isLoading } = useQuery({
    queryKey: ['dispatches', 'order', order._id],
    queryFn: () => dispatches.list({ order: order._id, status: 'dispatched' }),
  });

  // Select all by default when data loads
  useEffect(() => {
    if (dispatchesData.length > 0 && selectedDispatches.size === 0) {
      setSelectedDispatches(new Set(dispatchesData.map(d => d._id)));
    }
  }, [dispatchesData]);

  const toggleSelection = (id) => {
    const next = new Set(selectedDispatches);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDispatches(next);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedDispatches));
  };

  const groupedDispatches = dispatchesData.reduce((acc, d) => {
    const soKey = d.salesOrder?.soNumber || 'Legacy Order';
    if (!acc[soKey]) acc[soKey] = [];
    acc[soKey].push(d);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <div>
              <h2 className="text-lg font-semibold text-white">Authorize Sale</h2>
              <p className="text-xs text-violet-200">{order.orderNumber} · {order.client?.clientName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto">
          <p className="mb-4 text-sm text-slate-600">
            You are about to authorize the following pending dispatches. This will allow the Plant Worker (Level 4) to generate invoices.
          </p>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading dispatches...</div>
          ) : dispatchesData.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No pending dispatches found for this order.</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedDispatches).map(([soNumber, dispatches]) => (
                <div key={soNumber}>
                  <h3 className="mb-3 text-sm font-bold text-slate-700 bg-slate-100 py-1.5 px-3 rounded-lg inline-block">
                    Sales Order: {soNumber}
                  </h3>
                  <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                    {dispatches.map((d) => (
                      <div 
                        key={d._id} 
                        className={`rounded-xl border p-4 cursor-pointer transition-all ${selectedDispatches.has(d._id) ? 'bg-violet-50 border-violet-200 shadow-sm' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                        onClick={() => toggleSelection(d._id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-slate-800">{d.dispatchNumber}</div>
                          <div className={`h-5 w-5 rounded border flex items-center justify-center ${selectedDispatches.has(d._id) ? 'bg-violet-600 border-violet-600' : 'bg-white border-slate-300'}`}>
                            {selectedDispatches.has(d._id) && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm mt-1 opacity-90">
                          <div>
                            <p className="text-xs text-slate-400">Vehicle Number</p>
                            <p className="font-semibold font-mono text-slate-700 uppercase">{d.vehicleNumber || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Driver Name</p>
                            <p className="font-medium text-slate-700">{d.driverName || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Quantity</p>
                            <p className="font-bold text-violet-700">{d.quantity} m³</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Site Name</p>
                            <p className="font-medium text-slate-700 truncate" title={d.site?.siteName}>{d.site?.siteName || '—'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700 transition disabled:opacity-60 flex items-center gap-2"
            onClick={handleConfirm}
            disabled={isPending || dispatchesData.length === 0 || selectedDispatches.size === 0}
          >
            {isPending ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Authorizing…
              </>
            ) : (
              '✅ Confirm Authorize Sale'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────── */
export default function L2Orders() {
  const location = useLocation();
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState(location.state?.filter || 'PENDING');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [soTarget, setSoTarget] = useState(null);   // order for Create SO modal
  const [authTarget, setAuthTarget] = useState(null); // order for Authorize Sale modal
  const [soError, setSoError] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['orders', activeFilter],
    queryFn: () => orders.list(activeFilter === 'ALL' ? {} : { status: activeFilter }),
  });

  const approve = useMutation({
    mutationFn: (id) => orders.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }) => orders.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setRejectTarget(null);
    },
  });

  const createSo = useMutation({
    mutationFn: ({ orderId, numberOfVehicles, quantity }) =>
      salesOrders.createFromOrder(orderId, numberOfVehicles, quantity),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      setSoTarget(null);
      setSoError('');
    },
    onError: (err) => {
      setSoError(err?.response?.data?.error || 'Failed to create Sales Order');
    },
  });

  const authorizeSale = useMutation({
    mutationFn: ({ id, dispatchIds }) => orders.authorizeSale(id, { dispatchIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      setAuthTarget(null);
    },
  });

  // count by status for badges
  const { data: allData = [] } = useQuery({
    queryKey: ['orders', 'ALL'],
    queryFn: () => orders.list({}),
  });
  const counts = allData.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const openSoModal = (order) => {
    setSoError('');
    setSoTarget(order);
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Approve or reject orders submitted by sales team."
      />

      {/* Filter chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${activeFilter === f.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            {f.label}
            {counts[f.key] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${activeFilter === f.key
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500'
                  }`}
              >
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Mobile View: Card list */}
      <div className="md:hidden space-y-4">
        {isLoading && (
          <div className="card card-body text-center text-sm text-slate-400">Loading…</div>
        )}
        {!isLoading && data.length === 0 && (
          <div className="card card-body text-center text-sm text-slate-400 py-12">
            <div className="text-4xl mb-2">📋</div>
            <p>No orders in this category.</p>
          </div>
        )}
        {data.map((o) => (
          <div key={o._id} className="card card-body border-l-4 border-l-brand-500">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{o.orderNumber}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[o.status] || 'bg-slate-100 text-slate-600'}`}>
                    {FILTERS.find((f) => f.key === o.status)?.label || o.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-700 mt-1">{o.client?.clientName}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold uppercase">{o.grade}</span>
                  <span className="text-xs font-medium text-slate-600">{o.quantity} m³</span>
                </div>
                <div className="text-xs text-slate-400 mt-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="grayscale opacity-60">📍</span>
                    <span className="truncate">{o.site?.siteName || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="grayscale opacity-60">🗓</span>
                    <span>Del: {fmtDate(o.deliveryDate)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-brand-600">{fmtMoney(o.negotiatedRate)}</div>
                <div className="text-[10px] text-slate-400 mt-1">per m³</div>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="mt-4 pt-3 border-t border-slate-50 flex gap-2">
              {o.status === 'PENDING' && (
                <>
                  <button
                    className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
                    onClick={() => approve.mutate(o._id)}
                    disabled={approve.isPending}
                  >
                    Approve
                  </button>
                  <button
                    className="flex-1 rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                    onClick={() => setRejectTarget(o)}
                  >
                    Reject
                  </button>
                </>
              )}
              {o.status === 'APPROVED' && (
                <button
                  className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm flex items-center justify-center gap-2"
                  onClick={() => openSoModal(o)}
                >
                  📋 Create Sales Order
                </button>
              )}
              {o.status === 'DISPATCHED' && (
                <button
                  className="w-full rounded-lg bg-violet-600 py-2.5 text-xs font-bold text-white hover:bg-violet-700 transition shadow-sm flex items-center justify-center gap-2"
                  onClick={() => setAuthTarget(o)}
                >
                  ✅ Authorize Sale
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block card overflow-x-auto">
        <table className="table-clean w-full min-w-[1100px]">
          <thead>
            <tr>
              <th className="w-32">Order</th>
              <th>Client / Site</th>
              <th>Details</th>
              <th>Rate</th>
              <th>Delivery</th>
              <th>Sales Person</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="8" className="p-8 text-center text-sm text-slate-400">
                  Loading orders…
                </td>
              </tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan="8" className="p-12 text-center text-sm text-slate-400">
                  <div className="text-3xl mb-2">📋</div>
                  No orders found in this category.
                </td>
              </tr>
            )}
            {data.map((o) => (
              <tr key={o._id} className="group hover:bg-slate-50/50">
                <td className="font-bold text-slate-900">{o.orderNumber}</td>
                <td>
                  <div className="font-semibold text-slate-800">{o.client?.clientName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{o.site?.siteName || 'No site specified'}</div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                      {o.grade}
                    </span>
                    <span className="font-medium text-slate-700">{o.quantity} m³</span>
                  </div>
                </td>
                <td>
                  <div className="font-bold text-slate-800">{fmtMoney(o.negotiatedRate)}</div>
                </td>
                <td>
                  <div className="text-slate-600 text-xs font-semibold">{fmtDate(o.deliveryDate)}</div>
                </td>
                <td className="text-slate-500 text-sm">{o.createdByLevel3?.name}</td>
                <td>
                  <div className="flex flex-col">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[o.status] || 'bg-slate-100 text-slate-600'}`}>
                      {FILTERS.find((f) => f.key === o.status)?.label || o.status}
                    </span>
                    {o.status === 'REJECTED' && o.rejectionReason && (
                      <span className="mt-1 text-[10px] text-red-400 max-w-[120px] truncate" title={o.rejectionReason}>
                        {o.rejectionReason}
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {o.status === 'PENDING' && (
                      <>
                        <button
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                          onClick={() => approve.mutate(o._id)}
                          disabled={approve.isPending}
                        >
                          Approve
                        </button>
                        <button
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-all active:scale-95"
                          onClick={() => setRejectTarget(o)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {o.status === 'APPROVED' && (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                        onClick={() => openSoModal(o)}
                      >
                        📋 Create SO
                      </button>
                    )}
                    {o.status === 'DISPATCHED' && (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition-all shadow-sm active:scale-95"
                        onClick={() => setAuthTarget(o)}
                      >
                        ✅ Authorize Sale
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          order={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => reject.mutate({ id: rejectTarget._id, reason })}
          isPending={reject.isPending}
        />
      )}

      {/* Create SO Modal */}
      {soTarget && (
        <CreateSoModal
          order={soTarget}
          onClose={() => { setSoTarget(null); setSoError(''); }}
          onConfirm={(numberOfVehicles, quantity) =>
            createSo.mutate({ orderId: soTarget._id, numberOfVehicles, quantity })
          }
          isPending={createSo.isPending}
          error={soError}
        />
      )}

      {/* Authorize Sale Modal */}
      {authTarget && (
        <AuthorizeSaleModal
          order={authTarget}
          onClose={() => setAuthTarget(null)}
          onConfirm={(dispatchIds) => authorizeSale.mutate({ id: authTarget._id, dispatchIds })}
          isPending={authorizeSale.isPending}
        />
      )}
    </>
  );
}
