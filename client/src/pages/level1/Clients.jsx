import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { clients } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { statusBadge } from '../../utils/format.js';

export default function L1Clients() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data = { clients: [], totalPages: 1, page: 1 } } = useQuery({
    queryKey: ['clients', q, page],
    queryFn: () => clients.list({ q: q || undefined, page, limit: 6 }),
  });
  const clientList = data.clients || [];



  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Master database — permanent and non-deletable."
      />



      <div className="card">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients…"
            className="input max-w-sm"
          />
        </div>
        <table className="table-clean">
          <thead>
            <tr>
              <th>Client</th>
              <th>Contact</th>
              <th>KYC</th>
              <th>Credit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clientList.map((c) => (
              <tr key={c._id}>
                <td>
                  <div className="font-medium">{c.clientName}</div>
                  <div className="text-xs text-slate-500">{c.officeAddress}</div>
                </td>
                <td>
                  <div>{c.contactNumber}</div>
                  <div className="text-xs text-slate-400">{c.email}</div>
                </td>
                <td><span className={statusBadge(c.kycStatus)}>{c.kycStatus}</span></td>
                <td><span className={statusBadge(c.creditStatus)}>{c.creditStatus}</span></td>
                <td className="text-right">
                  <Link to={`/l1/clients/${c._id}`} className="text-brand-600 hover:underline text-sm">
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
            {clientList.length === 0 && (
              <tr>
                <td colSpan="5" className="p-6 text-center text-sm text-slate-400">No clients yet</td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination UI */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6">
          <div className="text-sm text-slate-500">
            Page {data.page || 1} of {data.totalPages || 1}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-sm py-1 px-3"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages || 1, p + 1))}
              disabled={page >= (data.totalPages || 1)}
              className="btn-secondary text-sm py-1 px-3"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
