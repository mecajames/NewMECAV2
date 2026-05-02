import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ClipboardCheck, Plus, ChevronRight, ChevronDown, CheckCircle2,
  AlertCircle, Clock, Circle, Users, BarChart3, ArrowRightFromLine,
  Pencil, PauseCircle, PlayCircle, Trash2,
} from 'lucide-react';
import { qaApi } from '@/api-client/qa.api-client';
import { useAuth } from '@/auth/contexts/AuthContext';

export default function QAChecklistPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [rounds, setRounds] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Master-item picker for the create modal — lazy-loaded when the modal opens
  const [masterSections, setMasterSections] = useState<any[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [selectedMasterIds, setSelectedMasterIds] = useState<Set<string>>(new Set());
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(new Set());
  // Pending custom items the admin has added but not yet submitted
  const [pendingCustomItems, setPendingCustomItems] = useState<Array<{
    title: string; steps: string[]; expectedResult: string; pageUrl?: string; promoteToMaster: boolean;
  }>>([]);
  // Draft of the custom-item form
  const [customDraftTitle, setCustomDraftTitle] = useState('');
  const [customDraftSteps, setCustomDraftSteps] = useState('');
  const [customDraftExpected, setCustomDraftExpected] = useState('');
  const [customDraftPageUrl, setCustomDraftPageUrl] = useState('');
  const [customDraftPromote, setCustomDraftPromote] = useState(false);

  // Inline edit modal — driven from the round-list cards so admins don't have
  // to drill into the round detail just to tweak a title.
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  // Track per-row loading so the right card shows "Working…" while suspending/resuming
  const [busyRoundId, setBusyRoundId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [roundsData, assignmentsData] = await Promise.all([
        qaApi.listRounds(),
        qaApi.getMyAssignments(),
      ]);
      setRounds(roundsData);
      setMyAssignments(assignmentsData);
    } catch (err) {
      console.error('Failed to load QA data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openEditRound = (round: any) => {
    setEditingRoundId(round.id);
    setEditTitle(round.title ?? '');
    setEditDescription(round.description ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editingRoundId || !editTitle.trim()) return;
    setSavingEdit(true);
    try {
      await qaApi.updateRound(editingRoundId, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
      });
      setEditingRoundId(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update round');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSuspendToggle = async (round: any) => {
    const willSuspend = !round.suspended;
    if (willSuspend && !confirm(
      `Pause "${round.title}"?\n\nReviewers will keep their progress but cannot submit new pass/fail responses, and developers cannot record fixes, until you resume.`,
    )) return;
    setBusyRoundId(round.id);
    try {
      if (willSuspend) await qaApi.suspendRound(round.id);
      else             await qaApi.resumeRound(round.id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update suspension');
    } finally {
      setBusyRoundId(null);
    }
  };

  const handleDeleteRound = async (round: any) => {
    const responseCount = round.totalResponses ?? 0;
    const tail = responseCount > 0
      ? `\n\nThis will permanently delete ${responseCount} reviewer response${responseCount === 1 ? '' : 's'} and any developer fix notes attached to this round.`
      : '';
    if (!confirm(`Delete round "${round.title}" (v${round.versionNumber})?${tail}\n\nThis cannot be undone.`)) return;
    if (responseCount > 0 && !confirm('Are you absolutely sure? Reviewer work will be lost.')) return;
    setBusyRoundId(round.id);
    try {
      await qaApi.deleteRound(round.id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete round');
    } finally {
      setBusyRoundId(null);
    }
  };

  const openCreateModal = async () => {
    setShowCreateModal(true);
    setCreateTitle('');
    setCreateDescription('');
    setPendingCustomItems([]);
    setCustomDraftTitle(''); setCustomDraftSteps(''); setCustomDraftExpected(''); setCustomDraftPageUrl(''); setCustomDraftPromote(false);
    setLoadingMaster(true);
    try {
      const sections = await qaApi.listMasterItems();
      setMasterSections(sections);
      // Default: every master item selected. Sections collapsed for visual scan.
      const allIds = new Set<string>();
      sections.forEach((s: any) => s.items.forEach((i: any) => allIds.add(i.id)));
      setSelectedMasterIds(allIds);
      setExpandedSectionIds(new Set());
    } catch (err) {
      console.error('Failed to load master items:', err);
    } finally {
      setLoadingMaster(false);
    }
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSectionIds(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const toggleItemSelected = (itemId: string) => {
    setSelectedMasterIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleSectionAll = (section: any) => {
    const ids = section.items.map((i: any) => i.id);
    const allOn = ids.every((id: string) => selectedMasterIds.has(id));
    setSelectedMasterIds(prev => {
      const next = new Set(prev);
      if (allOn) ids.forEach((id: string) => next.delete(id));
      else       ids.forEach((id: string) => next.add(id));
      return next;
    });
  };

  const selectAllMaster = () => {
    const ids = new Set<string>();
    masterSections.forEach(s => s.items.forEach((i: any) => ids.add(i.id)));
    setSelectedMasterIds(ids);
  };
  const deselectAllMaster = () => setSelectedMasterIds(new Set());

  const addPendingCustomItem = () => {
    if (!customDraftTitle.trim() || !customDraftExpected.trim()) {
      alert('Title and expected result are required');
      return;
    }
    const steps = customDraftSteps.split('\n').map(s => s.trim()).filter(Boolean);
    if (steps.length === 0) {
      alert('Add at least one step (one per line)');
      return;
    }
    setPendingCustomItems(prev => [...prev, {
      title: customDraftTitle.trim(),
      steps,
      expectedResult: customDraftExpected.trim(),
      pageUrl: customDraftPageUrl.trim() || undefined,
      promoteToMaster: customDraftPromote,
    }]);
    setCustomDraftTitle(''); setCustomDraftSteps(''); setCustomDraftExpected(''); setCustomDraftPageUrl(''); setCustomDraftPromote(false);
  };

  const removePendingCustomItem = (idx: number) => {
    setPendingCustomItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateRound = async () => {
    if (!createTitle.trim()) return;
    setCreating(true);
    try {
      await qaApi.createRound({
        title: createTitle,
        description: createDescription || undefined,
        selection: {
          masterItemIds: Array.from(selectedMasterIds),
          customItems: pendingCustomItems,
        },
      });
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateDescription('');
      setSelectedMasterIds(new Set());
      setPendingCustomItems([]);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create round');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="px-2.5 py-0.5 bg-slate-600 text-slate-200 rounded-full text-xs font-medium">Draft</span>;
      case 'active': return <span className="px-2.5 py-0.5 bg-blue-600 text-blue-100 rounded-full text-xs font-medium">Active</span>;
      case 'completed': return <span className="px-2.5 py-0.5 bg-green-600 text-green-100 rounded-full text-xs font-medium">Completed</span>;
      default: return null;
    }
  };

  const getProgressBar = (round: any) => {
    if (round.totalResponses === 0) return 0;
    return Math.round((round.completedCount / round.totalResponses) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-3 text-sm transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <ClipboardCheck className="h-8 w-8 text-orange-500" />
              QA Testing Rounds
            </h1>
            <p className="text-slate-400 mt-1">Manage QA testing rounds, assign reviewers, and track progress</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> New QA Round
          </button>
        </div>

        {/* My Assignments Banner */}
        {myAssignments.length > 0 && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 mb-6">
            <h2 className="text-blue-300 font-semibold mb-3 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" /> Your Assigned Reviews
            </h2>
            <div className="space-y-2">
              {myAssignments.map((a: any) => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/admin/qa-checklist/review/${a.id}`)}
                  className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700 rounded-lg p-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {a.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : a.status === 'in_progress' ? (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-500" />
                    )}
                    <div className="text-left">
                      <p className="text-white font-medium text-sm flex items-center gap-2">
                        {a.round.title} (v{a.round.versionNumber})
                        {a.round.suspended && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-purple-700/40 text-purple-200 rounded font-semibold uppercase tracking-wide">Paused</span>
                        )}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {a.counts.pass + a.counts.fail + a.counts.skip}/{a.counts.total} tested
                        {a.counts.fail > 0 && <span className="text-red-400 ml-2">{a.counts.fail} failed</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400"
                        style={{ width: `${a.counts.total > 0 ? Math.round(((a.counts.pass + a.counts.fail + a.counts.skip) / a.counts.total) * 100) : 0}%` }}
                      />
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rounds List */}
        {rounds.length === 0 ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
            <ClipboardCheck className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No QA Rounds Yet</h3>
            <p className="text-slate-400 mb-6">Create your first QA round to start testing the site.</p>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors"
            >
              Create First Round
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rounds.map((round: any) => {
              const progress = getProgressBar(round);
              const busy = busyRoundId === round.id;
              return (
                <div
                  key={round.id}
                  className="bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/qa-checklist/rounds/${round.id}`)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-orange-500 font-bold text-lg">v{round.versionNumber}</span>
                        <div className="min-w-0">
                          <h3 className="text-white font-semibold truncate">{round.title}</h3>
                          <p className="text-slate-400 text-xs">
                            Created by {round.createdBy.firstName} {round.createdBy.lastName} on {new Date(round.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {round.suspended && (
                          <span className="px-2.5 py-0.5 bg-purple-600/30 text-purple-200 rounded-full text-xs font-medium">Paused</span>
                        )}
                        {getStatusBadge(round.status)}
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <BarChart3 className="h-4 w-4" />
                        <span>{round.totalItems} items</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Users className="h-4 w-4" />
                        <span>{round.assignmentCount} reviewer{round.assignmentCount !== 1 ? 's' : ''}</span>
                      </div>
                      {round.passCount > 0 && (
                        <span className="text-green-400 text-xs">{round.passCount} passed</span>
                      )}
                      {round.failCount > 0 && (
                        <span className="text-red-400 text-xs">{round.failCount} failed</span>
                      )}
                    </div>

                    {round.totalResponses > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-400">Progress</span>
                          <span className="text-slate-400">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Inline round actions — quick access without entering the detail page */}
                    <div
                      className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-700/60"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => openEditRound(round)}
                        disabled={busy}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        title="Edit round title and description"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      {round.status !== 'completed' && (
                        <button
                          onClick={() => handleSuspendToggle(round)}
                          disabled={busy}
                          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-50 ${round.suspended
                            ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                            : 'bg-purple-700 hover:bg-purple-600 text-white'}`}
                          title={round.suspended
                            ? 'Resume — reviewers can submit responses again'
                            : 'Pause — reviewers keep progress but cannot submit until resumed'}
                        >
                          {round.suspended
                            ? (<><PlayCircle className="h-3.5 w-3.5" /> {busy ? 'Working…' : 'Resume'}</>)
                            : (<><PauseCircle className="h-3.5 w-3.5" /> {busy ? 'Working…' : 'Suspend'}</>)}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteRound(round)}
                        disabled={busy}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 ml-auto"
                        title="Permanently delete this round and all attached responses & fixes"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {busy ? 'Working…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Round Modal */}
        {editingRoundId && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full">
              <h3 className="text-white font-bold text-lg mb-4">Edit Round</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1">Title *</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1">Description (optional)</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-y"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setEditingRoundId(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button onClick={handleSaveEdit} disabled={!editTitle.trim() || savingEdit} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (() => {
          const totalMaster = masterSections.reduce((n, s) => n + s.items.length, 0);
          return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-3xl w-full max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-700">
                  <h3 className="text-white font-bold text-lg mb-1">Create New QA Round</h3>
                  <p className="text-slate-400 text-sm">Pick which checklist items reviewers should walk. You can also add custom items now or later.</p>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  <div>
                    <label className="text-slate-300 text-sm font-medium block mb-1">Title *</label>
                    <input
                      type="text"
                      value={createTitle}
                      onChange={(e) => setCreateTitle(e.target.value)}
                      placeholder="e.g., Initial QA Review"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium block mb-1">Description (optional)</label>
                    <textarea
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      placeholder="Notes about this round..."
                      rows={2}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-y"
                    />
                  </div>

                  {/* Master items picker */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-slate-300 text-sm font-medium">
                        Items to include
                        <span className="text-slate-500 font-normal ml-2">{selectedMasterIds.size} of {totalMaster} selected</span>
                      </label>
                      <div className="flex gap-2">
                        <button onClick={selectAllMaster} className="text-xs text-orange-400 hover:text-orange-300">Select all</button>
                        <span className="text-slate-600 text-xs">·</span>
                        <button onClick={deselectAllMaster} className="text-xs text-slate-400 hover:text-slate-200">Clear</button>
                      </div>
                    </div>
                    {loadingMaster ? (
                      <div className="text-slate-400 text-sm py-4 text-center">Loading checklist…</div>
                    ) : (
                      <div className="border border-slate-700 rounded-lg max-h-72 overflow-y-auto">
                        {masterSections.map((section: any) => {
                          const ids = section.items.map((i: any) => i.id);
                          const selectedInSection = ids.filter((id: string) => selectedMasterIds.has(id)).length;
                          const allOn = selectedInSection === ids.length && ids.length > 0;
                          const someOn = selectedInSection > 0 && selectedInSection < ids.length;
                          const expanded = expandedSectionIds.has(section.id);
                          return (
                            <div key={section.id} className="border-b border-slate-700/60 last:border-b-0">
                              <div className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700/40">
                                <input
                                  type="checkbox"
                                  checked={allOn}
                                  ref={el => { if (el) el.indeterminate = someOn; }}
                                  onChange={() => toggleSectionAll(section)}
                                  className="cursor-pointer"
                                />
                                <button onClick={() => toggleSectionExpanded(section.id)} className="flex-1 flex items-center gap-2 text-left">
                                  {expanded
                                    ? <ChevronDown className="h-4 w-4 text-slate-400" />
                                    : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                  <span className="text-white text-sm font-medium truncate">{section.title}</span>
                                  <span className="text-slate-500 text-xs">{selectedInSection}/{ids.length}</span>
                                </button>
                              </div>
                              {expanded && (
                                <div className="pl-9 pr-3 py-1 bg-slate-900/30 space-y-1">
                                  {section.items.map((item: any) => (
                                    <label key={item.id} className="flex items-start gap-2 py-1 cursor-pointer hover:bg-slate-700/30 rounded px-1">
                                      <input
                                        type="checkbox"
                                        checked={selectedMasterIds.has(item.id)}
                                        onChange={() => toggleItemSelected(item.id)}
                                        className="mt-0.5 cursor-pointer"
                                      />
                                      <span className="text-slate-200 text-xs flex-1">{item.title}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Custom items composer */}
                  <div>
                    <label className="text-slate-300 text-sm font-medium block mb-2">
                      Custom items <span className="text-slate-500 font-normal">({pendingCustomItems.length})</span>
                    </label>
                    {pendingCustomItems.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {pendingCustomItems.map((c, idx) => (
                          <div key={idx} className="bg-slate-900/40 border border-slate-700 rounded-lg p-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-white text-sm font-medium flex items-center gap-2">
                                {c.title}
                                {c.promoteToMaster && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-700/40 text-emerald-200 rounded font-semibold uppercase tracking-wide">Master</span>
                                )}
                              </div>
                              <p className="text-slate-400 text-xs mt-1">{c.steps.length} step{c.steps.length === 1 ? '' : 's'} · expects: {c.expectedResult.slice(0, 80)}{c.expectedResult.length > 80 ? '…' : ''}</p>
                            </div>
                            <button onClick={() => removePendingCustomItem(idx)} className="text-red-400 hover:text-red-300 flex-shrink-0">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-3 space-y-2">
                      <input
                        type="text"
                        value={customDraftTitle}
                        onChange={(e) => setCustomDraftTitle(e.target.value)}
                        placeholder="Item title (e.g., Verify new search filter)"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                      <textarea
                        value={customDraftSteps}
                        onChange={(e) => setCustomDraftSteps(e.target.value)}
                        placeholder="Steps (one per line)&#10;Open the search page&#10;Type a query&#10;Click apply"
                        rows={3}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-orange-500 outline-none resize-y font-mono"
                      />
                      <input
                        type="text"
                        value={customDraftExpected}
                        onChange={(e) => setCustomDraftExpected(e.target.value)}
                        placeholder="Expected result"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                      <input
                        type="text"
                        value={customDraftPageUrl}
                        onChange={(e) => setCustomDraftPageUrl(e.target.value)}
                        placeholder="Page URL (optional, e.g., /admin/events)"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-slate-300 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={customDraftPromote}
                            onChange={(e) => setCustomDraftPromote(e.target.checked)}
                            className="cursor-pointer"
                          />
                          Also save to the master checklist for future rounds
                        </label>
                        <button
                          onClick={addPendingCustomItem}
                          disabled={!customDraftTitle.trim() || !customDraftExpected.trim() || !customDraftSteps.trim()}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          + Add Custom Item
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end p-6 border-t border-slate-700">
                  <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
                  <button
                    onClick={handleCreateRound}
                    disabled={!createTitle.trim() || creating || (selectedMasterIds.size === 0 && pendingCustomItems.length === 0)}
                    title={selectedMasterIds.size === 0 && pendingCustomItems.length === 0 ? 'Pick at least one item or add a custom one' : undefined}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Creating…' : `Create Round (${selectedMasterIds.size + pendingCustomItems.length} items)`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
