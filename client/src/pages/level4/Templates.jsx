import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { batchsheetTemplates } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { fmtDateTime } from '../../utils/format.js';

// Suggested standard field keys matching the Docket/Batch Report format
const SUGGESTED_FIELDS = [
  'sand1', 'sand2', 'agg_10mm1', 'agg_10mm2',   // Aggregate
  'agg5', 'agg6', 'opc', 'ppc2', 'cem3', 'cem4', 'flyAsh', // Cement
  'water', 'wtr2', 'wtr3',                        // Water/Ice
  'admi1', 'adm', 'admi2',                        // Admixture
  'batchNumber', 'batcherName', 'recipeCode', 'recipeName',  // Metadata
  'truckDriver', 'plantSerialNumber', 'mixerCapacity', 'batchSize',
  'target_sand1', 'target_sand2', 'target_agg_10mm1', 'target_agg_10mm2',
];

function FieldEditor({ control, register, name }) {
  const { fields, append, remove, move } = useFieldArray({ control, name });
  return (
    <div className="space-y-2">
      <div className="label">Mix Design Field Keys</div>
      {fields.map((f, i) => (
        <div key={f.id} className="flex items-center gap-2">
          <input
            className="input flex-1"
            placeholder={`field_key_${i + 1}`}
            {...register(`${name}.${i}.key`)}
          />
          <button
            type="button"
            className="text-rose-500 hover:text-rose-700 text-sm"
            onClick={() => remove(i)}
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => append({ key: '' })}
        >
          + Custom field
        </button>
        <div className="flex-1 min-w-48">
          <select
            className="select text-xs"
            onChange={(e) => {
              if (e.target.value && !fields.find((f) => f.key === e.target.value)) {
                append({ key: e.target.value });
              }
              e.target.value = '';
            }}
          >
            <option value="">+ Add standard field…</option>
            {SUGGESTED_FIELDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function TemplateForm({ initial, onSave, onCancel, isPending }) {
  const { register, control, handleSubmit } = useForm({
    defaultValues: {
      templateName: initial?.templateName || '',
      type: initial?.type || 'preset',
      sections: (initial?.layoutJson?.sections || []).join(', '),
      fields: (initial?.mixDesignFields || []).map((k) => ({ key: k })),
    },
  });

  const onSubmit = (d) =>
    onSave({
      templateName: d.templateName,
      type: d.type,
      layoutJson: {
        sections: (d.sections || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      },
      mixDesignFields: (d.fields || []).map((f) => f.key).filter(Boolean),
    });

  return (
    <form
      className="card card-body mb-5 space-y-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="label">Template Name *</label>
          <input className="input" required {...register('templateName')} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="select" {...register('type')}>
            <option value="preset">Preset</option>
            <option value="custom">Custom base</option>
          </select>
        </div>
        <div>
          <label className="label">Sections (comma-separated)</label>
          <input
            className="input"
            placeholder="header, mix-design, quantities, signatures"
            {...register('sections')}
          />
        </div>
      </div>

      <FieldEditor control={control} register={register} name="fields" />

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="btn-primary" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Template'}
        </button>
      </div>
    </form>
  );
}

export default function L4Templates() {
  const qc = useQueryClient();
  const [mode, setMode] = useState('list'); // 'list' | 'new' | 'edit'
  const [editing, setEditing] = useState(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['batchsheet-templates'],
    queryFn: () => batchsheetTemplates.list(),
  });

  const create = useMutation({
    mutationFn: (d) => batchsheetTemplates.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batchsheet-templates'] });
      setMode('list');
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => batchsheetTemplates.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batchsheet-templates'] });
      setMode('list');
      setEditing(null);
    },
  });

  const toggle = useMutation({
    mutationFn: (t) => batchsheetTemplates.update(t._id, { isActive: !t.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batchsheet-templates'] }),
  });

  return (
    <>
      <PageHeader
        title="Batchsheet Templates"
        subtitle="Full authority to add, edit, and manage batchsheet preset designs."
        actions={
          mode === 'list' ? (
            <button className="btn-primary" onClick={() => setMode('new')}>
              + New Template
            </button>
          ) : null
        }
      />

      {mode === 'new' && (
        <TemplateForm
          onSave={(d) => create.mutate(d)}
          onCancel={() => setMode('list')}
          isPending={create.isPending}
        />
      )}

      {mode === 'edit' && editing && (
        <>
          <div className="mb-3 text-sm text-slate-500">
            Editing: <span className="font-semibold text-slate-700">{editing.templateName}</span>
          </div>
          <TemplateForm
            initial={editing}
            onSave={(d) => update.mutate({ id: editing._id, data: d })}
            onCancel={() => { setMode('list'); setEditing(null); }}
            isPending={update.isPending}
          />
        </>
      )}

      {mode === 'list' && (
        <div className="card">
          {isLoading && (
            <div className="p-6 text-center text-sm text-slate-400">Loading…</div>
          )}
          <table className="table-clean">
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Type</th>
                <th>Mix Fields</th>
                <th>Active</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t._id}>
                  <td className="font-medium">{t.templateName}</td>
                  <td>
                    <span className={t.type === 'preset' ? 'badge-blue' : 'badge-yellow'}>
                      {t.type}
                    </span>
                  </td>
                  <td className="max-w-xs">
                    <div className="text-xs text-slate-500 truncate">
                      {(t.mixDesignFields || []).length > 0
                        ? (t.mixDesignFields || []).join(', ')
                        : <span className="text-slate-300">—</span>}
                    </div>
                    <div className="text-xs text-slate-400">
                      {(t.mixDesignFields || []).length} fields
                    </div>
                  </td>
                  <td>
                    {t.isActive ? (
                      <span className="badge-green">Active</span>
                    ) : (
                      <span className="badge-gray">Inactive</span>
                    )}
                  </td>
                  <td className="text-slate-400 text-xs">{fmtDateTime(t.createdAt)}</td>
                  <td className="text-right space-x-4">
                    <button
                      className="text-xs text-brand-600 hover:underline"
                      onClick={() => { setEditing(t); setMode('edit'); }}
                    >
                      Edit
                    </button>
                    <button
                      className={`text-xs ${t.isActive ? 'text-amber-600' : 'text-emerald-600'} hover:underline`}
                      onClick={() => toggle.mutate(t)}
                      disabled={toggle.isPending}
                    >
                      {t.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && data.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-sm text-slate-400">
                    No templates yet — create your first preset above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
