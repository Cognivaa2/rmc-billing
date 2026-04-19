import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { users } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime } from '../../utils/format.js';
import { useState } from 'react';

export default function L1Users() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const { data = [] } = useQuery({ queryKey: ['users'], queryFn: () => users.list() });
  const { register, handleSubmit, reset } = useForm({ defaultValues: { level: 3 } });
  const create = useMutation({
    mutationFn: (d) => users.create({ ...d, level: Number(d.level) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowNew(false);
      reset();
    },
  });

  const toggleStatus = useMutation({
    mutationFn: (u) => users.update(u.id, { status: u.status === 'active' ? 'disabled' : 'active' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Level-based user management."
        actions={<button className="btn-primary" onClick={() => setShowNew((v) => !v)}>{showNew ? 'Cancel' : 'New User'}</button>}
      />

      {showNew && (
        <form
          className="card card-body mb-5 grid grid-cols-1 gap-3 md:grid-cols-5"
          onSubmit={handleSubmit((d) => create.mutate(d))}
        >
          <div>
            <label className="label">Name *</label>
            <input className="input" required {...register('name')} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" required {...register('email')} />
          </div>
          <div>
            <label className="label">Password *</label>
            <input className="input" type="password" required {...register('password')} />
          </div>
          <div>
            <label className="label">Level *</label>
            <select className="select" {...register('level')}>
              <option value={1}>1 — Admin</option>
              <option value={2}>2 — Approver</option>
              <option value={3}>3 — Order entry</option>
              <option value={4}>4 — Dispatch / Invoice</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" disabled={create.isPending}>Create</button>
          </div>
        </form>
      )}

      <div className="card">
        <table className="table-clean">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Level</th>
              <th>Status</th>
              <th>Last login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.name}</td>
                <td>{u.email}</td>
                <td><span className="badge-blue">L{u.level}</span></td>
                <td>
                  {u.status === 'active' ? (
                    <span className="badge-green">active</span>
                  ) : (
                    <span className="badge-gray">disabled</span>
                  )}
                </td>
                <td className="text-slate-500">{fmtDateTime(u.lastLoginAt)}</td>
                <td className="text-right">
                  <button className="text-xs text-brand-600 hover:underline" onClick={() => toggleStatus.mutate(u)}>
                    {u.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
