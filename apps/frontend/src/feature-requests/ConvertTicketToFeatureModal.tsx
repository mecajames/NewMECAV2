import { useState } from 'react';
import { Lightbulb, X, AlertTriangle } from 'lucide-react';
import { featureRequestsApi, FeatureCategory, FEATURE_CATEGORIES } from './feature-requests.api-client';

/**
 * Admin modal: convert a support ticket into a member feature request.
 *
 * - The member gets submitter credit; bell + email notify them.
 * - A description under 200 chars converts into a NEEDS-DETAILS draft the
 *   member must complete (one revision, 72h-default deadline).
 * - The ticket is HARD-CLOSED on conversion and the member can never reopen it.
 * - The member's 3-open cap warns here and can be overridden.
 */
export function ConvertTicketToFeatureModal({
  ticketId,
  initialTitle,
  initialDescription,
  onClose,
  onConverted,
}: {
  ticketId: string;
  initialTitle: string;
  initialDescription: string;
  onClose: () => void;
  onConverted: (featureRequestId: string, needsDetails: boolean) => void;
}) {
  const [title, setTitle] = useState(initialTitle.slice(0, 120));
  const [description, setDescription] = useState(initialDescription.slice(0, 4000));
  const [category, setCategory] = useState<FeatureCategory>('website');
  const [capWarning, setCapWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tooThin = description.trim().length < 200;

  const convert = async (overrideCap = false) => {
    setSaving(true);
    setError(null);
    setCapWarning(null);
    try {
      const result = await featureRequestsApi.adminConvertFromTicket({
        ticketId,
        title: title.trim(),
        description: description.trim(),
        category,
        overrideCap,
      });
      onConverted(result.id, result.needsDetails);
    } catch (err: any) {
      const msg: string = err.response?.data?.message || 'Failed to convert the ticket.';
      // The backend prefixes cap warnings so we can offer the override.
      if (msg.startsWith('CAP:')) {
        setCapWarning(msg.slice(4));
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-orange-500" /> Convert to Feature Idea
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="bg-slate-700/60 rounded-lg p-3 text-sm text-gray-300">
          The member gets submitter credit and is notified by bell + email. <strong className="text-white">This
          ticket will be closed permanently</strong> — the member cannot reopen it; the conversation moves to the
          Feature Ideas board.
        </div>

        {error && <div className="bg-red-900/40 text-red-300 rounded-lg p-3 text-sm">{error}</div>}

        <div>
          <label className="block text-sm text-gray-300 mb-1">Feature title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, 120))}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Category</label>
          <div className="flex flex-wrap gap-2">
            {FEATURE_CATEGORIES.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${category === c.id ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Description (edit freely — you're shaping the member's pitch)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value.slice(0, 4000))}
            rows={7}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
          />
          <div className="text-xs text-right text-gray-500">{description.trim().length}/4000</div>
        </div>

        {tooThin && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 text-sm text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Under 200 characters — this will convert as a <strong>Needs Details</strong> draft: the member gets one
              revision (with a deadline) to complete it before it can go live for voting. Add detail yourself to take
              it live immediately.
            </span>
          </div>
        )}

        {capWarning ? (
          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 space-y-2">
            <p className="text-sm text-amber-200">{capWarning}</p>
            <div className="flex gap-2">
              <button onClick={() => convert(true)} disabled={saving} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg">
                Convert anyway
              </button>
              <button onClick={() => setCapWarning(null)} className="px-3 py-1.5 bg-slate-700 text-gray-300 text-sm rounded-lg">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 text-gray-300 text-sm rounded-lg hover:bg-slate-600">Cancel</button>
            <button
              onClick={() => convert(false)}
              disabled={saving || title.trim().length < 5 || description.trim().length === 0}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              {saving ? 'Converting…' : tooThin ? 'Convert as Needs-Details Draft' : 'Convert & Go Live'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
