import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Filter, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { seasonsApi } from '@/seasons';
import { getJudgeAssignments, EventJudgeAssignment, EventAssignmentStatus } from '@/judges/judges.api-client';
import { getEDAssignmentsForDirector, EventDirectorAssignment } from '@/event-directors/event-directors.api-client';
import { US_STATES } from '@/utils/countries';

interface Season {
  id: string;
  name: string;
  year: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

type PersonType = 'judge' | 'event_director';

interface EventHistorySectionProps {
  personId: string;
  personType: PersonType;
}

const MONTHS = [
  { value: '', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  requested: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
  accepted: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: CheckCircle },
  confirmed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
  completed: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: CheckCircle },
  declined: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
  no_show: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: AlertCircle },
};

export default function EventHistorySection({ personId, personType }: EventHistorySectionProps) {
  const [assignments, setAssignments] = useState<(EventJudgeAssignment | EventDirectorAssignment)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');

  // Load seasons
  useEffect(() => {
    async function loadSeasons() {
      try {
        const data = await seasonsApi.getAll();
        setSeasons(data as Season[]);

        // Auto-select current season
        const currentSeason = (data as Season[]).find(s => s.is_current);
        if (currentSeason) {
          setSelectedSeasonId(currentSeason.id);
        }
      } catch (err) {
        console.error('Failed to load seasons:', err);
      }
    }
    loadSeasons();
  }, []);

  // Load assignments
  useEffect(() => {
    async function loadAssignments() {
      if (!personId) return;

      setLoading(true);
      setError(null);
      try {
        let data: (EventJudgeAssignment | EventDirectorAssignment)[];

        if (personType === 'judge') {
          data = await getJudgeAssignments(personId, {});
        } else {
          data = await getEDAssignmentsForDirector(personId, {});
        }

        setAssignments(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load event history');
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, [personId, personType]);

  // Get selected season details
  const selectedSeason = useMemo(() => {
    return seasons.find(s => s.id === selectedSeasonId);
  }, [seasons, selectedSeasonId]);

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => {
      const event = assignment.event;
      if (!event) return false;

      // Get event date
      const eventDateStr = 'event_date' in event ? event.event_date : (event as any).eventDate;
      if (!eventDateStr) return false;

      const eventDate = new Date(eventDateStr);

      // Filter by season (date range)
      if (selectedSeason) {
        const seasonStart = new Date(selectedSeason.start_date);
        const seasonEnd = new Date(selectedSeason.end_date);
        if (eventDate < seasonStart || eventDate > seasonEnd) {
          return false;
        }
      }

      // Filter by month
      if (selectedMonth) {
        const eventMonth = eventDate.getMonth() + 1; // getMonth() is 0-indexed
        if (eventMonth !== parseInt(selectedMonth)) {
          return false;
        }
      }

      // Filter by state
      if (selectedState) {
        const eventState = 'venue_state' in event ? event.venue_state : (event as any).state;
        if (eventState !== selectedState) {
          return false;
        }
      }

      return true;
    });
  }, [assignments, selectedSeason, selectedMonth, selectedState]);

  // Sort by date (most recent first)
  const sortedAssignments = useMemo(() => {
    return [...filteredAssignments].sort((a, b) => {
      const dateA = a.event ? ('event_date' in a.event ? a.event.event_date : (a.event as any).eventDate) : '';
      const dateB = b.event ? ('event_date' in b.event ? b.event.event_date : (b.event as any).eventDate) : '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [filteredAssignments]);

  // Stats
  const stats = useMemo(() => {
    const completed = filteredAssignments.filter(a =>
      a.status === EventAssignmentStatus.COMPLETED ||
      a.status === EventAssignmentStatus.CONFIRMED
    ).length;
    const total = filteredAssignments.length;

    return { completed, total };
  }, [filteredAssignments]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const getEventTitle = (event: any) => {
    return event?.title || event?.eventName || 'Unknown Event';
  };

  const getEventDate = (event: any) => {
    return event?.event_date || event?.eventDate;
  };

  const getEventLocation = (event: any) => {
    const city = event?.venue_city || event?.city;
    const state = event?.venue_state || event?.state;
    return [city, state].filter(Boolean).join(', ');
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-orange-500" />
          Event History
        </h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-r-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-orange-500" />
          Event History
          <span className="text-sm font-normal text-slate-400">
            ({stats.completed} completed of {stats.total} events)
          </span>
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-700/50 rounded-lg">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        {/* Season Filter */}
        <select
          value={selectedSeasonId}
          onChange={(e) => setSelectedSeasonId(e.target.value)}
          className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Seasons</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}{season.is_current ? ' (Current)' : ''}
            </option>
          ))}
        </select>

        {/* Month Filter */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {MONTHS.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>

        {/* State Filter */}
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All States</option>
          {US_STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Events List */}
      {sortedAssignments.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No events found for the selected filters</p>
          <p className="text-slate-500 text-sm mt-1">
            Try adjusting your filter criteria
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAssignments.map((assignment) => {
            const event = assignment.event;
            if (!event) return null;

            const status = assignment.status.toLowerCase();
            const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.requested;
            const StatusIcon = statusStyle.icon;

            return (
              <div
                key={assignment.id}
                className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-white truncate">
                        {getEventTitle(event)}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statusStyle.bg} ${statusStyle.text} border-current/30`}>
                        <StatusIcon className="h-3 w-3" />
                        {assignment.status.replace('_', ' ')}
                      </span>
                      {'role' in assignment && assignment.role && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-600 text-slate-300">
                          {(assignment as EventJudgeAssignment).role.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {getEventDate(event) ? formatDate(getEventDate(event)) : 'TBD'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {getEventLocation(event) || 'Location TBD'}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/events/${event.id}`}
                    className="flex items-center gap-1 text-orange-500 hover:text-orange-400 text-sm ml-4"
                  >
                    View Event
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
