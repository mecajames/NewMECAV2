import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Car,
  Tag,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  QrCode,
  User,
  CreditCard,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { eventRegistrationsApi, EventRegistration } from '@/event-registrations';

export default function EventRegistrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [qrData, setQrData] = useState<{ checkInCode: string; qrCodeData: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchRegistration();
    }
  }, [id]);

  const fetchRegistration = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await eventRegistrationsApi.getById(id);
      setRegistration(data);

      // Fetch QR code
      if (data.paymentStatus === 'paid') {
        try {
          const qr = await eventRegistrationsApi.getQrCode(id);
          setQrData(qr);
        } catch (e) {
          console.error('Error fetching QR code:', e);
        }
      }
    } catch (err) {
      console.error('Error fetching registration:', err);
      setError('Failed to load registration details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400">
            <Clock className="h-4 w-4 mr-2" />
            Pending
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400">
            <XCircle className="h-4 w-4 mr-2" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400">
            {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400">
            Pending
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400">
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading registration details...</p>
        </div>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error || 'Registration not found'}</p>
          <button
            onClick={() => navigate('/admin/event-registrations')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Registrations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Registration Details
            </h1>
            <p className="text-gray-400 mt-1">
              {registration.firstName} {registration.lastName}
            </p>
            <div className="flex items-center gap-3 mt-2">
              {getStatusBadge(registration.registrationStatus)}
              {getPaymentBadge(registration.paymentStatus)}
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/event-registrations')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Registrations
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-orange-500" />
              Contact Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-300">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{registration.email}</span>
              </div>
              {registration.phone && (
                <div className="flex items-center gap-3 text-gray-300">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{registration.phone}</span>
                </div>
              )}
              {(registration.address || registration.city) && (
                <div className="flex items-start gap-3 text-gray-300">
                  <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                  <div>
                    {registration.address && <div>{registration.address}</div>}
                    {(registration.city || registration.state || registration.postalCode) && (
                      <div>
                        {[registration.city, registration.state, registration.postalCode]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    )}
                    {registration.country && <div>{registration.country}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Event Information */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              Event Information
            </h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-500 text-sm">Event</span>
                <p className="text-white font-medium">{registration.event?.title || 'Unknown Event'}</p>
              </div>
              {registration.event?.event_date && (
                <div>
                  <span className="text-gray-500 text-sm">Date</span>
                  <p className="text-white">
                    {new Date(registration.event.event_date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
              {registration.event?.venue_name && (
                <div>
                  <span className="text-gray-500 text-sm">Venue</span>
                  <p className="text-white">
                    {registration.event.venue_name}
                    {registration.event.venue_city && `, ${registration.event.venue_city}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Information */}
          {(registration.vehicleMake || registration.vehicleModel) && (
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Car className="h-5 w-5 text-orange-500" />
                Vehicle Information
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-500 text-sm">Vehicle</span>
                  <p className="text-white font-medium">
                    {[registration.vehicleYear, registration.vehicleMake, registration.vehicleModel]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                </div>
                {registration.vehicleInfo && (
                  <div>
                    <span className="text-gray-500 text-sm">Additional Info</span>
                    <p className="text-white">{registration.vehicleInfo}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Classes Registered */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5 text-orange-500" />
              Classes Registered
            </h2>
            {registration.classes && registration.classes.length > 0 ? (
              <div className="space-y-2">
                {registration.classes.map((cls, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-700 rounded-lg px-4 py-3"
                  >
                    <div>
                      <span className="text-orange-400 font-medium">{cls.format}</span>
                      <span className="text-white ml-2">{cls.className}</span>
                    </div>
                    {cls.feeCharged !== undefined && (
                      <span className="text-gray-400">${cls.feeCharged.toFixed(2)}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No classes registered</p>
            )}
          </div>

          {/* Payment Information */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-500" />
              Payment Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                {getPaymentBadge(registration.paymentStatus)}
              </div>
              {registration.amountPaid && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="text-white font-medium text-lg">
                    ${registration.amountPaid.toFixed(2)}
                  </span>
                </div>
              )}
              {registration.stripePaymentIntentId && (
                <div>
                  <span className="text-gray-500 text-sm">Transaction ID</span>
                  <p className="text-gray-400 text-sm font-mono break-all">
                    {registration.stripePaymentIntentId}
                  </p>
                </div>
              )}
              {registration.registeredAt && (
                <div>
                  <span className="text-gray-500 text-sm">Registered At</span>
                  <p className="text-white">
                    {new Date(registration.registeredAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Check-In Status */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-orange-500" />
              Check-In Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                {registration.checkedIn ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Checked In
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400">
                    <Clock className="h-4 w-4 mr-2" />
                    Not Checked In
                  </span>
                )}
              </div>
              {registration.checkedIn && registration.checkedInAt && (
                <div>
                  <span className="text-gray-500 text-sm">Checked In At</span>
                  <p className="text-white">
                    {new Date(registration.checkedInAt).toLocaleString()}
                  </p>
                </div>
              )}
              {qrData && (
                <div className="mt-4">
                  <span className="text-gray-500 text-sm">Check-In Code</span>
                  <p className="text-white font-mono text-lg">{qrData.checkInCode}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QR Code */}
        {qrData && qrData.qrCodeData && (
          <div className="mt-6 bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-orange-500" />
              Check-In QR Code
            </h2>
            <div className="flex justify-center">
              <div className="bg-white rounded-xl p-4">
                <img
                  src={qrData.qrCodeData}
                  alt="Check-in QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>
            <p className="text-center text-gray-400 mt-4">
              Code: <span className="font-mono text-white">{qrData.checkInCode}</span>
            </p>
          </div>
        )}

        {/* Notes */}
        {registration.notes && (
          <div className="mt-6 bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Notes</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{registration.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
