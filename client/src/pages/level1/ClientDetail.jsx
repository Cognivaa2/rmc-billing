import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { clients } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { statusBadge, fmtDateTime } from '../../utils/format.js';

export default function L1ClientDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data: client } = useQuery({ queryKey: ['client', id], queryFn: () => clients.get(id) });

  const kyc = useMutation({
    mutationFn: (d) => clients.updateKyc(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client', id] }),
  });
  const { register, handleSubmit } = useForm({
    values: {
      kycStatus: client?.kycStatus || 'pending',
      creditStatus: client?.creditStatus || 'good',
      remarks: client?.kycData?.remarks || '',
    },
  });

  if (!client) return <div className="text-slate-400">Loading…</div>;

  return (
    <>
      <PageHeader title={client.clientName} subtitle={client.officeAddress} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card card-body lg:col-span-2">
          <div className="mb-3 text-sm font-semibold text-slate-500">Details</div>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-slate-500">Contact</dt><dd>{client.contactNumber}</dd>
            <dt className="text-slate-500">Email</dt><dd>{client.email || '—'}</dd>
            <dt className="text-slate-500">GSTIN</dt><dd>{client.taxInformation?.gstin || '—'}</dd>
            <dt className="text-slate-500">PAN</dt><dd>{client.taxInformation?.pan || '—'}</dd>
            <dt className="text-slate-500">KYC Status</dt>
            <dd><span className={statusBadge(client.kycStatus)}>{client.kycStatus}</span></dd>
            <dt className="text-slate-500">Credit</dt>
            <dd><span className={statusBadge(client.creditStatus)}>{client.creditStatus}</span></dd>
            <dt className="text-slate-500">Last KYC review</dt>
            <dd>{fmtDateTime(client.kycData?.verifiedAt)}</dd>
          </dl>
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            Client master records cannot be deleted by anyone, including Level 1. This is a business
            guarantee enforced both at the API layer and via Mongoose hooks.
          </div>
        </div>

        <form
          className="card card-body space-y-3"
          onSubmit={handleSubmit((d) => kyc.mutate(d))}
        >
          <div className="text-sm font-semibold text-slate-500">Update KYC / Credit</div>
          <div>
            <label className="label">KYC Status</label>
            <select className="select" {...register('kycStatus')}>
              <option value="pending">pending</option>
              <option value="submitted">submitted</option>
              <option value="verified">verified</option>
              <option value="rejected">rejected</option>
            </select>
          </div>
          <div>
            <label className="label">Credit Status</label>
            <select className="select" {...register('creditStatus')}>
              <option value="good">good</option>
              <option value="hold">hold</option>
              <option value="blocked">blocked</option>
            </select>
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea className="input" rows="3" {...register('remarks')} />
          </div>
          <button className="btn-primary w-full" disabled={kyc.isPending}>
            {kyc.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </>
  );
}
