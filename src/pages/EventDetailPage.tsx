import { useEffect, useState } from 'react';
import { Calendar, MapPin, User, Mail, Phone, Car, Award, DollarSign, X } from 'lucide-react';
import { supabase, Event, EventRegistration } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface EventDetailPageProps {
  eventId: string;
  onNavigate: (page: string) => void;
}

export default function EventDetailPage({ eventId, onNavigate }: EventDetailPageProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    fullName: '',
    email: '',
    phone: '',
    vehicleInfo: '',
    competitionClass: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    if (profile && showRegistrationModal) {
      setRegistrationData({
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone || '',
        vehicleInfo: '',
        competitionClass: '',
      });
    }
  }, [profile, showRegistrationModal]);

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*, event_director:profiles!events_event_director_id_fkey(*)')
      .eq('id', eventId)
      .maybeSingle();

    if (!error && data) {
      setEvent(data);
    }
    setLoading(false);
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const registrationPayload: any = {
      event_id: eventId,
      full_name: registrationData.fullName,
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

    const { error } = await supabase
      .from('event_registrations')
      .insert(registrationPayload);

    if (error) {
      setError(error.message);
      setSubmitting(false);
    } else {
      setSuccess(true);
      setSubmitting(false);
      setTimeout(() => {
        setShowRegistrationModal(false);
        setSuccess(false);
        setRegistrationData({
          fullName: '',
          email: '',
          phone: '',
          vehicleInfo: '',
          competitionClass: '',
        });
      }, 2000);
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
            onClick={() => onNavigate('events')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const mapUrl = event.latitude && event.longitude
    ? `https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${event.latitude},${event.longitude}`
    : `https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${encodeURIComponent(event.venue_address)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate('events')}
          className="mb-6 text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Events
        </button>

        {event.flyer_url && (
          <div className="mb-8 rounded-xl overflow-hidden shadow-2xl">
            <img
              src={event.flyer_url}
              alt={event.title}
              className="w-full max-h-96 object-cover"
            />
          </div>
        )}

        <div className="bg-slate-800 rounded-xl shadow-2xl p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <h1 className="text-4xl font-bold text-white">{event.title}</h1>
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

            {event.event_director && (
              <div className="bg-slate-700 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-orange-500" />
                  Event Director
                </h3>
                <p className="text-white font-medium mb-2">{event.event_director.full_name}</p>
                <p className="text-gray-400 text-sm mb-1">{event.event_director.email}</p>
                {event.event_director.phone && (
                  <p className="text-gray-400 text-sm">{event.event_director.phone}</p>
                )}
              </div>
            )}
          </div>

          {event.status === 'upcoming' && (
            <button
              onClick={() => setShowRegistrationModal(true)}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Pre-Register for This Event
            </button>
          )}
        </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={registrationData.fullName}
                    onChange={(e) =>
                      setRegistrationData({ ...registrationData, fullName: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
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
    </div>
  );
}
