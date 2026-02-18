import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Trophy, Award, CreditCard, Mail, Clock, CheckCircle, XCircle, Eye, MessageSquare, Settings, Users, FileText } from 'lucide-react';
import { useAuth } from '@/auth';
import { eventRegistrationsApi } from '@/event-registrations';
import { competitionResultsApi } from '@/competition-results';
import axios from '@/lib/axios';

interface EventHostingRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  eventName: string;
  eventType: string;
  status: string;
  adminResponse?: string;
  adminResponseDate?: string;
  createdAt: string;
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [hostingRequests, setHostingRequests] = useState<EventHostingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EventHostingRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalPoints: 0,
    bestPlacement: null as number | null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchUserData();
    }
  }, [profile]);

  const fetchUserData = async () => {
    try {
      const [regs, competitorResults] = await Promise.all([
        eventRegistrationsApi.getMyRegistrations(profile!.id),
        competitionResultsApi.getByCompetitor(profile!.id),
      ]);

      // Map backend camelCase to match frontend expectations
      const mappedRegs = regs.map((reg: any) => ({
        ...reg,
        status: reg.registrationStatus || reg.status,
        registration_date: reg.registeredAt || reg.createdAt,
      }));
      setRegistrations(mappedRegs);

      if (competitorResults) {
        setResults(competitorResults);

        const totalPoints = competitorResults.reduce(
          (sum: number, r: any) => sum + (r.points_earned || 0),
          0
        );
        const bestPlacement =
          competitorResults.length > 0
            ? Math.min(...competitorResults.map((r: any) => r.placement))
            : null;

        setStats({
          totalEvents: competitorResults.length,
          totalPoints,
          bestPlacement,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }

    // Fetch event hosting requests
    try {
      const response = await axios.get(`/api/event-hosting-requests/user/${profile!.id}`);
      if (response.data && Array.isArray(response.data)) {
        setHostingRequests(response.data);
      }
    } catch (error) {
      console.error('Error fetching hosting requests:', error);
      setHostingRequests([]);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { color: string; icon: any; label: string } } = {
      pending: { color: 'bg-yellow-500/10 text-yellow-500', icon: Clock, label: 'Pending' },
      under_review: { color: 'bg-blue-500/10 text-blue-500', icon: Eye, label: 'Under Review' },
      approved: { color: 'bg-green-500/10 text-green-500', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-500/10 text-red-500', icon: XCircle, label: 'Rejected' },
      cancelled: { color: 'bg-gray-500/10 text-gray-500', icon: XCircle, label: 'Cancelled' },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewRequest = (request: EventHostingRequest) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">My MECA</h1>
          <p className="text-gray-400">Welcome back, {`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}</p>
          {profile?.meca_id && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 rounded-lg">
              <span className="text-gray-400 text-sm">MECA ID:</span>
              <span className="text-orange-500 font-mono font-semibold">{profile.meca_id}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <User className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Membership</p>
                <p className="text-white font-semibold capitalize">
                  {profile?.membership_status}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Events</p>
                <p className="text-white font-semibold text-2xl">{stats.totalEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Points</p>
                <p className="text-white font-semibold text-2xl">{stats.totalPoints}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Best Place</p>
                <p className="text-white font-semibold text-2xl">
                  {stats.bestPlacement ? `#${stats.bestPlacement}` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {profile?.membership_status === 'none' && (
          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Become a Member Today
                </h3>
                <p className="text-white/90">
                  Get access to exclusive features, event discounts, and more
                </p>
              </div>
              <button
                onClick={() => navigate('/membership')}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-white text-orange-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <CreditCard className="h-5 w-5" />
                Purchase Membership
              </button>
            </div>
          </div>
        )}

        {/* Quick Links Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => navigate('/profile')}
            className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Settings className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Personal Profile</h3>
                <p className="text-gray-400 text-sm">Edit your account details</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/public-profile')}
            className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Public Profile</h3>
                <p className="text-gray-400 text-sm">Manage your public presence</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/billing')}
            className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Billing</h3>
                <p className="text-gray-400 text-sm">View invoices & payments</p>
              </div>
            </div>
          </button>
        </div>

        {/* Event Hosting Requests - Only show if user has submitted requests */}
        {hostingRequests.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Mail className="h-6 w-6 text-orange-500" />
              My Event Hosting Requests
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hostingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer"
                  onClick={() => handleViewRequest(request)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-white text-sm flex-1 pr-2">
                      {request.eventName}
                    </h4>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="space-y-1 text-xs text-gray-400">
                    <p className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Submitted {formatDate(request.createdAt)}
                    </p>
                    {request.adminResponse && (
                      <p className="flex items-center gap-1 text-blue-400">
                        <MessageSquare className="h-3 w-3" />
                        Admin responded
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-orange-500" />
              My Event Registrations
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
              </div>
            ) : registrations.length > 0 ? (
              <div className="space-y-4">
                {registrations.slice(0, 5).map((reg) => (
                  <div
                    key={reg.id}
                    className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer"
                    onClick={() =>
                      reg.event && navigate(`/events/${reg.event.id}`)
                    }
                  >
                    <h4 className="font-semibold text-white mb-2">
                      {reg.event?.title}
                    </h4>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        {reg.event &&
                          new Date(reg.event.event_date).toLocaleDateString()}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          reg.status === 'confirmed'
                            ? 'bg-green-500/10 text-green-400'
                            : reg.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {reg.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No event registrations yet</p>
                <button
                  onClick={() => navigate('/events')}
                  className="mt-4 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Browse Events
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-orange-500" />
              My Competition Results
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {results.slice(0, 5).map((result) => (
                  <div
                    key={result.id}
                    className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white">
                        {result.event?.title}
                      </h4>
                      <span className="text-2xl font-bold text-orange-500">
                        #{result.placement}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{result.competition_class}</span>
                      <span className="flex items-center gap-1 text-orange-400 font-semibold">
                        <Award className="h-4 w-4" />
                        {result.points_earned} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No competition results yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Request Details Modal */}
        {showRequestModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedRequest.eventName}</h3>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Request Details</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-400">Event Type:</span> {selectedRequest.eventType}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-400">Submitted:</span> {formatDate(selectedRequest.createdAt)}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-400">Status:</span>{' '}
                      <span className="capitalize">{selectedRequest.status.replace('_', ' ')}</span>
                    </p>
                  </div>
                </div>

                {selectedRequest.adminResponse && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      Admin Response
                    </h4>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap mb-2">
                      {selectedRequest.adminResponse}
                    </p>
                    {selectedRequest.adminResponseDate && (
                      <p className="text-gray-400 text-xs">
                        Responded on {formatDate(selectedRequest.adminResponseDate)}
                      </p>
                    )}
                  </div>
                )}

                {!selectedRequest.adminResponse && selectedRequest.status === 'pending' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <p className="text-yellow-400 text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Your request is pending review. We'll contact you soon!
                    </p>
                  </div>
                )}

                {!selectedRequest.adminResponse && selectedRequest.status === 'under_review' && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-blue-400 text-sm flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Your request is currently under review by our team.
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowRequestModal(false);
                      setSelectedRequest(null);
                    }}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
