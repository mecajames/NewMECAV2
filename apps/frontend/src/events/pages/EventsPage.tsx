import { useEffect, useState, useMemo } from 'react';
import { Calendar, MapPin, Users, DollarSign, Filter, TrendingUp, Search, Globe, Map, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { eventsApi, Event } from '@/events';
import { seasonsApi, Season } from '@/seasons';
import { countries, getStatesForCountry } from '@/utils/countries';
import { getStorageUrl } from '@/lib/storage';
import { EventsBanner } from '@/banners';
import { getAllActiveBanners } from '@/api-client/banners.api-client';
import { BannerPosition, type PublicBanner } from '@newmeca/shared';
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
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [eventsPerPage, setEventsPerPage] = useState(50);

  // Banner ads state - fetch once and distribute
  const [banners, setBanners] = useState<PublicBanner[]>([]);

  // Get states based on selected country
  const availableStates = useMemo(() => {
    if (selectedCountry === 'all') return [];
    return getStatesForCountry(selectedCountry);
  }, [selectedCountry]);

  // Reset state when country changes
  useEffect(() => {
    setSelectedState('all');
  }, [selectedCountry]);

  // Reset date range filter when main filter changes
  useEffect(() => {
    setDateRangeFilter('all');
  }, [filter]);

  useEffect(() => {
    fetchEvents();
  }, [filter, selectedSeason]);

  useEffect(() => {
    fetchSeasons();
  }, []);

  // Fetch all active banners once for distribution across the page
  useEffect(() => {
    getAllActiveBanners(BannerPosition.EVENTS_PAGE_TOP)
      .then(setBanners)
      .catch(console.error);
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

    // Filter by date range (sub-filter based on status)
    if (filter !== 'all' && dateRangeFilter !== 'all') {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today

      if (filter === 'upcoming') {
        // Upcoming events: filter by how far into the future
        if (dateRangeFilter === 'later') {
          // More than 180 days from now
          const cutoffDate = new Date(now);
          cutoffDate.setDate(cutoffDate.getDate() + 180);
          result = result.filter(e => new Date(e.event_date) > cutoffDate);
        } else {
          // Within X days from now
          const days = parseInt(dateRangeFilter);
          const cutoffDate = new Date(now);
          cutoffDate.setDate(cutoffDate.getDate() + days);
          result = result.filter(e => {
            const eventDate = new Date(e.event_date);
            return eventDate >= now && eventDate <= cutoffDate;
          });
        }
      } else if (filter === 'completed') {
        // Completed events: filter by how far in the past
        if (dateRangeFilter === 'longer') {
          // More than 180 days ago
          const cutoffDate = new Date(now);
          cutoffDate.setDate(cutoffDate.getDate() - 180);
          result = result.filter(e => new Date(e.event_date) < cutoffDate);
        } else {
          // Within X days ago
          const days = parseInt(dateRangeFilter);
          const cutoffDate = new Date(now);
          cutoffDate.setDate(cutoffDate.getDate() - days);
          result = result.filter(e => {
            const eventDate = new Date(e.event_date);
            return eventDate <= now && eventDate >= cutoffDate;
          });
        }
      }
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
      // Parse the selected date (YYYY-MM-DD format from input)
      const [filterYear, filterMonth, filterDay] = selectedDate.split('-').map(Number);
      result = result.filter(e => {
        // Parse the event date - handle both ISO strings and date objects
        const eventDate = new Date(e.event_date);
        // Use local date components to avoid timezone issues
        return (
          eventDate.getFullYear() === filterYear &&
          eventDate.getMonth() + 1 === filterMonth && // getMonth() is 0-indexed
          eventDate.getDate() === filterDay
        );
      });
    }

    return result;
  }, [events, filter, dateRangeFilter, selectedCountry, selectedState, selectedMultiplier, searchTerm, selectedDate]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, dateRangeFilter, selectedCountry, selectedState, selectedMultiplier, searchTerm, selectedDate, selectedSeason]);

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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">Competition Events</h1>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg">
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

            {/* Date Range Sub-filter - shown when Upcoming or Completed is selected */}
            {filter === 'upcoming' && (
              <div className="mt-3 pl-4 border-l-2 border-orange-500">
                <span className="text-gray-400 text-sm mr-3">Show events within:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { value: 'all', label: 'All Upcoming' },
                    { value: '30', label: '30 Days' },
                    { value: '90', label: '90 Days' },
                    { value: '120', label: '120 Days' },
                    { value: '180', label: '180 Days' },
                    { value: 'later', label: 'Later' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDateRangeFilter(option.value)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        dateRangeFilter === option.value
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filter === 'completed' && (
              <div className="mt-3 pl-4 border-l-2 border-orange-500">
                <span className="text-gray-400 text-sm mr-3">Show events from:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { value: 'all', label: 'All Completed' },
                    { value: '30', label: 'Past 30 Days' },
                    { value: '60', label: 'Past 60 Days' },
                    { value: '90', label: 'Past 90 Days' },
                    { value: '120', label: 'Past 120 Days' },
                    { value: '180', label: 'Past 180 Days' },
                    { value: 'longer', label: 'Older' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDateRangeFilter(option.value)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        dateRangeFilter === option.value
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results Count */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-gray-400">
              Showing <span className="text-white font-semibold">{filteredEvents.length}</span> event{filteredEvents.length !== 1 ? 's' : ''}
              {(filter !== 'all' || dateRangeFilter !== 'all' || selectedCountry !== 'all' || selectedState !== 'all' || selectedMultiplier !== 'all' || searchTerm || selectedDate) && (
                <button
                  onClick={() => {
                    setFilter('all');
                    setDateRangeFilter('all');
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
        {banners.length > 0 && <EventsBanner banner={banners[0]} />}

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
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src={getStorageUrl(event.flyer_url)}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: event.flyer_image_position
                          ? `${event.flyer_image_position.x}% ${event.flyer_image_position.y}%`
                          : '50% 50%'
                      }}
                      onError={(e) => {
                        // Hide the broken image and show fallback
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    {/* Fallback shown when image fails to load */}
                    <div
                      className="absolute inset-0 bg-slate-700 items-center justify-center"
                      style={{ display: 'none' }}
                    >
                      <img src="/meca-logo-transparent.png" alt="MECA Logo" className="h-32 w-auto opacity-50" />
                    </div>
                  </div>
                ) : (
                  <div className="h-48 bg-slate-700 flex items-center justify-center">
                    <img src="/meca-logo-transparent.png" alt="MECA Logo" className="h-32 w-auto opacity-50" />
                  </div>
                )}

                <div className="p-6">
                  {/* Title row with Day, Multiplier, and Status badges on the right */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-white">
                      {event.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      {event.day_number && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-blue-500/10 text-blue-400 border-blue-500">
                          Day {event.day_number}
                        </span>
                      )}
                      {event.points_multiplier !== undefined && event.points_multiplier !== null && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-orange-500/10 text-orange-400 border-orange-500">
                          {event.points_multiplier}X Points Event
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                          event.status
                        )}`}
                      >
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </div>
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

                    <div className="flex items-start gap-2 text-gray-300">
                      <MapPin className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div>{event.venue_name}</div>
                        {(event.venue_address || event.venue_city || event.venue_state) && (
                          <div className="text-sm text-gray-400">
                            {event.venue_address && <span>{event.venue_address}</span>}
                            {event.venue_address && (event.venue_city || event.venue_state) && <span>, </span>}
                            {event.venue_city && <span>{event.venue_city}</span>}
                            {event.venue_city && event.venue_state && <span>, </span>}
                            {event.venue_state && <span>{event.venue_state}</span>}
                          </div>
                        )}
                      </div>
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
                  {chunkIndex < Math.ceil(paginatedEvents.length / 4) - 1 && banners.length > 0 && (
                    <div className="mt-6">
                      <EventsBanner banner={banners[(chunkIndex + 1) % banners.length]} />
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
