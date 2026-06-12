import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../store/auth.js';

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function Login() {
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
        {/* Logo */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 font-bold text-white">R</div>
          <div>
            <div className="text-lg font-semibold">Merlo Billing</div>
            <div className="text-xs text-slate-500">Dispatch &amp; Invoice Portal</div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              autoComplete="username"
              placeholder="you@example.com"
              {...register('email', { required: true })}
            />
          </div>

          {/* Password with eye toggle */}
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password', { required: true })}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            className="w-full btn-primary py-3 px-6 font-bold text-sm rounded-xl active:scale-[0.98] transition-all shadow-md shadow-brand-600/20 flex items-center justify-center gap-2"
            disabled={submitting || formState.isSubmitting}
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-500">
          First time setup?{' '}
          <a href="/register" className="text-brand-600 hover:text-brand-500 font-medium">
            Register Admin here
          </a>
        </div>
      </div>
    </div>
  );
}
