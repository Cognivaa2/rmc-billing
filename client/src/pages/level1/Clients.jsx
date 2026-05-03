import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { clients } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { statusBadge } from '../../utils/format.js';

export default function L1Clients() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', q, page],
    queryFn: () => clients.list({ q: q || undefined, page, limit: 10 }),
    keepPreviousData: true,
  });

  const clientList = data?.clients || [];
  const totalPages = data?.totalPages || 1;
  const totalRecords = data?.total || 0;

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Master database — permanent and non-deletable records."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search clients by name..."
            className="input pl-10"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="text-sm text-slate-500 font-medium">
          {totalRecords} clients registered
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact Details</th>
                <th>KYC Status</th>
                <th>Credit Profile</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center">
                    <div className="flex justify-center items-center gap-3 text-slate-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600"></div>
                      <span>Loading clients...</span>
                    </div>
                  </td>
                </tr>
              ) : clientList.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div className="font-bold text-slate-900">{c.clientName}</div>
                    <div className="text-xs text-slate-500 max-w-xs truncate">{c.officeAddress}</div>
                  </td>
                  <td>
                    <div className="font-medium text-slate-700">{c.contactNumber}</div>
                    <div className="text-xs text-slate-400">{c.email || 'No email provided'}</div>
                  </td>
                  <td><span className={statusBadge(c.kycStatus)}>{c.kycStatus}</span></td>
                  <td><span className={statusBadge(c.creditStatus)}>{c.creditStatus}</span></td>
                  <td className="text-right">
                    <Link to={`/l1/clients/${c._id}`} className="text-brand-600 hover:text-brand-700 font-semibold text-sm hover:underline">
                      View Details →
                    </Link>
                  </td>
                </tr>
              ))}
              {!isLoading && clientList.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p>No clients found matching your search</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-10 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
              <span>Loading clients...</span>
            </div>
          ) : clientList.map((c) => (
            <div key={c._id} className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-slate-900 text-base">{c.clientName}</div>
                  <div className="text-xs text-slate-500 line-clamp-1">{c.officeAddress}</div>
                </div>
                <Link to={`/l1/clients/${c._id}`} className="p-2 text-brand-600 bg-brand-50 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Contact</div>
                  <div className="text-xs font-semibold text-slate-700">{c.contactNumber}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">KYC Status</div>
                  <span className={`${statusBadge(c.kycStatus)} text-[10px]`}>{c.kycStatus}</span>
                </div>
              </div>
            </div>
          ))}
          {!isLoading && clientList.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              No clients found
            </div>
          )}
        </div>

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6 bg-slate-50/50">
            <div className="flex flex-1 justify-between sm:hidden gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary flex-1 py-2 text-xs"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary flex-1 py-2 text-xs"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-600">
                  Showing page <span className="font-bold text-slate-900">{page}</span> of{' '}
                  <span className="font-bold text-slate-900">{totalPages}</span>
                </p>
              </div>
              <nav className="isolate inline-flex -space-x-px rounded-lg shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-l-lg px-3 py-2 text-slate-500 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-40 transition-colors"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01.02 1.06L8.832 10l3.978 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300">
                  {page}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center rounded-r-lg px-3 py-2 text-slate-500 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-40 transition-colors"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.19 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
