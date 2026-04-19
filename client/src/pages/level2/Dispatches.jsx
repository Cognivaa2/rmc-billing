import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dispatches, orders } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime } from '../../utils/format.js';

export default function L2Dispatches() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('dispatched');
  const { data = [] } = useQuery({
    queryKey: ['dispatches', status],
    queryFn: () => dispatches.list(status === 'all' ? {} : { status }),
  });
  const authorize = useMutation({
    mutationFn: (orderId) => orders.authorizeSale(orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispatches'] }),
  });

  return (
    <>
      <PageHeader title="Dispatches" subtitle="Authorise sales before invoice generation." />

      <div className="mb-4 flex gap-2">
        {['dispatched', 'sale_authorized', 'invoiced', 'all'].map((s) => (
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
              <th>Dispatch</th>
              <th>Order</th>
              <th>Client</th>
              <th>Grade</th>
              <th>Qty</th>
              <th>Vehicle</th>
              <th>L4</th>
              <th>When</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d._id}>
                <td className="font-medium">{d.dispatchNumber}</td>
                <td>{d.order?.orderNumber}</td>
                <td>{d.client?.clientName}</td>
                <td>{d.grade?.gradeCode}</td>
                <td>{d.quantity}</td>
                <td>{d.vehicleNumber}</td>
                <td>{d.filledByLevel4?.name}</td>
                <td className="text-slate-500">{fmtDateTime(d.dispatchDateTime)}</td>
                <td className="text-right">
                  {d.status === 'dispatched' && (
                    <button
                      className="btn-primary text-xs"
                      onClick={() => authorize.mutate(d.order?._id || d.order)}
                    >
                      Authorise Sale
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan="9" className="p-6 text-center text-sm text-slate-400">Nothing here</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
