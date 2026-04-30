import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { orders } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime, fmtMoney } from '../../utils/format.js';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'CLOSED', label: 'Closed' },
  { key: 'REJECTED', label: 'Rejected' },
];

const STATUS_BADGE = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border border-blue-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
  DISPATCHED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  CLOSED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const getNormalizedStatus = (status) => {
  if (['SALE_AUTHORIZED', 'INVOICED', 'CLOSED'].includes(status)) return 'CLOSED';
  return status;
};

const STATUS_DESC = {
  PENDING: 'Waiting for Manager approval',
  APPROVED: 'Manager approved — ready for dispatch',
  REJECTED: 'Order rejected by Manager',
  DISPATCHED: 'Dispatch in progress',
  CLOSED: 'Order closed by Manager',
};

const PIPELINE_STEPS = ['PENDING', 'APPROVED', 'DISPATCHED', 'CLOSED'];

function PipelineBar({ status }) {
  const normStatus = getNormalizedStatus(status);
  const idx = PIPELINE_STEPS.indexOf(normStatus);

  return (
    <div className="relative mt-2">
      {/* Background track */}
      <div className="absolute top-2 left-0 h-1 w-full rounded-full bg-slate-100" />
      
      <div className="relative flex justify-between">
        {PIPELINE_STEPS.map((s, i) => {
          const isCompleted = i < idx || (idx === PIPELINE_STEPS.length - 1 && i === idx);
          const isActive = i === idx && idx !== PIPELINE_STEPS.length - 1;
          
          return (
            <div key={s} className="flex flex-col items-center group">
              {/* Connector line for completed steps */}
              {i > 0 && (
                <div 
                  className={`absolute top-2 h-1 transition-all duration-500 ${
                    i <= idx ? 'bg-emerald-500' : 'bg-transparent'
                  }`}
                  style={{ 
                    left: `${((i - 1) / (PIPELINE_STEPS.length - 1)) * 100 + 2}%`,
                    width: `${(1 / (PIPELINE_STEPS.length - 1)) * 100 - 4}%`
                  }}
                />
              )}

              {/* Step circle */}
              <div
                className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                    : isActive
                    ? 'border-brand-600 bg-white shadow-[0_0_8px_rgba(37,99,235,0.2)]'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {isCompleted ? (
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <div className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-brand-600 animate-pulse' : 'bg-slate-200'}`} />
                )}
              </div>

              {/* Label */}
              <span 
                className={`mt-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${
                  isCompleted ? 'text-emerald-600' : isActive ? 'text-brand-600' : 'text-slate-400'
                }`}
              >
                {s === 'PENDING' ? 'Pending' : s === 'APPROVED' ? 'Approved' : s === 'DISPATCHED' ? 'Dispatch' : 'Closed'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function L3MyOrders() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'mine', page],
    queryFn: () =>
      orders.listPaginated({
        mine: 'true',
        page,
        limit: 10,
      }),
    keepPreviousData: true,
  });

  const ordersList = data?.orders || [];
  const totalPages = data?.totalPages || 1;

  return (
    <>
      <PageHeader
        title="My Orders"
        subtitle="Track and manage all your concrete orders."
        actions={
          <Link to="/l3/orders/new" className="btn-primary text-sm px-4 py-2">
            + New Order
          </Link>
        }
      />

      {/* Orders list */}
      <div className="space-y-3 pt-2">
        {isLoading && (
          <div className="card card-body text-center text-sm text-slate-400">Loading…</div>
        )}

        {ordersList.map((o) => {
          const nStatus = getNormalizedStatus(o.status);
          const isRejected = o.status === 'REJECTED';
          
          return (
            <div key={o._id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
              {/* Left Color Strip */}
              <div className={`absolute inset-y-0 left-0 w-1 ${
                isRejected ? 'bg-red-500' : 
                nStatus === 'CLOSED' ? 'bg-emerald-500' : 
                nStatus === 'DISPATCHED' ? 'bg-indigo-500' : 
                nStatus === 'APPROVED' ? 'bg-blue-500' : 'bg-amber-500'
              }`} />

              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  {/* Left: Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold tracking-tight text-slate-900">{o.orderNumber}</h3>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm border ${STATUS_BADGE[nStatus] || 'bg-slate-100 text-slate-600'}`}>
                        {FILTERS.find((f) => f.key === nStatus)?.label || o.status}
                      </span>
                    </div>
                    
                    <div className="mt-2">
                      <p className="font-bold text-slate-800 text-base">{o.client?.clientName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-slate-500">
                        {o.site?.siteName && (
                          <span className="flex items-center gap-1">
                            <span className="text-slate-400">📍</span>
                            {o.site.siteName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="text-slate-400">🗓</span>
                          {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Quantitative Grid */}
                  <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-4 lg:border-t-0 lg:pt-0 lg:px-8 lg:border-x lg:border-slate-100">
                    <div className="text-center sm:text-left">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Grade</p>
                      <p className="mt-0.5 inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700">
                        {o.grade || '—'}
                      </p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quantity</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-800">{o.quantity} <span className="text-xs font-normal text-slate-400">m³</span></p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rate</p>
                      <p className="mt-0.5 text-sm font-bold text-brand-600">{fmtMoney(o.negotiatedRate)}</p>
                    </div>
                  </div>

                  {/* Right: Meta & Actions */}
                  <div className="flex flex-row items-center justify-between lg:flex-col lg:items-end lg:justify-center gap-4 border-t border-slate-50 pt-4 lg:border-t-0 lg:pt-0">
                    <div className="flex flex-col lg:items-end">
                      <div className="text-[10px] text-slate-400 font-medium">Created on</div>
                      <div className="text-xs font-semibold text-slate-600">{fmtDateTime(o.createdAt)}</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {o.status === 'PENDING' && (
                        <Link
                          to={`/l3/orders/${o._id}/edit`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                        >
                          ✏️ Edit
                        </Link>
                      )}
                      {isRejected && (
                        <div className="group relative">
                          <div className="flex h-8 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-600 border border-red-100 cursor-help">
                            ⚠ Rejected
                          </div>
                          {o.rejectionReason && (
                            <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-slate-800 p-2 text-[10px] text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                              {o.rejectionReason}
                              <div className="absolute top-full right-4 h-2 w-2 rotate-45 bg-slate-800" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pipeline / Footer */}
                {!isRejected && (
                  <div className="mt-6 border-t border-slate-50 pt-4">
                    <div className="mx-auto max-w-xl">
                      <PipelineBar status={o.status} />
                      <p className="mt-4 text-center text-[11px] font-medium text-slate-400 italic">
                        {STATUS_DESC[nStatus]}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {!isLoading && ordersList.length === 0 && (
          <div className="card card-body text-center text-slate-400 py-12">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm font-medium">
              {activeFilter === 'ALL'
                ? 'No orders yet.'
                : `No ${FILTERS.find((f) => f.key === activeFilter)?.label} orders.`}
            </div>
            {activeFilter === 'ALL' && (
              <Link to="/l3/orders/new" className="mt-4 inline-block btn-primary text-xs">
                + Submit First Order
              </Link>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages >= 1 && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-500">
              Page <span className="font-medium">{page}</span> of{' '}
              <span className="font-medium">{totalPages}</span>
            </p>
            <div className="isolate inline-flex -space-x-px rounded-md shadow-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center rounded-l-md px-3 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="relative inline-flex items-center rounded-r-md px-3 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
