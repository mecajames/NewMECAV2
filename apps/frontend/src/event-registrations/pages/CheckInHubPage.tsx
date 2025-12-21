import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { QrCode, Calendar, MapPin, Users, ArrowLeft, Loader2, Search, Filter } from 'lucide-react';
import { useAuth } from '@/auth';
import { eventsApi, Event } from '@/events/events.api-client';
import { seasonsApi, Season } from '@/seasons';

export default function CheckInHubPage() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Season filter and search
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user has permission (admin or event_director only)
  const hasPermission = profile?.role === 'admin' || profile?.role === 'event_director';

  useEffect(() => {
    if (!authLoading && hasPermission) {
      fetchData();
    }
  }, [authLoading, hasPermission]);

  const fetchData = async () => {
    try {
      const [eventsData, seasonsData] = await Promise.all([
        eventsApi.getAll(),
        seasonsApi.getAll(),
      ]);

      // Filter to only upcoming and ongoing events
      const activeEvents = eventsData.filter(
        (e) => e.status === 'upcoming' || e.status === 'ongoing'
      );
      setEvents(activeEvents);
      setSeasons(seasonsData);

      // Set current season as default
      const currentSeason = seasonsData.find(s => s.is_current || s.isCurrent);
      if (currentSeason) {
        setSelectedSeason(currentSeason.id);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter events based on season and search term
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Season filter
      const matchesSeason = selectedSeason === 'all' || event.season_id === selectedSeason;

      // Search filter
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = !searchLower ||
        event.title.toLowerCase().includes(searchLower) ||
        event.venue_name?.toLowerCase().includes(searchLower) ||
        event.venue_city?.toLowerCase().includes(searchLower);

      return matchesSeason && matchesSearch;
    });
  }, [events, selectedSeason, searchTerm]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading events...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <QrCode className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">Only Admins and Event Directors can access check-in.</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center text-orange-500 hover:text-orange-400 mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link
            to="/dashboard/admin"
            className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">QR Check-In</h1>
          <p className="text-gray-400">Select an event to start checking in competitors</p>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Field */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events by name, venue, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Season Filter */}
            <div className="sm:w-64">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Seasons</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name} ({season.year})
                      {(season.is_current || season.isCurrent) ? ' - Current' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-400">
            Showing {filteredEvents.length} of {events.length} active events
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Events Found</h3>
            <p className="text-gray-400">
              {searchTerm || selectedSeason !== 'all'
                ? 'No events match your search criteria. Try adjusting your filters.'
                : 'There are no upcoming or ongoing events to check in.'}
            </p>
            {(searchTerm || selectedSeason !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSeason('all');
                }}
                className="mt-4 text-orange-500 hover:text-orange-400 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="bg-slate-800 rounded-xl p-6 hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{event.title}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.status === 'ongoing'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(event.event_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {event.venue_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {event.venue_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/events/${event.id}/check-in`)}
                    className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <QrCode className="h-5 w-5" />
                    Start Check-In
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
