import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Check, X, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { getMyEDAssignments, respondToEDAssignment, EventDirectorAssignment, EventAssignmentStatus } from '../event-directors.api-client';

interface EventDirectorAssignmentsProps {
  eventDirectorId?: string;
  selectedSeasonId?: string;
  seasonStartDate?: string;
  seasonEndDate?: string;
}

const STATUS_STYLES: Record<EventAssignmentStatus, string> = {
  [EventAssignmentStatus.REQUESTED]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  [EventAssignmentStatus.ACCEPTED]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [EventAssignmentStatus.DECLINED]: 'bg-red-500/20 text-red-400 border-red-500/30',
  [EventAssignmentStatus.CONFIRMED]: 'bg-green-500/20 text-green-400 border-green-500/30',
  [EventAssignmentStatus.COMPLETED]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  [EventAssignmentStatus.NO_SHOW]: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function EventDirectorAssignments({
  eventDirectorId,
  selectedSeasonId,
  seasonStartDate,
  seasonEndDate
}: EventDirectorAssignmentsProps) {
  const [assignments, setAssignments] = useState<EventDirectorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState<string | null>(null);

  useEffect(() => {
    loadAssignments();
  }, [eventDirectorId]);

  async function loadAssignments() {
    try {
      setLoading(true);
      // Don't filter by upcoming - show all assignments so users can respond to requests
      const data = await getMyEDAssignments({});
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }

  async function handleRespond(assignmentId: string, accept: boolean) {
    try {
      setResponding(assignmentId);
      await respondToEDAssignment(assignmentId, accept, accept ? undefined : declineReason);
      await loadAssignments();
      setShowDeclineModal(null);
      setDeclineReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to respond to assignment');
    } finally {
      setResponding(null);
    }
  }

  // Filter assignments by season
  const filterBySeason = (assignmentList: EventDirectorAssignment[]) => {
    if (!selectedSeasonId || !seasonStartDate || !seasonEndDate) {
      return assignmentList;
    }

    const seasonStart = new Date(seasonStartDate);
    const seasonEnd = new Date(seasonEndDate);

    return assignmentList.filter(assignment => {
      if (!assignment.event?.event_date) return true; // Include if no date
      const eventDate = new Date(assignment.event.event_date);
      return eventDate >= seasonStart && eventDate <= seasonEnd;
    });
  };

  if (loading) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-500" />
          Upcoming Events to Direct
        </h3>
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-r-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-500" />
          Upcoming Events to Direct
        </h3>
        <div className="text-center py-4">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={loadAssignments}
            className="mt-2 text-purple-500 hover:text-purple-400 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Apply season filter
  const filteredAssignments = filterBySeason(assignments);

  const pendingAssignments = filteredAssignments.filter(a => a.status === EventAssignmentStatus.REQUESTED);
  const confirmedAssignments = filteredAssignments.filter(a =>
    a.status === EventAssignmentStatus.ACCEPTED || a.status === EventAssignmentStatus.CONFIRMED
  );

  const renderAssignmentCard = (assignment: EventDirectorAssignment) => (
    <div
      key={assignment.id}
      className="bg-slate-700/50 rounded-lg p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white">
              {assignment.event?.title || 'Event'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLES[assignment.status]}`}>
              {assignment.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {assignment.event?.event_date
                ? new Date(assignment.event.event_date).toLocaleDateString()
                : 'TBD'}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {assignment.event?.venue_city}, {assignment.event?.venue_state}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {assignment.event?.id && (
            <Link
              to={`/event-directors/event/${assignment.event.id}`}
              className="text-purple-500 hover:text-purple-400 flex items-center gap-1 text-sm"
            >
              Manage Event
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-purple-500" />
        Upcoming Events to Direct
      </h3>

      {filteredAssignments.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No events to direct for this season</p>
          <p className="text-gray-500 text-sm mt-1">You'll see your event director assignments here once you're assigned to events.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Requests */}
          {pendingAssignments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Awaiting Your Response ({pendingAssignments.length})
              </h4>
              <div className="space-y-3">
                {pendingAssignments.map(assignment => (
                  <div key={assignment.id} className="bg-slate-700/50 rounded-lg p-4 border border-yellow-500/20">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">
                            {assignment.event?.title || 'Event'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLES[assignment.status]}`}>
                            {assignment.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {assignment.event?.event_date
                              ? new Date(assignment.event.event_date).toLocaleDateString()
                              : 'TBD'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {assignment.event?.venue_city}, {assignment.event?.venue_state}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespond(assignment.id, true)}
                          disabled={responding === assignment.id}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => setShowDeclineModal(assignment.id)}
                          disabled={responding === assignment.id}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirmed Assignments (Active) */}
          {confirmedAssignments.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Active ({confirmedAssignments.length})
              </h4>
              <div className="space-y-3">
                {confirmedAssignments.map(assignment => renderAssignmentCard(assignment))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Decline Assignment</h3>
            <p className="text-gray-400 mb-4">
              Please provide a reason for declining this assignment (optional):
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              rows={3}
              placeholder="e.g., Schedule conflict, travel distance, etc."
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeclineModal(null);
                  setDeclineReason('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRespond(showDeclineModal, false)}
                disabled={responding === showDeclineModal}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {responding === showDeclineModal ? 'Declining...' : 'Decline Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
