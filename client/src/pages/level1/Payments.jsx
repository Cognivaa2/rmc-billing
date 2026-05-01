import { useQuery, useQueryClient } from '@tanstack/react-query';
import { payments } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime } from '../../utils/format.js';

export default function L1Payments() {
  const qc = useQueryClient();
  const { data: list = [] } = useQuery({ queryKey: ['payments'], queryFn: () => payments.list() });

  return (
    <>
      <PageHeader title="Payments" subtitle="Record payment-received status per client / invoice." />



      <div className="card">
        <table className="table-clean">
          <thead>
            <tr>
              <th>When</th>
              <th>Client</th>
              <th>Invoice</th>
              <th>Received</th>
              <th>Recorded By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p._id}>
                <td className="text-slate-500">{fmtDateTime(p.createdAt)}</td>
                <td>{p.client?.clientName}</td>
                <td>{p.invoice?.invoiceNumber || '—'}</td>
                <td>
                  {p.paymentReceived ? (
                    <span className="badge-green">Yes</span>
                  ) : (
                    <span className="badge-gray">No</span>
                  )}
                </td>
                <td>{p.recordedByLevel2?.name || '—'}</td>
                <td className="text-right">
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan="6" className="p-6 text-center text-sm text-slate-400">No records</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
