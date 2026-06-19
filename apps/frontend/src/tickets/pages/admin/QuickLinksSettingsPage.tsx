import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2, Edit2, X, Globe, Lock, Loader2, AlertCircle, Search, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  quickLinksApi,
  TicketQuickLink,
  CreateQuickLinkDto,
  UpdateQuickLinkDto,
} from '@/tickets/ticket-support-tools.api-client';

/**
 * Manager for the ticket reply composer's "Insert link" entries. GLOBAL links
 * are shared with every support tech (admin-editable); PERSONAL links belong to
 * one agent. Mirrors CannedResponsesManager; exported standalone so it can be
 * embedded in the "My Tools" tab and on its own route.
 */
export function QuickLinksManager() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [list, setList] = useState<TicketQuickLink[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<TicketQuickLink | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await quickLinksApi.list());
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load links');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  const flashSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 2500); };
  const handleNew = () => { setEditing(null); setEditorOpen(true); };
  const handleEdit = (l: TicketQuickLink) => { setEditing(l); setEditorOpen(true); };
  const handleDelete = async (l: TicketQuickLink) => {
    if (!window.confirm(`Delete "${l.label}"?`)) return;
    try {
      await quickLinksApi.delete(l.id);
      flashSuccess('Link deleted.');
      refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = list.filter(l => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return l.label.toLowerCase().includes(s)
      || (l.category && l.category.toLowerCase().includes(s))
      || l.url.toLowerCase().includes(s);
  });
  const grouped = new Map<string, TicketQuickLink[]>();
  for (const l of filtered) {
    const cat = l.category || 'Uncategorized';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(l);
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Insert Links</h2>
          <p className="text-gray-400">
            Quick links for the reply composer's <span className="text-gray-300">Insert link</span> menu.
            Mark each <span className="text-gray-300">Global</span> (shown to all support techs) or{' '}
            <span className="text-gray-300">Personal</span> (only you).
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          New link
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-300">{successMsg}</div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by label, category, or URL..."
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
      ) : grouped.size === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <p className="text-gray-400 mb-4">No links yet.</p>
          <button onClick={handleNew} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            Create your first one
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">{category}</h3>
              <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700">
                {items.map((l) => (
                  <div key={l.id} className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-medium truncate">{l.label}</h4>
                        {l.is_global ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            <Globe className="w-3 h-3" />
                            Global
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-gray-500/10 text-gray-400 border border-gray-500/30">
                            <Lock className="w-3 h-3" />
                            Personal
                          </span>
                        )}
                      </div>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-orange-400 hover:text-orange-300 truncate inline-flex items-center gap-1 max-w-full"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{l.url}</span>
                      </a>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(l)} className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(l)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg" title="Delete">
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

      {editorOpen && (
        <QuickLinkEditor
          initial={editing}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            refresh();
            flashSuccess(editing ? 'Link updated.' : 'Link created.');
          }}
        />
      )}
    </div>
  );
}

export default function QuickLinksSettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <QuickLinksManager />
      </div>
    </div>
  );
}

function QuickLinkEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: TicketQuickLink | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(initial?.label || '');
  const [url, setUrl] = useState(initial?.url || '');
  const [category, setCategory] = useState(initial?.category || '');
  const [isGlobal, setIsGlobal] = useState(initial?.is_global ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (initial) {
        const dto: UpdateQuickLinkDto = { label, url, category: category || null, is_global: isGlobal };
        await quickLinksApi.update(initial.id, dto);
      } else {
        const dto: CreateQuickLinkDto = { label, url, category: category || undefined, is_global: isGlobal };
        await quickLinksApi.create(dto);
      }
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-bold text-white">{initial ? 'Edit link' : 'New link'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Membership / Join / Renew"
              maxLength={120}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://mecacaraudio.com/membership"
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
              placeholder="e.g. Support, Competition, Membership"
              maxLength={60}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center justify-between bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex items-start gap-2">
              {isGlobal ? <Globe className="w-4 h-4 text-blue-400 mt-0.5" /> : <Lock className="w-4 h-4 text-gray-400 mt-0.5" />}
              <div>
                <p className="text-white text-sm font-medium">{isGlobal ? 'Global' : 'Personal'}</p>
                <p className="text-gray-400 text-xs">
                  {isGlobal ? 'Shown to all support techs in the Insert link menu.' : 'Only you see this link.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isGlobal}
              onClick={() => setIsGlobal(v => !v)}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${isGlobal ? 'bg-orange-500' : 'bg-slate-600'}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${isGlobal ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-700 p-4">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-300 hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !label.trim() || !url.trim()}
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
