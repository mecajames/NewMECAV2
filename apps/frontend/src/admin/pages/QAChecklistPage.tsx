import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ClipboardCheck, Plus, ChevronRight, CheckCircle2,
  AlertCircle, Clock, Circle, Users, BarChart3, ArrowRightFromLine
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

  const handleCreateRound = async () => {
    if (!createTitle.trim()) return;
    setCreating(true);
    try {
      await qaApi.createRound({ title: createTitle, description: createDescription || undefined });
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateDescription('');
      await loadData();
    } catch (err) {
      console.error('Failed to create round:', err);
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
            onClick={() => setShowCreateModal(true)}
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
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors"
            >
              Create First Round
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rounds.map((round: any) => {
              const progress = getProgressBar(round);
              return (
                <div
                  key={round.id}
                  className="bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/qa-checklist/rounds/${round.id}`)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-orange-500 font-bold text-lg">v{round.versionNumber}</span>
                        <div>
                          <h3 className="text-white font-semibold">{round.title}</h3>
                          <p className="text-slate-400 text-xs">
                            Created by {round.createdBy.firstName} {round.createdBy.lastName} on {new Date(round.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full">
              <h3 className="text-white font-bold text-lg mb-4">Create New QA Round</h3>
              <p className="text-slate-400 text-sm mb-4">
                This creates a new QA round with the current master checklist (every section and item). You can then assign reviewers to walk through the site and sign off.
              </p>
              <div className="space-y-4">
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
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-y"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button onClick={handleCreateRound} disabled={!createTitle.trim() || creating} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Round'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
