import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';
import { useAuth } from './store/auth.js';
import { installSyncListeners } from './offline/sync.js';

import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Forbidden from './pages/Forbidden.jsx';
import NotFound from './pages/NotFound.jsx';

import L1Dashboard from './pages/level1/Dashboard.jsx';
import L1Clients from './pages/level1/Clients.jsx';
import L1ClientDetail from './pages/level1/ClientDetail.jsx';
import L1Payments from './pages/level1/Payments.jsx';
import L1Reports from './pages/level1/Reports.jsx';
import L1Users from './pages/level1/Users.jsx';
import L1Admin from './pages/level1/Admin.jsx';

import L2Dashboard from './pages/level2/Dashboard.jsx';
import L2Clients from './pages/level2/Clients.jsx';
import L2ClientDetail from './pages/level2/ClientDetail.jsx';
import L2Payments from './pages/level2/Payments.jsx';
import L2Orders from './pages/level2/Orders.jsx';
import L2SalesOrders from './pages/level2/SalesOrders.jsx';
import L2Dispatches from './pages/level2/Dispatches.jsx';

import L3Dashboard from './pages/level3/Dashboard.jsx';
import L3NewOrder from './pages/level3/NewOrder.jsx';
import L3MyOrders from './pages/level3/MyOrders.jsx';

import L4Dashboard from './pages/level4/Dashboard.jsx';
import L4ApprovedOrders from './pages/level4/ApprovedOrders.jsx';
import L4Dispatches from './pages/level4/Dispatches.jsx';
import L4Invoices from './pages/level4/Invoices.jsx';
import L4Batchsheets from './pages/level4/Batchsheets.jsx';
import L4Templates from './pages/level4/Templates.jsx';

function HomeRedirect() {
  const { user, booted } = useAuth();
  if (!booted) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  const map = { 1: '/l1', 2: '/l2', 3: '/l3', 4: '/l4' };
  return <Navigate to={map[user.level] || '/login'} replace />;
}

export default function App() {
  const boot = useAuth((s) => s.boot);

  useEffect(() => {
    boot();
    installSyncListeners();
  }, [boot]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<RequireAuth levels={[1]}><Layout /></RequireAuth>}>
        <Route path="/l1" element={<L1Dashboard />} />
        <Route path="/l1/clients" element={<L1Clients />} />
        <Route path="/l1/clients/:id" element={<L1ClientDetail />} />
        <Route path="/l1/payments" element={<L1Payments />} />
        <Route path="/l1/reports" element={<L1Reports />} />
        <Route path="/l1/users" element={<L1Users />} />
        <Route path="/l1/admin" element={<L1Admin />} />
      </Route>

      <Route element={<RequireAuth levels={[2]}><Layout /></RequireAuth>}>
        <Route path="/l2" element={<L2Dashboard />} />
        <Route path="/l2/clients" element={<L2Clients />} />
        <Route path="/l2/clients/:id" element={<L2ClientDetail />} />
        <Route path="/l2/payments" element={<L2Payments />} />
        <Route path="/l2/orders" element={<L2Orders />} />
        <Route path="/l2/sales-orders" element={<L2SalesOrders />} />
        <Route path="/l2/dispatches" element={<L2Dispatches />} />
      </Route>

      <Route element={<RequireAuth levels={[3]}><Layout /></RequireAuth>}>
        <Route path="/l3" element={<L3Dashboard />} />
        <Route path="/l3/orders/new" element={<L3NewOrder />} />
        <Route path="/l3/orders" element={<L3MyOrders />} />
      </Route>

      <Route element={<RequireAuth levels={[4]}><Layout /></RequireAuth>}>
        <Route path="/l4" element={<L4Dashboard />} />
        <Route path="/l4/approved-orders" element={<L4ApprovedOrders />} />
        <Route path="/l4/dispatches" element={<L4Dispatches />} />
        <Route path="/l4/invoices" element={<L4Invoices />} />
        <Route path="/l4/batchsheets" element={<L4Batchsheets />} />
        <Route path="/l4/templates" element={<L4Templates />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
