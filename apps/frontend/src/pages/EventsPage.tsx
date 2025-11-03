import { useEffect, useState } from 'react';
import { Calendar, MapPin, Users, DollarSign, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { eventsApi, Event } from '../api-client/events.api-client';
import { seasonsApi, Season } from '../api-client/seasons.api-client';

type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventStatus | 'all'>('all');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('all');

  useEffect(() => {
    fetchEvents();
  }, [filter, selectedSeason]);

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const data = await seasonsApi.getAll();
      setSeasons(data);
      
      // Set current season as default
      const currentSeason = data.find(s => s.is_current || s.isCurrent);
      if (currentSeason) {
        setSelectedSeason(currentSeason.id);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = selectedSeason === 'all'
        ? await eventsApi.getAll(1, 1000)
        : await eventsApi.getAllBySeason(selectedSeason, 1, 1000);

      // Filter out not_public events (public page should never show them)
      const publicEvents = data.filter(e => e.status !== 'not_public');

      // Filter by status if needed
      const filtered = filter !== 'all'
        ? publicEvents.filter(e => e.status === filter)
        : publicEvents;

      // Sort by event_date ascending
      filtered.sort((a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );

      setEvents(filtered);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500/10 text-blue-400 border-blue-500';
      case 'ongoing':
        return 'bg-green-500/10 text-green-400 border-green-500';
      case 'completed':
        return 'bg-gray-500/10 text-gray-400 border-gray-500';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400 border-red-500';
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'SPL':
        return 'bg-purple-500/10 text-purple-400 border-purple-500';
      case 'SQL':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500';
      case 'Show and Shine':
        return 'bg-pink-500/10 text-pink-400 border-pink-500';
      case 'Ride the Light':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Competition Events</h1>
          <p className="text-gray-400 text-lg">
            Browse upcoming and past car audio competition events
          </p>
        </div>

                {/* Season Filter */}
        <div className="mb-6">
          <label className="block text-gray-300 font-medium mb-2">Filter by Season:</label>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Seasons</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name} ({season.year})
                {(season.is_current || season.isCurrent) && ' - Current'}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-8 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-gray-300">
            <Filter className="h-5 w-5" />
            <span className="font-medium">Filter by status:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All Events' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'ongoing', label: 'Ongoing' },
              { value: 'completed', label: 'Completed' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as EventStatus | 'all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === option.value
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-slate-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                {event.flyer_url ? (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={event.flyer_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-r from-orange-600 to-red-600 flex items-center justify-center">
                    <Calendar className="h-20 w-20 text-white opacity-50" />
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-2xl font-bold text-white flex-1">
                      {event.title}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                        event.status
                      )}`}
                    >
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                  </div>

                  {/* Season and Format Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {event.season && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-teal-500/10 text-teal-400 border-teal-500">
                        {event.season.year} Season
                      </span>
                    )}
                    {event.format && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getFormatColor(
                          event.format
                        )}`}
                      >
                        {event.format}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Calendar className="h-5 w-5 text-orange-500 flex-shrink-0" />
                      <span>
                        {new Date(event.event_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="h-5 w-5 text-orange-500 flex-shrink-0" />
                      <span>{event.venue_name}</span>
                    </div>

                    {event.registration_fee > 0 && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <DollarSign className="h-5 w-5 text-orange-500 flex-shrink-0" />
                        <span>Registration Fee: ${event.registration_fee}</span>
                      </div>
                    )}

                    {event.max_participants && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Users className="h-5 w-5 text-orange-500 flex-shrink-0" />
                        <span>Max Participants: {event.max_participants}</span>
                      </div>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-gray-400 mb-4 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <button className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors">
                    View Event Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-800 rounded-xl">
            <Calendar className="h-20 w-20 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">No events found matching your filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
