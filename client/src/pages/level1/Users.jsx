import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { users } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Icon } from '../../components/Layout.jsx';
import { fmtDateTime } from '../../utils/format.js';
import { useState } from 'react';

export default function L1Users() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data } = useQuery({
    queryKey: ['users', page],
    queryFn: () => users.list({ page, limit: 10 }),
    placeholderData: (prev) => prev,
  });

  const userList = data?.users || [];
  const totalPages = data?.totalPages || 1;

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

  const deleteMutation = useMutation({
    mutationFn: (u) => users.delete(u.id || u._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
    },
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
        <div className="overflow-x-auto">
          <table className="table-clean min-w-[800px] md:min-w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Level</th>
                <th>Status</th>
                <th>Last login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {userList.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium whitespace-nowrap">{u.customId || '-'}</td>
                  <td className="font-medium whitespace-nowrap">{u.name}</td>
                  <td className="whitespace-nowrap">{u.email}</td>
                  <td><span className="badge-blue">L{u.level}</span></td>
                  <td>
                    {u.status === 'active' ? (
                      <span className="badge-green">active</span>
                    ) : (
                      <span className="badge-gray">disabled</span>
                    )}
                  </td>
                  <td className="text-slate-500 whitespace-nowrap">{fmtDateTime(u.lastLoginAt)}</td>
                  <td className="text-right">
                    <button 
                      className="text-brand-600 hover:text-brand-700 mr-3 rounded-md p-1 hover:bg-brand-50 transition-colors" 
                      onClick={() => toggleStatus.mutate(u)}
                      title={u.status === 'active' ? 'Disable User' : 'Enable User'}
                    >
                      {u.status === 'active' ? <Icon name="x" size={16} /> : <Icon name="check" size={16} />}
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-700 rounded-md p-1 hover:bg-red-50 transition-colors" 
                      onClick={() => setDeleteTarget(u)}
                      title="Delete User"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {userList.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 gap-4">
          <div className="text-xs text-slate-500">
            Page <span className="font-medium text-slate-700">{page}</span> of{' '}
            <span className="font-medium text-slate-700">{totalPages}</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              className="btn-secondary flex-1 sm:flex-none py-2 px-4 text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <button
              className="btn-secondary flex-1 sm:flex-none py-2 px-4 text-xs disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mb-4 mx-auto">
                <Icon name="trash" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-center text-slate-800 mb-2">
                Delete User
              </h3>
              <p className="text-sm text-center text-slate-600">
                Are you sure you want to delete <span className="font-semibold text-slate-800">{deleteTarget.name}</span>? They will not be able to log in again. This action cannot be undone.
              </p>
            </div>
            <div className="flex bg-slate-50 p-4 gap-3 justify-end border-t border-slate-100">
              <button
                className="btn-secondary px-4 py-2"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="btn-primary bg-rose-600 hover:bg-rose-700 px-4 py-2"
                onClick={() => deleteMutation.mutate(deleteTarget)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
