import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { payments, invoices } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime, fmtMoney } from '../../utils/format.js';

export default function L1Payments() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all'); // all, received, pending

  const { data: paymentsList = [], isLoading: pLoad } = useQuery({
    queryKey: ['payments_all'],
    queryFn: () => payments.list({ limit: 10000 }),
  });

  const { data: invoicesList = [], isLoading: iLoad } = useQuery({
    queryKey: ['invoices_all'],
    queryFn: () => invoices.list(),
  });

  const isLoading = pLoad || iLoad;

  const allRecords = useMemo(() => {
    const paidInvoiceIds = new Set(
      paymentsList
        .filter((p) => p.paymentReceived && p.invoice)
        .map((p) => p.invoice._id || p.invoice)
    );

    const virtualPayments = invoicesList
      .filter((inv) => !paidInvoiceIds.has(inv._id))
      .map((inv) => ({
        _id: 'v_' + inv._id,
        isVirtual: true,
        createdAt: inv.generatedAt,
        client: inv.client,
        invoice: inv,
        amount: inv.amount,
        paymentReceived: false,
        recordedByLevel2: null,
      }));

    const combined = [...paymentsList, ...virtualPayments];
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return combined;
  }, [paymentsList, invoicesList]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter((p) => {
      if (status === 'received' && !p.paymentReceived) return false;
      if (status === 'pending' && p.paymentReceived) return false;
      if (search) {
        const q = search.toLowerCase();
        const clientName = (p.client?.clientName || '').toLowerCase();
        if (!clientName.includes(q)) return false;
      }
      return true;
    });
  }, [allRecords, status, search]);

  const totalRecords = filteredRecords.length;
  const limit = 10;
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  const list = filteredRecords.slice((page - 1) * limit, page * limit);


  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Track payment status and identify pending collections."
      />

      <div className="mb-6 space-y-4">
        {/* Filters Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl w-fit">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'received', label: 'Received' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setStatus(s.id);
                  setPage(1);
                }}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${status === s.id
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="relative max-w-sm w-full">
            <input
              type="text"
              placeholder="Search by client name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input pl-10"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500 font-medium">
            Found <span className="text-slate-900 font-bold">{totalRecords}</span> {status} records
          </div>
        </div>
      </div>

      <div className="card overflow-hidden border-none shadow-xl shadow-slate-200/50">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr>
                <th>When</th>
                <th>Client</th>
                <th>Invoice</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center">
                    <div className="flex justify-center items-center gap-3 text-slate-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600"></div>
                      <span>Syncing data...</span>
                    </div>
                  </td>
                </tr>
              ) : list.map((p) => (
                <tr key={p._id} className={!p.paymentReceived ? 'bg-rose-50/30' : ''}>
                  <td className="text-slate-500">{fmtDateTime(p.createdAt)}</td>
                  <td className="font-bold text-slate-900">{p.client?.clientName}</td>
                  <td className="text-slate-600 font-mono text-xs">{p.invoice?.invoiceNumber || '—'}</td>
                  <td className="font-black text-slate-900">{fmtMoney(p.amount || p.invoice?.amount || 0)}</td>
                  <td>
                    {p.paymentReceived ? (
                      <span className="badge-green">Received</span>
                    ) : (
                      <span className="badge-red animate-pulse">Pending</span>
                    )}
                  </td>
                  <td className="text-slate-600">{p.recordedByLevel2?.name || '—'}</td>
                </tr>
              ))}
              {!isLoading && list.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-20 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-50 rounded-full">
                        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="font-medium">No {status !== 'all' ? status : ''} records found</p>
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
              Loading...
            </div>
          ) : list.map((p) => (
            <div key={p._id} className={`p-4 space-y-3 ${!p.paymentReceived ? 'bg-rose-50/50' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black text-slate-900 text-base">{p.client?.clientName}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{fmtDateTime(p.createdAt)}</div>
                </div>
                {p.paymentReceived ? (
                  <span className="badge-green">Received</span>
                ) : (
                  <span className="badge-red animate-pulse">Pending</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-slate-100">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Invoice</div>
                  <div className="font-bold text-slate-700 truncate">{p.invoice?.invoiceNumber || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Amount</div>
                  <div className="font-black text-brand-700">{fmtMoney(p.amount || p.invoice?.amount || 0)}</div>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 flex justify-between items-center px-1">
                <span>Recorded by: <span className="text-slate-600 font-bold">{p.recordedByLevel2?.name || '—'}</span></span>
              </div>
            </div>
          ))}
          {!isLoading && list.length === 0 && (
            <div className="p-20 text-center text-slate-400">
              No {status !== 'all' ? status : ''} records found
            </div>
          )}
        </div>

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6 bg-slate-50/80 backdrop-blur-md">
            <div className="flex flex-1 justify-between sm:hidden gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary flex-1 py-2 text-xs font-bold"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary flex-1 py-2 text-xs font-bold"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">
                  Page <span className="font-bold text-slate-900">{page}</span> of{' '}
                  <span className="font-bold text-slate-900">{totalPages}</span>
                </p>
              </div>
              <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-l-xl px-3 py-2 text-slate-500 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-30 transition-all"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01.02 1.06L8.832 10l3.978 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="relative inline-flex items-center px-4 py-2 text-xs font-bold text-slate-900 ring-1 ring-inset ring-slate-300">
                  {page}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center rounded-r-xl px-3 py-2 text-slate-500 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-30 transition-all"
                >
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
