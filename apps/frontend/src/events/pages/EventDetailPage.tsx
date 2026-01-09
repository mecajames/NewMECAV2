import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, User, Mail, Phone, Car, Award, DollarSign, X, TrendingUp, QrCode, Move, Check, Image, ZoomIn, ArrowLeft, Star } from 'lucide-react';
import { eventsApi, Event, EventAssignmentManager } from '@/events';
import { eventRegistrationsApi } from '@/event-registrations';
import { useAuth, usePermissions } from '@/auth';
import { EventRatingsPanel } from '@/ratings';
import { ratingsApi } from '@/api-client/ratings.api-client';

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [multiDayEvents, setMultiDayEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    vehicleInfo: '',
    competitionClass: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user, profile } = useAuth();
  const { hasPermission: _hasPermission } = usePermissions();

  // Position editing state
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [savingPosition, setSavingPosition] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Flyer lightbox state
  const [showFlyerLightbox, setShowFlyerLightbox] = useState(false);

  // Check if user is admin
  const isAdmin = profile?.role === 'admin';

  // Track if user participated in this event (for ratings)
  const [userParticipated, setUserParticipated] = useState(false);

  useEffect(() => {
    if (!eventId) {
      navigate('/events');
      return;
    }
    fetchEvent();
  }, [eventId]);

  // Check if user competed at this event (has results under their MECA ID)
  useEffect(() => {
    const checkCompetition = async () => {
      if (!user || !eventId) return;
      try {
        const competed = await ratingsApi.hasUserCompetedAtEvent(eventId);
        setUserParticipated(competed);
      } catch (err) {
        console.error('Error checking competition participation:', err);
      }
    };
    checkCompetition();
  }, [user, eventId]);

  useEffect(() => {
    if (profile && showRegistrationModal) {
      setRegistrationData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email,
        phone: profile.phone || '',
        vehicleInfo: '',
        competitionClass: '',
      });
    }
  }, [profile, showRegistrationModal]);

  useEffect(() => {
    // Initialize position from event data
    if (event?.flyer_image_position) {
      setPosition(event.flyer_image_position);
    }
  }, [event]);

  const fetchEvent = async () => {
    if (!eventId) return;
    try {
      const data = await eventsApi.getById(eventId);
      setEvent(data);

      // If this is part of a multi-day event, fetch all days
      if (data.multi_day_group_id) {
        try {
          const allDays = await eventsApi.getByMultiDayGroup(data.multi_day_group_id);
          setMultiDayEvents(allDays);
        } catch (err) {
          console.error('Error fetching multi-day events:', err);
        }
      } else {
        setMultiDayEvents([]);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    }
    setLoading(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditingPosition) return;
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setPosition({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isEditingPosition) return;
    setIsDragging(true);
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !imageContainerRef.current) return;

    const touch = e.touches[0];
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));

    setPosition({ x, y });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const savePosition = async () => {
    if (!event) return;

    try {
      setSavingPosition(true);
      await eventsApi.updateFlyerImagePosition(event.id, position);
      setEvent({ ...event, flyer_image_position: position });
      setIsEditingPosition(false);
    } catch (err) {
      console.error('Error saving position:', err);
    } finally {
      setSavingPosition(false);
    }
  };

  const cancelEditing = () => {
    // Reset to saved position
    if (event?.flyer_image_position) {
      setPosition(event.flyer_image_position);
    } else {
      setPosition({ x: 50, y: 50 });
    }
    setIsEditingPosition(false);
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

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const registrationPayload: any = {
      event_id: eventId,
      first_name: registrationData.firstName,
      last_name: registrationData.lastName,
      email: registrationData.email,
      phone: registrationData.phone,
      vehicle_info: registrationData.vehicleInfo,
      competition_class: registrationData.competitionClass,
      payment_status: 'pending',
      status: 'pending',
    };

    if (user) {
      registrationPayload.user_id = user.id;
    }

    try {
      await eventRegistrationsApi.create(registrationPayload);
      setSuccess(true);
      setSubmitting(false);
      setTimeout(() => {
        setShowRegistrationModal(false);
        setSuccess(false);
        setRegistrationData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          vehicleInfo: '',
          competitionClass: '',
        });
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Event not found</p>
          <button
            onClick={() => navigate('/events')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-400">Event Details</h2>
          <button
            onClick={() => navigate('/events')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </button>
        </div>

        {event.flyer_url && (
          <div
            ref={imageContainerRef}
            className={`mb-8 rounded-xl overflow-hidden shadow-2xl relative ${isEditingPosition ? 'cursor-move' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={event.flyer_url}
              alt={event.title}
              className="w-full max-h-96 object-cover select-none"
              style={{ objectPosition: `${position.x}% ${position.y}%` }}
              draggable={false}
            />

            {/* Position editing overlay */}
            {isEditingPosition && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                  Drag to reposition image
                </div>
              </div>
            )}

            {/* Edit position button - only show for admins */}
            {isAdmin && !isEditingPosition && (
              <button
                onClick={() => setIsEditingPosition(true)}
                className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/90 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <Move className="h-4 w-4" />
                Adjust Position
              </button>
            )}

            {/* Save/Cancel buttons when editing */}
            {isEditingPosition && (
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={cancelEditing}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={savePosition}
                  disabled={savingPosition}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {savingPosition ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="bg-slate-800 rounded-xl shadow-2xl p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <h1 className="text-4xl font-bold text-white">{event.title}</h1>
            <div className="flex items-center gap-2">
              {event.day_number && (
                <span className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-500/10 text-blue-400 border border-blue-500">
                  Day {event.day_number}
                </span>
              )}
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  event.status === 'upcoming'
                    ? 'bg-blue-500/10 text-blue-400'
                    : event.status === 'ongoing'
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-gray-500/10 text-gray-400'
                }`}
              >
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Multi-Day Event Navigation */}
          {multiDayEvents.length > 1 && (
            <div className="mb-6 p-4 bg-slate-700 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                This is a {multiDayEvents.length}-day event
              </h3>
              <div className="flex flex-wrap gap-2">
                {multiDayEvents.map((dayEvent) => (
                  <button
                    key={dayEvent.id}
                    onClick={() => dayEvent.id !== event.id && navigate(`/events/${dayEvent.id}`)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      dayEvent.id === event.id
                        ? 'bg-orange-600 text-white cursor-default'
                        : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
                    }`}
                  >
                    Day {dayEvent.day_number} - {new Date(dayEvent.event_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Multiplier Badge - First Line */}
          {event.points_multiplier !== undefined && event.points_multiplier !== null && (
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-orange-500/10 text-orange-400 border-orange-500">
                {event.points_multiplier}X Points Event
              </span>
            </div>
          )}

          {/* Format Badges - Second Line */}
          {event.formats && event.formats.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {event.formats.map((format) => (
                <span
                  key={format}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${getFormatColor(format)}`}
                >
                  {format}
                </span>
              ))}
            </div>
          )}

          {event.description && (
            <p className="text-gray-300 text-lg mb-6 leading-relaxed">
              {event.description}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Event Date</p>
                  <p className="text-white font-semibold">
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-400 text-sm">Location</p>
                  <p className="text-white font-semibold">{event.venue_name}</p>
                  <p className="text-gray-300 text-sm">{event.venue_address}</p>
                </div>
              </div>

              {event.registration_fee > 0 && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-gray-400 text-sm">Registration Fee</p>
                    <p className="text-white font-semibold">${event.registration_fee}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Flyer Thumbnail */}
              {event.flyer_url && (
                <div
                  className="relative cursor-pointer group"
                  onClick={() => setShowFlyerLightbox(true)}
                >
                  <div className="bg-slate-700 rounded-lg p-2 hover:bg-slate-600 transition-colors">
                    <p className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Event Flyer
                    </p>
                    <div className="relative overflow-hidden rounded-lg">
                      <img
                        src={event.flyer_url}
                        alt={`${event.title} flyer`}
                        className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                        style={{
                          objectPosition: event.flyer_image_position
                            ? `${event.flyer_image_position.x}% ${event.flyer_image_position.y}%`
                            : '50% 50%'
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                          <ZoomIn className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs mt-2 text-center">Click to view full flyer</p>
                  </div>
                </div>
              )}

              {/* Event Director */}
              {event.event_director && (
                <div className="bg-slate-700 rounded-lg p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-orange-500" />
                    Event Director
                  </h3>
                  <p className="text-white font-medium mb-2">{`${event.event_director.first_name || ''} ${event.event_director.last_name || ''}`.trim()}</p>
                  <p className="text-gray-400 text-sm mb-1">{event.event_director.email}</p>
                  {event.event_director.phone && (
                    <p className="text-gray-400 text-sm">{event.event_director.phone}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Admin: Event Staff Assignments */}
          {isAdmin && eventId && (
            <div className="mb-8">
              <EventAssignmentManager eventId={eventId} eventTitle={event.title} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {event.status === 'upcoming' && (
              <button
                onClick={() => navigate(`/events/${eventId}/register`)}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
              >
                Pre-Register for This Event
              </button>
            )}

            {/* Check-In Button for Event Directors/Admins Only */}
            {(profile?.role === 'admin' || profile?.role === 'event_director') && (event.status === 'upcoming' || event.status === 'ongoing') && (
              <button
                onClick={() => navigate(`/events/${eventId}/check-in`)}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg text-lg transition-colors flex items-center justify-center gap-2"
              >
                <QrCode className="h-6 w-6" />
                QR Check-In
              </button>
            )}
          </div>

          {event.status === 'completed' && (
            <button
              onClick={() => navigate(`/results?eventId=${event.id}`)}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
              <TrendingUp className="h-6 w-6" />
              View Event Results
            </button>
          )}
        </div>

        {/* Ratings Section - Show for completed events where user has competition results */}
        {event.status === 'completed' && userParticipated && (
          <div className="mt-8 bg-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500" />
              Rate Event Staff
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Help us improve by rating the judges and event directors from this event.
            </p>
            <EventRatingsPanel
              eventId={event.id}
              eventName={event.title}
            />
          </div>
        )}

        <div className="bg-slate-800 rounded-xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-orange-500" />
            Event Location
          </h2>
          <div className="aspect-video rounded-lg overflow-hidden bg-slate-700">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://www.google.com/maps?q=${encodeURIComponent(event.venue_address)}&output=embed`}
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>

      {showRegistrationModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
              <h2 className="text-2xl font-bold text-white">Event Pre-Registration</h2>
              <button
                onClick={() => setShowRegistrationModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleRegistration} className="p-6 space-y-6">
              {success && (
                <div className="p-4 bg-green-500/10 border border-green-500 rounded-lg">
                  <p className="text-green-400">Registration successful!</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={registrationData.firstName}
                      onChange={(e) =>
                        setRegistrationData({ ...registrationData, firstName: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={registrationData.lastName}
                      onChange={(e) =>
                        setRegistrationData({ ...registrationData, lastName: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={registrationData.email}
                    onChange={(e) =>
                      setRegistrationData({ ...registrationData, email: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={registrationData.phone}
                    onChange={(e) =>
                      setRegistrationData({ ...registrationData, phone: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vehicle Information
                </label>
                <div className="relative">
                  <Car className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    value={registrationData.vehicleInfo}
                    onChange={(e) =>
                      setRegistrationData({ ...registrationData, vehicleInfo: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                    placeholder="Year, Make, Model, Modifications..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Competition Class
                </label>
                <div className="relative">
                  <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={registrationData.competitionClass}
                    onChange={(e) =>
                      setRegistrationData({ ...registrationData, competitionClass: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g., Pro, Street, Novice"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Complete Registration'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Flyer Lightbox Modal */}
      {showFlyerLightbox && event?.flyer_url && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
          onClick={() => setShowFlyerLightbox(false)}
        >
          <button
            onClick={() => setShowFlyerLightbox(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <X className="h-8 w-8" />
          </button>
          <div
            className="relative max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={event.flyer_url}
              alt={`${event.title} flyer`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
