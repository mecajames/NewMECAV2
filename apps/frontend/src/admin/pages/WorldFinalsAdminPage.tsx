import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Trophy,
  Mail,
  Bell,
  Send,
  CheckCircle2,
  Clock,
  ArrowLeft,
  RefreshCw,
  Users,
  MailCheck,
  TicketCheck
} from 'lucide-react';
import {
  worldFinalsApi,
  type WorldFinalsQualification,
  type QualificationStats
} from '@/api-client/world-finals.api-client';
import { seasonsApi } from '@/seasons/seasons.api-client';

export default function WorldFinalsAdminPage() {
  const navigate = useNavigate();
  const [qualifications, setQualifications] = useState<WorldFinalsQualification[]>([]);
  const [stats, setStats] = useState<QualificationStats | null>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingInvitation, setSendingInvitation] = useState<string | null>(null);
  const [sendingAllInvitations, setSendingAllInvitations] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    fetchSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchData();
    }
  }, [selectedSeasonId]);

  const fetchSeasons = async () => {
    try {
      const data = await seasonsApi.getAll();
      setSeasons(data);
      // Find current season and select it
      const currentSeason = data.find((s: any) => s.is_current);
      if (currentSeason) {
        setSelectedSeasonId(currentSeason.id);
      } else if (data.length > 0) {
        setSelectedSeasonId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch seasons:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qualificationsData, statsData] = await Promise.all([
        worldFinalsApi.getSeasonQualifications(selectedSeasonId),
        worldFinalsApi.getQualificationStats(selectedSeasonId),
      ]);
      setQualifications(qualificationsData);
      setStats(statsData);
    } catch (err) {
      setError('Failed to fetch qualification data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (qualificationId: string) => {
    try {
      setSendingInvitation(qualificationId);
      await worldFinalsApi.sendInvitation(qualificationId);
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Failed to send invitation:', err);
      alert('Failed to send invitation');
    } finally {
      setSendingInvitation(null);
    }
  };

  const handleSendAllInvitations = async () => {
    if (!confirm('Are you sure you want to send invitations to all qualified competitors who haven\'t received one yet?')) {
      return;
    }

    try {
      setSendingAllInvitations(true);
      const result = await worldFinalsApi.sendAllPendingInvitations(selectedSeasonId);
      alert(`Sent ${result.sent} invitations. ${result.failed} failed.`);
      await fetchData();
    } catch (err) {
      console.error('Failed to send invitations:', err);
      alert('Failed to send invitations');
    } finally {
      setSendingAllInvitations(false);
    }
  };

  const handleRecalculate = async () => {
    if (!confirm('Are you sure you want to recalculate all qualifications for this season? This will check all competitors against the current threshold.')) {
      return;
    }

    try {
      setRecalculating(true);
      const result = await worldFinalsApi.recalculateSeasonQualifications(selectedSeasonId);
      alert(`Recalculation complete. ${result.newQualifications} new qualifications, ${result.updatedQualifications} updated.`);
      await fetchData();
    } catch (err) {
      console.error('Failed to recalculate:', err);
      alert('Failed to recalculate qualifications');
    } finally {
      setRecalculating(false);
    }
  };

  const filteredQualifications = qualifications.filter((q) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      q.competitor_name.toLowerCase().includes(searchLower) ||
      q.meca_id.toString().includes(searchLower) ||
      q.competition_class.toLowerCase().includes(searchLower) ||
      q.user?.email?.toLowerCase().includes(searchLower)
    );
  });

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              World Finals Qualifications
            </h1>
            <p className="text-gray-400 mt-2">
              Manage qualified competitors and send pre-registration invitations
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Season Selection */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <label className="text-gray-400">Season:</label>
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} {season.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>

              {selectedSeason?.qualification_points_threshold ? (
                <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-sm">
                  Threshold: {selectedSeason.qualification_points_threshold} points
                </div>
              ) : (
                <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg text-sm">
                  No threshold set
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
                Recalculate
              </button>
              <button
                onClick={handleSendAllInvitations}
                disabled={sendingAllInvitations || !stats?.totalQualifications}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Send className={`h-4 w-4 ${sendingAllInvitations ? 'animate-pulse' : ''}`} />
                Send All Pending Invitations
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-yellow-500" />
                  <span className="text-gray-400 text-sm">Competitors</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.uniqueCompetitors}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="text-gray-400 text-sm">Qualifications</span>
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalQualifications}</div>
                <div className="text-xs text-gray-500">(per class)</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="h-5 w-5 text-blue-400" />
                  <span className="text-gray-400 text-sm">Notifications</span>
                </div>
                <div className="text-2xl font-bold text-blue-400">{stats.notificationsSent}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-5 w-5 text-green-400" />
                  <span className="text-gray-400 text-sm">Emails Sent</span>
                </div>
                <div className="text-2xl font-bold text-green-400">{stats.emailsSent}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MailCheck className="h-5 w-5 text-purple-400" />
                  <span className="text-gray-400 text-sm">Invitations</span>
                </div>
                <div className="text-2xl font-bold text-purple-400">{stats.invitationsSent}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TicketCheck className="h-5 w-5 text-orange-400" />
                  <span className="text-gray-400 text-sm">Redeemed</span>
                </div>
                <div className="text-2xl font-bold text-orange-400">{stats.invitationsRedeemed}</div>
              </div>
            </div>

            {/* Class Breakdown */}
            {stats.classesByQualifications.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Qualifications by Class</h3>
                <div className="flex flex-wrap gap-2">
                  {stats.classesByQualifications.map(({ className, count }) => (
                    <span
                      key={className}
                      className="px-3 py-1 bg-slate-700 text-white rounded-full text-sm"
                    >
                      {className}: <span className="font-bold text-yellow-400">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Search */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, MECA ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Qualifications List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500 rounded-xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        ) : filteredQualifications.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Qualified Competitors</h3>
            <p className="text-gray-400">
              {!selectedSeason?.qualification_points_threshold
                ? 'Set a qualification threshold for this season to start tracking qualifications.'
                : 'No competitors have reached the qualification threshold yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Competitor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">MECA ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Points</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Qualified</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredQualifications.map((qualification) => (
                  <tr key={qualification.id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <div className="ml-4">
                          <div className="text-white font-medium">{qualification.competitor_name}</div>
                          <div className="text-gray-400 text-sm">{qualification.user?.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-orange-400 font-mono font-bold">{qualification.meca_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-700 text-white rounded text-sm font-medium">
                        {qualification.competition_class}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xl font-bold text-green-400">{qualification.total_points}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300 text-sm">
                        {new Date(qualification.qualified_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {qualification.invitation_redeemed ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs">
                            <TicketCheck className="h-3 w-3" />
                            Registered
                          </span>
                        ) : qualification.invitation_sent ? (
                          <span className="flex items-center gap-1 text-purple-400 text-xs">
                            <Mail className="h-3 w-3" />
                            Invite Sent
                          </span>
                        ) : (
                          <>
                            {qualification.notification_sent && (
                              <span className="flex items-center gap-1 text-blue-400 text-xs">
                                <Bell className="h-3 w-3" />
                                Notified
                              </span>
                            )}
                            {qualification.email_sent && (
                              <span className="flex items-center gap-1 text-green-400 text-xs">
                                <CheckCircle2 className="h-3 w-3" />
                                Emailed
                              </span>
                            )}
                            {!qualification.notification_sent && !qualification.email_sent && (
                              <span className="flex items-center gap-1 text-gray-500 text-xs">
                                <Clock className="h-3 w-3" />
                                Pending
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {!qualification.invitation_sent && (
                        <button
                          onClick={() => handleSendInvitation(qualification.id)}
                          disabled={sendingInvitation === qualification.id}
                          className="px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          <Send className={`h-3 w-3 ${sendingInvitation === qualification.id ? 'animate-pulse' : ''}`} />
                          Send Invite
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
