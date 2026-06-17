import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, GripVertical, ListChecks, Eye, EyeOff } from 'lucide-react';
import {
  TicketCustomField,
  TicketCustomFieldType,
  CreateTicketCustomFieldDto,
  TicketCategory,
} from '@newmeca/shared';
import * as customFieldsApi from '../../ticket-custom-fields.api-client';
import { listCategories } from '../../ticket-categories.api-client';
import { reportError } from './error-helper';

const FIELD_TYPE_OPTIONS: { value: TicketCustomFieldType; label: string }[] = [
  { value: TicketCustomFieldType.TEXT, label: 'Single-line text' },
  { value: TicketCustomFieldType.TEXTAREA, label: 'Paragraph text' },
  { value: TicketCustomFieldType.SELECT, label: 'Dropdown (single-select)' },
  { value: TicketCustomFieldType.MULTISELECT, label: 'Multi-select' },
  { value: TicketCustomFieldType.CHECKBOX, label: 'Checkbox (yes/no)' },
  { value: TicketCustomFieldType.NUMBER, label: 'Number' },
  { value: TicketCustomFieldType.DATE, label: 'Date' },
  { value: TicketCustomFieldType.EVENT_REFERENCE, label: 'Related Event (event picker)' },
  { value: TicketCustomFieldType.PURCHASE_REFERENCE, label: 'My Purchase (membership / order / registration — for refunds)' },
  { value: TicketCustomFieldType.STAFF_REFERENCE, label: 'Staff Member (team picker)' },
];

// Keep categories as plain strings in the UI; cast to the enum at the API
// boundary (the 9 category values are fixed and match TicketCategory).
type Draft = Omit<CreateTicketCustomFieldDto, 'categories'> & { categories: string[] };

const emptyDraft = (): Draft => ({
  field_key: '',
  label: '',
  field_type: TicketCustomFieldType.TEXT,
  help_text: '',
  options: [],
  categories: [],
  required: false,
  visible_to_user: true,
  show_when: null,
  display_order: 0,
  is_active: true,
});

const slugify = (label: string) =>
  label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

const needsOptions = (t: TicketCustomFieldType) =>
  t === TicketCustomFieldType.SELECT || t === TicketCustomFieldType.MULTISELECT;

