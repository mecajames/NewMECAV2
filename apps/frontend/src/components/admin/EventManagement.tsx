import { useEffect, useState } from 'react';
import { Calendar, Plus, CreditCard as Edit, Trash2, X, MapPin, DollarSign, Users, Search, Filter, TrendingUp } from 'lucide-react';
import { eventsApi, Event } from '../../api-client/events.api-client';
import { profilesApi, Profile } from '../../api-client/profiles.api-client';
import { seasonsApi, Season } from '../../api-client/seasons.api-client';
import { competitionResultsApi } from '../../api-client/competition-results.api-client';
import { countries, getStatesForCountry, getStateLabel, getPostalCodeLabel } from '../../utils/countries';
import { useNavigate } from 'react-router-dom';


interface EventManagementProps {
  onViewResults?: (eventId: string) => void;
}

export default function EventManagement({ onViewResults }: EventManagementProps = {}) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [eventDirectors, setEventDirectors] = useState<Profile[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<string>('all');
  const [eventResults, setEventResults] = useState<{[key: string]: number}>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    registration_deadline: '',
    venue_name: '',
    venue_address: '',
    venue_city: '',
    venue_state: '',
    venue_postal_code: '',
    venue_country: 'US',
    latitude: '',
    longitude: '',
    flyer_url: '',
    event_director_id: '',
    season_id: '',
    status: 'upcoming',
    max_participants: '',
    registration_fee: '0',
    formats: [] as string[],
    points_multiplier: '1',
    event_type: 'standard',
    number_of_days: '1',
    day2_date: '',
    day3_date: '',
  });

  useEffect(() => {
    fetchEvents();
    fetchEventDirectors();
    fetchSeasons();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, statusFilter, seasonFilter, countryFilter, stateFilter, quickFilter]);

  useEffect(() => {
    if (events.length > 0) {
      fetchResultCounts();
    }
  }, [events]);

  const fetchEvents = async () => {
    try {
      const data = await eventsApi.getAll(1, 1000);
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
    setLoading(false);
  };

  const fetchSeasons = async () => {
    try {
      const data = await seasonsApi.getAll();
      setSeasons(data);
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const fetchResultCounts = async () => {
    const counts: {[key: string]: number} = {};
    for (const event of events) {
      try {
        const results = await competitionResultsApi.getByEvent(event.id);
        counts[event.id] = results.length;
      } catch (error) {
        counts[event.id] = 0;
      }
    }
    setEventResults(counts);
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.venue_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event as any).venue_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event as any).venue_state?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }

    // Filter by season
    if (seasonFilter !== 'all') {
      filtered = filtered.filter(event => event.season_id === seasonFilter);
    }

    // Filter by country
    if (countryFilter !== 'all') {
      filtered = filtered.filter(event => (event as any).venue_country === countryFilter);
    }

    // Filter by state
    if (stateFilter !== 'all') {
      filtered = filtered.filter(event => (event as any).venue_state === stateFilter);
    }

    // Apply quick filters
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (quickFilter === 'recent-upcoming') {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.event_date);
        return eventDate >= thirtyDaysAgo && event.status !== 'completed';
      });
    }

    // Sort by event date descending (most recent first)
    filtered.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

    setFilteredEvents(filtered);
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

  const fetchEventDirectors = async () => {
    try {
      const data = await profilesApi.getAll(1, 1000);
      const directors = data.filter(p => p.role === 'event_director' || p.role === 'admin');
      setEventDirectors(directors);
    } catch (error) {
      console.error('Error fetching event directors:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert datetime-local string to ISO 8601 format
    const convertToISO = (datetimeLocal: string) => {
      if (!datetimeLocal) return null;
      // datetime-local format: "2025-11-02T15:30"
      // We need to convert it to ISO: "2025-11-02T15:30:00.000Z"
      const date = new Date(datetimeLocal);
      return date.toISOString();
    };

    const eventData: any = {
      title: formData.title,
      description: formData.description || null,
      event_date: convertToISO(formData.event_date),
      registration_deadline: formData.registration_deadline ? convertToISO(formData.registration_deadline) : null,
      venue_name: formData.venue_name,
      venue_address: formData.venue_address,
      venue_city: formData.venue_city || null,
      venue_state: formData.venue_state || null,
      venue_postal_code: formData.venue_postal_code || null,
      venue_country: formData.venue_country || 'US',
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      flyer_url: formData.flyer_url || null,
      event_director_id: formData.event_director_id || null,
      season_id: formData.season_id || null,
      status: formData.status,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
      registration_fee: parseFloat(formData.registration_fee),
      formats: formData.formats.length > 0 ? formData.formats : null,
      points_multiplier: parseInt(formData.points_multiplier),
      event_type: formData.event_type,
    };

    console.log('📤 FRONTEND - Form data event_date:', formData.event_date);
    console.log('📤 FRONTEND - Converted event_date:', eventData.event_date);
    console.log('📤 FRONTEND - Full event data:', eventData);

    try {
      if (editingEvent) {
        console.log('📤 FRONTEND - Updating event ID:', editingEvent.id);
        await eventsApi.update(editingEvent.id, eventData);
      } else {
        const numberOfDays = parseInt(formData.number_of_days);

        if (numberOfDays > 1) {
          // Multi-day event: collect all dates and call createMultiDay
          const dayDates: string[] = [convertToISO(formData.event_date)!];
          if (numberOfDays >= 2 && formData.day2_date) {
            dayDates.push(convertToISO(formData.day2_date)!);
          }
          if (numberOfDays >= 3 && formData.day3_date) {
            dayDates.push(convertToISO(formData.day3_date)!);
          }

          console.log('📤 FRONTEND - Creating multi-day event:', numberOfDays, 'days');
          await eventsApi.createMultiDay(eventData, numberOfDays, dayDates);
        } else {
          console.log('📤 FRONTEND - Creating new event');
          await eventsApi.create(eventData);
        }
      }

      setShowModal(false);
      setEditingEvent(null);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Error saving event. Please try again.');
    }
  };

  const handleEdit = (event: Event) => {
    // Convert UTC ISO string to local datetime-local format
    const convertToLocalDatetime = (isoString: string) => {
      const date = new Date(isoString);
      // Get local date/time components
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: convertToLocalDatetime(event.event_date),
      registration_deadline: event.registration_deadline ? convertToLocalDatetime(event.registration_deadline) : '',
      venue_name: event.venue_name,
      venue_address: event.venue_address,
      venue_city: (event as any).venue_city || '',
      venue_state: (event as any).venue_state || '',
      venue_postal_code: (event as any).venue_postal_code || '',
      venue_country: (event as any).venue_country || 'US',
      latitude: event.latitude?.toString() || '',
      longitude: event.longitude?.toString() || '',
      flyer_url: event.flyer_url || '',
      event_director_id: event.event_director_id || '',
      season_id: event.season_id || '',
      status: event.status,
      max_participants: event.max_participants?.toString() || '',
      registration_fee: event.registration_fee.toString(),
      formats: event.formats || [],
      points_multiplier: (event as any).points_multiplier?.toString() || '1',
      event_type: (event as any).event_type || 'standard',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsApi.delete(id);
        fetchEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_date: '',
      registration_deadline: '',
      venue_name: '',
      venue_address: '',
      venue_city: '',
      venue_state: '',
      venue_postal_code: '',
      venue_country: 'US',
      latitude: '',
      longitude: '',
      flyer_url: '',
      event_director_id: '',
      season_id: '',
      status: 'upcoming',
      max_participants: '',
      registration_fee: '0',
      points_multiplier: '1',
      event_type: 'standard',
      formats: [],
      number_of_days: '1',
      day2_date: '',
      day3_date: '',
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Event Management</h2>
        <button
          onClick={() => {
            setEditingEvent(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Event
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-slate-700 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Season Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Season</label>
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Seasons</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.year}
                </option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Country</label>
            <select
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setStateFilter('all'); // Reset state when country changes
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
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
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {getStateLabel(countryFilter !== 'all' ? countryFilter : 'US')}
            </label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All States</option>
              {getStatesForCountry(countryFilter !== 'all' ? countryFilter : 'US').map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Filter Text</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Searches for city, site, name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setQuickFilter('all')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              quickFilter === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setQuickFilter('recent-upcoming')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              quickFilter === 'recent-upcoming'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
            }`}
          >
            Recent & Upcoming
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-400">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="overflow-x-auto bg-slate-700 rounded-lg">
          <table className="w-full">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">State</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Event Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Events Offered</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Results</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event, index) => (
                <tr
                  key={event.id}
                  className={`border-b border-slate-600 ${index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-700'} hover:bg-slate-600 transition-colors`}
                >
                  {/* Dates */}
                  <td className="px-4 py-3 text-sm text-white align-top">
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>

                  {/* State */}
                  <td className="px-4 py-3 text-sm text-white align-top">
                    {(event as any).venue_state || '-'}
                  </td>

                  {/* Event Name */}
                  <td className="px-4 py-3 align-top">
                    <div className="text-sm">
                      <div className="text-blue-400 font-medium">
                        {event.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        hosted at {event.venue_name}
                      </div>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-4 py-3 text-sm text-white align-top">
                    {(event as any).venue_city && `${(event as any).venue_city}, `}
                    {(event as any).venue_state || ''}
                  </td>

                  {/* Events Offered (Formats) */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-1">
                      {(event as any).day_number && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500">
                          Day {(event as any).day_number}
                        </span>
                      )}
                      {event.formats && event.formats.length > 0 ? (
                        event.formats.map((format) => (
                          <span
                            key={format}
                            className={`px-2 py-1 rounded text-xs font-semibold ${getFormatColor(format)}`}
                          >
                            {format}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                      {event.points_multiplier !== undefined && event.points_multiplier !== null && (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500">
                          {event.points_multiplier}X
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Results */}
                  <td className="px-4 py-3 align-top">
                    {eventResults[event.id] > 0 ? (
                      <button
                        onClick={() => onViewResults?.(event.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-semibold transition-colors"
                      >
                        <TrendingUp className="h-3 w-3" />
                        Results
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500">No results</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(event)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors"
                        title="Edit Event"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs transition-colors"
                        title="Delete Event"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-700 rounded-lg">
          <Calendar className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No events found matching your filters.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
              <h2 className="text-2xl font-bold text-white">
                {editingEvent ? 'Edit Event' : 'Create Event'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingEvent(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                  />
                </div>

                {/* Number of Days - only show when creating new event */}
                {!editingEvent && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Number of Days
                    </label>
                    <select
                      value={formData.number_of_days}
                      onChange={(e) => setFormData({ ...formData, number_of_days: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="1">1 Day (Standard Event)</option>
                      <option value="2">2 Days (Multi-Day Event)</option>
                      <option value="3">3 Days (Multi-Day Event)</option>
                    </select>
                    {parseInt(formData.number_of_days) > 1 && (
                      <p className="text-xs text-orange-400 mt-1">
                        A separate event entry will be created for each day in the calendar.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {parseInt(formData.number_of_days) > 1 ? 'Day 1 Date & Time *' : 'Event Date & Time *'}
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                {/* Day 2 Date - only show if 2+ days selected */}
                {parseInt(formData.number_of_days) >= 2 && !editingEvent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Day 2 Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.day2_date}
                      onChange={(e) => setFormData({ ...formData, day2_date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                )}

                {/* Day 3 Date - only show if 3 days selected */}
                {parseInt(formData.number_of_days) >= 3 && !editingEvent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Day 3 Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.day3_date}
                      onChange={(e) => setFormData({ ...formData, day3_date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Registration Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.registration_deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, registration_deadline: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    value={formData.venue_name}
                    onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Venue Address *
                  </label>
                  <input
                    type="text"
                    value={formData.venue_address}
                    onChange={(e) =>
                      setFormData({ ...formData, venue_address: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.venue_city}
                    onChange={(e) => setFormData({ ...formData, venue_city: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {getStateLabel(formData.venue_country)}
                  </label>
                  {getStatesForCountry(formData.venue_country).length > 0 ? (
                    <select
                      value={formData.venue_state}
                      onChange={(e) => setFormData({ ...formData, venue_state: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select {getStateLabel(formData.venue_country)}</option>
                      {getStatesForCountry(formData.venue_country).map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.venue_state}
                      onChange={(e) => setFormData({ ...formData, venue_state: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder={getStateLabel(formData.venue_country)}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {getPostalCodeLabel(formData.venue_country)}
                  </label>
                  <input
                    type="text"
                    value={formData.venue_postal_code}
                    onChange={(e) => setFormData({ ...formData, venue_postal_code: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country *
                  </label>
                  <select
                    value={formData.venue_country}
                    onChange={(e) => setFormData({ ...formData, venue_country: e.target.value, venue_state: '' })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g., 33.2208391333072"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="e.g., -87.1675749917274"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Flyer URL
                  </label>
                  <input
                    type="url"
                    value={formData.flyer_url}
                    onChange={(e) => setFormData({ ...formData, flyer_url: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Director
                  </label>
                  <select
                    value={formData.event_director_id}
                    onChange={(e) =>
                      setFormData({ ...formData, event_director_id: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select Director</option>
                    {eventDirectors.map((director) => (
                      <option key={director.id} value={director.id}>
                        {`${director.first_name || ''} ${director.last_name || ''}`.trim()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Season
                  </label>
                  <select
                    value={formData.season_id}
                    onChange={(e) => setFormData({ ...formData, season_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select Season</option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name || season.year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="not_public">Not Public</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Competition Formats Available *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['SPL', 'SQL', 'SSI', 'MK', 'Show and Shine', 'Ride the Light', 'Dueling Demo'].map((format) => (
                      <label
                        key={format}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.formats.includes(format)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, formats: [...formData.formats, format] });
                            } else {
                              setFormData({
                                ...formData,
                                formats: formData.formats.filter((f) => f !== format),
                              });
                            }
                          }}
                          className="w-4 h-4 text-orange-600 bg-slate-600 border-slate-500 rounded focus:ring-orange-500 focus:ring-2"
                        />
                        <span className="text-white text-sm">{format}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Points Multiplier *
                  </label>
                  <select
                    required
                    value={formData.points_multiplier}
                    onChange={(e) => setFormData({ ...formData, points_multiplier: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="0">0X - Non-competitive (exhibitions, judging events)</option>
                    <option value="1">1X - Local events (single-day local shows)</option>
                    <option value="2">2X - Regional events (standard competitive events)</option>
                    <option value="3">3X - State/Major events (state championships)</option>
                    <option value="4">4X - Championship events (national finals, world finals)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Determines points awarded: 1st=5pts, 2nd=4pts, 3rd=3pts, 4th=2pts, 5th=1pt × multiplier
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Type *
                  </label>
                  <select
                    required
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="standard">Standard Event</option>
                    <option value="state_finals">State Finals Event</option>
                    <option value="world_finals">World Finals Event</option>
                    <option value="judges_point">Judges Point Event</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    World Finals events are used for Championship Archives
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) =>
                      setFormData({ ...formData, max_participants: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Registration Fee ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.registration_fee}
                    onChange={(e) =>
                      setFormData({ ...formData, registration_fee: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                >
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingEvent(null);
                  }}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
