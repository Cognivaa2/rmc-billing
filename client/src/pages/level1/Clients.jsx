import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { clients } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { statusBadge } from '../../utils/format.js';

export default function L1Clients() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ['clients', q],
    queryFn: () => clients.list({ q: q || undefined }),
  });

  const { register, handleSubmit, reset } = useForm();
  const create = useMutation({
    mutationFn: (d) => clients.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      setShowNew(false);
      reset();
    },
  });

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Master database — permanent and non-deletable."
        actions={
          <button className="btn-primary" onClick={() => setShowNew((v) => !v)}>
            {showNew ? 'Cancel' : 'New Client'}
          </button>
        }
      />

      {showNew && (
        <form
          className="card card-body mb-5 grid grid-cols-1 gap-3 md:grid-cols-3"
          onSubmit={handleSubmit((d) => create.mutate({
            ...d,
            taxInformation: {
              gstin: d.gstin || undefined,
              pan: d.pan || undefined,
            },
          }))}
        >
          <div>
            <label className="label">Name *</label>
            <input className="input" required {...register('clientName')} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Office Address *</label>
            <input className="input" required {...register('officeAddress')} />
          </div>
          <div>
            <label className="label">Contact Number *</label>
            <input className="input" required {...register('contactNumber')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" {...register('email')} />
          </div>
          <div>
            <label className="label">GSTIN</label>
            <input className="input" {...register('gstin')} />
          </div>
          <div>
            <label className="label">PAN</label>
            <input className="input" {...register('pan')} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button className="btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients…"
            className="input max-w-sm"
          />
        </div>
        <table className="table-clean">
          <thead>
            <tr>
              <th>Client</th>
              <th>Contact</th>
              <th>KYC</th>
              <th>Credit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c._id}>
                <td>
                  <div className="font-medium">{c.clientName}</div>
                  <div className="text-xs text-slate-500">{c.officeAddress}</div>
                </td>
                <td>
                  <div>{c.contactNumber}</div>
                  <div className="text-xs text-slate-400">{c.email}</div>
                </td>
                <td><span className={statusBadge(c.kycStatus)}>{c.kycStatus}</span></td>
                <td><span className={statusBadge(c.creditStatus)}>{c.creditStatus}</span></td>
                <td className="text-right">
                  <Link to={`/l1/clients/${c._id}`} className="text-brand-600 hover:underline text-sm">
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan="5" className="p-6 text-center text-sm text-slate-400">No clients yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
