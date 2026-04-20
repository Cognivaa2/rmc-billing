import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../store/auth.js';

export default function Login() {
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState } = useForm();
  const login = useAuth((s) => s.login);
  const user = useAuth((s) => s.user);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (user) {
      const map = { 1: '/l1', 2: '/l2', 3: '/l3', 4: '/l4' };
      nav(loc.state?.from?.pathname || map[user.level] || '/', { replace: true });
    }
  }, [user, loc, nav]);

  const onSubmit = async ({ email, password }) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(e?.response?.data?.error || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-brand-50 p-4">
      <div className="card w-full max-w-md card-body">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 font-bold text-white">R</div>
          <div>
            <div className="text-lg font-semibold">RMC Billing</div>
            <div className="text-xs text-slate-500">Dispatch & Invoice Portal</div>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              autoComplete="username"
              placeholder="admin@rmc.local"
              {...register('email', { required: true })}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              autoComplete="current-password"
              {...register('password', { required: true })}
            />
          </div>
          {error && (
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          )}
          <button className="btn-primary w-full" disabled={submitting || formState.isSubmitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <div className="font-medium text-slate-600">Seeded logins</div>
          <div className="mt-1">admin@rmc.local · l2a@rmc.local · l3a@rmc.local · l4a@rmc.local</div>
          <div>Password for all: <span className="font-mono">ChangeMe@123</span></div>
        </div>
        <div className="mt-4 text-center text-sm text-slate-500">
          First time setup? <a href="/register" className="text-brand-600 hover:text-brand-500">Register Admin here</a>
        </div>
      </div>
    </div>
  );
}
