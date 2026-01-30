import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ClipboardList, FileText, ChevronRight, Calendar, MapPin,
  Clock, AlertCircle, User
} from 'lucide-react';
import { useAuth } from '@/auth';
import { getMyEventDirectorProfile, EventDirector } from '@/event-directors';
import {
  eventHostingRequestsApi,
  EventHostingRequest,
  EventHostingRequestStatus,
  getStatusLabel,
} from '@/event-hosting-requests/event-hosting-requests.api-client';
import { seasonsApi } from '@/seasons';
import { Season } from '@/types/database';
import EventDirectorAssignments from '../components/EventDirectorAssignments';

export default function EventDirectorAssignmentsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [edProfile, setEdProfile] = useState<EventDirector | null>(null);
  const [pendingRequests, setPendingRequests] = useState<EventHostingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Season filter
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');

  // Get selected season details for passing to child component
  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  useEffect(() => {
    if (profile) {
      fetchEDProfile();
      fetchSeasons();
    }
  }, [profile]);

  useEffect(() => {
    if (edProfile) {
      fetchPendingRequests();
    }
  }, [edProfile, selectedSeasonId, seasons]);

  const fetchEDProfile = async () => {
    try {
      const ed = await getMyEventDirectorProfile();
      if (ed) {
        setEdProfile(ed);
      }
    } catch (error) {
      console.error('Error fetching ED profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasons = async () => {
    try {
      const data = await seasonsApi.getAll();
      setSeasons(data as Season[]);

      // Auto-select current season by default
      const currentSeason = (data as Season[]).find(s => s.is_current);
      if (currentSeason && !selectedSeasonId) {
        setSelectedSeasonId(currentSeason.id);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const fetchPendingRequests = async () => {
    if (!edProfile) return;

    try {
      const data = await eventHostingRequestsApi.getByEventDirector(edProfile.id);
      // Filter to only show requests that:
      // 1. Are assigned to ED, ED accepted, approved, or under review
      // 2. Don't have a created event yet (created_event_id is null)
      let pending = data.filter((req: EventHostingRequest) => {
        const pendingStatuses = [
          EventHostingRequestStatus.ASSIGNED_TO_ED,
          EventHostingRequestStatus.ED_REVIEWING,
          EventHostingRequestStatus.ED_ACCEPTED,
          EventHostingRequestStatus.UNDER_REVIEW,
          EventHostingRequestStatus.APPROVED,
          EventHostingRequestStatus.APPROVED_PENDING_INFO,
        ];
        return pendingStatuses.includes(req.status as EventHostingRequestStatus) && !req.created_event_id;
      });

      // Filter by season if selected (based on event date falling within season date range)
      if (selectedSeasonId && selectedSeason) {
        const seasonStart = new Date(selectedSeason.start_date);
        const seasonEnd = new Date(selectedSeason.end_date);

        pending = pending.filter((req: EventHostingRequest) => {
          if (!req.event_start_date) return true; // Include if no date set
          const eventDate = new Date(req.event_start_date);
          // Check if event date falls within the season's date range
          return eventDate >= seasonStart && eventDate <= seasonEnd;
        });
      }

      setPendingRequests(pending);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const getStatusBadge = (status: string) => {
    const colorMap: { [key: string]: string } = {
      assigned_to_ed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      ed_reviewing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      ed_accepted: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      under_review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      approved_pending_info: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
    };

    const color = colorMap[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    const label = getStatusLabel(status as EventHostingRequestStatus);

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
        {label}
      </span>
    );
  };

  const getSourceLabel = (request: EventHostingRequest) => {
    // Check if this was submitted by the ED themselves (compare user_ids)
    if (request.user_id && edProfile?.user_id && request.user_id === edProfile.user_id) {
      return { label: 'Your Submission', color: 'text-purple-400' };
    }
    // Check if it's from a business or club
    if (request.host_type === 'business') {
      return { label: 'Business Host', color: 'text-blue-400' };
    }
    if (request.host_type === 'club') {
      return { label: 'Club Host', color: 'text-green-400' };
    }
    // Default to individual/public submission
    return { label: 'Public Request', color: 'text-orange-400' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          {/* Season Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="h-5 w-5 text-orange-500" />
              <span className="font-medium text-sm">Season:</span>
            </div>
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 hover:bg-slate-600 transition-colors"
            >
              <option value="">All Seasons</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                  {season.is_current ? ' (Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigate('/dashboard/mymeca')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Link to Hosting Requests */}
        <Link
          to="/event-directors/hosting-requests"
          className="block bg-orange-600/20 border border-orange-500/30 rounded-xl p-4 mb-6 hover:bg-orange-600/30 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-orange-500" />
              <div>
                <h3 className="text-white font-semibold">Event Hosting Requests</h3>
                <p className="text-gray-400 text-sm">View and accept new hosting requests being assigned to you</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-orange-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* My Event Director Assignments */}
        <div className="bg-slate-800 rounded-xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center">
              <ClipboardList className="h-7 w-7 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">My Event Director Assignments</h1>
              <p className="text-gray-400">Events you're confirmed to direct</p>
            </div>
          </div>

          <EventDirectorAssignments
            selectedSeasonId={selectedSeasonId}
            seasonStartDate={selectedSeason?.start_date}
            seasonEndDate={selectedSeason?.end_date}
          />
        </div>

        {/* Pending Events Section */}
        {pendingRequests.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Pending Events</h2>
                <p className="text-gray-400 text-sm">
                  Accepted requests awaiting event creation ({pendingRequests.length})
                </p>
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-4 bg-slate-700/50 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 inline mr-2 text-yellow-500" />
              These are your accepted requests that will be available in the events calendar soon. Plan accordingly for these upcoming events.
            </p>

            <div className="space-y-3">
              {pendingRequests.map((request) => {
                const source = getSourceLabel(request);
                return (
                  <Link
                    key={request.id}
                    to="/event-directors/hosting-requests"
                    className="block bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors border border-slate-600/50 hover:border-yellow-500/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-white truncate">{request.event_name}</span>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(request.event_start_date)}
                          </span>
                          {(request.city || request.state) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {[request.city, request.state].filter(Boolean).join(', ')}
                            </span>
                          )}
                          <span className={`flex items-center gap-1 ${source.color}`}>
                            <User className="h-3.5 w-3.5" />
                            {source.label}
                          </span>
                        </div>
                        {request.competition_formats && request.competition_formats.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {request.competition_formats.slice(0, 3).map((format, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-slate-600 text-gray-300 rounded text-xs"
                              >
                                {format}
                              </span>
                            ))}
                            {request.competition_formats.length > 3 && (
                              <span className="px-2 py-0.5 bg-slate-600 text-gray-400 rounded text-xs">
                                +{request.competition_formats.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state if no pending requests */}
        {pendingRequests.length === 0 && !loading && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Pending Events</h2>
                <p className="text-gray-400 text-sm">Accepted requests awaiting event creation</p>
              </div>
            </div>
            <div className="text-center py-6 text-gray-400">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No pending event requests for this season</p>
              <p className="text-sm text-gray-500 mt-1">
                Accepted hosting requests will appear here until they become official events.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
