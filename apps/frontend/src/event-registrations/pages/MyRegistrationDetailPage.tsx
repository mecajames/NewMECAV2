import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, MapPin, QrCode, Tag, Loader2, CreditCard,
  Clock, CheckCircle, XCircle, Car, AlertCircle,
} from 'lucide-react';
import { eventRegistrationsApi, EventRegistration } from '@/event-registrations';

function formatDate(value?: string | Date | null): string {
  if (!value) return 'TBD';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatCurrency(value: string | number | undefined | null): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(num) || 0);
}

export default function MyRegistrationDetailPage() {
  const navigate = useNavigate();
  const { registrationId } = useParams<{ registrationId: string }>();
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [qrPayload, setQrPayload] = useState<{ checkInCode: string; qrCodeData: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!registrationId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await eventRegistrationsApi.getById(registrationId);
        if (!cancelled) setRegistration(data);
        // Also try to load QR if registration is paid/confirmed
        if (data?.paymentStatus === 'paid' || data?.registrationStatus === 'confirmed') {
          try {
            const qr = await eventRegistrationsApi.getQrCode(registrationId);
            if (!cancelled) setQrPayload(qr);
          } catch (qrErr) {
            console.warn('Could not load QR code:', qrErr);
          }
        }
      } catch (err: any) {
        console.error('Failed to load registration:', err);
        if (!cancelled) setError(err?.response?.data?.message || 'Registration not found.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [registrationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <AlertCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Registration unavailable</h2>
            <p className="text-gray-400 mb-6">{error || 'This registration could not be loaded.'}</p>
            <button
              onClick={() => navigate('/billing?tab=event_registrations')}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              Back to Payments &amp; Invoices
            </button>
          </div>
        </div>
      </div>
    );
  }

  const event = registration.event;
  const classes = registration.classes || [];
  const isPending = registration.paymentStatus === 'pending';
  const isPaid = registration.paymentStatus === 'paid';
  const isInterested = registration.registrationStatus === 'interested';
  const isCancelled = registration.registrationStatus === 'cancelled';

  const statusPill = (() => {
    if (isCancelled) return { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Cancelled' };
    if (registration.checkedIn) return { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Checked In' };
    if (isPaid) return { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Confirmed' };
    if (isPending) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Payment Pending' };
    if (isInterested) return { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: AlertCircle, label: 'Interested' };
    return { bg: 'bg-slate-500/20', text: 'text-slate-300', icon: AlertCircle, label: registration.registrationStatus || 'Unknown' };
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top action bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <button
            onClick={() => navigate('/billing?tab=event_registrations')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Payments &amp; Invoices
          </button>
          {isPending && event?.id && (
            <button
              onClick={() => navigate(`/events/${event.id}/register?registrationId=${registration.id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Pay Now
            </button>
          )}
        </div>

        {/* Header card */}
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-3xl font-bold text-white">{event?.title || 'Event'}</h1>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusPill.bg} ${statusPill.text}`}>
                    <statusPill.icon className="h-4 w-4" />
                    {statusPill.label}
                  </span>
                </div>
                {event && (
                  <div className="flex flex-wrap gap-4 text-gray-400 mt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    {(event.venue_name || event.venue_city) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {event.venue_name}
                          {event.venue_city && `, ${event.venue_city}`}
                          {event.venue_state && `, ${event.venue_state}`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-gray-500">Amount</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(registration.amountPaid)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Classes */}
        {classes.length > 0 && (
          <div className="bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-2 text-gray-400 mb-4">
              <Tag className="h-4 w-4" />
              <h2 className="text-lg font-semibold text-white">Registered Classes</h2>
            </div>
            <div className="space-y-2">
              {classes.map((cls, idx) => (
                <div key={cls.id || idx} className="flex items-center justify-between bg-slate-900/40 rounded-lg p-4">
                  <div>
                    <p className="text-white font-medium">{cls.className || 'Class'}</p>
                    <p className="text-gray-400 text-sm uppercase tracking-wider">{cls.format || ''}</p>
                  </div>
                  <p className="text-orange-400 font-semibold">{formatCurrency(cls.feeCharged)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR Code & Check-in */}
        {(qrPayload || registration.checkInCode) && (
          <div className="bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-2 text-gray-400 mb-4">
              <QrCode className="h-4 w-4" />
              <h2 className="text-lg font-semibold text-white">Check-In</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {qrPayload?.qrCodeData && (
                <div className="bg-white p-4 rounded-lg flex-shrink-0">
                  <img src={qrPayload.qrCodeData} alt="Check-in QR code" className="w-48 h-48" />
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Check-In Code</p>
                <p className="text-3xl font-mono font-bold text-orange-400">{qrPayload?.checkInCode || registration.checkInCode}</p>
                <p className="text-gray-400 text-sm mt-2">
                  Show this QR code or enter the check-in code at the event to check in.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Vehicle info */}
        {(registration.vehicleMake || registration.vehicleModel) && (
          <div className="bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-2 text-gray-400 mb-4">
              <Car className="h-4 w-4" />
              <h2 className="text-lg font-semibold text-white">Vehicle</h2>
            </div>
            <p className="text-white">
              {[registration.vehicleYear, registration.vehicleMake, registration.vehicleModel].filter(Boolean).join(' ')}
            </p>
            {registration.vehicleInfo && <p className="text-gray-400 text-sm mt-1">{registration.vehicleInfo}</p>}
          </div>
        )}

        {/* Pending payment notice */}
        {isPending && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-300 font-semibold mb-1">Payment Pending</h3>
                <p className="text-gray-300 text-sm">
                  Your registration is reserved but not yet confirmed. Click "Pay Now" above to complete checkout.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
