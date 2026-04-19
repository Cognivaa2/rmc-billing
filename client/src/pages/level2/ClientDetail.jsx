import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { clients, payments, sites } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { statusBadge, fmtDateTime } from '../../utils/format.js';

export default function L2ClientDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState('kyc');

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clients.get(id),
  });

  const { data: paymentList = [] } = useQuery({
    queryKey: ['payments', id],
    queryFn: () => payments.list({ client: id }),
    enabled: tab === 'payments',
  });

  const { data: sitesList = [] } = useQuery({
    queryKey: ['sites', id],
    queryFn: () => sites.list({ client: id }),
    enabled: tab === 'sites',
  });

  const { register: regKyc, handleSubmit: handleKyc, reset: resetKyc } = useForm();
  const { register: regPay, handleSubmit: handlePay, reset: resetPay } = useForm({
    defaultValues: { paymentReceived: true },
  });
  const { register: regSite, handleSubmit: handleSite, reset: resetSite } = useForm();

  const updateKyc = useMutation({
    mutationFn: (d) =>
      clients.updateKyc(id, {
        kycStatus: d.kycStatus || undefined,
        creditStatus: d.creditStatus || undefined,
        remarks: d.remarks || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', id] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      resetKyc();
    },
  });

  const recordPayment = useMutation({
    mutationFn: (d) =>
      payments.create({
        client: id,
        paymentReceived: d.paymentReceived === 'true' || d.paymentReceived === true,
        receivedAt: d.receivedAt || undefined,
        remarks: d.remarks || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', id] });
      resetPay({ paymentReceived: true });
    },
  });

  const createSite = useMutation({
    mutationFn: (d) => sites.create({ ...d, client: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites', id] });
      resetSite();
    },
  });

  if (isLoading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!client) return <div className="p-8 text-slate-400">Client not found.</div>;

  const tabs = ['kyc', 'payments', 'sites'];

  return (
    <>
      <PageHeader
        title={client.clientName}
        subtitle={client.officeAddress}
        actions={<Link to="/l2/clients" className="btn-secondary">← Back</Link>}
      />

      {/* Client info strip */}
      <div className="card card-body mb-5 grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
        <div>
          <div className="label">Contact</div>
          <div>{client.contactNumber}</div>
          <div className="text-slate-400">{client.email}</div>
        </div>
        <div>
          <div className="label">GSTIN</div>
          <div>{client.taxInformation?.gstin || '—'}</div>
        </div>
        <div>
          <div className="label">KYC Status</div>
          <span className={statusBadge(client.kycStatus)}>{client.kycStatus}</span>
        </div>
        <div>
          <div className="label">Credit Status</div>
          <span className={statusBadge(client.creditStatus)}>{client.creditStatus}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
              tab === t
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* KYC TAB */}
      {tab === 'kyc' && (
        <div className="space-y-5">
          <div className="card card-body">
            <div className="mb-4 font-semibold text-slate-700">Update KYC &amp; Credit Status</div>
            <form
              className="grid grid-cols-1 gap-3 md:grid-cols-3"
              onSubmit={handleKyc((d) => updateKyc.mutate(d))}
            >
              <div>
                <label className="label">KYC Status</label>
                <select className="select" {...regKyc('kycStatus')}>
                  <option value="">— no change —</option>
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="label">Credit Status</label>
                <select className="select" {...regKyc('creditStatus')}>
                  <option value="">— no change —</option>
                  <option value="good">Good</option>
                  <option value="hold">Hold</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
              <div>
                <label className="label">Remarks</label>
                <input className="input" placeholder="Optional remark" {...regKyc('remarks')} />
              </div>
              <div className="md:col-span-3 flex justify-end gap-3">
                {updateKyc.isSuccess && (
                  <span className="text-sm text-emerald-600">Saved ✓</span>
                )}
                <button className="btn-primary" disabled={updateKyc.isPending}>
                  {updateKyc.isPending ? 'Saving…' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>

          {/* KYC documents */}
          <div className="card">
            <div className="border-b border-slate-100 px-5 py-4 font-semibold">
              Documents ({client.kycData?.documents?.length || 0})
            </div>
            {client.kycData?.documents?.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {client.kycData.documents.map((doc, i) => (
                  <li key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span>{doc.fileName}</span>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      View
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-sm text-slate-400">No documents uploaded</div>
            )}
            {client.kycData?.remarks && (
              <div className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
                <span className="font-medium">Remarks: </span>
                {client.kycData.remarks}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAYMENTS TAB */}
      {tab === 'payments' && (
        <div className="space-y-5">
          <div className="card card-body">
            <div className="mb-4 font-semibold text-slate-700">Record Payment</div>
            <form
              className="grid grid-cols-1 gap-3 md:grid-cols-4"
              onSubmit={handlePay((d) => recordPayment.mutate(d))}
            >
              <div>
                <label className="label">Status *</label>
                <select className="select" required {...regPay('paymentReceived')}>
                  <option value="true">Payment Received</option>
                  <option value="false">Not Received</option>
                </select>
              </div>
              <div>
                <label className="label">Date Received</label>
                <input type="datetime-local" className="input" {...regPay('receivedAt')} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Remarks</label>
                <input className="input" {...regPay('remarks')} />
              </div>
              <div className="md:col-span-4 flex justify-end gap-3">
                {recordPayment.isSuccess && (
                  <span className="text-sm text-emerald-600">Recorded ✓</span>
                )}
                <button className="btn-primary" disabled={recordPayment.isPending}>
                  {recordPayment.isPending ? 'Saving…' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="border-b border-slate-100 px-5 py-4 font-semibold">Payment History</div>
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Received At</th>
                  <th>Recorded By</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {paymentList.map((p) => (
                  <tr key={p._id}>
                    <td>
                      {p.paymentReceived ? (
                        <span className="badge-green">Received</span>
                      ) : (
                        <span className="badge-red">Not Received</span>
                      )}
                    </td>
                    <td className="text-slate-500">
                      {p.receivedAt ? fmtDateTime(p.receivedAt) : '—'}
                    </td>
                    <td>{p.recordedByLevel2?.name || '—'}</td>
                    <td className="text-slate-500">{p.remarks || '—'}</td>
                  </tr>
                ))}
                {paymentList.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-sm text-slate-400">
                      No payment records yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SITES TAB */}
      {tab === 'sites' && (
        <div className="space-y-5">
          <div className="card card-body">
            <div className="mb-4 font-semibold text-slate-700">Add New Site</div>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={handleSite((d) => createSite.mutate(d))}
            >
              <div>
                <label className="label">Site Name *</label>
                <input className="input" required {...regSite('siteName')} />
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input" {...regSite('siteAddress')} />
              </div>
              <button className="btn-primary" disabled={createSite.isPending}>
                {createSite.isPending ? 'Adding…' : 'Add Site'}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="border-b border-slate-100 px-5 py-4 font-semibold">
              Sites ({sitesList.length})
            </div>
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Site Name</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {sitesList.map((s) => (
                  <tr key={s._id}>
                    <td className="font-medium">{s.siteName}</td>
                    <td className="text-slate-500">{s.siteAddress || '—'}</td>
                  </tr>
                ))}
                {sitesList.length === 0 && (
                  <tr>
                    <td colSpan="2" className="p-6 text-center text-sm text-slate-400">
                      No sites yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
