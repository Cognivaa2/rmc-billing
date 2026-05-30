import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { clients, payments, sites } from '../../api/endpoints.js';
import { statusBadge, fmtDateTime, fmtMoney } from '../../utils/format.js';


export default function L2ClientDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState('kyc');
  const [paymentPage, setPaymentPage] = useState(1);
  const [sitePage, setSitePage] = useState(1);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editingSite, setEditingSite] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clients.get(id),
  });

  const { data: paymentsData = { payments: [], totalPages: 1, page: 1 } } = useQuery({
    queryKey: ['payments', id, paymentPage],
    queryFn: () => payments.list({ client: id, page: paymentPage, limit: 6 }),
    enabled: tab === 'payments',
  });
  const paymentList = paymentsData.payments || [];

  const { data: sitesData = { sites: [], totalPages: 1, page: 1 } } = useQuery({
    queryKey: ['sites', id, sitePage],
    queryFn: () => sites.list({ client: id, page: sitePage, limit: 6 }),
    enabled: tab === 'sites',
  });
  const sitesList = sitesData.sites || [];

  const { register: regKyc, handleSubmit: handleKyc, reset: resetKyc } = useForm();
  const { register: regPay, handleSubmit: handlePay, reset: resetPay } = useForm({
    defaultValues: { paymentReceived: true },
  });
  const { register: regSite, handleSubmit: handleSite, reset: resetSite } = useForm();
  const { register: regProfile, handleSubmit: handleProfile, reset: resetProfile, formState: { errors: profileErrors } } = useForm();

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

  const updateProfile = useMutation({
    mutationFn: (d) =>
      clients.update(id, {
        clientName: d.clientName,
        officeAddress: d.officeAddress,
        contactNumber: d.contactNumber?.trim(),
        email: d.email,
        taxInformation: {
          gstin: d.gstin ? d.gstin.trim().toUpperCase() : undefined,
          pan: d.pan ? d.pan.trim().toUpperCase() : undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', id] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      setIsEditingProfile(false);
    },
  });

  const recordPayment = useMutation({
    mutationFn: (d) =>
      payments.create({
        client: id,
        amount: Number(d.amount),
        paymentReceived: d.paymentReceived === 'true' || d.paymentReceived === true,
        receivedAt: d.receivedAt || undefined,
        remarks: d.remarks || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', id] });
      resetPay({ paymentReceived: true });
    },
  });

  const updatePayment = useMutation({
    mutationFn: (d) =>
      payments.update(editingPayment._id, {
        amount: Number(d.amount),
        paymentReceived: d.paymentReceived === 'true' || d.paymentReceived === true,
        receivedAt: d.receivedAt || undefined,
        remarks: d.remarks || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', id] });
      setEditingPayment(null);
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

  const updateSite = useMutation({
    mutationFn: (d) => sites.update(editingSite._id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites', id] });
      setEditingSite(null);
      resetSite();
    },
  });

  if (isLoading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!client) return <div className="p-8 text-slate-400">Client not found.</div>;

  const tabs = ['kyc', 'payments', 'sites'];

  return (
    <>
      {/* Page header — Back above title on the left */}
      <div className="mb-6">
        <Link
          to="/l2/clients"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 transition mb-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900 truncate">{client.clientName}</h1>
            {client.officeAddress && (
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{client.officeAddress}</p>
            )}
          </div>
          <button
            onClick={() => {
              setIsEditingProfile(!isEditingProfile);
              resetProfile({
                clientName: client.clientName,
                officeAddress: client.officeAddress,
                contactNumber: client.contactNumber,
                email: client.email,
                gstin: client.taxInformation?.gstin || '',
                pan: client.taxInformation?.pan || '',
              });
            }}
            className="btn-secondary text-xs"
          >
            {isEditingProfile ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </div>


      {isEditingProfile && (
        <div className="card card-body mb-5">
          <div className="mb-4 font-semibold text-slate-700">Edit Client Profile</div>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={handleProfile((d) => updateProfile.mutate(d))}>
            <div>
              <label className="label">Client Name *</label>
              <input
                className={`input ${profileErrors.clientName ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : ''}`}
                {...regProfile('clientName', { required: 'Client name is required' })}
              />
              {profileErrors.clientName && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{profileErrors.clientName.message}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="label">Office Address *</label>
              <input
                className={`input ${profileErrors.officeAddress ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : ''}`}
                {...regProfile('officeAddress', { required: 'Office address is required' })}
              />
              {profileErrors.officeAddress && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{profileErrors.officeAddress.message}</p>
              )}
            </div>
            <div>
              <label className="label">Contact Number *</label>
              <input
                className={`input ${profileErrors.contactNumber ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : ''}`}
                placeholder="e.g. 9876543210"
                {...regProfile('contactNumber', {
                  required: 'Contact number is required',
                  pattern: {
                    value: /^\d{10}$/,
                    message: 'Must be exactly 10 digits',
                  },
                })}
              />
              {profileErrors.contactNumber && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{profileErrors.contactNumber.message}</p>
              )}
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className={`input ${profileErrors.email ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : ''}`}
                type="email"
                placeholder="e.g. client@example.com"
                {...regProfile('email')}
              />
              {profileErrors.email && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{profileErrors.email.message}</p>
              )}
            </div>
            <div>
              <label className="label">GSTIN</label>
              <input
                className={`input uppercase ${profileErrors.gstin ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : ''}`}
                placeholder="e.g. 22AAAAA0000A1Z5"
                {...regProfile('gstin', {
                  pattern: {
                    value: /^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}[1-9A-Za-z]{1}Z[0-9A-Za-z]{1}$/,
                    message: 'Format must be: 22AAAAA0000A1Z5',
                  },
                })}
              />
              {profileErrors.gstin && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{profileErrors.gstin.message}</p>
              )}
            </div>
            <div>
              <label className="label">PAN</label>
              <input
                className={`input uppercase ${profileErrors.pan ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : ''}`}
                placeholder="e.g. ABCDE1234F"
                {...regProfile('pan', {
                  pattern: {
                    value: /^[A-Za-z]{5}\d{4}[A-Za-z]$/,
                    message: 'Format must be: 5 letters, 4 digits, 1 letter',
                  },
                })}
              />
              {profileErrors.pan && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{profileErrors.pan.message}</p>
              )}
            </div>
            {updateProfile.error && (
              <div className="md:col-span-3 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                {updateProfile.error?.response?.data?.error || 'Failed to update client profile'}
              </div>
            )}
            <div className="md:col-span-3 flex justify-end gap-3">
              <button type="button" onClick={() => setIsEditingProfile(false)} className="btn-secondary">Cancel</button>
              <button className="btn-primary" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}


      {/* Client info strip */}
      <div className="card card-body mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 text-sm">
        <div>
          <div className="label">Contact</div>
          <div className="font-medium">{client.contactNumber}</div>
          <div className="text-slate-400 break-all">{client.email}</div>
        </div>
        <div>
          <div className="label">GSTIN</div>
          <div className="font-medium uppercase">{client.taxInformation?.gstin || '—'}</div>
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
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${tab === t
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
          {/* <div className="card">
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
            {client.kycData?.verifiedAt && (
              <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400 bg-slate-50 flex justify-between items-center">
                <span>Last updated by: <strong>{client.kycData.verifiedBy?.name || 'System'}</strong></span>
                <span>{fmtDateTime(client.kycData.verifiedAt)}</span>
              </div>
            )}
          </div> */}
        </div>
      )}

      {/* PAYMENTS TAB */}
      {tab === 'payments' && (
        <div className="space-y-5">
          <div className="card card-body">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-semibold text-slate-700">
                {editingPayment ? 'Edit Payment' : 'Record Payment'}
              </div>
              {editingPayment && (
                <button
                  onClick={() => {
                    setEditingPayment(null);
                    resetPay({ paymentReceived: true });
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <form
              className="grid grid-cols-1 gap-3 md:grid-cols-4"
              onSubmit={handlePay((d) => {
                if (editingPayment) {
                  updatePayment.mutate(d);
                } else {
                  recordPayment.mutate(d);
                }
              })}
            >
              <div>
                <label className="label">Amount *</label>
                <input type="number" step="0.01" className="input" required {...regPay('amount')} />
              </div>
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
                {(recordPayment.isSuccess || updatePayment.isSuccess) && (
                  <span className="text-sm text-emerald-600">Saved ✓</span>
                )}
                <button className="btn-primary" disabled={recordPayment.isPending || updatePayment.isPending}>
                  {recordPayment.isPending || updatePayment.isPending ? 'Saving…' : editingPayment ? 'Update Payment' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>

          <div className="card overflow-x-auto">
            <div className="border-b border-slate-100 px-5 py-4 font-semibold">Payment History</div>
            <table className="table-clean min-w-[850px]">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Received At</th>
                  <th>Recorded By</th>
                  <th>Remarks</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paymentList.map((p) => (
                  <tr key={p._id}>
                    <td className="font-semibold text-slate-800">{p.amount ? fmtMoney(p.amount) : '—'}</td>
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
                    <td className="text-right">
                      <button
                        onClick={() => {
                          setEditingPayment(p);
                          resetPay({
                            amount: p.amount,
                            paymentReceived: String(p.paymentReceived),
                            receivedAt: p.receivedAt ? new Date(p.receivedAt).toISOString().slice(0, 16) : '',
                            remarks: p.remarks || '',
                          });
                        }}
                        className="text-brand-600 hover:text-brand-700 font-medium text-xs"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {paymentList.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-sm text-slate-400">
                      No payment records yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination UI */}
            <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6 gap-3">
              <div className="text-sm text-slate-500">
                Page {paymentsData.page || 1} of {paymentsData.totalPages || 1}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                  disabled={paymentPage === 1}
                  className="btn-secondary text-sm py-1 px-3"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPaymentPage((p) => Math.min(paymentsData.totalPages || 1, p + 1))}
                  disabled={paymentPage >= (paymentsData.totalPages || 1)}
                  className="btn-secondary text-sm py-1 px-3"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SITES TAB */}
      {tab === 'sites' && (
        <div className="space-y-5">
          <div className="card card-body">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-semibold text-slate-700">
                {editingSite ? 'Edit Site' : 'Add New Site'}
              </div>
              {editingSite && (
                <button
                  onClick={() => {
                    setEditingSite(null);
                    resetSite({ siteName: '', siteAddress: '' });
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={handleSite((d) => {
                if (editingSite) {
                  updateSite.mutate(d);
                } else {
                  createSite.mutate(d);
                }
              })}
            >
              <div className="flex-1 min-w-[200px]">
                <label className="label">Site Name *</label>
                <input className="input" required {...regSite('siteName')} />
              </div>
              <div className="flex-[2] min-w-[300px]">
                <label className="label">Address</label>
                <input className="input" {...regSite('siteAddress')} />
              </div>
              <div className="flex gap-3">
                <button className="btn-primary" disabled={createSite.isPending || updateSite.isPending}>
                  {createSite.isPending || updateSite.isPending ? 'Saving…' : editingSite ? 'Update Site' : 'Add Site'}
                </button>
              </div>
            </form>
          </div>

          <div className="card overflow-x-auto">
            <div className="border-b border-slate-100 px-5 py-4 font-semibold">
              Sites ({sitesData.total || 0})
            </div>
            <table className="table-clean min-w-[600px]">
              <thead>
                <tr>
                  <th>Site Name</th>
                  <th>Address</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sitesList.map((s) => (
                  <tr key={s._id}>
                    <td className="font-medium text-slate-800">{s.siteName}</td>
                    <td className="text-slate-500">{s.siteAddress || '—'}</td>
                    <td className="text-right">
                      <button
                        onClick={() => {
                          setEditingSite(s);
                          resetSite({
                            siteName: s.siteName,
                            siteAddress: s.siteAddress || '',
                          });
                        }}
                        className="text-brand-600 hover:text-brand-700 font-medium text-xs"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {sitesList.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-6 text-center text-sm text-slate-400">
                      No sites yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination UI */}
            <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6 gap-3">
              <div className="text-sm text-slate-500">
                Page {sitesData.page || 1} of {sitesData.totalPages || 1}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSitePage((p) => Math.max(1, p - 1))}
                  disabled={sitePage === 1}
                  className="btn-secondary text-sm py-1 px-3"
                >
                  Previous
                </button>
                <button
                  onClick={() => setSitePage((p) => Math.min(sitesData.totalPages || 1, p + 1))}
                  disabled={sitePage >= (sitesData.totalPages || 1)}
                  className="btn-secondary text-sm py-1 px-3"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
