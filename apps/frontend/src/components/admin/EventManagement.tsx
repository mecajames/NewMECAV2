import { useEffect, useState } from 'react';
import { Calendar, Plus, CreditCard as Edit, Trash2, X, MapPin, DollarSign, Users } from 'lucide-react';
import { eventsApi, Event } from '../../api-client/events.api-client';
import { profilesApi, Profile } from '../../api-client/profiles.api-client';
import { seasonsApi, Season } from '../../api-client/seasons.api-client';
import { countries, getStatesForCountry, getStateLabel, getPostalCodeLabel } from '../../utils/countries';


export default function EventManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventDirectors, setEventDirectors] = useState<Profile[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
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
  });

  useEffect(() => {
    fetchEvents();
    fetchEventDirectors();
    fetchSeasons();
  }, []);

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
    };

    console.log('📤 FRONTEND - Form data event_date:', formData.event_date);
    console.log('📤 FRONTEND - Converted event_date:', eventData.event_date);
    console.log('📤 FRONTEND - Full event data:', eventData);

    try {
      if (editingEvent) {
        console.log('📤 FRONTEND - Updating event ID:', editingEvent.id);
        await eventsApi.update(editingEvent.id, eventData);
      } else {
        console.log('📤 FRONTEND - Creating new event');
        await eventsApi.create(eventData);
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

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="bg-slate-700 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">{event.title}</h3>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      {new Date(event.event_date).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-orange-500" />
                      {event.venue_name}
                    </div>
                    {event.event_director && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-500" />
                        Director: {event.event_director.full_name}
                      </div>
                    )}
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        event.status === 'upcoming'
                          ? 'bg-blue-500/10 text-blue-400'
                          : event.status === 'ongoing'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(event)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
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

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

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
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
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
                        {director.full_name}
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
