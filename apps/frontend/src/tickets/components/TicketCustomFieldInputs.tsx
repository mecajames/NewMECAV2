import { TicketCustomField, TicketCustomFieldType, TicketPurchase } from '@newmeca/shared';
import { TicketCustomFieldAnswerData } from '../tickets.api-client';

export interface EventOption {
  id: string;
  title: string;
}

export type CustomFieldValues = Record<string, string | number | boolean | string[] | null | undefined>;

const REFUND_POLICY_URL = '/terms-and-conditions#section-1';

interface Props {
  fields: TicketCustomField[];
  values: CustomFieldValues;
  onChange: (fieldId: string, value: string | number | boolean | string[] | null) => void;
  events?: EventOption[];
  purchases?: TicketPurchase[];
  staff?: { id: string; name: string }[];
  disabled?: boolean;
}

const inputClass =
  'w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500';

/** Evaluate a field's show_when condition against the current values (keyed by field id). */
export function isFieldVisible(field: TicketCustomField, values: CustomFieldValues): boolean {
  const cond = field.show_when;
  if (!cond || !cond.field_id) return true;
  const raw = values[cond.field_id];
  const condValues = cond.values ?? [];
  switch (cond.operator) {
    case 'is_checked':
      return raw === true;
    case 'not_empty':
      if (raw === null || raw === undefined) return false;
      if (Array.isArray(raw)) return raw.length > 0;
      return String(raw).trim() !== '';
    case 'equals':
      return condValues.length > 0 && String(raw ?? '') === condValues[0];
    case 'one_of':
      if (Array.isArray(raw)) return raw.some((v) => condValues.includes(String(v)));
      return condValues.includes(String(raw ?? ''));
    default:
      return true;
  }
}

/** Fields currently visible given the values (condition satisfied / no condition). */
export function getVisibleFields(fields: TicketCustomField[], values: CustomFieldValues): TicketCustomField[] {
  return fields.filter((f) => isFieldVisible(f, values));
}

/** Required + VISIBLE fields whose value is missing — for client-side validation. */
export function getMissingRequiredFields(
  fields: TicketCustomField[],
  values: CustomFieldValues,
): TicketCustomField[] {
  return getVisibleFields(fields, values).filter((f) => {
    if (!f.required) return false;
    const v = values[f.id];
    if (f.field_type === TicketCustomFieldType.CHECKBOX) return v !== true;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'number') return false;
    return v === undefined || v === null || String(v).trim() === '';
  });
}

/** Convert the values map into the answer payload — VISIBLE fields only, dropping empties. */
export function buildCustomFieldAnswers(
  fields: TicketCustomField[],
  values: CustomFieldValues,
): TicketCustomFieldAnswerData[] {
  const answers: TicketCustomFieldAnswerData[] = [];
  for (const f of getVisibleFields(fields, values)) {
    const v = values[f.id];
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
    } else if (typeof v === 'string') {
      if (v.trim() === '') continue;
    }
    answers.push({ field_id: f.id, value: v as TicketCustomFieldAnswerData['value'] });
  }
  return answers;
}

export function TicketCustomFieldInputs({ fields, values, onChange, events = [], purchases = [], staff = [], disabled }: Props) {
  if (!fields || fields.length === 0) return null;

  const renderPurchaseReference = (field: TicketCustomField) => {
    let selectedId: string | null = null;
    try {
      const raw = values[field.id];
      if (typeof raw === 'string' && raw) selectedId = JSON.parse(raw)?.id ?? null;
    } catch {
      selectedId = null;
    }
    if (purchases.length === 0) {
      return (
        <p className="text-sm text-gray-400">
          No purchases found on your account. You can still describe your request below.
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {purchases.map((p) => {
          const selected = p.id === selectedId;
          const purchasedAt = new Date(p.purchased_at).toLocaleDateString();
          return (
            <button
              type="button"
              key={`${p.type}:${p.id}`}
              disabled={disabled}
              onClick={() => onChange(field.id, JSON.stringify(p))}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selected ? 'border-orange-500 bg-orange-500/10' : 'border-slate-600 bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-white">{p.label}</span>
                <span className="text-sm text-gray-300">${p.amount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-1">
                <span className="text-xs text-gray-400">
                  {purchasedAt}{p.method !== 'unknown' ? ` · ${p.method === 'stripe' ? 'Card' : 'PayPal'}` : ''}
                </span>
                {p.refund_eligible ? (
                  <span className="text-xs text-green-400">Within 30-day refund window</span>
                ) : (
                  <span className="text-xs text-amber-400">Outside 30-day refund window</span>
                )}
              </div>
              {!p.refund_eligible && (
                <p className="text-xs text-gray-400 mt-1">
                  This purchase is outside our 30-day refund policy. You can still submit your request and our team
                  will review it.{' '}
                  <a
                    href={REFUND_POLICY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    See our Refund Policy
                  </a>
                </p>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderInput = (field: TicketCustomField) => {
    if (field.field_type === TicketCustomFieldType.PURCHASE_REFERENCE) {
      return renderPurchaseReference(field);
    }
    if (field.field_type === TicketCustomFieldType.STAFF_REFERENCE) {
      const value = values[field.id];
      return (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(field.id, e.target.value || null)}
          disabled={disabled}
          className={inputClass}
        >
          <option value="">{field.required ? 'Select a staff member…' : '— None —'}</option>
          {staff.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      );
    }
    const value = values[field.id];
    switch (field.field_type) {
      case TicketCustomFieldType.TEXTAREA:
        return (
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            rows={3}
            disabled={disabled}
            className={`${inputClass} resize-none`}
          />
        );
      case TicketCustomFieldType.SELECT:
        return (
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={disabled}
            className={inputClass}
          >
            <option value="">{field.required ? 'Select…' : '— None —'}</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case TicketCustomFieldType.MULTISELECT: {
        const selected = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                    checked ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-slate-600 bg-slate-700 text-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() =>
                      onChange(
                        field.id,
                        checked ? selected.filter((v) => v !== opt.value) : [...selected, opt.value],
                      )
                    }
                    className="w-4 h-4 accent-orange-500"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
        );
      }
      case TicketCustomFieldType.CHECKBOX:
        return (
          <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={value === true}
              disabled={disabled}
              onChange={(e) => onChange(field.id, e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            Yes
          </label>
        );
      case TicketCustomFieldType.NUMBER:
        return (
          <input
            type="number"
            value={value === null || value === undefined ? '' : (value as number)}
            onChange={(e) => onChange(field.id, e.target.value === '' ? null : Number(e.target.value))}
            disabled={disabled}
            className={inputClass}
          />
        );
      case TicketCustomFieldType.DATE:
        return (
          <input
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={disabled}
            className={inputClass}
          />
        );
      case TicketCustomFieldType.EVENT_REFERENCE:
        return (
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(field.id, e.target.value || null)}
            disabled={disabled}
            className={inputClass}
          >
            <option value="">{field.required ? 'Select an event…' : 'No specific event'}</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        );
      case TicketCustomFieldType.TEXT:
      default:
        return (
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={disabled}
            className={inputClass}
          />
        );
    }
  };

  const visible = getVisibleFields(fields, values);
  return (
    <>
      {visible.map((field) => (
        <div key={field.id}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {field.label}
            {field.required && <span className="text-red-400"> *</span>}
          </label>
          {renderInput(field)}
          {field.help_text && <p className="text-xs text-gray-500 mt-1">{field.help_text}</p>}
        </div>
      ))}
    </>
  );
}

export default TicketCustomFieldInputs;