export function TicketCustomFields() {
  const [fields, setFields] = useState<TicketCustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [keyTouched, setKeyTouched] = useState(false);
  // Managed categories drive the "Shown for categories" chips.
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const [fieldDefs, cats] = await Promise.all([
        customFieldsApi.listCustomFields(),
        listCategories(),
      ]);
      setFields(fieldDefs);
      setCategoryOptions(cats.map((c) => ({ value: c.key, label: c.label })));
    } catch (err) {
      reportError(err, 'load custom fields');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setKeyTouched(false);
    setShowForm(true);
  };

  const startEdit = (f: TicketCustomField) => {
    setEditingId(f.id);
    setDraft({
      field_key: f.field_key,
      label: f.label,
      field_type: f.field_type,
      help_text: f.help_text ?? '',
      options: f.options ?? [],
      categories: f.categories ?? [],
      required: f.required,
      visible_to_user: f.visible_to_user,
      show_when: f.show_when ?? null,
      display_order: f.display_order,
      is_active: f.is_active,
    });
    setKeyTouched(true);
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const toggleCategory = (cat: string) => {
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(cat)
        ? d.categories.filter((c) => c !== cat)
        : [...d.categories, cat],
    }));
  };

  const setOption = (i: number, key: 'value' | 'label', val: string) => {
    setDraft((d) => {
      const options = [...(d.options ?? [])];
      options[i] = { ...options[i], [key]: val };
      return { ...d, options };
    });
  };

  const addOption = () =>
    setDraft((d) => ({ ...d, options: [...(d.options ?? []), { value: '', label: '' }] }));

  const removeOption = (i: number) =>
    setDraft((d) => ({ ...d, options: (d.options ?? []).filter((_, idx) => idx !== i) }));

  // ── Conditional visibility (show_when) ──────────────────────────────────────
  // Candidate controlling fields: other dropdown/checkbox fields that share a
  // category with this field (so they're on the same form together).
  const controllingCandidates = fields.filter(
    (f) =>
      f.id !== editingId &&
      [TicketCustomFieldType.SELECT, TicketCustomFieldType.MULTISELECT, TicketCustomFieldType.CHECKBOX].includes(
        f.field_type as TicketCustomFieldType,
      ) &&
      (f.categories ?? []).some((c) => draft.categories.includes(c)),
  );
  const controllingField = draft.show_when
    ? fields.find((f) => f.id === draft.show_when!.field_id)
    : undefined;

  const setShowWhenEnabled = (on: boolean) =>
    setDraft((d) => ({
      ...d,
      show_when: on ? { field_id: '', operator: 'equals', values: [] } : null,
    }));

  const patchShowWhen = (patch: Partial<NonNullable<Draft['show_when']>>) =>
    setDraft((d) => ({
      ...d,
      show_when: d.show_when
        ? { ...d.show_when, ...patch }
        : { field_id: '', operator: 'equals', values: [], ...patch },
    }));

  const toggleConditionValue = (val: string) =>
    setDraft((d) => {
      if (!d.show_when) return d;
      const values = d.show_when.values.includes(val)
        ? d.show_when.values.filter((v) => v !== val)
        : [...d.show_when.values, val];
      return { ...d, show_when: { ...d.show_when, values } };
    });

  const save = async () => {
    if (!draft.label.trim()) return reportError(new Error('Label is required'), 'save custom field');
    if (!draft.field_key.trim()) return reportError(new Error('Field key is required'), 'save custom field');
    if (draft.categories.length === 0)
      return reportError(new Error('Assign at least one category'), 'save custom field');
    if (needsOptions(draft.field_type) && (draft.options ?? []).filter((o) => o.value && o.label).length === 0)
      return reportError(new Error('Add at least one option'), 'save custom field');

    const payload: CreateTicketCustomFieldDto = {
      ...draft,
      categories: draft.categories as TicketCategory[],
      help_text: draft.help_text?.trim() || undefined,
      options: needsOptions(draft.field_type)
        ? (draft.options ?? []).filter((o) => o.value && o.label)
        : undefined,
      // Only persist a complete condition (needs a controlling field).
      show_when: draft.show_when?.field_id ? draft.show_when : null,
    };

    try {
      if (editingId) {
        await customFieldsApi.updateCustomField(editingId, payload);
      } else {
        await customFieldsApi.createCustomField(payload);
      }
      cancel();
      fetchFields();
    } catch (err) {
      reportError(err, 'save custom field');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this field? Existing answers on past tickets will also be removed.')) return;
    try {
      await customFieldsApi.deleteCustomField(id);
      fetchFields();
    } catch (err) {
      reportError(err, 'delete custom field');
    }
  };

  const typeLabel = (t: string) => FIELD_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
  const catLabel = (c: string) => categoryOptions.find((o) => o.value === c)?.label ?? c;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <ListChecks className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Custom Fields</h2>
            <p className="text-sm text-gray-400">
              Extra fields shown on the support form based on the selected category.
            </p>
          </div>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-800 rounded-xl p-6 border border-cyan-500/30 space-y-4">
          <h3 className="text-white font-medium">{editingId ? 'Edit Field' : 'New Field'}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Label *</label>
              <input
                type="text"
                value={draft.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    label,
                    field_key: keyTouched ? d.field_key : slugify(label),
                  }));
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                placeholder="e.g. MECA ID"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Field key *</label>
              <input
                type="text"
                value={draft.field_key}
                disabled={!!editingId}
                onChange={(e) => {
                  setKeyTouched(true);
                  setDraft((d) => ({ ...d, field_key: e.target.value.toLowerCase() }));
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm disabled:opacity-60"
                placeholder="meca_id"
              />
              <p className="text-xs text-gray-500 mt-1">Lowercase / underscores. Cannot change after creation.</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Field type *</label>
              <select
                value={draft.field_type}
                onChange={(e) => setDraft((d) => ({ ...d, field_type: e.target.value as TicketCustomFieldType }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              >
                {FIELD_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
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
            <label className="block text-sm text-gray-400 mb-1">Help text</label>
            <input
              type="text"
              value={draft.help_text ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, help_text: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              placeholder="Shown under the field to guide the submitter (optional)"
            />
          </div>

          {/* Options (select / multiselect) */}
          {needsOptions(draft.field_type) && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Options *</label>
              <div className="space-y-2">
                {(draft.options ?? []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => {
                        setOption(i, 'label', e.target.value);
                        if (!opt.value || opt.value === slugify(opt.label)) setOption(i, 'value', slugify(e.target.value));
                      }}
                      placeholder="Label"
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    />
                    <input
                      type="text"
                      value={opt.value}
                      onChange={(e) => setOption(i, 'value', e.target.value)}
                      placeholder="value"
                      className="w-40 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    />
                    <button onClick={() => removeOption(i)} className="p-2 text-gray-400 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={addOption} className="text-sm text-cyan-400 hover:text-cyan-300">+ Add option</button>
              </div>
            </div>
          )}

          {/* Categories */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Shown for categories *</label>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((c) => {
                const on = draft.categories.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleCategory(c.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${
                      on ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-slate-600 bg-slate-700 text-gray-300'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional visibility */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={!!draft.show_when}
                onChange={(e) => setShowWhenEnabled(e.target.checked)}
                className="w-4 h-4 accent-cyan-500"
              />
              Only show this field when another field matches
            </label>
            {draft.show_when && (
              <div className="mt-3 space-y-3">
                {controllingCandidates.length === 0 ? (
                  <p className="text-xs text-amber-400">
                    No eligible controlling field yet — add a dropdown/checkbox field in the same category first.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={draft.show_when.field_id}
                        onChange={(e) => patchShowWhen({ field_id: e.target.value, values: [] })}
                        className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                      >
                        <option value="">Controlling field…</option>
                        {controllingCandidates.map((f) => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                      <select
                        value={draft.show_when.operator}
                        onChange={(e) => patchShowWhen({ operator: e.target.value as NonNullable<Draft['show_when']>['operator'] })}
                        className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                      >
                        <option value="equals">is</option>
                        <option value="one_of">is one of</option>
                        <option value="is_checked">is checked</option>
                        <option value="not_empty">has any value</option>
                      </select>
                    </div>
                    {(draft.show_when.operator === 'equals' || draft.show_when.operator === 'one_of') && (
                      controllingField?.options && controllingField.options.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {controllingField.options.map((opt) => {
                            const on = draft.show_when!.values.includes(opt.value);
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => toggleConditionValue(opt.value)}
                                className={`px-3 py-1.5 rounded-lg border text-sm ${
                                  on ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-slate-600 bg-slate-700 text-gray-300'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={draft.show_when.values[0] ?? ''}
                          onChange={(e) => patchShowWhen({ values: e.target.value ? [e.target.value] : [] })}
                          placeholder="Match value"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                        />
                      )
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={draft.required}
                onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))}
                className="w-4 h-4 accent-cyan-500"
              />
              Required (when shown)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={draft.visible_to_user}
                onChange={(e) => setDraft((d) => ({ ...d, visible_to_user: e.target.checked }))}
                className="w-4 h-4 accent-cyan-500"
              />
              Visible to submitter (uncheck for admin-only)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
                className="w-4 h-4 accent-cyan-500"
              />
              Active
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={cancel} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
            <button
              onClick={save}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500"
            >
              <Check className="w-4 h-4" />
              {editingId ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
          </div>
        ) : fields.length === 0 ? (
          <div className="text-center py-12">
            <ListChecks className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No custom fields yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {fields.map((f) => (
              <div key={f.id} className={`p-4 flex items-start justify-between ${!f.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <GripVertical className="w-4 h-4 text-gray-600 mt-1" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{f.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-gray-300">{typeLabel(f.field_type)}</span>
                      {f.required && <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/40">Required</span>}
                      {f.visible_to_user ? (
                        <span className="text-xs flex items-center gap-1 text-gray-400"><Eye className="w-3 h-3" />Submitter</span>
                      ) : (
                        <span className="text-xs flex items-center gap-1 text-gray-400"><EyeOff className="w-3 h-3" />Admin-only</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <code className="text-gray-400">{f.field_key}</code>
                      {' · '}
                      {(f.categories ?? []).map(catLabel).join(', ') || 'No categories'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(f)} className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(f.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketCustomFields;
