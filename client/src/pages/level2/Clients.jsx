import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { clients, sites } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { statusBadge } from '../../utils/format.js';

export default function L2Clients() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [showSiteFor, setShowSiteFor] = useState(null);

  const { data = { clients: [], totalPages: 1, page: 1 }, isLoading } = useQuery({
    queryKey: ['clients', q, kycFilter, page],
    queryFn: () => clients.list({ q: q || undefined, kycStatus: kycFilter || undefined, page, limit: 6 }),
  });
  const clientList = data.clients || [];

  const { register: regClient, handleSubmit: handleClient, reset: resetClient, formState: { errors: clientErrors } } = useForm();
  const { register: regSite, handleSubmit: handleSite, reset: resetSite } = useForm();

  const createClient = useMutation({
    mutationFn: (d) =>
      clients.create({
        ...d,
        contactNumber: d.contactNumber?.trim(),
        taxInformation: {
          gstin: d.gstin ? d.gstin.trim().toUpperCase() : undefined,
          pan: d.pan ? d.pan.trim().toUpperCase() : undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      setShowNew(false);
      resetClient();
    },
  });

  const createSite = useMutation({
    mutationFn: (d) => sites.create({ ...d, client: showSiteFor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      setShowSiteFor(null);
      resetSite();
    },
  });

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Create and manage client records, KYC status, and sites."
        actions={
          <button className="btn-primary" onClick={() => setShowNew((v) => !v)}>
            {showNew ? 'Cancel' : '+ New Client'}
          </button>
        }
      />

      {showNew && (
        <form
          className="card card-body mb-5 grid grid-cols-1 gap-3 md:grid-cols-3"
          onSubmit={handleClient((d) => createClient.mutate(d))}
        >
          <div>
            <label className="label">Client Name *</label>
            <input
              className={`input ${clientErrors.clientName ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : ''}`}
              {...regClient('clientName', { required: 'Client name is required' })}
            />
            {clientErrors.clientName && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{clientErrors.clientName.message}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="label">Office Address *</label>
            <input
              className={`input ${clientErrors.officeAddress ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : ''}`}
              {...regClient('officeAddress', { required: 'Office address is required' })}
            />
            {clientErrors.officeAddress && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{clientErrors.officeAddress.message}</p>
            )}
          </div>
          <div>
            <label className="label">Contact Number *</label>
            <input
              className={`input ${clientErrors.contactNumber ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : ''}`}
              placeholder="e.g. 9876543210"
              {...regClient('contactNumber', {
                required: 'Contact number is required',
                pattern: {
                  value: /^\d{10}$/,
                  message: 'Must be exactly 10 digits',
                },
              })}
            />
            {clientErrors.contactNumber && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{clientErrors.contactNumber.message}</p>
            )}
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className={`input ${clientErrors.email ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : ''}`}
              type="email"
              placeholder="e.g. client@example.com"
              {...regClient('email')}
            />
            {clientErrors.email && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{clientErrors.email.message}</p>
            )}
          </div>
          <div>
            <label className="label">GSTIN</label>
            <input
              className={`input uppercase ${clientErrors.gstin ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : ''}`}
              placeholder="e.g. 22AAAAA0000A1Z5"
              {...regClient('gstin', {
                pattern: {
                  value: /^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}[1-9A-Za-z]{1}Z[0-9A-Za-z]{1}$/,
                  message: 'Format must be: 22AAAAA0000A1Z5',
                },
              })}
            />
            {clientErrors.gstin && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{clientErrors.gstin.message}</p>
            )}
          </div>
          <div>
            <label className="label">PAN</label>
            <input
              className={`input uppercase ${clientErrors.pan ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : ''}`}
              placeholder="e.g. ABCDE1234F"
              {...regClient('pan', {
                pattern: {
                  value: /^[A-Za-z]{5}\d{4}[A-Za-z]$/,
                  message: 'Format must be: 5 letters, 4 digits, 1 letter',
                },
              })}
            />
            {clientErrors.pan && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{clientErrors.pan.message}</p>
            )}
          </div>
          {createClient.error && (
            <div className="md:col-span-3 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              {createClient.error?.response?.data?.error || 'Failed to save client'}
            </div>
          )}
          <div className="md:col-span-3 flex justify-end">
            <button className="btn-primary" disabled={createClient.isPending}>
              {createClient.isPending ? 'Saving…' : 'Save Client'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name…"
          className="input w-full sm:max-w-xs"
        />
        <select
          value={kycFilter}
          onChange={(e) => setKycFilter(e.target.value)}
          className="select w-full sm:w-44"
        >
          <option value="">All KYC</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        {isLoading && <div className="p-6 text-center text-sm text-slate-400">Loading…</div>}
        <table className="table-clean min-w-[900px]">
          <thead>
            <tr>
              <th>Client</th>
              <th>Contact</th>
              <th>GSTIN</th>
              <th>KYC</th>
              <th>Credit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clientList.map((c) => (
              <React.Fragment key={c._id}>
                <tr key={c._id}>
                  <td>
                    <div className="font-medium">{c.clientName}</div>
                    <div className="text-xs text-slate-500">{c.officeAddress}</div>
                  </td>
                  <td>
                    <div>{c.contactNumber}</div>
                    <div className="text-xs text-slate-400">{c.email}</div>
                  </td>
                  <td className="text-xs text-slate-500">{c.taxInformation?.gstin || '—'}</td>
                  <td>
                    <span className={statusBadge(c.kycStatus)}>{c.kycStatus}</span>
                  </td>
                  <td>
                    <span className={statusBadge(c.creditStatus)}>{c.creditStatus}</span>
                  </td>
                  <td className="text-right space-x-3">
                    <button
                      className="text-xs text-slate-500 hover:text-slate-700"
                      onClick={() => setShowSiteFor(showSiteFor === c._id ? null : c._id)}
                    >
                      + Site
                    </button>
                    <Link
                      to={`/l2/clients/${c._id}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      KYC / Details →
                    </Link>
                  </td>
                </tr>
                {showSiteFor === c._id && (
                  <tr key={`${c._id}-site`}>
                    <td colSpan="6" className="bg-slate-50 px-4 py-3">
                      <form
                        className="flex flex-wrap items-end gap-3"
                        onSubmit={handleSite((d) => createSite.mutate(d))}
                      >
                        <div className="w-full sm:w-auto">
                          <label className="label">Site Name *</label>
                          <input className="input" required {...regSite('siteName')} />
                        </div>
                        <div className="w-full sm:w-auto">
                          <label className="label">Address</label>
                          <input className="input" {...regSite('siteAddress')} />
                        </div>
                        <div className="flex gap-2">
                          <button className="btn-primary" disabled={createSite.isPending}>
                            {createSite.isPending ? 'Adding…' : 'Add Site'}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setShowSiteFor(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {!isLoading && clientList.length === 0 && (
              <tr>
                <td colSpan="6" className="p-6 text-center text-sm text-slate-400">
                  No clients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination UI */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6 gap-3">
          <div className="text-sm text-slate-500">
            Page {data.page || 1} of {data.totalPages || 1}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-sm py-1 px-3"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages || 1, p + 1))}
              disabled={page >= (data.totalPages || 1)}
              className="btn-secondary text-sm py-1 px-3"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
