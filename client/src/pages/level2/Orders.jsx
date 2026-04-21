import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orders } from '../../api/endpoints.js';
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

// Reject reason modal
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
          <strong>{order.client?.clientName}</strong>. The sales person will be notified and can resubmit a new order.
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

export default function L2Orders() {
  const qc = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('PENDING');
  const [rejectTarget, setRejectTarget] = useState(null); // holds order being rejected

  const { data = [], isLoading } = useQuery({
    queryKey: ['orders', activeFilter],
    queryFn: () => orders.list(activeFilter === 'ALL' ? {} : { status: activeFilter }),
  });

  const approve = useMutation({
    mutationFn: (id) => orders.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }) => orders.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      setRejectTarget(null);
    },
  });

  // count by status for badge
  const { data: allData = [] } = useQuery({
    queryKey: ['orders', 'ALL'],
    queryFn: () => orders.list({}),
  });
  const counts = allData.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

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
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
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
              <tr><td colSpan="9" className="p-8 text-center text-sm text-slate-400">Loading…</td></tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr><td colSpan="9" className="p-8 text-center text-sm text-slate-400">No orders in this category.</td></tr>
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
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[o.status] || 'bg-slate-100 text-slate-600'}`}>
                      {FILTERS.find(f => f.key === o.status)?.label || o.status}
                    </span>
                    {o.status === 'REJECTED' && o.rejectionReason && (
                      <div className="mt-0.5 text-xs text-red-400 max-w-[140px] truncate" title={o.rejectionReason}>
                        {o.rejectionReason}
                      </div>
                    )}
                  </div>
                </td>
                <td className="text-slate-500 text-xs">{fmtDateTime(o.createdAt)}</td>
                <td className="text-right">
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
    </>
  );
}
