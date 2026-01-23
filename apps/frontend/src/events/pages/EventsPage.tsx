import { useEffect, useState, useMemo } from 'react';
import { Calendar, MapPin, Users, DollarSign, Filter, TrendingUp, Search, Globe, Map, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { eventsApi, Event } from '@/events';
import { seasonsApi, Season } from '@/seasons';
import { countries, getStatesForCountry } from '@/utils/countries';
import { getStorageUrl } from '@/lib/storage';
import { EventsBanner } from '@/banners';
import { SEOHead, useEventsListSEO } from '@/shared/seo';
import { Pagination } from '@/shared/components';

type EventStatus = 'upcoming' | 'completed';

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventStatus | 'all'>('all');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedMultiplier, setSelectedMultiplier] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [eventsPerPage, setEventsPerPage] = useState(50);

  // Get states based on selected country
  const availableStates = useMemo(() => {
    if (selectedCountry === 'all') return [];
    return getStatesForCountry(selectedCountry);
  }, [selectedCountry]);

  // Reset state when country changes
  useEffect(() => {
    setSelectedState('all');
  }, [selectedCountry]);

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

      // Sort by event_date descending (newest first)
      publicEvents.sort((a, b) =>
        new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
      );

      setEvents(publicEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
    setLoading(false);
  };

  // Apply all filters to events
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Filter by status
    if (filter !== 'all') {
      result = result.filter(e => e.status === filter);
    }

    // Filter by country
    if (selectedCountry !== 'all') {
      result = result.filter(e => e.venue_country === selectedCountry);
    }

    // Filter by state
    if (selectedState !== 'all') {
      result = result.filter(e => e.venue_state === selectedState);
    }

    // Filter by multiplier
    if (selectedMultiplier !== 'all') {
      const multiplierValue = parseInt(selectedMultiplier);
      result = result.filter(e => e.points_multiplier === multiplierValue);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = result.filter(e =>
        e.title.toLowerCase().includes(search) ||
        e.venue_name.toLowerCase().includes(search) ||
        e.venue_address.toLowerCase().includes(search) ||
        (e.venue_city && e.venue_city.toLowerCase().includes(search)) ||
        (e.description && e.description.toLowerCase().includes(search))
      );
    }

    // Filter by specific date
    if (selectedDate) {
      const filterDate = new Date(selectedDate);
      result = result.filter(e => {
        const eventDate = new Date(e.event_date);
        return (
          eventDate.getFullYear() === filterDate.getFullYear() &&
          eventDate.getMonth() === filterDate.getMonth() &&
          eventDate.getDate() === filterDate.getDate()
        );
      });
    }

    return result;
  }, [events, filter, selectedCountry, selectedState, selectedMultiplier, searchTerm, selectedDate]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, selectedCountry, selectedState, selectedMultiplier, searchTerm, selectedDate, selectedSeason]);

  // Paginated events
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * eventsPerPage;
    return filteredEvents.slice(startIndex, startIndex + eventsPerPage);
  }, [filteredEvents, currentPage, eventsPerPage]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500/10 text-blue-400 border-blue-500';
      case 'ongoing':
        return 'bg-green-500/10 text-green-400 border-green-500';
      case 'completed':
        return 'bg-gray-500/10 text-gray-400 border-gray-500';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400 border-red-500';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500';
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

  // SEO
  const seoData = useEventsListSEO();

  return (
    <>
      <SEOHead {...seoData} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Competition Events</h1>
          <p className="text-gray-400 text-lg">
            Browse upcoming and past car audio competition events
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-slate-800 rounded-xl mb-8 overflow-hidden">
          {/* Accordion Header */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full px-6 py-4 flex items-center justify-between bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-orange-500" />
              <span className="text-lg font-semibold text-white">Search and Filter Events</span>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                filtersOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Collapsible Content */}
          <div
            className={`transition-all duration-300 ease-in-out ${
              filtersOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
            }`}
          >
            <div className="p-6">
          {/* Search Field and Date Filter */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-3">
              <label className="block text-gray-300 font-medium mb-2">
                <Search className="h-4 w-4 inline mr-2" />
                Search Events
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by event name, venue, city, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 font-medium mb-2">
                <Calendar className="h-4 w-4 inline mr-2" />
                Specific Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 [color-scheme:dark]"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    title="Clear date"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* First Row: Season, Country, State */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Season Filter */}
            <div>
              <label className="block text-gray-300 font-medium mb-2">
                <Calendar className="h-4 w-4 inline mr-2" />
                Season
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
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

            {/* Country Filter */}
            <div>
              <label className="block text-gray-300 font-medium mb-2">
                <Globe className="h-4 w-4 inline mr-2" />
                Country
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Countries</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* State Filter */}
            <div>
              <label className="block text-gray-300 font-medium mb-2">
                <Map className="h-4 w-4 inline mr-2" />
                State/Province
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                disabled={selectedCountry === 'all'}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="all">All States</option>
                {availableStates.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Second Row: Multiplier Filter */}
          <div className="mb-6">
            <label className="block text-gray-300 font-medium mb-2">
              <TrendingUp className="h-4 w-4 inline mr-2" />
              Points Multiplier
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Multipliers' },
                { value: '1', label: '1X Points' },
                { value: '2', label: '2X Points' },
                { value: '3', label: '3X Points' },
                { value: '4', label: '4X Points' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedMultiplier(option.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMultiplier === option.value
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Third Row: Status Filter */}
          <div>
            <div className="flex items-center gap-2 text-gray-300 mb-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Event Status</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Events' },
                { value: 'upcoming', label: 'Upcoming' },
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

          {/* Results Count */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-gray-400">
              Showing <span className="text-white font-semibold">{filteredEvents.length}</span> event{filteredEvents.length !== 1 ? 's' : ''}
              {(filter !== 'all' || selectedCountry !== 'all' || selectedState !== 'all' || selectedMultiplier !== 'all' || searchTerm || selectedDate) && (
                <button
                  onClick={() => {
                    setFilter('all');
                    setSelectedCountry('all');
                    setSelectedState('all');
                    setSelectedMultiplier('all');
                    setSearchTerm('');
                    setSelectedDate('');
                  }}
                  className="ml-4 text-orange-500 hover:text-orange-400 underline"
                >
                  Clear all filters
                </button>
              )}
            </p>
          </div>
            </div>
          </div>
        </div>

        {/* Banner Ad - Below filters, above events */}
        <EventsBanner />

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : paginatedEvents.length > 0 ? (
          <div className="space-y-6">
            {/* Render events in chunks of 4 (2 rows) with banners between */}
            {Array.from({ length: Math.ceil(paginatedEvents.length / 4) }).map((_, chunkIndex) => {
              const startIdx = chunkIndex * 4;
              const chunkEvents = paginatedEvents.slice(startIdx, startIdx + 4);

              return (
                <div key={`chunk-${chunkIndex}`}>
                  {/* Event grid for this chunk */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {chunkEvents.map((event) => (
              <div
                key={event.id}
                className="bg-slate-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-1"
              >
                {event.flyer_url ? (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={getStorageUrl(event.flyer_url)}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: event.flyer_image_position
                          ? `${event.flyer_image_position.x}% ${event.flyer_image_position.y}%`
                          : '50% 50%'
                      }}
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

                  {/* Season, Multiplier, and Day Badges - First Line */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {event.day_number && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-blue-500/10 text-blue-400 border-blue-500">
                        Day {event.day_number}
                      </span>
                    )}
                    {event.season && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-teal-500/10 text-teal-400 border-teal-500">
                        {event.season.year} Season
                      </span>
                    )}
                    {event.points_multiplier !== undefined && event.points_multiplier !== null && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-orange-500/10 text-orange-400 border-orange-500">
                        {event.points_multiplier}X Points Event
                      </span>
                    )}
                  </div>

                  {/* Format Badges - Second Line */}
                  {(event.formats && event.formats.length > 0) || event.format ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {event.formats && event.formats.length > 0 ? (
                        event.formats.map((format) => (
                          <span
                            key={format}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getFormatColor(
                              format
                            )}`}
                          >
                            {format}
                          </span>
                        ))
                      ) : event.format ? (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getFormatColor(
                            event.format
                          )}`}
                        >
                          {event.format}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

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

                  {/* Buttons - Two buttons for completed events, one for others */}
                  {event.status === 'completed' ? (
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/events/${event.id}`);
                        }}
                        className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Calendar className="h-5 w-5" />
                        View Event Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/results?eventId=${event.id}`);
                        }}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <TrendingUp className="h-5 w-5" />
                        View Event Results
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/events/${event.id}`);
                      }}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      View Event Details
                    </button>
                  )}
                </div>
              </div>
                    ))}
                  </div>

                  {/* Show banner after every 2 rows, but not after the last chunk */}
                  {chunkIndex < Math.ceil(paginatedEvents.length / 4) - 1 && (
                    <div className="mt-6">
                      <EventsBanner />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination */}
            <div className="mt-6 rounded-xl overflow-hidden">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={eventsPerPage}
                totalItems={filteredEvents.length}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setEventsPerPage}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-800 rounded-xl">
            <Calendar className="h-20 w-20 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">No events found matching your filter.</p>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
