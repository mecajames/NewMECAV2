import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb, ThumbsUp, ThumbsDown, Send, Target, MessageCircle, ChevronDown, ChevronUp, Clock, Ticket } from 'lucide-react';
import { featureRequestsApi, FEATURE_CATEGORIES } from '@/feature-requests/feature-requests.api-client';

const STATUSES = [
  ['needs_details', 'Needs Details'],
  ['gathering_interest', 'Gathering Interest'],
  ['investigating', 'Investigating'],
  ['approved', 'Approved'],
  ['implemented', 'Implemented'],
  ['declined', 'Declined'],
  ['expired', 'Expired'],
] as const;

const categoryLabel = (id: string) => {
  const c = FEATURE_CATEGORIES.find(c => c.id === id);
  return c ? `${c.emoji} ${c.label}` : id;
};

const PLANNED_PRESETS = ['Next release', 'Next quarter', 'Within 3 months', 'Within 6 months', 'This season'];

/**
 * Admin: member feature requests — full visibility (submitter, every voter's
 * identity + rating + comment), threshold progress vs active members, status
 * pipeline control, and private turn-based replies to any participant.
 */
export default function AdminFeatureRequestsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Per-request edit state
  const [statusDraft, setStatusDraft] = useState('');
  const [plannedDraft, setPlannedDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [declinePublicDraft, setDeclinePublicDraft] = useState(false);
  const [thresholdDraft, setThresholdDraft] = useState('10');
  const [replyTarget, setReplyTarget] = useState<{ userId: string; name: string } | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [saving, setSaving] = useState(false);

  // Needs-details completion deadline (days) — applies to ticket conversions
  // that arrive too thin. Hidden from members.
  const [deadlineDays, setDeadlineDays] = useState('3');
  const [savingDeadline, setSavingDeadline] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setRows(await featureRequestsApi.adminList(statusFilter || undefined));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load feature requests' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [statusFilter]);

  useEffect(() => {
    featureRequestsApi.adminGetSettings()
      .then(s => setDeadlineDays(String(s.detailsDeadlineDays)))
      .catch(() => {});
  }, []);

  const saveDeadline = async () => {
    setSavingDeadline(true);
    setMessage(null);
    try {
      const result = await featureRequestsApi.adminUpdateSettings(Number(deadlineDays));
      setDeadlineDays(String(result.detailsDeadlineDays));
      setMessage({ type: 'success', text: `Members now have ${result.detailsDeadlineDays} day(s) to complete a needs-details request.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save the deadline setting' });
    } finally {
      setSavingDeadline(false);
    }
  };

  const openRow = (r: any) => {
    setExpandedId(expandedId === r.id ? null : r.id);
    setStatusDraft(r.status);
    setPlannedDraft(r.planned_release || '');
    setNoteDraft(r.admin_note_public || '');
    setDeclinePublicDraft(!!r.decline_public);
    setThresholdDraft(String(r.threshold_pct));
    setReplyTarget(null);
    setReplyBody('');
  };

  const saveStatus = async (r: any) => {
    setSaving(true);
    setMessage(null);
    try {
      await featureRequestsApi.adminSetStatus(r.id, {
        status: statusDraft,
        plannedRelease: plannedDraft.trim() || null,
        publicNote: noteDraft.trim() || null,
        declinePublic: declinePublicDraft,
      });
      if (Number(thresholdDraft) !== Number(r.threshold_pct)) {
        await featureRequestsApi.adminSetThreshold(r.id, Number(thresholdDraft));
      }
      setMessage({ type: 'success', text: `"${r.title}" updated.` });
      await refresh();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update request' });
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async (r: any) => {
    if (!replyTarget || !replyBody.trim()) return;
    setSaving(true);
    try {
      await featureRequestsApi.adminMessage(r.id, replyTarget.userId, replyBody.trim());
      setReplyBody('');
      setReplyTarget(null);
      setMessage({ type: 'success', text: `Message sent to ${replyTarget.name} — they can now reply.` });
      await refresh();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to send message' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-orange-500" /> Member Feature Requests
          </h1>
        </div>

        {message && (
          <div className={`rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
            {message.text}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === '' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300'}`}>All</button>
          {STATUSES.map(([id, label]) => (
            <button key={id} onClick={() => setStatusFilter(id)} className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === id ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300'}`}>{label}</button>
          ))}
        </div>

        {/* Needs-details completion deadline (ticket conversions) */}
        <div className="bg-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
          <Clock className="h-5 w-5 text-orange-500" />
          <div className="flex-1 min-w-[240px]">
            <div className="text-sm text-white font-medium">Needs-details completion deadline</div>
            <div className="text-xs text-gray-400">How long a member has to complete a converted request that needs more detail (they get one revision). Not shown to members until a conversion happens.</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={60}
              value={deadlineDays}
              onChange={e => setDeadlineDays(e.target.value)}
              className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            />
            <span className="text-sm text-gray-400">days</span>
            <button onClick={saveDeadline} disabled={savingDeadline} className="px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm rounded-lg">
              {savingDeadline ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {loading && <div className="text-gray-400 py-8 text-center">Loading…</div>}
        {!loading && rows.length === 0 && <div className="bg-slate-800 rounded-xl p-8 text-center text-gray-400">No feature requests{statusFilter ? ' in this status' : ' yet'}.</div>}

        {rows.map(r => (
          <div key={r.id} className="bg-slate-800 rounded-xl overflow-hidden">
            {/* Row header */}
            <button onClick={() => openRow(r)} className="w-full text-left p-5 hover:bg-slate-750">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{r.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-gray-300">{categoryLabel(r.category)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-gray-300">{r.status}</span>
                    {r.threshold_met && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700">🎯 threshold met</span>}
                    {r.source_ticket_id && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700 flex items-center gap-1">
                        <Ticket className="h-3 w-3" /> from ticket
                      </span>
                    )}
                    {r.status === 'needs_details' && r.details_deadline_at && (
                      <span className="text-xs text-amber-400">member deadline: {new Date(r.details_deadline_at).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    by {r.submitter?.name} ({r.submitter?.mecaId ?? 'no ID'}) · {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-400 flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> {r.upvotes}</span>
                  <span className="text-red-400 flex items-center gap-1"><ThumbsDown className="h-4 w-4" /> {r.downvotes}</span>
                  {r.avg_rating != null && <span className="text-gray-300">{Number(r.avg_rating).toFixed(1)}/10</span>}
                  <span className="text-gray-400 flex items-center gap-1" title={`Interest threshold: ${r.threshold_pct}% of ${r.active_member_count} active members`}>
                    <Target className="h-4 w-4" /> {r.upvotes}/{r.threshold_needed}
                  </span>
                  {expandedId === r.id ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                </div>
              </div>
              {/* Threshold progress bar */}
              <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${r.threshold_met ? 'bg-emerald-500' : 'bg-orange-500'}`}
                  style={{ width: `${Math.min(100, (r.upvotes / Math.max(1, r.threshold_needed)) * 100)}%` }}
                />
              </div>
            </button>

            {expandedId === r.id && (
              <div className="border-t border-slate-700 p-5 space-y-5">
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{r.description}</p>

                {/* Status controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Status</label>
                    <select value={statusDraft} onChange={e => setStatusDraft(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
                      {STATUSES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Planned availability (date, version, or time frame)</label>
                    <input value={plannedDraft} onChange={e => setPlannedDraft(e.target.value)} list={`presets-${r.id}`} placeholder="e.g. v2.4 / Sept 2026 / next quarter" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                    <datalist id={`presets-${r.id}`}>{PLANNED_PRESETS.map(p => <option key={p} value={p} />)}</datalist>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Public note (members see this)</label>
                    <input value={noteDraft} onChange={e => setNoteDraft(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Interest threshold % (hidden from members)</label>
                    <input type="number" min={0.5} max={100} step={0.5} value={thresholdDraft} onChange={e => setThresholdDraft(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                  </div>
                </div>
                {statusDraft === 'declined' && (
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={declinePublicDraft} onChange={e => setDeclinePublicDraft(e.target.checked)} className="accent-orange-500" />
                    Make this decline public (unchecked = only the submitter is told, and the request leaves the member board)
                  </label>
                )}
                <button onClick={() => saveStatus(r)} disabled={saving} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>

                {/* Votes & comments */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Votes ({r.votes.length})</h4>
                  {r.votes.length === 0 && <p className="text-sm text-gray-500">No votes yet.</p>}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {r.votes.map((v: any, i: number) => (
                      <div key={i} className="bg-slate-700/60 rounded-lg p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-white">{v.user?.name} <span className="text-gray-500">({v.user?.mecaId ?? 'no ID'})</span></span>
                          <span className="flex items-center gap-2">
                            {v.vote === 'up'
                              ? <span className="text-emerald-400 flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> {v.rating}/10</span>
                              : <span className="text-red-400 flex items-center gap-1"><ThumbsDown className="h-4 w-4" /></span>}
                            <button onClick={() => { setReplyTarget({ userId: v.user.id, name: v.user.name }); setReplyBody(''); }} className="text-xs text-orange-400 hover:underline">Reply</button>
                          </span>
                        </div>
                        {v.comment && <p className="text-gray-300 mt-1 italic">"{v.comment}"</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Threads */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-1"><MessageCircle className="h-4 w-4" /> Private conversations</h4>
                  {r.messages.length === 0 && <p className="text-sm text-gray-500">None yet — reply to the submitter or a voter to start one.</p>}
                  <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                    {r.messages.map((m: any) => (
                      <div key={m.id} className="text-sm bg-slate-700/40 rounded-lg p-2.5">
                        <span className="text-xs text-gray-500">
                          {m.author_role === 'admin' ? 'MECA Team' : m.member?.name} → thread with {m.member?.name} · {new Date(m.created_at).toLocaleString()}
                        </span>
                        <p className="text-gray-200">{m.body}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setReplyTarget({ userId: r.submitter.id, name: r.submitter.name }); setReplyBody(''); }} className="text-xs text-orange-400 hover:underline mt-2">
                    Message the submitter ({r.submitter?.name})
                  </button>
                </div>

                {/* Composer */}
                {replyTarget && (
                  <div className="bg-slate-700/60 rounded-lg p-3 space-y-2">
                    <div className="text-sm text-gray-300">Private message to <span className="text-white font-medium">{replyTarget.name}</span> — this unlocks a reply from them.</div>
                    <textarea value={replyBody} onChange={e => setReplyBody(e.target.value.slice(0, 1500))} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => sendReply(r)} disabled={saving || !replyBody.trim()} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm rounded-lg flex items-center gap-1"><Send className="h-4 w-4" /> Send</button>
                      <button onClick={() => setReplyTarget(null)} className="px-3 py-1.5 bg-slate-600 text-gray-300 text-sm rounded-lg">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
