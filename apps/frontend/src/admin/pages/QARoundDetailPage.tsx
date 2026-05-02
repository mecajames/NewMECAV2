import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ClipboardCheck, Users, Play, CheckCheck, Plus, Trash2,
  ChevronRight, ChevronDown, CheckCircle2, AlertCircle, Clock, Circle, Wrench,
  ArrowRightFromLine, Image as ImageIcon, ExternalLink, MessageSquare,
  Pencil, PauseCircle, PlayCircle, EyeOff, ListChecks, Star,
} from 'lucide-react';
import { qaApi } from '@/api-client/qa.api-client';

export default function QARoundDetailPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();
  const [round, setRound] = useState<any>(null);
  const [failedItems, setFailedItems] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'failed' | 'fixes'>('overview');
  const [roundItems, setRoundItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Add-from-master modal state
  const [showAddMasterModal, setShowAddMasterModal] = useState(false);
  const [masterSections, setMasterSections] = useState<any[]>([]);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [pickerExpanded, setPickerExpanded] = useState<Set<string>>(new Set());
  const [addingMaster, setAddingMaster] = useState(false);

  // Add-custom modal state
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customDraftTitle, setCustomDraftTitle] = useState('');
  const [customDraftSteps, setCustomDraftSteps] = useState('');
  const [customDraftExpected, setCustomDraftExpected] = useState('');
  const [customDraftPageUrl, setCustomDraftPageUrl] = useState('');
  const [customDraftPromote, setCustomDraftPromote] = useState(false);
  const [savingCustom, setSavingCustom] = useState(false);
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

  // Edit round form state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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

  const loadRoundItems = async () => {
    if (!roundId) return;
    setLoadingItems(true);
    try {
      const items = await qaApi.getRoundItems(roundId);
      setRoundItems(items);
    } catch (err) {
      console.error('Failed to load round items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Load items lazily the first time the Manage Items tab is opened
  useEffect(() => {
    if (activeTab === 'items' && roundItems.length === 0 && !loadingItems) {
      loadRoundItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const openAddMasterModal = async () => {
    setShowAddMasterModal(true);
    setPickerSelected(new Set());
    setPickerExpanded(new Set());
    try {
      const sections = await qaApi.listMasterItems();
      // Filter out master items already in this round so admins only see new options
      const existingMasterIds = new Set<string>(
        roundItems.flatMap((s: any) => s.items.filter((i: any) => i.sourceMasterId).map((i: any) => i.sourceMasterId)),
      );
      const filtered = sections
        .map((s: any) => ({ ...s, items: s.items.filter((i: any) => !existingMasterIds.has(i.id)) }))
        .filter((s: any) => s.items.length > 0);
      setMasterSections(filtered);
    } catch (err) {
      console.error('Failed to load master items:', err);
    }
  };

  const togglePickerItem = (itemId: string) => {
    setPickerSelected(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };
  const togglePickerSection = (section: any) => {
    const ids = section.items.map((i: any) => i.id);
    const allOn = ids.every((id: string) => pickerSelected.has(id));
    setPickerSelected(prev => {
      const next = new Set(prev);
      if (allOn) ids.forEach((id: string) => next.delete(id));
      else       ids.forEach((id: string) => next.add(id));
      return next;
    });
  };
  const togglePickerExpanded = (sectionId: string) => {
    setPickerExpanded(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleAddMasterItems = async () => {
    if (pickerSelected.size === 0) return;
    setAddingMaster(true);
    try {
      await qaApi.addMasterItemsToRound(roundId!, Array.from(pickerSelected));
      setShowAddMasterModal(false);
      await Promise.all([loadData(), loadRoundItems()]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add items');
    } finally {
      setAddingMaster(false);
    }
  };

  const handleAddCustomItem = async () => {
    const steps = customDraftSteps.split('\n').map(s => s.trim()).filter(Boolean);
    if (!customDraftTitle.trim() || !customDraftExpected.trim() || steps.length === 0) {
      alert('Title, expected result, and at least one step are required');
      return;
    }
    setSavingCustom(true);
    try {
      await qaApi.addCustomItemToRound(roundId!, {
        title: customDraftTitle.trim(),
        steps,
        expectedResult: customDraftExpected.trim(),
        pageUrl: customDraftPageUrl.trim() || undefined,
        promoteToMaster: customDraftPromote,
      });
      setShowAddCustomModal(false);
      setCustomDraftTitle(''); setCustomDraftSteps(''); setCustomDraftExpected(''); setCustomDraftPageUrl(''); setCustomDraftPromote(false);
      await Promise.all([loadData(), loadRoundItems()]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add item');
    } finally {
      setSavingCustom(false);
    }
  };

  const handleRemoveItem = async (item: any) => {
    // Look up how many responses exist for this item across all reviewers so
    // the admin sees the destruction risk before confirming.
    const submitted = (round.assignments ?? []).reduce((n: number, a: any) => n + (a.counts?.total ?? 0), 0);
    const tail = submitted > 0
      ? `\n\nAny submitted reviewer responses for this item (and developer fixes attached to them) will be permanently deleted.`
      : '';
    if (!confirm(`Remove "${item.title}" from this round?${tail}`)) return;
    try {
      await qaApi.removeRoundItem(item.id);
      await Promise.all([loadData(), loadRoundItems()]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove item');
    }
  };

  const handlePromoteToMaster = async (item: any) => {
    if (!confirm(`Save "${item.title}" to the master checklist?\n\nFuture rounds will include this item by default.`)) return;
    try {
      await qaApi.promoteItemToMaster(item.id);
      await loadRoundItems();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to promote item');
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

  const handleRemoveAssignment = async (assignmentId: string, assigneeName: string, submittedCount: number) => {
    const tail = submittedCount > 0
      ? `\n\nThis reviewer has already submitted ${submittedCount} response${submittedCount === 1 ? '' : 's'}, which will be permanently lost (along with any developer fix notes attached to those responses).`
      : '';
    if (!confirm(`Remove ${assigneeName} from this round?${tail}`)) return;
    if (submittedCount > 0 && !confirm('Are you absolutely sure? Their work cannot be recovered.')) return;
    try {
      await qaApi.removeAssignment(assignmentId);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove reviewer');
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

  const openEditModal = () => {
    setEditTitle(round?.title ?? '');
    setEditDescription(round?.description ?? '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    try {
      await qaApi.updateRound(roundId!, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
      });
      setShowEditModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update round');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSuspendToggle = async () => {
    if (!round) return;
    const willSuspend = !round.suspended;
    if (willSuspend && !confirm(
      `Pause "${round.title}"?\n\nReviewers will keep their progress but cannot submit new pass/fail responses, and developers cannot record fixes, until you resume the round.`,
    )) return;
    try {
      if (willSuspend) await qaApi.suspendRound(roundId!);
      else             await qaApi.resumeRound(roundId!);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update suspension');
    }
  };

  const handleDeleteRound = async () => {
    if (!round) return;
    const consequence = round.stats?.totalResponses > 0
      ? `\n\nThis will permanently delete ${round.stats.totalResponses} reviewer response${round.stats.totalResponses === 1 ? '' : 's'} and any developer fix notes attached to this round.`
      : '';
    if (!confirm(`Delete round "${round.title}" (v${round.versionNumber})?${consequence}\n\nThis cannot be undone.`)) return;
    // Second confirm for destructive deletes against rounds with data
    if (round.stats?.totalResponses > 0 && !confirm('Are you absolutely sure? Reviewer work will be lost.')) return;
    try {
      await qaApi.deleteRound(roundId!);
      navigate('/admin/qa-checklist');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete round');
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
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className="text-orange-500 font-bold text-2xl">v{round.versionNumber}</span>
              <h1 className="text-2xl font-bold text-white">{round.title}</h1>
              {round.status === 'draft' && <span className="px-2.5 py-0.5 bg-slate-600 text-slate-200 rounded-full text-xs font-medium">Draft</span>}
              {round.status === 'active' && <span className="px-2.5 py-0.5 bg-blue-600 text-blue-100 rounded-full text-xs font-medium">Active</span>}
              {round.status === 'completed' && <span className="px-2.5 py-0.5 bg-green-600 text-green-100 rounded-full text-xs font-medium">Completed</span>}
              {round.suspended && (
                <span className="px-2.5 py-0.5 bg-purple-600/30 text-purple-200 rounded-full text-xs font-medium flex items-center gap-1">
                  <EyeOff className="h-3 w-3" /> Paused
                </span>
              )}
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

            {/* Round CRUD — available in any status */}
            <button
              onClick={openEditModal}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              title="Edit round title and description"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
            {round.status !== 'completed' && (
              <button
                onClick={handleSuspendToggle}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${round.suspended
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                  : 'bg-purple-700 hover:bg-purple-600 text-white'}`}
                title={round.suspended
                  ? 'Resume — reviewers can submit responses again'
                  : 'Pause — reviewers keep progress but cannot submit until resumed'}
              >
                {round.suspended
                  ? (<><PlayCircle className="h-4 w-4" /> Resume</>)
                  : (<><PauseCircle className="h-4 w-4" /> Suspend</>)}
              </button>
            )}
            <button
              onClick={handleDeleteRound}
              className="flex items-center gap-2 px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
              title="Permanently delete this round and all attached responses & fixes"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>

        {round.suspended && (
          <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-4 mb-6 flex items-start gap-3">
            <PauseCircle className="h-5 w-5 text-purple-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="text-purple-200 font-medium">Round paused</p>
              <p className="text-purple-300/80 mt-0.5">
                Reviewers can still see their assignments and prior progress, but cannot submit pass/fail or fix submissions until you click <span className="font-semibold">Resume</span> above.
              </p>
            </div>
          </div>
        )}

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
            { id: 'items' as const, label: 'Manage Items', icon: ListChecks },
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
                        {round.status !== 'draft' && (
                          <button
                            onClick={() => navigate(`/admin/qa-checklist/review/${a.id}`)}
                            className="text-slate-400 hover:text-white ml-2"
                            title="Open review"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveAssignment(
                            a.id,
                            `${a.assignee.firstName ?? ''} ${a.assignee.lastName ?? ''}`.trim() || a.assignee.email,
                            a.counts.pass + a.counts.fail + a.counts.skip,
                          )}
                          className="text-red-400 hover:text-red-300 ml-2"
                          title="Remove reviewer (any submitted responses will be deleted)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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

        {/* Manage Items Tab */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={openAddMasterModal}
                disabled={round.status === 'completed'}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                title={round.status === 'completed' ? 'Round is completed — items are locked' : 'Pick more master items to add to this round'}
              >
                <Plus className="h-4 w-4" /> Add from Master
              </button>
              <button
                onClick={() => setShowAddCustomModal(true)}
                disabled={round.status === 'completed'}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                title={round.status === 'completed' ? 'Round is completed — items are locked' : 'Compose a one-off custom item'}
              >
                <Plus className="h-4 w-4" /> Add Custom
              </button>
              <span className="text-slate-400 text-xs ml-auto">
                {roundItems.reduce((n, s) => n + s.items.length, 0)} items in this round
              </span>
            </div>

            {loadingItems ? (
              <div className="text-slate-400 text-sm py-8 text-center">Loading items…</div>
            ) : roundItems.length === 0 ? (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-slate-400 text-sm">
                No items in this round yet. Use the buttons above to add some.
              </div>
            ) : (
              roundItems.map((section: any) => (
                <div key={section.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700/60">
                    <div className="text-white font-semibold text-sm">{section.title}</div>
                    {section.description && <div className="text-slate-400 text-xs mt-0.5">{section.description}</div>}
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {section.items.map((item: any) => (
                      <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-slate-700/20">
                        <div className="min-w-0 flex-1">
                          <div className="text-white text-sm flex items-center gap-2">
                            {item.title}
                            {item.isCustom && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-700/30 text-emerald-300 rounded font-semibold uppercase tracking-wide">
                                {item.sourceMasterId ? 'Custom · Promoted' : 'Custom'}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-xs mt-0.5">
                            {item.steps?.length ?? 0} step{item.steps?.length === 1 ? '' : 's'}
                            {item.pageUrl && <> · <a href={item.pageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{item.pageUrl}</a></>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {item.isCustom && !item.sourceMasterId && round.status !== 'completed' && (
                            <button
                              onClick={() => handlePromoteToMaster(item)}
                              className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors"
                              title="Promote to master checklist (future rounds will inherit this item)"
                            >
                              <Star className="h-4 w-4" />
                            </button>
                          )}
                          {round.status !== 'completed' && (
                            <button
                              onClick={() => handleRemoveItem(item)}
                              className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                              title="Remove from round"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
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

        {/* Add From Master Modal */}
        {showAddMasterModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[85vh] flex flex-col">
              <div className="p-5 border-b border-slate-700">
                <h3 className="text-white font-bold text-lg">Add Master Items</h3>
                <p className="text-slate-400 text-sm mt-0.5">
                  Pick items from the master checklist to add to this round. Items already in the round are hidden.
                </p>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                {masterSections.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-6">All master items are already in this round.</p>
                ) : (
                  <div className="border border-slate-700 rounded-lg">
                    {masterSections.map((section: any) => {
                      const ids = section.items.map((i: any) => i.id);
                      const selectedInSection = ids.filter((id: string) => pickerSelected.has(id)).length;
                      const allOn = selectedInSection === ids.length && ids.length > 0;
                      const someOn = selectedInSection > 0 && selectedInSection < ids.length;
                      const expanded = pickerExpanded.has(section.id);
                      return (
                        <div key={section.id} className="border-b border-slate-700/60 last:border-b-0">
                          <div className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700/40">
                            <input
                              type="checkbox"
                              checked={allOn}
                              ref={el => { if (el) el.indeterminate = someOn; }}
                              onChange={() => togglePickerSection(section)}
                              className="cursor-pointer"
                            />
                            <button onClick={() => togglePickerExpanded(section.id)} className="flex-1 flex items-center gap-2 text-left">
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
                                    checked={pickerSelected.has(item.id)}
                                    onChange={() => togglePickerItem(item.id)}
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
              <div className="flex gap-3 justify-end p-5 border-t border-slate-700">
                <button onClick={() => setShowAddMasterModal(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button
                  onClick={handleAddMasterItems}
                  disabled={pickerSelected.size === 0 || addingMaster}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {addingMaster ? 'Adding…' : `Add ${pickerSelected.size} item${pickerSelected.size === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Custom Item Modal */}
        {showAddCustomModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full">
              <h3 className="text-white font-bold text-lg mb-4">Add Custom Item</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1">Title *</label>
                  <input
                    type="text"
                    value={customDraftTitle}
                    onChange={(e) => setCustomDraftTitle(e.target.value)}
                    placeholder="e.g., Verify new search filter"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1">Steps (one per line) *</label>
                  <textarea
                    value={customDraftSteps}
                    onChange={(e) => setCustomDraftSteps(e.target.value)}
                    placeholder={'Open the search page\nType a query\nClick apply'}
                    rows={4}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-y font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1">Expected result *</label>
                  <input
                    type="text"
                    value={customDraftExpected}
                    onChange={(e) => setCustomDraftExpected(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1">Page URL (optional)</label>
                  <input
                    type="text"
                    value={customDraftPageUrl}
                    onChange={(e) => setCustomDraftPageUrl(e.target.value)}
                    placeholder="/admin/events"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customDraftPromote}
                    onChange={(e) => setCustomDraftPromote(e.target.checked)}
                    className="cursor-pointer"
                  />
                  Also save to the master checklist for future rounds
                </label>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setShowAddCustomModal(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button
                  onClick={handleAddCustomItem}
                  disabled={savingCustom || !customDraftTitle.trim() || !customDraftExpected.trim() || !customDraftSteps.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {savingCustom ? 'Saving…' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Round Modal */}
        {showEditModal && (
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
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button onClick={handleSaveEdit} disabled={!editTitle.trim() || savingEdit} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {savingEdit ? 'Saving…' : 'Save Changes'}
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
