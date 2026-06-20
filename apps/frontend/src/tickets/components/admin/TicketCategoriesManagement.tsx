import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, Tags, GripVertical } from 'lucide-react';
import {
  TicketCategoryConfig,
  CreateTicketCategoryDto,
  TicketDepartmentResponse,
} from '@newmeca/shared';
import * as categoriesApi from '../../ticket-categories.api-client';
import { listDepartments } from '../../ticket-admin.api-client';
import { reportError } from './error-helper';
import { AudienceRoleFields, AudienceBadge } from './AudienceRoleFields';

type Draft = CreateTicketCategoryDto;

const slugify = (label: string) =>
  label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

const emptyDraft = (): Draft => ({
  key: '',
  label: '',
  department_id: null,
  description: '',
  display_order: 0,
  is_active: true,
  audience: 'all',
  required_roles: [],
});

export function TicketCategoriesManagement() {
  const [categories, setCategories] = useState<TicketCategoryConfig[]>([]);
  const [departments, setDepartments] = useState<TicketDepartmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [keyTouched, setKeyTouched] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cats, depts] = await Promise.all([categoriesApi.listCategories(), listDepartments(true)]);
      setCategories(cats);
      setDepartments(depts);
    } catch (err) {
      reportError(err, 'load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setKeyTouched(false);
    setShowForm(true);
  };

  const startEdit = (c: TicketCategoryConfig) => {
    setEditingId(c.id);
    setDraft({
      key: c.key,
      label: c.label,
      department_id: c.department_id,
      description: c.description ?? '',
      display_order: c.display_order,
      is_active: c.is_active,
      audience: c.audience ?? 'all',
      required_roles: c.required_roles ?? [],
    });
    setKeyTouched(true);
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const save = async () => {
    if (!draft.label.trim()) return reportError(new Error('Label is required'), 'save category');
    if (!draft.key.trim()) return reportError(new Error('Key is required'), 'save category');
    const payload: Draft = {
      ...draft,
      description: draft.description?.trim() || undefined,
      department_id: draft.department_id || null,
    };
    try {
      if (editingId) await categoriesApi.updateCategory(editingId, payload);
      else await categoriesApi.createCategory(payload);
      cancel();
      fetchAll();
    } catch (err) {
      reportError(err, 'save category');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this category? Tickets already using it keep their value; the form will no longer offer it.')) return;
    try {
      await categoriesApi.deleteCategory(id);
      fetchAll();
    } catch (err) {
      reportError(err, 'delete category');
    }
  };

  // Group categories by department for display.
  const grouped = departments
    .map((d) => ({ dept: d, cats: categories.filter((c) => c.department_id === d.id) }))
    .filter((g) => g.cats.length > 0);
  const unassigned = categories.filter((c) => !c.department_id || !departments.some((d) => d.id === c.department_id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Tags className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Categories</h2>
            <p className="text-sm text-gray-400">The topics shown under each department on the support form.</p>
          </div>
        </div>
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500">
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 rounded-xl p-6 border border-cyan-500/30 space-y-4">
          <h3 className="text-white font-medium">{editingId ? 'Edit Category' : 'New Category'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Label *</label>
              <input
                type="text"
                value={draft.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setDraft((d) => ({ ...d, label, key: keyTouched ? d.key : slugify(label) }));
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                placeholder="e.g. Points"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Key *</label>
              <input
                type="text"
                value={draft.key}
                disabled={!!editingId}
                onChange={(e) => { setKeyTouched(true); setDraft((d) => ({ ...d, key: e.target.value.toLowerCase() })); }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm disabled:opacity-60"
                placeholder="points"
              />
              <p className="text-xs text-gray-500 mt-1">Lowercase / underscores. Used by routing + field rules. Cannot change later.</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Department</label>
              <select
                value={draft.department_id ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, department_id: e.target.value || null }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              >
                <option value="">— Unassigned —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Display order</label>
              <input
                type="number"
                value={draft.display_order}
                onChange={(e) => setDraft((d) => ({ ...d, display_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={draft.description ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              placeholder="Optional helper text"
            />
          </div>
          <AudienceRoleFields
            audience={draft.audience ?? 'all'}
            requiredRoles={draft.required_roles ?? []}
            onChange={(next) => setDraft((d) => ({ ...d, audience: next.audience as Draft['audience'], required_roles: next.required_roles }))}
          />
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
              className="w-4 h-4 accent-cyan-500"
            />
            Active (shown on the form)
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={cancel} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
            <button onClick={save} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500">
              <Check className="w-4 h-4" />
              {editingId ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <Tags className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No categories yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {[...grouped, ...(unassigned.length ? [{ dept: null, cats: unassigned }] : [])].map((group, gi) => (
              <div key={group.dept?.id ?? `unassigned-${gi}`} className="p-4">
                <h4 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  {group.dept ? group.dept.name : 'Unassigned'}
                </h4>
                <div className="space-y-2">
                  {group.cats.map((c) => (
                    <div key={c.id} className={`flex items-center justify-between rounded-lg bg-slate-900/40 px-3 py-2 ${!c.is_active ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-gray-600" />
                        <span className="text-white text-sm font-medium">{c.label}</span>
                        <code className="text-xs text-gray-500">{c.key}</code>
                        {!c.is_active && <span className="text-xs text-gray-500">(inactive)</span>}
                        <AudienceBadge audience={c.audience} requiredRoles={c.required_roles} />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(c)} className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(c.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketCategoriesManagement;
