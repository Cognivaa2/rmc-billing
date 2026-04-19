import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { batchsheets, batchsheetTemplates, dispatches } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime } from '../../utils/format.js';

function MixDesignInputs({ fields, register }) {
  const list = fields && fields.length > 0 ? fields : [];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {list.map((f) => (
        <div key={f}>
          <label className="label">{f.replace(/_/g, ' ')}</label>
          <input className="input" {...register(`mix.${f}`)} />
        </div>
      ))}
    </div>
  );
}

export default function L4Batchsheets() {
  const qc = useQueryClient();
  const [customFields, setCustomFields] = useState(['']);
  const { data: list = [] } = useQuery({ queryKey: ['batchsheets'], queryFn: () => batchsheets.list() });
  const { data: templates = [] } = useQuery({ queryKey: ['batchsheet-templates'], queryFn: () => batchsheetTemplates.list() });
  const { data: dispatchList = [] } = useQuery({
    queryKey: ['dispatches'],
    queryFn: () => dispatches.list(),
  });

  const { register, handleSubmit, watch, reset } = useForm({ defaultValues: { mode: 'preset' } });
  const mode = watch('mode');
  const templateId = watch('template');
  const selectedTemplate = templates.find((t) => t._id === templateId);

  const create = useMutation({
    mutationFn: (d) => {
      const mixDesignData = d.mode === 'custom'
        ? customFields.reduce((acc, k, i) => {
            if (!k) return acc;
            acc[k] = d[`customVal_${i}`] || '';
            return acc;
          }, {})
        : d.mix || {};
      return batchsheets.create({
        dispatch: d.dispatch,
        template: d.mode === 'preset' ? d.template || undefined : undefined,
        isCustom: d.mode === 'custom',
        mixDesignData,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batchsheets'] });
      reset({ mode: 'preset' });
      setCustomFields(['']);
    },
  });

  return (
    <>
      <PageHeader
        title="Batchsheets"
        subtitle="Generate preset or custom batchsheets based on concrete mix design."
      />

      <form
        className="card card-body mb-5 space-y-4"
        onSubmit={handleSubmit((d) => create.mutate(d))}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="label">Dispatch *</label>
            <select className="select" required {...register('dispatch')}>
              <option value="">Select…</option>
              {dispatchList.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.dispatchNumber} · {d.client?.clientName} · {d.grade?.gradeCode}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="select" {...register('mode')}>
              <option value="preset">Preset template</option>
              <option value="custom">Custom design</option>
            </select>
          </div>
          {mode === 'preset' && (
            <div>
              <label className="label">Template</label>
              <select className="select" {...register('template')}>
                <option value="">—</option>
                {templates.filter((t) => t.isActive !== false).map((t) => (
                  <option key={t._id} value={t._id}>{t.templateName}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {mode === 'preset' && selectedTemplate && (
          <div>
            <div className="label">Mix design</div>
            <MixDesignInputs fields={selectedTemplate.mixDesignFields} register={register} />
          </div>
        )}

        {mode === 'custom' && (
          <div>
            <div className="label">Custom mix design fields</div>
            <div className="space-y-2">
              {customFields.map((f, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <input
                    className="input"
                    placeholder="Field name"
                    value={f}
                    onChange={(e) =>
                      setCustomFields((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))
                    }
                  />
                  <input className="input" placeholder="Value" {...register(`customVal_${i}`)} />
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => setCustomFields((p) => [...p, ''])}
              >
                + Add field
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button className="btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Generate Batchsheet'}
          </button>
        </div>
      </form>

      <div className="card">
        <table className="table-clean">
          <thead>
            <tr><th>Dispatch</th><th>Type</th><th>Template</th><th>By</th><th>When</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b._id}>
                <td className="font-medium">{b.dispatch?.dispatchNumber}</td>
                <td>{b.isCustom ? <span className="badge-yellow">Custom</span> : <span className="badge-blue">Preset</span>}</td>
                <td>{b.template?.templateName || '—'}</td>
                <td>{b.generatedByLevel4?.name}</td>
                <td className="text-slate-500">{fmtDateTime(b.generatedAt)}</td>
                <td className="text-right">
                  <a
                    className="text-xs text-brand-600 hover:underline"
                    href={batchsheets.pdfUrl(b._id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PDF
                  </a>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan="6" className="p-6 text-center text-sm text-slate-400">No batchsheets yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
