import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { auth } from '../../api/endpoints.js';
import { useAuth } from '../../store/auth.js';

export default function Register() {
  const { register, handleSubmit } = useForm();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const res = await auth.register(data.name, data.email, data.password);
      setAuth(res.user);
      navigate('/');
    } catch (e) {
      const errData = e.response?.data;
      // Backend sends { error: "string message", details?: {...} }
      setError(errData?.error || errData?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center text-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">R</div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Create Admin Account</h2>
            <p className="mt-1 text-sm text-slate-500">Register the first L1 Admin user</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card card-body space-y-6">
          {error && <div className="rounded-md bg-red-900/50 p-3 text-sm text-red-200 border border-red-800">{error}</div>}
          
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              required
              className="input w-full"
              placeholder="Admin Name"
              {...register('name')}
            />
          </div>

          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              required
              className="input w-full"
              placeholder="admin@example.com"
              {...register('email')}
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="input w-full"
              placeholder="••••••••"
              {...register('password')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center"
          >
            {loading ? 'Creating...' : 'Register as Admin'}
          </button>

          <div className="text-center text-sm text-slate-400 mt-4">
            Already have an account? <Link to="/login" className="text-brand-500 hover:text-brand-400">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
