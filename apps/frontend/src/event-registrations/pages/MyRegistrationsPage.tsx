import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  QrCode,
  Car,
  Tag,
  ChevronRight,
  Loader2,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/auth';
import { eventRegistrationsApi, EventRegistration } from '@/event-registrations';

export default function MyRegistrationsPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [expandedQr, setExpandedQr] = useState<string | null>(null);
  const [qrData, setQrData] = useState<Record<string, { checkInCode: string; qrCodeData: string }>>({});

  useEffect(() => {
    fetchRegistrations();
  }, [user, profile]);

  const fetchRegistrations = async () => {
    if (!user && !profile?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let data: EventRegistration[];

      if (user?.id) {
        data = await eventRegistrationsApi.getMyRegistrations(user.id);
      } else if (profile?.email) {
        data = await eventRegistrationsApi.getByEmail(profile.email);
      } else {
        data = [];
      }

      // Sort by event date (most recent first)
      data.sort((a, b) => {
        const dateA = a.event?.event_date ? new Date(a.event.event_date).getTime() : 0;
        const dateB = b.event?.event_date ? new Date(b.event.event_date).getTime() : 0;
        return dateB - dateA;
      });

      setRegistrations(data);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setError('Failed to load your registrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchQrCode = async (registrationId: string) => {
    if (qrData[registrationId]) {
      setExpandedQr(expandedQr === registrationId ? null : registrationId);
      return;
    }

    try {
      const data = await eventRegistrationsApi.getQrCode(registrationId);
      setQrData((prev) => ({ ...prev, [registrationId]: data }));
      setExpandedQr(registrationId);
    } catch (err) {
      console.error('Error fetching QR code:', err);
    }
  };

  const filteredRegistrations = registrations.filter((reg) => {
    if (filter === 'all') return true;

    const eventDate = reg.event?.event_date ? new Date(reg.event.event_date) : null;
    const now = new Date();

    if (!eventDate) return filter === 'all';

    if (filter === 'upcoming') return eventDate >= now;
    if (filter === 'past') return eventDate < now;

    return true;
  });

  const getStatusBadge = (reg: EventRegistration) => {
    if (reg.registrationStatus === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelled
        </span>
      );
    }

    if (reg.checkedIn) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          Checked In
        </span>
      );
    }

    if (reg.paymentStatus === 'paid') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          Confirmed
        </span>
      );
    }

    if (reg.paymentStatus === 'pending') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
          <Clock className="h-3 w-3 mr-1" />
          Payment Pending
        </span>
      );
    }

    return null;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="text-center">
          <ClipboardList className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Sign In Required</h2>
          <p className="text-gray-400 mb-6">Please sign in to view your event registrations.</p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your registrations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchRegistrations}
            className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Registrations</h1>
          <p className="text-gray-400">
            View and manage your event registrations
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            All ({registrations.length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'upcoming'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'past'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            Past
          </button>
        </div>

        {/* Registrations List */}
        {filteredRegistrations.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-12 text-center">
            <ClipboardList className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {filter === 'all' ? 'No registrations yet' : `No ${filter} registrations`}
            </h3>
            <p className="text-gray-400 mb-6">
              {filter === 'all'
                ? 'Register for an event to see it here.'
                : `You don't have any ${filter} event registrations.`}
            </p>
            <Link
              to="/events"
              className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRegistrations.map((reg) => (
              <div
                key={reg.id}
                className="bg-slate-800 rounded-xl overflow-hidden"
              >
                {/* Main Card */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">
                          {reg.event?.title || 'Event'}
                        </h3>
                        {getStatusBadge(reg)}
                      </div>

                      {reg.event && (
                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(reg.event.event_date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {reg.event.venue_name}
                            {reg.event.venue_city && `, ${reg.event.venue_city}`}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => navigate(`/events/${reg.event?.id || reg.event_id}`)}
                      className="text-orange-500 hover:text-orange-400"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Classes */}
                  {reg.classes && reg.classes.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <Tag className="h-4 w-4" />
                        Classes Registered
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {reg.classes.map((cls, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-slate-700 rounded-full text-sm text-white"
                          >
                            <span className="text-orange-400">{cls.format}</span> - {cls.className}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vehicle Info */}
                  {(reg.vehicleMake || reg.vehicleModel) && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Car className="h-4 w-4" />
                      {[reg.vehicleYear, reg.vehicleMake, reg.vehicleModel]
                        .filter(Boolean)
                        .join(' ')}
                    </div>
                  )}

                  {/* QR Code Button */}
                  {reg.paymentStatus === 'paid' && reg.registrationStatus !== 'cancelled' && !reg.checkedIn && (
                    <button
                      onClick={() => fetchQrCode(reg.id)}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      <QrCode className="h-5 w-5" />
                      {expandedQr === reg.id ? 'Hide Check-In QR Code' : 'Show Check-In QR Code'}
                    </button>
                  )}
                </div>

                {/* QR Code Expansion */}
                {expandedQr === reg.id && qrData[reg.id] && (
                  <div className="border-t border-slate-700 p-6 bg-slate-900/50">
                    <div className="flex flex-col items-center">
                      <p className="text-gray-400 text-sm mb-4">
                        Show this QR code at the event for quick check-in
                      </p>
                      <div className="bg-white rounded-xl p-4">
                        <img
                          src={qrData[reg.id].qrCodeData}
                          alt="Check-in QR Code"
                          className="w-48 h-48"
                        />
                      </div>
                      <div className="mt-4 flex items-center text-gray-400">
                        <span className="font-mono text-lg text-white">{qrData[reg.id].checkInCode}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Info Footer */}
                <div className="border-t border-slate-700 px-6 py-3 bg-slate-900/50 flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Registered {reg.registeredAt
                      ? new Date(reg.registeredAt).toLocaleDateString()
                      : new Date(reg.created_at || '').toLocaleDateString()
                    }
                  </span>
                  {reg.amountPaid && (
                    <span className="text-white font-medium">
                      ${reg.amountPaid.toFixed(2)} paid
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Browse More Events CTA */}
        {registrations.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              to="/events"
              className="inline-flex items-center px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              Browse More Events
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
