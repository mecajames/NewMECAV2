import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ClipboardCheck, Users, Play, CheckCheck, Plus, Trash2,
  ChevronRight, CheckCircle2, AlertCircle, Clock, Circle, Wrench,
  ArrowRightFromLine, Image as ImageIcon, ExternalLink, MessageSquare
} from 'lucide-react';
import { qaApi } from '@/api-client/qa.api-client';

export default function QARoundDetailPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();
  const [round, setRound] = useState<any>(null);
  const [failedItems, setFailedItems] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'failed' | 'fixes'>('overview');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [showCreateNextModal, setShowCreateNextModal] = useState(false);
  const [nextTitle, setNextTitle] = useState('');
  const [creatingNext, setCreatingNext] = useState(false);

  // Fix form state
  const [fixingResponseId, setFixingResponseId] = useState<string | null>(null);
  const [fixNotes, setFixNotes] = useState('');
  const [fixStatus, setFixStatus] = useState('fixed');
  const [submittingFix, setSubmittingFix] = useState(false);

  useEffect(() => {
    if (roundId) loadData();
  }, [roundId]);

  const loadData = async () => {
    try {
      const [roundData, failed, users] = await Promise.all([
        qaApi.getRound(roundId!),
        qaApi.getFailedItems(roundId!).catch(() => []),
        qaApi.getAdminUsers(),
      ]);
      setRound(roundData);
      setFailedItems(failed);
      setAdminUsers(users);
    } catch (err) {
      console.error('Failed to load round:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (selectedUsers.length === 0) return;
    setAssigning(true);
    try {
      await qaApi.assignReviewers(roundId!, selectedUsers);
      setShowAssignModal(false);
      setSelectedUsers([]);
      await loadData();
    } catch (err) {
      console.error('Failed to assign:', err);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this reviewer?')) return;
    try {
      await qaApi.removeAssignment(assignmentId);
      await loadData();
    } catch (err) {
      console.error('Failed to remove:', err);
    }
  };

  const handleActivate = async () => {
    if (!confirm('Activate this round? Assigned reviewers will be able to start testing.')) return;
    try {
      await qaApi.activateRound(roundId!);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to activate');
    }
  };

  const handleComplete = async () => {
    if (!confirm('Mark this round as completed?')) return;
    try {
      await qaApi.completeRound(roundId!);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete');
    }
  };

  const handleCreateNext = async () => {
    if (!nextTitle.trim()) return;
    setCreatingNext(true);
    try {
      const newRound = await qaApi.createRoundFromPrevious(roundId!, { title: nextTitle });
      navigate(`/admin/qa-checklist/rounds/${newRound.id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create next round');
    } finally {
      setCreatingNext(false);
    }
  };

  const handleSubmitFix = async () => {
    if (!fixingResponseId || !fixNotes.trim()) return;
    setSubmittingFix(true);
    try {
      await qaApi.submitFix(fixingResponseId, { fixNotes, status: fixStatus });
      setFixingResponseId(null);
      setFixNotes('');
      setFixStatus('fixed');
      await loadData();
    } catch (err) {
      console.error('Failed to submit fix:', err);
    } finally {
      setSubmittingFix(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent" />
      </div>
    );
  }

  if (!round) return null;

  const assignedIds = round.assignments.map((a: any) => a.assignee.id);
  const availableUsers = adminUsers.filter((u: any) => !assignedIds.includes(u.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <button onClick={() => navigate('/admin/qa-checklist')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to QA Rounds
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-orange-500 font-bold text-2xl">v{round.versionNumber}</span>
              <h1 className="text-2xl font-bold text-white">{round.title}</h1>
              {round.status === 'draft' && <span className="px-2.5 py-0.5 bg-slate-600 text-slate-200 rounded-full text-xs font-medium">Draft</span>}
              {round.status === 'active' && <span className="px-2.5 py-0.5 bg-blue-600 text-blue-100 rounded-full text-xs font-medium">Active</span>}
              {round.status === 'completed' && <span className="px-2.5 py-0.5 bg-green-600 text-green-100 rounded-full text-xs font-medium">Completed</span>}
            </div>
            {round.description && <p className="text-slate-400 text-sm">{round.description}</p>}
            <p className="text-slate-500 text-xs mt-1">
              Created by {round.createdBy.firstName} {round.createdBy.lastName} on {new Date(round.createdAt).toLocaleDateString()}
              {round.parentRoundId && ' | Created from previous round\'s failed items'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {round.status === 'draft' && (
              <>
                <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
                  <Plus className="h-4 w-4" /> Assign Reviewers
                </button>
                <button onClick={handleActivate} className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm transition-colors">
                  <Play className="h-4 w-4" /> Activate
                </button>
              </>
            )}
            {round.status === 'active' && (
              <>
                <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
                  <Plus className="h-4 w-4" /> Add Reviewer
                </button>
                <button onClick={handleComplete} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors">
                  <CheckCheck className="h-4 w-4" /> Complete Round
                </button>
              </>
            )}
            {round.status === 'completed' && failedItems.length > 0 && (
              <button onClick={() => { setNextTitle(`Re-test Round v${round.versionNumber} Fixes`); setShowCreateNextModal(true); }} className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm transition-colors">
                <ArrowRightFromLine className="h-4 w-4" /> Create Next Round from Failed Items
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
            <div className="text-2xl font-bold text-white">{round.totalItems}</div>
            <div className="text-xs text-slate-400 uppercase">Items</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{round.stats.pass}</div>
            <div className="text-xs text-slate-400 uppercase">Passed</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{round.stats.fail}</div>
            <div className="text-xs text-slate-400 uppercase">Failed</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{round.stats.skip}</div>
            <div className="text-xs text-slate-400 uppercase">Skipped</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
            <div className="text-2xl font-bold text-slate-400">{round.stats.notStarted}</div>
            <div className="text-xs text-slate-400 uppercase">Remaining</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 mb-6">
          {[
            { id: 'overview' as const, label: 'Reviewers', icon: Users },
            { id: 'failed' as const, label: `Failed Items (${failedItems.length})`, icon: AlertCircle },
            { id: 'fixes' as const, label: 'Developer Fixes', icon: Wrench },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab - Reviewers */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {round.assignments.length === 0 ? (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
                <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 mb-4">No reviewers assigned yet</p>
                <button onClick={() => setShowAssignModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
                  Assign Reviewers
                </button>
              </div>
            ) : (
              round.assignments.map((a: any) => {
                const pct = a.counts.total > 0 ? Math.round(((a.counts.pass + a.counts.fail + a.counts.skip) / a.counts.total) * 100) : 0;
                return (
                  <div key={a.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                          {a.assignee.firstName?.[0]}{a.assignee.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium">{a.assignee.firstName} {a.assignee.lastName}</p>
                          <p className="text-slate-400 text-xs">{a.assignee.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                        {a.status === 'in_progress' && <Clock className="h-5 w-5 text-yellow-500" />}
                        {a.status === 'assigned' && <Circle className="h-5 w-5 text-slate-500" />}
                        {round.status === 'draft' && (
                          <button onClick={() => handleRemoveAssignment(a.id)} className="text-red-400 hover:text-red-300 ml-2">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {round.status !== 'draft' && (
                          <button
                            onClick={() => navigate(`/admin/qa-checklist/review/${a.id}`)}
                            className="text-slate-400 hover:text-white ml-2"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-green-400">{a.counts.pass} pass</span>
                      <span className="text-red-400">{a.counts.fail} fail</span>
                      <span className="text-yellow-400">{a.counts.skip} skip</span>
                      <span className="text-slate-400">{a.counts.not_started} remaining</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-slate-400 text-xs">{pct}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Failed Items Tab */}
        {activeTab === 'failed' && (
          <div className="space-y-4">
            {failedItems.length === 0 ? (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-slate-400">No failed items in this round!</p>
              </div>
            ) : (
              failedItems.map((fi: any) => (
                <div key={fi.item.id} className="bg-slate-800 rounded-xl border border-red-800/30 p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">{fi.item.title}</p>
                      <p className="text-slate-400 text-xs">{fi.item.sectionTitle}</p>
                    </div>
                  </div>

                  {/* Reviewer Feedback */}
                  <div className="ml-8 space-y-3">
                    {fi.failedReviews.map((review: any) => (
                      <div key={review.responseId} className="bg-red-900/10 border border-red-800/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-red-400 text-xs font-medium">
                            {review.reviewer.firstName} {review.reviewer.lastName}
                          </span>
                          <span className="text-slate-500 text-xs">
                            {review.respondedAt ? new Date(review.respondedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        {review.comment && <p className="text-slate-300 text-sm mb-2">{review.comment}</p>}
                        <div className="flex items-center gap-3">
                          {review.pageUrl && (
                            <a href={review.pageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 text-xs hover:underline">
                              <ExternalLink className="h-3 w-3" /> View Page
                            </a>
                          )}
                          {review.screenshotUrl && (
                            <a href={review.screenshotUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-violet-400 text-xs hover:underline">
                              <ImageIcon className="h-3 w-3" /> Screenshot
                            </a>
                          )}
                          <button
                            onClick={() => { setFixingResponseId(review.responseId); setFixNotes(''); setFixStatus('fixed'); }}
                            className="flex items-center gap-1 text-emerald-400 text-xs hover:underline ml-auto"
                          >
                            <Wrench className="h-3 w-3" /> Mark as Fixed
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Existing Fixes */}
                  {fi.fixes.length > 0 && (
                    <div className="ml-8 mt-3 space-y-2">
                      {fi.fixes.map((fix: any) => (
                        <div key={fix.id} className="bg-emerald-900/10 border border-emerald-800/20 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Wrench className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-emerald-400 text-xs font-medium">
                              {fix.developer.firstName} {fix.developer.lastName}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              fix.status === 'fixed' ? 'bg-green-600/20 text-green-400' :
                              fix.status === 'wont_fix' ? 'bg-yellow-600/20 text-yellow-400' :
                              'bg-blue-600/20 text-blue-400'
                            }`}>
                              {fix.status === 'fixed' ? 'Fixed' : fix.status === 'wont_fix' ? 'Won\'t Fix' : 'In Progress'}
                            </span>
                          </div>
                          <p className="text-slate-300 text-sm">{fix.fixNotes}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Fixes Tab */}
        {activeTab === 'fixes' && (
          <div className="space-y-4">
            {failedItems.length === 0 ? (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
                <p className="text-slate-400">No items need fixes.</p>
              </div>
            ) : (
              failedItems.map((fi: any) => {
                const hasFixedAll = fi.fixes.length > 0 && fi.fixes.every((f: any) => f.status === 'fixed');
                return (
                  <div key={fi.item.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                    <div className="flex items-center gap-3 mb-2">
                      {hasFixedAll ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Wrench className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-white font-medium text-sm">{fi.item.title}</p>
                        <p className="text-slate-400 text-xs">{fi.failedReviews.length} reviewer(s) reported issue</p>
                      </div>
                    </div>
                    {fi.fixes.length > 0 ? (
                      <div className="ml-8 space-y-2">
                        {fi.fixes.map((fix: any) => (
                          <div key={fix.id} className="text-sm">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              fix.status === 'fixed' ? 'bg-green-600/20 text-green-400' :
                              fix.status === 'wont_fix' ? 'bg-yellow-600/20 text-yellow-400' :
                              'bg-blue-600/20 text-blue-400'
                            }`}>
                              {fix.status === 'fixed' ? 'Fixed' : fix.status === 'wont_fix' ? 'Won\'t Fix' : 'In Progress'}
                            </span>
                            <span className="text-slate-300 ml-2">{fix.fixNotes}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="ml-8 text-slate-500 text-xs">No fix submitted yet</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Assign Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full max-h-[80vh] overflow-auto">
              <h3 className="text-white font-bold text-lg mb-4">Assign Reviewers</h3>
              {availableUsers.length === 0 ? (
                <p className="text-slate-400 text-sm mb-4">All admin users are already assigned.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {availableUsers.map((user: any) => (
                    <label key={user.id} className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedUsers(prev => [...prev, user.id]);
                          else setSelectedUsers(prev => prev.filter(id => id !== user.id));
                        }}
                        className="rounded border-slate-500"
                      />
                      <div>
                        <p className="text-white text-sm font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-slate-400 text-xs">{user.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowAssignModal(false); setSelectedUsers([]); }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button onClick={handleAssign} disabled={selectedUsers.length === 0 || assigning} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {assigning ? 'Assigning...' : `Assign ${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Next Round Modal */}
        {showCreateNextModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full">
              <h3 className="text-white font-bold text-lg mb-2">Create Next Round</h3>
              <p className="text-slate-400 text-sm mb-4">
                This will create a new round containing only the {failedItems.length} failed item{failedItems.length !== 1 ? 's' : ''} from this round for re-testing.
              </p>
              <div className="mb-4">
                <label className="text-slate-300 text-sm font-medium block mb-1">Title *</label>
                <input
                  type="text"
                  value={nextTitle}
                  onChange={(e) => setNextTitle(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowCreateNextModal(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button onClick={handleCreateNext} disabled={!nextTitle.trim() || creatingNext} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {creatingNext ? 'Creating...' : 'Create Round'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fix Response Modal */}
        {fixingResponseId && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full">
              <h3 className="text-white font-bold text-lg mb-4">Submit Developer Fix</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1">Fix Status</label>
                  <select
                    value={fixStatus}
                    onChange={(e) => setFixStatus(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="wont_fix">Won't Fix</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1">Notes *</label>
                  <textarea
                    value={fixNotes}
                    onChange={(e) => setFixNotes(e.target.value)}
                    placeholder="Describe what was fixed..."
                    rows={4}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-orange-500 outline-none resize-y"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setFixingResponseId(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button onClick={handleSubmitFix} disabled={!fixNotes.trim() || submittingFix} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {submittingFix ? 'Saving...' : 'Submit Fix'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
