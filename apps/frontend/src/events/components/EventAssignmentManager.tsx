import { useState, useEffect } from 'react';
import { Users, UserPlus, X, Check, AlertCircle, Gavel, ClipboardList, Search, Trash2, ChevronDown } from 'lucide-react';
import {
  getEventAssignments,
  createAssignment,
  deleteAssignment,
  updateAssignment,
  getAllJudges,
  EventJudgeAssignment,
  EventAssignmentStatus,
  EventAssignmentRole,
  AssignmentRequestType
} from '@/judges';
import {
  getEventEDAssignments,
  createEDAssignment,
  deleteEDAssignment,
  updateEDAssignment,
  getAllEventDirectors,
  EventDirectorAssignment
} from '@/event-directors';

interface EventAssignmentManagerProps {
  eventId: string;
  eventTitle: string;
}

interface Judge {
  id: string;
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
  level?: string;
  specialty?: string;
}

interface EventDirector {
  id: string;
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
  additional_regions?: string[];
}

const STATUS_STYLES: Record<EventAssignmentStatus, string> = {
  [EventAssignmentStatus.REQUESTED]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  [EventAssignmentStatus.ACCEPTED]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [EventAssignmentStatus.DECLINED]: 'bg-red-500/20 text-red-400 border-red-500/30',
  [EventAssignmentStatus.CONFIRMED]: 'bg-green-500/20 text-green-400 border-green-500/30',
  [EventAssignmentStatus.COMPLETED]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  [EventAssignmentStatus.NO_SHOW]: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const ROLE_LABELS: Record<EventAssignmentRole, string> = {
  [EventAssignmentRole.PRIMARY]: 'Primary',
  [EventAssignmentRole.SUPPORTING]: 'Supporting',
  [EventAssignmentRole.TRAINEE]: 'Trainee',
};

export default function EventAssignmentManager({ eventId, eventTitle: _eventTitle }: EventAssignmentManagerProps) {
  const [activeTab, setActiveTab] = useState<'judges' | 'eds'>('judges');
  const [judgeAssignments, setJudgeAssignments] = useState<EventJudgeAssignment[]>([]);
  const [edAssignments, setEdAssignments] = useState<EventDirectorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add assignment state
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableJudges, setAvailableJudges] = useState<Judge[]>([]);
  const [availableEDs, setAvailableEDs] = useState<EventDirector[]>([]);
  const [selectedRole, setSelectedRole] = useState<EventAssignmentRole>(EventAssignmentRole.PRIMARY);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    loadAssignments();
  }, [eventId]);

  async function loadAssignments() {
    try {
      setLoading(true);
      setError(null);
      const [judges, eds] = await Promise.all([
        getEventAssignments(eventId),
        getEventEDAssignments(eventId),
      ]);
      setJudgeAssignments(judges);
      setEdAssignments(eds);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailablePersonnel() {
    try {
      if (activeTab === 'judges') {
        const judges = await getAllJudges({ isActive: true });
        // Filter out already assigned judges
        const assignedJudgeIds = judgeAssignments.map(a => a.judge_id);
        setAvailableJudges(judges.filter((j: Judge) => !assignedJudgeIds.includes(j.id)));
      } else {
        const eds = await getAllEventDirectors({ isActive: true });
        // Filter out already assigned EDs
        const assignedEDIds = edAssignments.map(a => a.event_director_id);
        setAvailableEDs(eds.filter((ed: EventDirector) => !assignedEDIds.includes(ed.id)));
      }
    } catch (err: any) {
      console.error('Error loading available personnel:', err);
    }
  }

  async function handleAddAssignment(personId: string) {
    try {
      setSubmitting(true);
      if (activeTab === 'judges') {
        await createAssignment({
          event_id: eventId,
          judge_id: personId,
          role: selectedRole,
          request_type: AssignmentRequestType.ADMIN_ASSIGNED,
        });
      } else {
        await createEDAssignment({
          event_id: eventId,
          event_director_id: personId,
          request_type: AssignmentRequestType.ADMIN_ASSIGNED,
        });
      }
      await loadAssignments();
      setShowAddModal(false);
      setSearchQuery('');
    } catch (err: any) {
      setError(err.message || 'Failed to add assignment');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string, type: 'judge' | 'ed') {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      if (type === 'judge') {
        await deleteAssignment(assignmentId);
      } else {
        await deleteEDAssignment(assignmentId);
      }
      await loadAssignments();
    } catch (err: any) {
      setError(err.message || 'Failed to remove assignment');
    }
  }

  async function handleStatusUpdate(assignmentId: string, newStatus: EventAssignmentStatus, type: 'judge' | 'ed') {
    try {
      setUpdatingStatus(assignmentId);
      if (type === 'judge') {
        await updateAssignment(assignmentId, { status: newStatus });
      } else {
        await updateEDAssignment(assignmentId, { status: newStatus });
      }
      await loadAssignments();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  }

  const filteredJudges = availableJudges.filter(j => {
    const name = `${j.user?.first_name || ''} ${j.user?.last_name || ''}`.toLowerCase();
    const email = j.user?.email?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const filteredEDs = availableEDs.filter(ed => {
    const name = `${ed.user?.first_name || ''} ${ed.user?.last_name || ''}`.toLowerCase();
    const email = ed.user?.email?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  if (loading) {
    return (
      <div className="bg-slate-700 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-orange-500" />
          Event Staff Assignments
        </h3>
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-r-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-orange-500" />
          Event Staff Assignments
        </h3>
        <button
          onClick={() => {
            setShowAddModal(true);
            loadAvailablePersonnel();
          }}
          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
        >
          <UserPlus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('judges')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'judges'
              ? 'bg-orange-600 text-white'
              : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
          }`}
        >
          <Gavel className="h-4 w-4" />
          Judges ({judgeAssignments.length})
        </button>
        <button
          onClick={() => setActiveTab('eds')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'eds'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Event Directors ({edAssignments.length})
        </button>
      </div>

      {/* Assignments List */}
      {activeTab === 'judges' ? (
        <div className="space-y-2">
          {judgeAssignments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No judges assigned to this event</p>
          ) : (
            judgeAssignments.map(assignment => (
              <div key={assignment.id} className="bg-slate-600 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Gavel className="h-5 w-5 text-orange-400" />
                  <div>
                    <p className="text-white font-medium">
                      {assignment.judge?.user?.first_name || ''} {assignment.judge?.user?.last_name || ''}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">
                        {assignment.judge?.user?.email}
                      </span>
                      <span className="text-orange-400 text-xs">
                        {ROLE_LABELS[assignment.role as EventAssignmentRole] || assignment.role}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={assignment.status}
                      onChange={(e) => handleStatusUpdate(assignment.id, e.target.value as EventAssignmentStatus, 'judge')}
                      disabled={updatingStatus === assignment.id}
                      className={`appearance-none pl-2 pr-7 py-1 rounded-full text-xs border cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 ${STATUS_STYLES[assignment.status]} ${updatingStatus === assignment.id ? 'opacity-50' : ''}`}
                    >
                      <option value={EventAssignmentStatus.REQUESTED}>requested</option>
                      <option value={EventAssignmentStatus.ACCEPTED}>accepted</option>
                      <option value={EventAssignmentStatus.CONFIRMED}>confirmed</option>
                      <option value={EventAssignmentStatus.COMPLETED}>completed</option>
                      <option value={EventAssignmentStatus.DECLINED}>declined</option>
                      <option value={EventAssignmentStatus.NO_SHOW}>no show</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" />
                  </div>
                  <button
                    onClick={() => handleRemoveAssignment(assignment.id, 'judge')}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Remove assignment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {edAssignments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No event directors assigned to this event</p>
          ) : (
            edAssignments.map(assignment => (
              <div key={assignment.id} className="bg-slate-600 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-purple-400" />
                  <div>
                    <p className="text-white font-medium">
                      {assignment.eventDirector?.user?.first_name || ''} {assignment.eventDirector?.user?.last_name || ''}
                    </p>
                    <span className="text-gray-400 text-xs">
                      {assignment.eventDirector?.user?.email}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={assignment.status}
                      onChange={(e) => handleStatusUpdate(assignment.id, e.target.value as EventAssignmentStatus, 'ed')}
                      disabled={updatingStatus === assignment.id}
                      className={`appearance-none pl-2 pr-7 py-1 rounded-full text-xs border cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 ${STATUS_STYLES[assignment.status]} ${updatingStatus === assignment.id ? 'opacity-50' : ''}`}
                    >
                      <option value={EventAssignmentStatus.REQUESTED}>requested</option>
                      <option value={EventAssignmentStatus.ACCEPTED}>accepted</option>
                      <option value={EventAssignmentStatus.CONFIRMED}>confirmed</option>
                      <option value={EventAssignmentStatus.COMPLETED}>completed</option>
                      <option value={EventAssignmentStatus.DECLINED}>declined</option>
                      <option value={EventAssignmentStatus.NO_SHOW}>no show</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" />
                  </div>
                  <button
                    onClick={() => handleRemoveAssignment(assignment.id, 'ed')}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Remove assignment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Add {activeTab === 'judges' ? 'Judge' : 'Event Director'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs in modal */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setActiveTab('judges');
                  loadAvailablePersonnel();
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'judges'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                Judges
              </button>
              <button
                onClick={() => {
                  setActiveTab('eds');
                  loadAvailablePersonnel();
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'eds'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                Event Directors
              </button>
            </div>

            {/* Role selector for judges */}
            {activeTab === 'judges' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as EventAssignmentRole)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={EventAssignmentRole.PRIMARY}>Primary Judge</option>
                  <option value={EventAssignmentRole.SUPPORTING}>Supporting Judge</option>
                  <option value={EventAssignmentRole.TRAINEE}>Trainee</option>
                </select>
              </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab === 'judges' ? 'judges' : 'event directors'}...`}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {activeTab === 'judges' ? (
                filteredJudges.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">
                    {availableJudges.length === 0 ? 'No available judges' : 'No judges match your search'}
                  </p>
                ) : (
                  filteredJudges.map(judge => (
                    <button
                      key={judge.id}
                      onClick={() => handleAddAssignment(judge.id)}
                      disabled={submitting}
                      className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg p-3 flex items-center justify-between transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <Gavel className="h-5 w-5 text-orange-400" />
                        <div className="text-left">
                          <p className="text-white font-medium">
                            {judge.user?.first_name || ''} {judge.user?.last_name || ''}
                          </p>
                          <p className="text-gray-400 text-xs">{judge.user?.email}</p>
                          {judge.level && (
                            <span className="text-orange-400 text-xs">{judge.level}</span>
                          )}
                        </div>
                      </div>
                      <Check className="h-5 w-5 text-green-400" />
                    </button>
                  ))
                )
              ) : (
                filteredEDs.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">
                    {availableEDs.length === 0 ? 'No available event directors' : 'No event directors match your search'}
                  </p>
                ) : (
                  filteredEDs.map(ed => (
                    <button
                      key={ed.id}
                      onClick={() => handleAddAssignment(ed.id)}
                      disabled={submitting}
                      className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg p-3 flex items-center justify-between transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <ClipboardList className="h-5 w-5 text-purple-400" />
                        <div className="text-left">
                          <p className="text-white font-medium">
                            {ed.user?.first_name || ''} {ed.user?.last_name || ''}
                          </p>
                          <p className="text-gray-400 text-xs">{ed.user?.email}</p>
                          {ed.additional_regions && ed.additional_regions.length > 0 && (
                            <span className="text-purple-400 text-xs">{ed.additional_regions.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <Check className="h-5 w-5 text-green-400" />
                    </button>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
