import { useEffect, useMemo, useState } from 'react';
import { Lightbulb, ThumbsUp, ThumbsDown, Send, Clock, CheckCircle, Rocket, Search, RefreshCw, MessageCircle, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { featureRequestsApi, FeatureRequestRow, FeatureDashboardPayload, FeatureCategory, FEATURE_CATEGORIES } from './feature-requests.api-client';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  needs_details: { label: 'Needs your details!', cls: 'bg-amber-900/50 text-amber-300 border-amber-700' },
  gathering_interest: { label: 'Gathering Interest', cls: 'bg-blue-900/50 text-blue-300 border-blue-700' },
  investigating: { label: 'Investigating', cls: 'bg-purple-900/50 text-purple-300 border-purple-700' },
  approved: { label: 'Approved', cls: 'bg-emerald-900/50 text-emerald-300 border-emerald-700' },
  implemented: { label: 'Live! 🚀', cls: 'bg-orange-900/50 text-orange-300 border-orange-700' },
  declined: { label: 'Declined', cls: 'bg-red-900/50 text-red-300 border-red-700' },
  expired: { label: 'Closed — not enough interest', cls: 'bg-slate-700 text-gray-300 border-slate-600' },
};

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, cls: 'bg-slate-700 text-gray-300 border-slate-600' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${meta.cls}`}>{meta.label}</span>;
}

function CategoryBadge({ category }: { category: FeatureCategory }) {
  const meta = FEATURE_CATEGORIES.find(c => c.id === category);
  if (!meta) return null;
  return <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-gray-300">{meta.emoji} {meta.label}</span>;
}

/**
 * My MECA → Feature Ideas: submit ideas, vote on others' (👍 with a 1–10
 * usage-likelihood rating, 👎), optional comment that only the MECA team sees,
 * and a private Q&A thread with the team on your own submissions.
 */
export default function FeatureIdeasTab() {
  const [view, setView] = useState<'browse' | 'mine' | 'submit'>('browse');
  const [requests, setRequests] = useState<FeatureRequestRow[]>([]);
  const [mine, setMine] = useState<FeatureRequestRow[]>([]);
  const [dashboard, setDashboard] = useState<FeatureDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FeatureCategory | ''>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Voting panel state (one open at a time)
  const [votingId, setVotingId] = useState<string | null>(null);
  const [voteChoice, setVoteChoice] = useState<'up' | 'down'>('up');
  const [voteRating, setVoteRating] = useState(7);
  const [voteComment, setVoteComment] = useState('');
  const [savingVote, setSavingVote] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Submit form (also reused for one-time draft completion)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<FeatureCategory>('website');
  const [resubmitOf, setResubmitOf] = useState<string | null>(null);
  const [completingDraftOf, setCompletingDraftOf] = useState<FeatureRequestRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Thread replies
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const refresh = async () => {
    setLoading(true);
    try {
      const [list, my, dash] = await Promise.all([
        featureRequestsApi.list({ sort: 'top' }),
        featureRequestsApi.mine(),
        featureRequestsApi.dashboard(),
      ]);
      setRequests(list);
      setMine(my);
      setDashboard(dash);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load feature ideas. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => requests.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (categoryFilter && r.category !== categoryFilter) return false;
    if (search && !`${r.title} ${r.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [requests, statusFilter, categoryFilter, search]);

  const maxTop5 = Math.max(1, ...(dashboard?.top5 ?? []).map(t => t.upvotes));

  const openVotePanel = (r: FeatureRequestRow, choice: 'up' | 'down') => {
    setVotingId(r.id);
    setVoteChoice(choice);
    setVoteRating(r.my_vote?.rating ?? 7);
    setVoteComment('');
  };

  const castVote = async () => {
    if (!votingId) return;
    setSavingVote(true);
    setMessage(null);
    try {
      await featureRequestsApi.vote(votingId, {
        vote: voteChoice,
        ...(voteChoice === 'up' ? { rating: voteRating } : {}),
        ...(voteComment.trim() ? { comment: voteComment.trim() } : {}),
      });
      setVotingId(null);
      setMessage({ type: 'success', text: 'Vote counted — thanks for weighing in! 🗳️' });
      await refresh();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save your vote.' });
    } finally {
      setSavingVote(false);
    }
  };

  const submitIdea = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = { title: title.trim(), description: description.trim(), category };
      if (completingDraftOf) {
        // ONE-TIME completion of a needs-details draft (ticket conversion).
        await featureRequestsApi.completeDraft(completingDraftOf.id, payload);
      } else if (resubmitOf) {
        await featureRequestsApi.resubmit(resubmitOf, payload);
      } else {
        await featureRequestsApi.submit(payload);
      }
      setTitle('');
      setDescription('');
      setCategory('website');
      setResubmitOf(null);
      setCompletingDraftOf(null);
      setView('mine');
      setMessage({ type: 'success', text: 'Your idea is live! Members have 3 months to vote on it. 💡' });
      await refresh();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to submit your idea.' });
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async (requestId: string) => {
    const body = (replyDrafts[requestId] || '').trim();
    if (!body) return;
    try {
      await featureRequestsApi.reply(requestId, body);
      setReplyDrafts(prev => ({ ...prev, [requestId]: '' }));
      await refresh();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to send your reply.' });
    }
  };

  const startResubmit = (r: FeatureRequestRow) => {
    setResubmitOf(r.id);
    setCompletingDraftOf(null);
    setTitle(r.title);
    setDescription(r.description);
    setCategory(r.category);
    setView('submit');
  };

  const startCompleteDraft = (r: FeatureRequestRow) => {
    setCompletingDraftOf(r);
    setResubmitOf(null);
    setTitle(r.title);
    setDescription(r.description);
    setCategory(r.category);
    setView('submit');
  };

  if (loading && requests.length === 0) {
    return <div className="text-center py-12 text-gray-400">Loading feature ideas…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header + view switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-orange-500" /> Feature Ideas
        </h2>
        <div className="flex gap-2">
          {([['browse', 'Vote on Ideas'], ['mine', 'My Submissions'], ['submit', 'Suggest a Feature']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setView(id); if (id !== 'submit') { setResubmitOf(null); setCompletingDraftOf(null); } }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === id ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* Top 5 bar graph + leaderboard */}
      {view === 'browse' && dashboard && dashboard.top5.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">🔥 Top 5 Most-Wanted Features</h3>
            <div className="space-y-3">
              {dashboard.top5.map(t => (
                <div key={t.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-200 truncate pr-2">{t.title}</span>
                    <span className="text-gray-400 whitespace-nowrap">
                      👍 {t.upvotes}{t.avg_rating != null ? ` · ${t.avg_rating.toFixed(1)}/10 likely` : ''}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all" style={{ width: `${Math.max(4, (t.upvotes / maxTop5) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">🏆 Idea Legends</h3>
            <div className="space-y-3 text-sm">
              {[
                ['💡', 'Idea Machine', dashboard.leaderboard.ideaMachine, 'ideas submitted'],
                ['✅', 'Most Approved', dashboard.leaderboard.mostApproved, 'ideas approved'],
                ['🚀', 'Shipped It', dashboard.leaderboard.shippedIt, 'features live'],
              ].map(([emoji, label, entry, suffix]: any) => (
                <div key={label} className="flex items-center gap-3 bg-slate-700/60 rounded-lg p-3">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <div className="text-gray-400 text-xs">{label}</div>
                    <div className="text-white font-medium">
                      {entry ? `${entry.name} — ${entry.count} ${suffix}` : 'Up for grabs!'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============ BROWSE + VOTE ============ */}
      {view === 'browse' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ideas…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
            >
              <option value="">All statuses</option>
              <option value="gathering_interest">Gathering Interest</option>
              <option value="investigating">Investigating</option>
              <option value="approved">Approved</option>
              <option value="implemented">Live</option>
            </select>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${categoryFilter === '' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}
            >
              All categories
            </button>
            {FEATURE_CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(categoryFilter === c.id ? '' : c.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${categoryFilter === c.id ? 'bg-orange-600 text-white' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="bg-slate-800 rounded-xl p-8 text-center text-gray-400">
              No ideas match — be the first to <button className="text-orange-400 hover:underline" onClick={() => setView('submit')}>suggest one</button>!
            </div>
          )}

          {filtered.map(r => (
            <div key={r.id} className="bg-slate-800 rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-white font-semibold">{r.title}</h4>
                    <CategoryBadge category={r.category} />
                    <StatusPill status={r.status} />
                    {r.voting_open && (
                      <span className="text-xs text-amber-400 flex items-center gap-1"><Clock className="h-3 w-3" /> {r.days_left} days left to vote</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Suggested by {r.submitter_name}{r.submitted_by_me ? ' (you)' : ''}</p>
                  <p className={`text-sm text-gray-300 mt-2 ${expandedId === r.id ? '' : 'line-clamp-3'}`}>{r.description}</p>
                  {r.description.length > 220 && (
                    <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="text-xs text-orange-400 hover:underline mt-1 flex items-center gap-1">
                      {expandedId === r.id ? <><ChevronUp className="h-3 w-3" /> Less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
                    </button>
                  )}
                  {r.planned_release && (
                    <p className="text-sm text-emerald-400 mt-2 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Planned: {r.planned_release}</p>
                  )}
                  {r.admin_note_public && <p className="text-sm text-gray-400 mt-1 italic">MECA team: {r.admin_note_public}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-emerald-400 flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> {r.upvotes}</span>
                    <span className="text-red-400 flex items-center gap-1"><ThumbsDown className="h-4 w-4" /> {r.downvotes}</span>
                  </div>
                  {r.avg_rating != null && <div className="text-xs text-gray-400">{r.avg_rating.toFixed(1)}/10 would use it</div>}
                  {r.voting_open && !r.submitted_by_me && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openVotePanel(r, 'up')}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors ${r.my_vote?.vote === 'up' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-emerald-700 hover:text-white'}`}
                      >
                        <ThumbsUp className="h-4 w-4" /> {r.my_vote?.vote === 'up' ? 'Voted' : 'Yes!'}
                      </button>
                      <button
                        onClick={() => openVotePanel(r, 'down')}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors ${r.my_vote?.vote === 'down' ? 'bg-red-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-red-700 hover:text-white'}`}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {r.submitted_by_me && <span className="text-xs text-gray-500">Your idea — your submission is your vote!</span>}
                </div>
              </div>

              {/* Inline vote panel */}
              {votingId === r.id && (
                <div className="mt-4 border-t border-slate-700 pt-4 space-y-3">
                  {voteChoice === 'up' && (
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">
                        How likely are you to USE this feature? <span className="text-orange-400 font-semibold">{voteRating}/10</span>
                      </label>
                      <input type="range" min={1} max={10} value={voteRating} onChange={e => setVoteRating(Number(e.target.value))} className="w-full accent-orange-500" />
                      <div className="flex justify-between text-xs text-gray-500"><span>Probably never</span><span>Every event!</span></div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">
                      Anything to add? <span className="text-gray-500">(optional — visible to the MECA team only, never to other members)</span>
                    </label>
                    <textarea
                      value={voteComment}
                      onChange={e => setVoteComment(e.target.value.slice(0, 1500))}
                      rows={2}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                    />
                    <div className="text-xs text-gray-500 text-right">{voteComment.length}/1500</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={castVote} disabled={savingVote} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg flex items-center gap-2">
                      <Send className="h-4 w-4" /> {savingVote ? 'Saving…' : `Cast my ${voteChoice === 'up' ? '👍' : '👎'}`}
                    </button>
                    <button onClick={() => setVotingId(null)} className="px-4 py-2 bg-slate-700 text-gray-300 text-sm rounded-lg hover:bg-slate-600">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ============ MY SUBMISSIONS ============ */}
      {view === 'mine' && (
        <div className="space-y-4">
          {mine.length === 0 && (
            <div className="bg-slate-800 rounded-xl p-8 text-center text-gray-400">
              You haven't suggested anything yet — got an idea that would make MECA better? 💡
            </div>
          )}
          {mine.map(r => {
            const canReply = (r.messages ?? []).length > 0 && r.messages![r.messages!.length - 1].author_role === 'admin';
            return (
              <div key={r.id} className="bg-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-white font-semibold">{r.title}</h4>
                  <CategoryBadge category={r.category} />
                  <StatusPill status={r.status} />
                  {r.status === 'gathering_interest' && (
                    <span className="text-xs text-amber-400 flex items-center gap-1"><Clock className="h-3 w-3" /> {r.days_left} days of voting left</span>
                  )}
                </div>

                {/* Needs-details draft: one-time completion with a hard deadline */}
                {r.status === 'needs_details' && (
                  <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2 text-sm text-amber-200">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        The MECA team turned your support ticket into this feature request, but it needs
                        more detail before members can vote on it. You get <strong>one revision</strong>
                        {r.details_deadline_at && (
                          <> and it must be completed by <strong>{new Date(r.details_deadline_at).toLocaleString()}</strong></>
                        )} — otherwise it will be closed.
                      </span>
                    </div>
                    <button onClick={() => startCompleteDraft(r)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg">
                      Complete My Idea
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="text-emerald-400 flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> {r.upvotes}</span>
                  <span className="text-red-400 flex items-center gap-1"><ThumbsDown className="h-4 w-4" /> {r.downvotes}</span>
                  {r.avg_rating != null && <span>{r.avg_rating.toFixed(1)}/10 would use it</span>}
                </div>
                {r.planned_release && <p className="text-sm text-emerald-400 flex items-center gap-1"><Rocket className="h-4 w-4" /> Planned: {r.planned_release}</p>}
                {r.admin_note_public && <p className="text-sm text-gray-400 italic">MECA team: {r.admin_note_public}</p>}
                {r.status === 'expired' && (
                  <button onClick={() => startResubmit(r)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-orange-400 text-sm rounded-lg flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" /> Revise &amp; Resubmit
                  </button>
                )}

                {/* Private Q&A thread with the MECA team */}
                {(r.messages ?? []).length > 0 && (
                  <div className="border-t border-slate-700 pt-3 space-y-2">
                    <div className="text-xs text-gray-500 flex items-center gap-1"><MessageCircle className="h-3 w-3" /> Private conversation with the MECA team</div>
                    {r.messages!.map(m => (
                      <div key={m.id} className={`text-sm rounded-lg p-2.5 max-w-[85%] ${m.author_role === 'admin' ? 'bg-slate-700 text-gray-200' : 'bg-orange-900/40 text-orange-100 ml-auto'}`}>
                        <span className="block text-xs text-gray-500 mb-0.5">{m.author_role === 'admin' ? 'MECA Team' : 'You'}</span>
                        {m.body}
                      </div>
                    ))}
                    {canReply ? (
                      <div className="flex gap-2">
                        <input
                          value={replyDrafts[r.id] || ''}
                          onChange={e => setReplyDrafts(prev => ({ ...prev, [r.id]: e.target.value.slice(0, 1500) }))}
                          placeholder="Reply to the MECA team…"
                          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                        />
                        <button onClick={() => sendReply(r.id)} className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"><Send className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">You can reply when the MECA team asks you a question.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============ SUBMIT ============ */}
      {view === 'submit' && (
        <div className="bg-slate-800 rounded-xl p-6 space-y-4 max-w-3xl">
          <h3 className="text-lg font-semibold text-white">
            {completingDraftOf ? 'Complete Your Idea (one revision)' : resubmitOf ? 'Revise & Resubmit Your Idea' : 'Suggest a New Feature'}
          </h3>
          {completingDraftOf?.details_deadline_at && (
            <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 text-sm text-amber-200">
              ⏰ This is your one revision — complete it by <strong>{new Date(completingDraftOf.details_deadline_at).toLocaleString()}</strong> or the request will be closed.
            </div>
          )}
          <div className="bg-slate-700/60 rounded-lg p-4 text-sm text-gray-300">
            💡 <span className="font-medium text-white">You're pitching the whole MECA community for votes</span> — be thorough!
            Explain <span className="text-orange-400">what</span> the feature is, <span className="text-orange-400">how</span> you'd
            use it, and <span className="text-orange-400">why</span> other members would benefit. One-liners don't win votes.
            Members get 3 months to vote on your idea.
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Feature title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 120))}
              placeholder="e.g. Head-to-head bracket mode for SPL events"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
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
            <label className="block text-sm text-gray-300 mb-1">Describe it thoroughly</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 4000))}
              rows={8}
              placeholder="What is it? How would you use it? Why would other members want it?"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
            />
            <div className={`text-xs text-right ${description.trim().length < 200 ? 'text-amber-400' : 'text-gray-500'}`}>
              {description.trim().length < 200 ? `${200 - description.trim().length} more characters needed — sell it!` : `${description.length}/4000`}
            </div>
          </div>
          <button
            onClick={submitIdea}
            disabled={submitting || title.trim().length < 5 || description.trim().length < 200}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center gap-2"
          >
            <Lightbulb className="h-4 w-4" /> {submitting ? 'Submitting…' : completingDraftOf ? 'Complete & Go Live' : resubmitOf ? 'Resubmit Idea' : 'Submit My Idea'}
          </button>
        </div>
      )}
    </div>
  );
}
