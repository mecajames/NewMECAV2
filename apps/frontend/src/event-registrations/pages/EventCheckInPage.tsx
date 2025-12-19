import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  QrCode,
  Camera,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Car,
  Tag,
  DollarSign,
  Search,
  RefreshCw,
  Clock,
  Award,
  CameraOff,
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useAuth } from '@/auth';
import { eventsApi, Event } from '@/events/events.api-client';
import { eventRegistrationsApi, CheckInResponse } from '@/event-registrations';

export default function EventCheckInPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  // State
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check-in state
  const [checkInCode, setCheckInCode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<CheckInResponse | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Processing check-in
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);

  // Stats
  const [stats, setStats] = useState<{ total: number; checkedIn: number; pending: number } | null>(null);

  // Recent check-ins
  const [recentCheckIns, setRecentCheckIns] = useState<CheckInResponse[]>([]);

  // Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Check if user has permission (admin or event_director only)
  const hasCheckInPermission = profile?.role === 'admin' || profile?.role === 'event_director';

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      fetchStats();
    }
  }, [eventId]);

  // Focus input on mount
  useEffect(() => {
    if (!scannerActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scannerActive, lookupResult]);

  const fetchEvent = async () => {
    try {
      const data = await eventsApi.getById(eventId!);
      setEvent(data);
    } catch (err) {
      console.error('Error fetching event:', err);
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await eventRegistrationsApi.getEventCheckInStats(eventId!);
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkInCode.trim()) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    setCheckInSuccess(false);

    try {
      const result = await eventRegistrationsApi.lookupByCheckInCode(checkInCode.trim());
      setLookupResult(result);
    } catch (err) {
      console.error('Lookup error:', err);
      setLookupError(err instanceof Error ? err.message : 'Registration not found');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!lookupResult || !user) return;

    setCheckInLoading(true);

    try {
      const result = await eventRegistrationsApi.checkIn(
        lookupResult.registration.checkInCode,
        user.id
      );

      setLookupResult(result);
      setCheckInSuccess(true);

      // Add to recent check-ins
      setRecentCheckIns((prev) => [result, ...prev.slice(0, 9)]);

      // Refresh stats
      fetchStats();

      // Clear for next check-in after delay
      setTimeout(() => {
        setCheckInCode('');
        setLookupResult(null);
        setCheckInSuccess(false);
        inputRef.current?.focus();
      }, 3000);
    } catch (err) {
      console.error('Check-in error:', err);
      setLookupError(err instanceof Error ? err.message : 'Failed to check in');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleClear = () => {
    setCheckInCode('');
    setLookupResult(null);
    setLookupError(null);
    setCheckInSuccess(false);
    inputRef.current?.focus();
  };

  // Handle QR code scan result
  const handleScan = async (result: { rawValue: string }[]) => {
    if (result && result.length > 0) {
      const scannedCode = result[0].rawValue;
      if (scannedCode && scannedCode !== checkInCode) {
        setCheckInCode(scannedCode.toUpperCase());
        setScannerActive(false);

        // Auto-lookup the scanned code
        setLookupLoading(true);
        setLookupError(null);
        setLookupResult(null);
        setCheckInSuccess(false);

        try {
          const lookupResult = await eventRegistrationsApi.lookupByCheckInCode(scannedCode.trim());
          setLookupResult(lookupResult);
        } catch (err) {
          console.error('Lookup error:', err);
          setLookupError(err instanceof Error ? err.message : 'Registration not found');
        } finally {
          setLookupLoading(false);
        }
      }
    }
  };

  // Handle scanner errors
  const handleScanError = (error: unknown) => {
    console.error('Scanner error:', error);
    if (error instanceof Error) {
      setScannerError(error.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading check-in system...</p>
        </div>
      </div>
    );
  }

  if (!hasCheckInPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <QrCode className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">Only Admins and Event Directors can check in competitors.</p>
          <Link
            to="/events"
            className="inline-flex items-center text-orange-500 hover:text-orange-400 mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error || 'Event not found'}</p>
          <Link
            to="/events"
            className="inline-flex items-center text-orange-500 hover:text-orange-400"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            to={`/events/${eventId}`}
            className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Event Check-In</h1>
              <p className="text-gray-400">{event.title}</p>
            </div>

            {/* Stats */}
            {stats && (
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{stats.checkedIn}</div>
                  <div className="text-sm text-gray-400">Checked In</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-500">{stats.pending}</div>
                  <div className="text-sm text-gray-400">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-500">{stats.total}</div>
                  <div className="text-sm text-gray-400">Total</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Check-In Area */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-2xl p-6">
              {/* Scanner Toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setScannerActive(false)}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    !scannerActive
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                  }`}
                >
                  <Search className="h-5 w-5" />
                  Manual Entry
                </button>
                <button
                  onClick={() => {
                    setScannerActive(true);
                    setScannerError(null);
                  }}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    scannerActive
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                  }`}
                >
                  <Camera className="h-5 w-5" />
                  QR Scanner
                </button>
              </div>

              {/* QR Scanner */}
              {scannerActive && (
                <div className="mb-6">
                  <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden">
                    {scannerError ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <CameraOff className="h-16 w-16 text-red-500 mx-auto mb-4" />
                          <p className="text-red-400 font-medium mb-2">Camera Error</p>
                          <p className="text-gray-400 text-sm">{scannerError}</p>
                          <button
                            onClick={() => {
                              setScannerError(null);
                              setScannerActive(false);
                            }}
                            className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                          >
                            Use Manual Entry
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Scanner
                        onScan={handleScan}
                        onError={handleScanError}
                        constraints={{ facingMode: 'environment' }}
                        formats={['qr_code']}
                        components={{
                          audio: false,
                          torch: true,
                        }}
                        styles={{
                          container: { width: '100%', height: '100%' },
                          video: { width: '100%', height: '100%', objectFit: 'cover' },
                        }}
                      />
                    )}
                  </div>
                  <p className="text-gray-400 text-sm text-center mt-2">
                    Point camera at QR code to scan
                  </p>
                </div>
              )}

              {/* Manual Entry Form */}
              {!scannerActive && (
                <form onSubmit={handleLookup} className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enter Check-In Code
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        ref={inputRef}
                        type="text"
                        value={checkInCode}
                        onChange={(e) => setCheckInCode(e.target.value.toUpperCase())}
                        placeholder="REG-XXXXXX-XXXX"
                        className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-lg"
                        autoComplete="off"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={lookupLoading || !checkInCode.trim()}
                      className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {lookupLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        'Look Up'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Lookup Error */}
              {lookupError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-500 font-medium">Not Found</p>
                    <p className="text-red-400 text-sm">{lookupError}</p>
                  </div>
                  <button
                    onClick={handleClear}
                    className="ml-auto text-gray-400 hover:text-white"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Check-In Success */}
              {checkInSuccess && lookupResult && (
                <div className="mb-6 p-6 bg-green-500/10 border border-green-500 rounded-xl text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">Checked In!</h3>
                  <p className="text-gray-400">
                    {lookupResult.competitor.firstName} {lookupResult.competitor.lastName}
                  </p>
                </div>
              )}

              {/* Lookup Result */}
              {lookupResult && !checkInSuccess && (
                <div className="bg-slate-900/50 rounded-xl p-6">
                  {/* Already Checked In Warning */}
                  {lookupResult.registration.checkedIn && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500 rounded-lg flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <span className="text-yellow-500">
                        Already checked in at{' '}
                        {new Date(lookupResult.registration.checkedInAt!).toLocaleTimeString()}
                      </span>
                    </div>
                  )}

                  {/* Competitor Info */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {lookupResult.competitor.firstName} {lookupResult.competitor.lastName}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {lookupResult.competitor.email}
                        </div>
                        {lookupResult.competitor.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {lookupResult.competitor.phone}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Member Badge */}
                    {lookupResult.competitor.isMember ? (
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        MEMBER
                        {lookupResult.competitor.mecaId && (
                          <span className="ml-1">#{lookupResult.competitor.mecaId}</span>
                        )}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm font-medium">
                        NON-MEMBER
                      </span>
                    )}
                  </div>

                  {/* Vehicle Info */}
                  {(lookupResult.vehicle.make || lookupResult.vehicle.model) && (
                    <div className="mb-4 p-3 bg-slate-800 rounded-lg flex items-center gap-2">
                      <Car className="h-5 w-5 text-gray-400" />
                      <span className="text-white">
                        {[lookupResult.vehicle.year, lookupResult.vehicle.make, lookupResult.vehicle.model]
                          .filter(Boolean)
                          .join(' ')}
                      </span>
                      {lookupResult.vehicle.info && (
                        <span className="text-gray-400">- {lookupResult.vehicle.info}</span>
                      )}
                    </div>
                  )}

                  {/* Classes */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <Tag className="h-4 w-4" />
                      Registered Classes
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lookupResult.classes.map((cls, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-slate-800 rounded-full text-sm text-white"
                        >
                          <span className="text-orange-400">{cls.format}</span> - {cls.className}
                          <span className="text-gray-400 ml-2">${cls.feeCharged.toFixed(2)}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-400">
                      <DollarSign className="h-4 w-4" />
                      ${lookupResult.registration.amountPaid?.toFixed(2) || '0.00'} paid
                    </div>
                    {lookupResult.registration.paymentStatus === 'paid' ? (
                      <span className="text-green-400">Payment Confirmed</span>
                    ) : (
                      <span className="text-yellow-400">Payment {lookupResult.registration.paymentStatus}</span>
                    )}
                  </div>

                  {/* Check-In Button */}
                  {!lookupResult.registration.checkedIn && (
                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={handleCheckIn}
                        disabled={checkInLoading}
                        className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {checkInLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-5 w-5" />
                            Check In Competitor
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleClear}
                        className="px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {lookupResult.registration.checkedIn && (
                    <div className="mt-6">
                      <button
                        onClick={handleClear}
                        className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                      >
                        Next Check-In
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recent Check-Ins Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Recent Check-Ins
              </h3>

              {recentCheckIns.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  No check-ins yet
                </p>
              ) : (
                <div className="space-y-3">
                  {recentCheckIns.map((checkIn, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">
                          {checkIn.competitor.firstName} {checkIn.competitor.lastName}
                        </span>
                        {checkIn.competitor.isMember && (
                          <Award className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {checkIn.classes.length} {checkIn.classes.length === 1 ? 'class' : 'classes'}
                        <span className="mx-2">•</span>
                        {checkIn.registration.checkedInAt
                          ? new Date(checkIn.registration.checkedInAt).toLocaleTimeString()
                          : 'Just now'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
