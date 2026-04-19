import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { salesOrders, clients, sites, grades } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { statusBadge, fmtMoney } from '../../utils/format.js';

export default function L2SalesOrders() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const { data = [] } = useQuery({ queryKey: ['sales-orders'], queryFn: () => salesOrders.list() });
  const { data: clientsList = [] } = useQuery({ queryKey: ['clients'], queryFn: () => clients.list() });
  const { data: gradesList = [] } = useQuery({ queryKey: ['grades'], queryFn: () => grades.list() });
  const { register, handleSubmit, watch, reset } = useForm();
  const selectedClient = watch('client');
  const { data: sitesList = [] } = useQuery({
    queryKey: ['sites', selectedClient],
    queryFn: () => sites.list({ client: selectedClient }),
    enabled: Boolean(selectedClient),
  });

  const create = useMutation({
    mutationFn: (d) => salesOrders.create({
      ...d,
      rate: Number(d.rate),
      totalQuantity: Number(d.totalQuantity),
      site: d.site || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-orders'] }); setShowNew(false); reset(); },
  });
  const close = useMutation({
    mutationFn: (id) => salesOrders.close(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-orders'] }),
  });

  return (
    <>
      <PageHeader
        title="Sales Orders"
        subtitle="L2 creates and closes SOs. Order quantities draw down from remaining."
        actions={<button className="btn-primary" onClick={() => setShowNew((v) => !v)}>{showNew ? 'Cancel' : 'New SO'}</button>}
      />

      {showNew && (
        <form
          className="card card-body mb-5 grid grid-cols-1 gap-3 md:grid-cols-6"
          onSubmit={handleSubmit((d) => create.mutate(d))}
        >
          <div className="md:col-span-2">
            <label className="label">Client *</label>
            <select className="select" required {...register('client')}>
              <option value="">Select…</option>
              {clientsList.map((c) => (<option key={c._id} value={c._id}>{c.clientName}</option>))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Site</label>
            <select className="select" {...register('site')}>
              <option value="">—</option>
              {sitesList.map((s) => (<option key={s._id} value={s._id}>{s.siteName}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Grade *</label>
            <select className="select" required {...register('grade')}>
              <option value="">—</option>
              {gradesList.map((g) => (<option key={g._id} value={g._id}>{g.gradeCode}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Rate (₹) *</label>
            <input type="number" step="0.01" className="input" required {...register('rate')} />
          </div>
          <div>
            <label className="label">Total Qty (m³) *</label>
            <input type="number" step="0.01" className="input" required {...register('totalQuantity')} />
          </div>
          <div className="md:col-span-5">
            <label className="label">Notes</label>
            <input className="input" {...register('notes')} />
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
              <th>SO</th>
              <th>Client</th>
              <th>Grade</th>
              <th>Rate</th>
              <th>Total</th>
              <th>Dispatched</th>
              <th>Remaining</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((so) => (
              <tr key={so._id}>
                <td className="font-medium">{so.soNumber}</td>
                <td>{so.client?.clientName}</td>
                <td>{so.grade?.gradeCode}</td>
                <td>{fmtMoney(so.rate)}</td>
                <td>{so.totalQuantity}</td>
                <td>{so.dispatchedQuantity}</td>
                <td>{so.remainingQuantity}</td>
                <td><span className={statusBadge(so.status)}>{so.status}</span></td>
                <td className="text-right">
                  {so.status === 'open' && (
                    <button className="btn-secondary text-xs" onClick={() => close.mutate(so._id)}>Close</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
