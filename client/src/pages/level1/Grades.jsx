import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { grades } from '../../api/endpoints.js';
import { PageHeader } from '../../components/PageHeader.jsx';

export default function L1Grades() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);

  const { data: gradeList = [], isLoading } = useQuery({
    queryKey: ['grades'],
    queryFn: () => grades.list(),
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (d) => grades.create({ gradeCode: d.gradeCode.trim(), description: d.description?.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades'] });
      setShowNew(false);
      reset();
    },
  });

  const update = useMutation({
    mutationFn: (d) =>
      grades.update(editingGrade._id, {
        gradeCode: d.gradeCode.trim(),
        description: d.description?.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades'] });
      setEditingGrade(null);
      reset();
    },
  });

  const remove = useMutation({
    mutationFn: (id) => grades.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades'] });
    },
  });

  const handleDelete = (g) => {
    if (window.confirm(`Are you sure you want to delete concrete grade ${g.gradeCode}?`)) {
      remove.mutate(g._id);
    }
  };

  const openEdit = (g) => {
    setEditingGrade(g);
    setShowNew(true);
    reset({ gradeCode: g.gradeCode, description: g.description || '' });
  };

  const cancelForm = () => {
    setShowNew(false);
    setEditingGrade(null);
    reset({ gradeCode: '', description: '' });
  };

  return (
    <>
      <PageHeader
        title="Concrete Grades"
        subtitle="Manage concrete grade codes like M5, M15, M25 etc."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              if (showNew) {
                cancelForm();
              } else {
                setEditingGrade(null);
                reset({ gradeCode: '', description: '' });
                setShowNew(true);
              }
            }}
          >
            {showNew ? 'Cancel' : '+ Add Grade'}
          </button>
        }
      />

      {/* Add / Edit Form */}
      {showNew && (
        <form
          className="card card-body mb-5 grid grid-cols-1 gap-3 md:grid-cols-3"
          onSubmit={handleSubmit((d) => {
            if (editingGrade) {
              update.mutate(d);
            } else {
              create.mutate(d);
            }
          })}
        >
          <div className="md:col-span-3 flex justify-between items-center mb-1">
            <h3 className="font-semibold text-slate-700">
              {editingGrade ? 'Edit Grade' : 'Add New Grade'}
            </h3>
            {editingGrade && (
              <button
                type="button"
                onClick={cancelForm}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            )}
          </div>
          <div>
            <label className="label">Grade Code *</label>
            <input
              className="input"
              required
              placeholder="e.g. M5, M15, M25"
              {...register('gradeCode')}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <input
              className="input"
              placeholder="e.g. Standard M25 Grade"
              {...register('description')}
            />
          </div>
          <div className="flex items-end">
            <button
              className="btn-primary w-full"
              disabled={create.isPending || update.isPending}
            >
              {create.isPending || update.isPending
                ? 'Saving…'
                : editingGrade
                  ? 'Update Grade'
                  : 'Add Grade'}
            </button>
          </div>
          {(create.isError || update.isError) && (
            <div className="md:col-span-3 text-sm text-rose-600">
              {create.error?.response?.data?.message || update.error?.response?.data?.message || 'Something went wrong'}
            </div>
          )}
        </form>
      )}

      {/* Grades Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table-clean min-w-[500px] md:min-w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Grade Code</th>
                <th>Description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-sm text-slate-400">Loading…</td>
                </tr>
              )}
              {!isLoading && gradeList.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-400">
                    No grades added yet. Click "+ Add Grade" to create one.
                  </td>
                </tr>
              )}
              {gradeList.map((g, idx) => (
                <tr key={g._id}>
                  <td className="text-slate-500">{idx + 1}</td>
                  <td className="font-semibold text-slate-800">{g.gradeCode}</td>
                  <td className="text-slate-500">{g.description || '—'}</td>
                  <td className="text-right space-x-3">
                    <button
                      className="text-xs text-brand-600 hover:underline font-medium"
                      onClick={() => openEdit(g)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs text-rose-600 hover:underline font-medium"
                      onClick={() => handleDelete(g)}
                      disabled={remove.isPending}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
