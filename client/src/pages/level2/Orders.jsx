import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orders, salesOrders } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney, fmtDateTime } from '../../utils/format.js';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
          <div className="grid grid-cols-3 gap-2 mb-3">
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
                    <span className={`rounded-full px-2 py-0.5 font-medium ${
                      so.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
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
            <div className="grid grid-cols-2 gap-3">
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
                  # of Vehicles <span className="text-red-500">*</span>
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

/* ─── Main Page ────────────────────────────────────────────────────────── */
export default function L2Orders() {
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('PENDING');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [soTarget, setSoTarget] = useState(null);   // order for Create SO modal
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
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeFilter === f.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
            {counts[f.key] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  activeFilter === f.key
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

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="table-clean">
          <thead>
            <tr>
              <th>Order</th>
              <th>Client</th>
              <th>Grade</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Sales Person</th>
              <th>Status</th>
              <th>Submitted</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="9" className="p-8 text-center text-sm text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan="9" className="p-8 text-center text-sm text-slate-400">
                  No orders in this category.
                </td>
              </tr>
            )}
            {data.map((o) => (
              <tr key={o._id}>
                <td className="font-medium text-slate-800">{o.orderNumber}</td>
                <td>{o.client?.clientName}</td>
                <td>
                  {o.grade && (
                    <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                      {o.grade}
                    </span>
                  )}
                </td>
                <td>{o.quantity} m³</td>
                <td>{fmtMoney(o.negotiatedRate)}</td>
                <td className="text-slate-500">{o.createdByLevel3?.name}</td>
                <td>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_BADGE[o.status] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {FILTERS.find((f) => f.key === o.status)?.label || o.status}
                    </span>
                    {o.status === 'REJECTED' && o.rejectionReason && (
                      <div
                        className="mt-0.5 text-xs text-red-400 max-w-[140px] truncate"
                        title={o.rejectionReason}
                      >
                        {o.rejectionReason}
                      </div>
                    )}
                  </div>
                </td>
                <td className="text-slate-500 text-xs">{fmtDateTime(o.createdAt)}</td>
                <td className="text-right">
                  {/* PENDING → Approve / Reject */}
                  {o.status === 'PENDING' && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition disabled:opacity-60"
                        onClick={() => approve.mutate(o._id)}
                        disabled={approve.isPending}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition"
                        onClick={() => setRejectTarget(o)}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}

                  {/* APPROVED → Create SO (opens modal) */}
                  {o.status === 'APPROVED' && (
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition"
                      onClick={() => openSoModal(o)}
                      title="Create Sales Order from this approved order"
                    >
                      📋 Create SO
                    </button>
                  )}
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
    </>
  );
}
