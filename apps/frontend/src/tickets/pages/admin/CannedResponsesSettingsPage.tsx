import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2, Edit2, X, Globe, Lock, Loader2, AlertCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  cannedResponsesApi,
  CannedResponse,
  CreateCannedResponseDto,
  UpdateCannedResponseDto,
} from '@/tickets/ticket-support-tools.api-client';

/**
 * Per-agent canned response (reply template) editor. Templates are
 * stored server-side keyed by the owning agent; "Global" ones surface
 * to all support staff for read access but only the owner can edit
 * or delete. ("Global" maps to the is_shared flag; the opposite is
 * "Private" — visible only to the owner.)
 *
 * Variables embedded in the body - {{customer_name}}, {{ticket_id}},
 * {{ticket_number}}, {{ticket_subject}}, {{agent_name}} - are
 * resolved client-side at insert time (in TicketDetail's reply box),
 * not on the server. This lets the admin preview the raw template
 * here without losing the placeholders.
 *
 * The manager is exported as a standalone component (CannedResponsesManager)
 * so it can be embedded both in its own route (default export below) and
 * in the "My Tools" tab of the ticket admin.
 */
const AVAILABLE_VARIABLES = [
  { key: '{{customer_name}}', label: 'Customer name' },
  { key: '{{ticket_id}}', label: 'Ticket UUID' },
  { key: '{{ticket_number}}', label: 'Ticket number (TKT-...)' },
  { key: '{{ticket_subject}}', label: 'Ticket subject' },
  { key: '{{agent_name}}', label: 'Your full name' },
];

export function CannedResponsesManager() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [list, setList] = useState<CannedResponse[]>([]);
  const [search, setSearch] = useState('');

  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cannedResponsesApi.list();
      setList(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load canned responses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const handleEdit = (r: CannedResponse) => {
    setEditing(r);
    setEditorOpen(true);
  };

  const handleDelete = async (r: CannedResponse) => {
    if (!window.confirm(`Delete "${r.title}"?`)) return;
    try {
      await cannedResponsesApi.delete(r.id);
      flashSuccess('Canned response deleted.');
      refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = list.filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return r.title.toLowerCase().includes(s)
      || (r.category && r.category.toLowerCase().includes(s))
      || r.body.toLowerCase().includes(s);
  });

  // Group by category for display.
  const grouped = new Map<string, CannedResponse[]>();
  for (const r of filtered) {
    const cat = r.category || 'Uncategorized';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(r);
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">My Canned Responses</h2>
          <p className="text-gray-400">
            Reply templates with variable substitution. Use {`{{customer_name}}`}, {`{{ticket_number}}`}, etc.
            Set each one <span className="text-gray-300">Global</span> (usable by all support techs) or{' '}
            <span className="text-gray-300">Private</span> (only you).
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          New response
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-300">
          {successMsg}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, category, or body..."
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : grouped.size === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <p className="text-gray-400 mb-4">No canned responses yet.</p>
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Create your first one
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">{category}</h3>
              <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700">
                {items.map((r) => (
                  <div key={r.id} className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-medium truncate">{r.title}</h4>
                        {r.is_shared ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            <Globe className="w-3 h-3" />
                            Global
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-gray-500/10 text-gray-400 border border-gray-500/30">
                            <Lock className="w-3 h-3" />
                            Private
                          </span>
                        )}
                        {!r.is_owner && r.owner && (
                          <span className="text-xs text-gray-500">
                            by {(r.owner.first_name || '') + ' ' + (r.owner.last_name || '')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2 whitespace-pre-wrap">{r.body}</p>
                    </div>
                    {r.is_owner && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(r)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editorOpen && (
        <CannedResponseEditor
          initial={editing}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            refresh();
            flashSuccess(editing ? 'Canned response updated.' : 'Canned response created.');
          }}
        />
      )}
    </div>
  );
}

/**
 * Standalone route wrapper — keeps the existing
 * /admin/settings/canned-responses URL working with its own page
 * chrome + back button.
 */
export default function CannedResponsesSettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <CannedResponsesManager />
      </div>
    </div>
  );
}

// ============================================================================
// Editor modal
// ============================================================================

function CannedResponseEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: CannedResponse | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [body, setBody] = useState(initial?.body || '');
  const [category, setCategory] = useState(initial?.category || '');
  const [isShared, setIsShared] = useState(initial?.is_shared ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (initial) {
        const dto: UpdateCannedResponseDto = {
          title, body,
          category: category || null,
          is_shared: isShared,
        };
        await cannedResponsesApi.update(initial.id, dto);
      } else {
        const dto: CreateCannedResponseDto = {
          title, body,
          category: category || undefined,
          is_shared: isShared,
        };
        await cannedResponsesApi.create(dto);
      }
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    setBody(b => b + (b && !b.endsWith(' ') ? ' ' : '') + variable);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-bold text-white">
            {initial ? 'Edit canned response' : 'New canned response'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Refund acknowledgement"
              maxLength={120}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category <span className="text-gray-500 text-xs">(optional - used for grouping)</span>
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Refunds, Account, Memberships"
              maxLength={60}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Body</label>
            <div className="mb-2 flex flex-wrap gap-1">
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="px-2 py-1 text-xs bg-slate-800 text-blue-400 hover:bg-slate-700 rounded border border-slate-700"
                  title={`Insert ${v.label}`}
                >
                  {v.key}
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{customer_name}},&#10;&#10;Thanks for reaching out about ticket {{ticket_number}}..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[180px] font-mono text-sm"
            />
          </div>

          {/* Visibility: Global (is_shared) vs Private. */}
          <div className="flex items-center justify-between bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex items-start gap-2">
              {isShared
                ? <Globe className="w-4 h-4 text-blue-400 mt-0.5" />
                : <Lock className="w-4 h-4 text-gray-400 mt-0.5" />}
              <div>
                <p className="text-white text-sm font-medium">{isShared ? 'Global' : 'Private'}</p>
                <p className="text-gray-400 text-xs">
                  {isShared
                    ? 'Usable by all support techs (read-only for them).'
                    : 'Only you can see and use this template.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isShared}
              onClick={() => setIsShared(v => !v)}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${isShared ? 'bg-orange-500' : 'bg-slate-600'}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${isShared ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-700 p-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !body.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
