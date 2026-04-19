import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth.js';

export function RequireAuth({ levels, children }) {
  const { user, booted } = useAuth();
  const loc = useLocation();

  if (!booted) {
    return <div className="p-8 text-slate-400">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }
  if (levels && !levels.includes(user.level)) {
    return <Navigate to="/forbidden" replace />;
  }
  return children;
}
