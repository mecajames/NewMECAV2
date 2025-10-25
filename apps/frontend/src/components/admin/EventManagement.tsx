import { useEffect, useState } from 'react';
import { Calendar, Plus, CreditCard as Edit, Trash2, X, MapPin, DollarSign, Users, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase, Event, Profile } from '../../lib/supabase';

export default function EventManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventDirectors, setEventDirectors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    registration_deadline: '',
    venue_name: '',
    venue_address: '',
    latitude: '',
    longitude: '',
    flyer_url: '',
    header_image_url: '',
    event_director_id: '',
    status: 'upcoming',
    max_participants: '',
    registration_fee: '0',
  });

  useEffect(() => {
    fetchEvents();
    fetchEventDirectors();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*, event_director:profiles!events_event_director_id_fkey(*)')
      .order('event_date', { ascending: false });

    if (data) setEvents(data);
    setLoading(false);
  };

  const fetchEventDirectors = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['event_director', 'admin'])
      .order('full_name');

    if (data) setEventDirectors(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const eventData: any = {
      title: formData.title,
      description: formData.description || null,
      event_date: formData.event_date,
      registration_deadline: formData.registration_deadline || null,
      venue_name: formData.venue_name,
      venue_address: formData.venue_address,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      flyer_url: formData.flyer_url || null,
      header_image_url: formData.header_image_url || null,
      event_director_id: formData.event_director_id || null,
      status: formData.status,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
      registration_fee: parseFloat(formData.registration_fee),
    };

    if (editingEvent) {
      await supabase.from('events').update(eventData).eq('id', editingEvent.id);
    } else {
      await supabase.from('events').insert(eventData);
    }

    setShowModal(false);
    setEditingEvent(null);
    resetForm();
    fetchEvents();
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date.substring(0, 16),
      registration_deadline: event.registration_deadline?.substring(0, 16) || '',
      venue_name: event.venue_name,
      venue_address: event.venue_address,
      latitude: event.latitude?.toString() || '',
      longitude: event.longitude?.toString() || '',
      flyer_url: event.flyer_url || '',
      header_image_url: event.header_image_url || '',
      event_director_id: event.event_director_id || '',
      status: event.status,
      max_participants: event.max_participants?.toString() || '',
      registration_fee: event.registration_fee.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      await supabase.from('events').delete().eq('id', id);
      fetchEvents();
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
      latitude: '',
      longitude: '',
      flyer_url: '',
      header_image_url: '',
      event_director_id: '',
      status: 'upcoming',
      max_participants: '',
      registration_fee: '0',
    });
  };

  const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10485760) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadingFlyer(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `flyers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      // Add to media library
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('media_files').insert({
        title: file.name,
        file_url: data.publicUrl,
        file_type: file.type.startsWith('image/') ? 'image' : 'pdf',
        file_size: file.size,
        mime_type: file.type,
        is_external: false,
        tags: ['event-flyer'],
        created_by: user?.id,
      });

      setFormData({ ...formData, flyer_url: data.publicUrl });
    } catch (error) {
      console.error('Error uploading flyer:', error);
      alert('Failed to upload flyer');
    } finally {
      setUploadingFlyer(false);
    }
  };

  const handleHeaderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10485760) {
      alert('File size must be less than 10MB');
      return;
    }

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      alert('Header image must be an image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    setUploadingHeader(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `headers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      // Get image dimensions if possible
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => { img.onload = resolve; });
      const dimensions = `${img.width}x${img.height}`;

      // Add to media library
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('media_files').insert({
        title: file.name,
        file_url: data.publicUrl,
        file_type: 'image',
        file_size: file.size,
        mime_type: file.type,
        dimensions,
        is_external: false,
        tags: ['event-header'],
        created_by: user?.id,
      });

      setFormData({ ...formData, header_image_url: data.publicUrl });
    } catch (error) {
      console.error('Error uploading header image:', error);
      alert('Failed to upload header image');
    } finally {
      setUploadingHeader(false);
    }
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

                <div>
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
                    Event Flyer
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFlyerUpload}
                          disabled={uploadingFlyer}
                          className="hidden"
                          id="flyer-upload"
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('flyer-upload')?.click()}
                          disabled={uploadingFlyer}
                          className={`w-full px-4 py-3 bg-slate-600 border border-slate-500 rounded-lg text-white text-center hover:bg-slate-500 transition-colors flex items-center justify-center gap-2 ${
                            uploadingFlyer ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingFlyer ? 'Uploading...' : 'Upload Flyer'}
                        </button>
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-400">or</div>
                    <input
                      type="url"
                      value={formData.flyer_url}
                      onChange={(e) => setFormData({ ...formData, flyer_url: e.target.value })}
                      placeholder="https://example.com/flyer.pdf or image URL"
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {formData.flyer_url && (
                      <div className="flex items-center gap-2 p-2 bg-slate-600 rounded-lg">
                        <ImageIcon className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-gray-300 truncate flex-1">{formData.flyer_url}</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">Full PDF or image for event flyer/poster (Max 10MB)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Header Image
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleHeaderImageUpload}
                          disabled={uploadingHeader}
                          className="hidden"
                          id="header-upload"
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('header-upload')?.click()}
                          disabled={uploadingHeader}
                          className={`w-full px-4 py-3 bg-slate-600 border border-slate-500 rounded-lg text-white text-center hover:bg-slate-500 transition-colors flex items-center justify-center gap-2 ${
                            uploadingHeader ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingHeader ? 'Uploading...' : 'Upload Header Image'}
                        </button>
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-400">or</div>
                    <input
                      type="url"
                      value={formData.header_image_url}
                      onChange={(e) => setFormData({ ...formData, header_image_url: e.target.value })}
                      placeholder="https://example.com/header-image.jpg"
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {formData.header_image_url && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-slate-600 rounded-lg">
                          <ImageIcon className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-gray-300 truncate flex-1">{formData.header_image_url}</span>
                        </div>
                        <img
                          src={formData.header_image_url}
                          alt="Header preview"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">Banner image for event card (Recommended: 1200x400px, Max 10MB)</p>
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
