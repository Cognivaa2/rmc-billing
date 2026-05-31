import { useQuery } from '@tanstack/react-query';
import { clients, payments, orders, invoices } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtMoney, fmtDateTime, fmtMoneyShort } from '../../utils/format.js';

/* ─── Icon helpers ──────────────────────────────────────────────────────── */
const ClientIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 20v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ReceiptIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const OrderIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <polyline points="9 16 11 18 15 14" />
  </svg>
);

const PendingIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

/* ─── Stat KPI Card ─────────────────────────────────────────────────────── */
function StatCard({ title, value, hint, icon, variant = 'default' }) {
  const variants = {
    default: 'bg-white border border-slate-200 text-slate-800',
    blue:    'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0',
    emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0',
    amber:   'bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0',
    rose:    'bg-gradient-to-br from-rose-500 to-rose-600 text-white border-0',
  };

  const iconBg = {
    default: 'bg-brand-50 text-brand-600',
    blue:    'bg-white/20 text-white',
    emerald: 'bg-white/20 text-white',
    amber:   'bg-white/20 text-white',
    rose:    'bg-white/20 text-white',
  };

  const hintColor = {
    default: 'text-slate-400',
    blue:    'text-blue-100',
    emerald: 'text-emerald-100',
    amber:   'text-amber-100',
    rose:    'text-rose-100',
  };

  return (
    <div className={`rounded-2xl p-5 shadow-sm flex items-start gap-4 ${variants[variant]}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg[variant]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold uppercase tracking-widest mb-1 ${variant === 'default' ? 'text-slate-400' : 'text-white/75'}`}>
          {title}
        </div>
        <div className="text-2xl font-black tracking-tight">{value}</div>
        {hint && (
          <div className={`mt-1 text-xs font-medium ${hintColor[variant]}`}>{hint}</div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function L1Dashboard() {
  const { data: clientsList = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clients.list(),
  });

  const { data: paymentsList = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['payments', 'all'],
    queryFn: () => payments.list(),
  });

  const { data: invoicesList = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoices.list(),
  });

  const { data: soList = [], isLoading: loadingSo } = useQuery({
    queryKey: ['sales-orders', 'all'],
    queryFn: () => orders.list(),
  });

  const isLoading = loadingClients || loadingPayments || loadingInvoices || loadingSo;

  // ── KPI calculations ─────────────────────────────────────────────────────
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd   = new Date(todayStart.getTime() + 86400000);

  // 1. Total Clients
  const totalClients = clientsList.length;
  const pendingKyc   = clientsList.filter((c) => c.kycStatus !== 'verified').length;

  // 2. Total Receipt Amount (sum of all payments received)
  const totalReceiptAmount = paymentsList
    .filter((p) => p.paymentReceived)
    .reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalPaymentCount = paymentsList.filter((p) => p.paymentReceived).length;

  // 3. Today Closed Sales Orders (closed today, per-day wise)
  const todayClosedOrders = soList.filter((so) => {
    if (so.status !== 'closed') return false;
    const closedAt = new Date(so.closedAt || so.updatedAt);
    return closedAt >= todayStart && closedAt < todayEnd;
  });
  const totalClosedEver = soList.filter((so) => so.status === 'closed').length;

  // 4. Pending / Not Received Amount  = total invoice amount − payments received
  const totalInvoiceAmount   = invoicesList.reduce((acc, i) => acc + (i.amount || 0), 0);
  const pendingReceiptAmount = Math.max(0, totalInvoiceAmount - totalReceiptAmount);
  const pendingPaymentCount  = paymentsList.filter((p) => !p.paymentReceived).length;

  // ── Recent data for tables ───────────────────────────────────────────────
  const recentPayments = [...paymentsList]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  const recentSo = [...soList]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  /* ── Skeleton loader ─────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Overview"
          subtitle="All operational data — read-only (Level 1 scope)"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl p-5 bg-white border border-slate-100 shadow-sm animate-pulse h-[100px]" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="All operational data — read-only (Level 1 scope)"
      />

      {/* ── KPI Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Clients */}
        <StatCard
          title="Total Clients"
          value={totalClients}
          hint={pendingKyc > 0 ? `${pendingKyc} pending KYC` : 'All KYC verified'}
          variant="blue"
          icon={<ClientIcon />}
        />

        {/* 2. Total Receipt Amount */}
        <StatCard
          title="Total Receipt Amount"
          value={fmtMoneyShort(totalReceiptAmount)}
          hint={`${totalPaymentCount} payment${totalPaymentCount !== 1 ? 's' : ''} received`}
          variant="emerald"
          icon={<ReceiptIcon />}
        />

        {/* 3. Today Closed Orders (per day) */}
        <StatCard
          title="Today Closed Orders"
          value={todayClosedOrders.length}
          hint={`${totalClosedEver} closed all-time`}
          variant="amber"
          icon={<OrderIcon />}
        />

        {/* 4. Pending / Not Received Amount */}
        <StatCard
          title="Pending Receipt Amount"
          value={fmtMoneyShort(pendingReceiptAmount)}
          hint={`${pendingPaymentCount} unpaid payment record${pendingPaymentCount !== 1 ? 's' : ''}`}
          variant="rose"
          icon={<PendingIcon />}
        />
      </div>

      {/* ── Tables Row ───────────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Recent Payments */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <div className="font-bold text-slate-800">Recent Receipts</div>
              <div className="text-xs text-slate-400 mt-0.5">Latest payment records</div>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              {totalPaymentCount} received
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-sm text-slate-400">No payments recorded yet</td>
                  </tr>
                ) : recentPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.client?.clientName || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{fmtMoney(p.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      {p.paymentReceived ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                          ✓ Received
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{fmtDateTime(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Sales Orders */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <div className="font-bold text-slate-800">Sales Orders</div>
              <div className="text-xs text-slate-400 mt-0.5">Latest order activity</div>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              {soList.filter(s => s.status === 'open').length} open
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">SO#</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentSo.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-sm text-slate-400">No sales orders yet</td>
                  </tr>
                ) : recentSo.map((so) => (
                  <tr key={so._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-700 text-xs">{so.orderNumber || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{so.client?.clientName || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{so.quantity ?? '—'} m³</td>
                    <td className="px-4 py-3 text-center">
                      {so.status === 'open' ? (
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Open
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          Closed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
