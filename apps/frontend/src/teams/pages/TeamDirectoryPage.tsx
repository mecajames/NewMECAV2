import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, MapPin, User, Globe, Shield, Clock, UserPlus, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { teamsApi, Team, PendingRequest } from '../teams.api-client';
import { SEOHead, useTeamDirectorySEO } from '@/shared/seo';
import { useAuth } from '@/auth';

const TEAM_TYPE_LABELS: Record<string, string> = {
  competitive: 'Competitive',
  casual: 'Casual',
  shop: 'Shop',
  club: 'Club',
  // Membership-based team types
  retailer: 'Retailer',
  manufacturer: 'Manufacturer',
  competitor_team: 'Competitor Team',
};

const TEAM_TYPE_COLORS: Record<string, string> = {
  competitive: 'bg-red-500/10 text-red-400',
  casual: 'bg-blue-500/10 text-blue-400',
  shop: 'bg-green-500/10 text-green-400',
  club: 'bg-purple-500/10 text-purple-400',
  // Membership-based team types
  retailer: 'bg-green-500/10 text-green-400',
  manufacturer: 'bg-blue-500/10 text-blue-400',
  competitor_team: 'bg-orange-500/10 text-orange-400',
};

export default function TeamDirectoryPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAuthenticated = !!profile;
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamTypeFilter, setTeamTypeFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const seoProps = useTeamDirectorySEO();

  // Join request state
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  useEffect(() => {
    fetchPublicTeams();
    if (isAuthenticated && profile) {
      fetchUserTeamData();
    }
  }, [isAuthenticated, profile]);

  const fetchPublicTeams = async () => {
    try {
      setLoading(true);
      const data = await teamsApi.getPublicTeams();
      setTeams(data);
    } catch (err: any) {
      console.error('Error fetching teams:', err);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTeamData = async () => {
    if (!profile) return;
    try {
      const [userTeam, userPendingRequests] = await Promise.all([
        teamsApi.getTeamByUserId(profile.id),
        teamsApi.getMyPendingRequests(),
      ]);
      setMyTeam(userTeam);
      setPendingRequests(userPendingRequests);
    } catch (err) {
      console.error('Error fetching user team data:', err);
    }
  };

  const filteredTeams = teams.filter(team => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      team.name.toLowerCase().includes(searchLower) ||
      team.description?.toLowerCase().includes(searchLower) ||
      team.location?.toLowerCase().includes(searchLower) ||
      team.owner?.first_name?.toLowerCase().includes(searchLower) ||
      team.owner?.last_name?.toLowerCase().includes(searchLower) ||
      team.representativeName?.toLowerCase().includes(searchLower);

    // For team type filter, also match retailer->shop and manufacturer->club mappings
    let matchesType = teamTypeFilter === 'all' || team.teamType === teamTypeFilter;
    if (!matchesType && teamTypeFilter === 'shop' && team.teamType === 'retailer') matchesType = true;
    if (!matchesType && teamTypeFilter === 'club' && team.teamType === 'manufacturer') matchesType = true;

    return matchesSearch && matchesType;
  });

  // Helper to get member count from either memberCount or members array
  const getMemberCount = (team: Team): number => {
    return team.memberCount ?? team.members?.length ?? 1;
  };

  // Check if user is already a member of a team
  const isUserOnTeam = (teamId: string): boolean => {
    if (!profile || !myTeam) return false;
    return myTeam.id === teamId;
  };

  // Check if user already has a pending request for this team
  const hasPendingRequest = (teamId: string): boolean => {
    return pendingRequests.some(req => req.teamId === teamId);
  };

  // Open join modal
  const openJoinModal = (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTeamId(teamId);
    setJoinMessage('');
    setRequestError(null);
    setRequestSuccess(false);
    setShowJoinModal(true);
  };

  // Close join modal
  const closeJoinModal = () => {
    setShowJoinModal(false);
    setSelectedTeamId(null);
    setJoinMessage('');
    setRequestError(null);
    setRequestSuccess(false);
  };

  // Submit join request
  const handleSubmitJoinRequest = async () => {
    if (!selectedTeamId) return;

    setSendingRequest(true);
    setRequestError(null);

    try {
      await teamsApi.requestToJoin(selectedTeamId, joinMessage || undefined);
      setRequestSuccess(true);
      // Refresh pending requests
      await fetchUserTeamData();
      // Close modal after brief success message
      setTimeout(() => {
        closeJoinModal();
      }, 1500);
    } catch (err: any) {
      setRequestError(err.response?.data?.message || 'Failed to send join request');
    } finally {
      setSendingRequest(false);
    }
  };

  const selectedTeam = selectedTeamId ? teams.find(t => t.id === selectedTeamId) : null;

  if (loading) {
    return (
      <>
        <SEOHead {...seoProps} />
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead {...seoProps} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-10 w-10 text-orange-500" />
              <h1 className="text-4xl font-bold text-white">Team Directory</h1>
            </div>
            <p className="text-gray-400">Browse MECA competition teams</p>
          </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by team name, location, or owner..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>

          <select
            value={teamTypeFilter}
            onChange={(e) => setTeamTypeFilter(e.target.value)}
            className="px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          >
            <option value="all">All Types</option>
            <option value="retailer">Retailers</option>
            <option value="manufacturer">Manufacturers</option>
            <option value="competitor_team">Competitor Teams</option>
            <option value="competitive">Competitive</option>
            <option value="casual">Casual</option>
            <option value="shop">Shop</option>
            <option value="club">Club</option>
          </select>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <p className="text-gray-400">
            Showing {filteredTeams.length} of {teams.length} teams
          </p>
        </div>

        {/* Teams Grid */}
        {filteredTeams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => {
              const userOnThisTeam = isUserOnTeam(team.id);
              const hasPending = hasPendingRequest(team.id);

              return (
                <div
                  key={team.id}
                  className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                  onClick={() => navigate(`/teams/${team.id}`)}
                >
                  {/* Team Header with Logo */}
                  <div className="relative h-48 bg-gradient-to-br from-slate-700 to-slate-800">
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt={`${team.name} logo`}
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: team.coverImagePosition
                            ? `${team.coverImagePosition.x}% ${team.coverImagePosition.y}%`
                            : '50% 50%'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Shield className="h-24 w-24 text-slate-600" />
                      </div>
                    )}

                    {/* Team Type Badge */}
                    <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${TEAM_TYPE_COLORS[team.teamType] || 'bg-slate-500/10 text-slate-400'}`}>
                      {TEAM_TYPE_LABELS[team.teamType] || team.teamType}
                    </div>

                    {/* Member Count Badge */}
                    <div className="absolute top-3 left-3 bg-slate-900/80 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {getMemberCount(team)} {getMemberCount(team) === 1 ? 'member' : 'members'}
                    </div>
                  </div>

                  {/* Team Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-1">
                      Team {team.name}
                    </h3>

                    {team.location && (
                      <p className="text-gray-400 text-sm mb-3 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {team.location}
                      </p>
                    )}

                    {team.description && (
                      <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                        {team.description}
                      </p>
                    )}

                    {/* Owner Info */}
                    {team.owner && (
                      <div className="flex items-center gap-3 pt-4 border-t border-slate-700">
                        {team.owner.profile_picture_url ? (
                          <img
                            src={team.owner.profile_picture_url}
                            alt={`${team.owner.first_name}'s avatar`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                            <User className="h-5 w-5 text-slate-500" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-400">Team Owner</p>
                          <p className="text-white font-medium">
                            {team.owner.first_name} {team.owner.last_name}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Website Link */}
                    {team.website && (
                      <a
                        href={team.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-4 flex items-center gap-2 text-orange-500 hover:text-orange-400 text-sm transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        Visit Website
                      </a>
                    )}

                    {/* Join Request Button - Only for authenticated users */}
                    {isAuthenticated && (
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        {userOnThisTeam ? (
                          <div className="flex items-center gap-2 text-green-400 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            You're a member
                          </div>
                        ) : myTeam ? (
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Users className="h-4 w-4" />
                            Already on a team
                          </div>
                        ) : hasPending ? (
                          <div className="flex items-center gap-2 text-yellow-400 text-sm">
                            <Clock className="h-4 w-4" />
                            Request pending
                          </div>
                        ) : (
                          <button
                            onClick={(e) => openJoinModal(team.id, e)}
                            className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <UserPlus className="h-4 w-4" />
                            Request to Join
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Teams Found</h3>
            <p className="text-gray-400">
              {searchTerm || teamTypeFilter !== 'all'
                ? 'No teams match your search criteria'
                : 'No teams have been registered yet'}
            </p>
          </div>
        )}
        </div>
      </div>

      {/* Join Request Modal */}
      {showJoinModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Request to Join Team</h3>
              <button
                onClick={closeJoinModal}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {requestSuccess ? (
              <div className="text-center py-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-white mb-2">Request Sent!</h4>
                <p className="text-gray-400">
                  Your request to join Team {selectedTeam.name} has been sent.
                  The team owner will review your request.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-4 p-4 bg-slate-700 rounded-lg">
                    <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {selectedTeam.logoUrl ? (
                        <img
                          src={selectedTeam.logoUrl}
                          alt={selectedTeam.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Shield className="h-8 w-8 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">Team {selectedTeam.name}</h4>
                      {selectedTeam.location && (
                        <p className="text-gray-400 text-sm flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedTeam.location}
                        </p>
                      )}
                      <p className="text-gray-400 text-sm">
                        {getMemberCount(selectedTeam as Team)} {getMemberCount(selectedTeam as Team) === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message to Team Owner (optional)
                  </label>
                  <textarea
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    placeholder="Introduce yourself or explain why you'd like to join..."
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-gray-500 text-xs mt-1 text-right">
                    {joinMessage.length}/500
                  </p>
                </div>

                {requestError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{requestError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={closeJoinModal}
                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitJoinRequest}
                    disabled={sendingRequest}
                    className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {sendingRequest ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Send Request
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
