import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orders } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { statusBadge, fmtMoney, fmtDateTime } from '../../utils/format.js';

export default function L2Orders() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const { data = [], isLoading } = useQuery({
    queryKey: ['orders', status],
    queryFn: () => orders.list(status === 'ALL' ? {} : { status }),
  });

  const approve = useMutation({
    mutationFn: (id) => orders.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });

  return (
    <>
      <PageHeader title="Orders" subtitle="Approve orders submitted by Level 3." />

      <div className="mb-4 flex gap-2">
        {['PENDING', 'APPROVED', 'DISPATCHED', 'SALE_AUTHORIZED', 'INVOICED', 'ALL'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === s ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card">
        <table className="table-clean">
          <thead>
            <tr>
              <th>Order</th>
              <th>Client</th>
              <th>Grade</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>L3</th>
              <th>Status</th>
              <th>When</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((o) => (
              <tr key={o._id}>
                <td className="font-medium">{o.orderNumber}</td>
                <td>{o.client?.clientName}</td>
                <td>{o.grade?.gradeCode}</td>
                <td>{o.quantity}</td>
                <td>{fmtMoney(o.negotiatedRate)}</td>
                <td>{o.createdByLevel3?.name}</td>
                <td><span className={statusBadge(o.status)}>{o.status}</span></td>
                <td className="text-slate-500">{fmtDateTime(o.createdAt)}</td>
                <td className="text-right">
                  {o.status === 'PENDING' && (
                    <button
                      className="btn-primary text-xs"
                      onClick={() => approve.mutate(o._id)}
                      disabled={approve.isPending}
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {isLoading && (
              <tr><td colSpan="9" className="p-6 text-center text-sm text-slate-400">Loading…</td></tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr><td colSpan="9" className="p-6 text-center text-sm text-slate-400">Nothing here</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
