import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../store/auth.js';
import { NotificationBell } from './NotificationBell.jsx';
import { OfflineIndicator } from './OfflineIndicator.jsx';

const NAV_BY_LEVEL = {
  1: [
    { to: '/l1', label: 'Dashboard', icon: 'grid' },
    { to: '/l1/clients', label: 'Clients', icon: 'users' },
    { to: '/l1/grades', label: 'Grades', icon: 'layers' },
    { to: '/l1/payments', label: 'Payments', icon: 'coin' },
    { to: '/l1/reports', label: 'Reports', icon: 'chart' },
    { to: '/l1/users', label: 'Users', icon: 'user' },
  ],
  2: [
    { to: '/l2', label: 'Dashboard', icon: 'grid' },
    { to: '/l2/clients', label: 'Clients', icon: 'users' },
    { to: '/l2/orders', label: 'Orders', icon: 'star' },
    { to: '/l2/invoices', label: 'Invoices', icon: 'receipt' },
    { to: '/l2/payments', label: 'Payments', icon: 'coin' },
  ],
  3: [
    { to: '/l3', label: 'Dashboard', icon: 'grid' },
    { to: '/l3/orders', label: 'My Orders', icon: 'star' },
  ],
  4: [
    { to: '/l4', label: 'Dashboard', icon: 'grid' },
    { to: '/l4/approved-orders', label: 'Approved Orders', icon: 'star' },
    { to: '/l4/invoices', label: 'Invoices', icon: 'receipt' },
  ],
};

export function Icon({ name, size = 18 }) {
  const paths = {
    grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
    users: <path d="M17 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
    coin: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5v10M7 12h10" />,
    chart: <path d="M3 21h18M6 17V9M10 17V5M14 17v-6M18 17v-3" />,
    user: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
    trash: <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />,
    star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
    deal: <path d="M3 7h18v10H3zM7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />,
    truck: <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7zM5 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="M5 13l4 4L19 7" />,
    receipt: <path d="M4 2h16v20l-3-2-3 2-3-2-3 2-4-2V2zM8 7h8M8 11h8M8 15h5" />,
    doc: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8M8 9h2" />,
    layers: <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
    menu: <path d="M3 12h18M3 6h18M3 18h18" />,
    x: <path d="M18 6 6 18M6 6l12 12" />,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.grid}
    </svg>
  );
}

/* ── Sidebar content (shared between desktop + mobile drawer) ─────────────── */
function SidebarContent({ items, user, levelLabel, onLinkClick, onLogout }) {
  return (
    <>
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white font-bold">R</div>
        <div>
          <div className="font-semibold">Merlo Billing</div>
          <div className="text-xs text-slate-500">Dashboard</div>
        </div>
      </div>
      <div className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Main Menu</div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to.endsWith(`/l${user.level}`)}
            onClick={onLinkClick}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )
            }
          >
            <Icon name={i.icon} />
            <span>{i.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-slate-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700">
            {user?.name?.[0] || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user?.name}</div>
            <div className="text-xs text-slate-500">{levelLabel}</div>
          </div>
          <button className="text-slate-400 hover:text-slate-700" onClick={onLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

export function Layout() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const nav = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = user ? NAV_BY_LEVEL[user.level] || [] : [];
  const levelLabel = user ? `Level ${user.level}` : '';

  const handleLogout = async () => {
    await logout();
    nav('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100">

      {/* ── Desktop sidebar (hidden on mobile) ──────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col bg-white shadow-sm flex-shrink-0">
        <SidebarContent
          items={items}
          user={user}
          levelLabel={levelLabel}
          onLinkClick={() => { }}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Mobile drawer backdrop ───────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-xl transition-transform duration-300 md:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Close button */}
        <button
          className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          onClick={() => setDrawerOpen(false)}
        >
          <Icon name="x" size={20} />
        </button>
        <SidebarContent
          items={items}
          user={user}
          levelLabel={levelLabel}
          onLinkClick={() => setDrawerOpen(false)}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Top header */}
        <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" size={20} />
            </button>
            <OfflineIndicator />
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        {/* Page content — adds bottom padding on mobile for the bottom nav bar */}
        <section className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </section>

        {/* ── Mobile bottom nav bar (L3 only for quick access) ──────────── */}
        {user?.level === 3 && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white px-2 py-2 md:hidden">
            {items.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.to.endsWith(`/l${user.level}`)}
                className={({ isActive }) =>
                  clsx(
                    'flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-xs font-medium transition',
                    isActive ? 'text-brand-600' : 'text-slate-400',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={clsx('rounded-xl p-1.5 transition', isActive ? 'bg-brand-50' : '')}>
                      <Icon name={i.icon} size={20} />
                    </span>
                    <span>{i.label}</span>
                  </>
                )}
              </NavLink>
            ))}
            {/* Quick "New Order" shortcut */}
            <NavLink
              to="/l3/orders/new"
              className="flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-xs font-medium text-slate-400 transition"
            >
              <span className="rounded-xl bg-brand-600 p-1.5 text-white shadow">
                <Icon name="plus" size={20} />
              </span>
              <span>New</span>
            </NavLink>
          </nav>
        )}
      </main>
    </div>
  );
}
