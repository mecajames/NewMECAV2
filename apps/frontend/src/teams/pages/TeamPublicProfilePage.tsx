import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  MapPin,
  Globe,
  ArrowLeft,
  User,
  Trophy,
  Medal,
  Calendar,
  Volume2,
  Music,
  X,
  Award,
  Target,
  TrendingUp,
  Move,
  Check,
  Camera,
  Loader2,
  UserPlus,
  Clock,
} from 'lucide-react';
import { teamsApi, Team, TeamPublicStats, PendingRequest } from '../teams.api-client';
import { seasonsApi, Season } from '@/seasons';
import { useAuth } from '@/auth';

const TEAM_TYPE_LABELS: Record<string, string> = {
  competitive: 'Competitive Team',
  casual: 'Casual Team',
  shop: 'Shop Team',
  club: 'Club',
  // Membership-based team types
  retailer: 'Retailer',
  manufacturer: 'Manufacturer',
  competitor_team: 'Competitor Team',
};

const TEAM_TYPE_COLORS: Record<string, string> = {
  competitive: 'bg-red-500/10 text-red-400 border-red-500/20',
  casual: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  shop: 'bg-green-500/10 text-green-400 border-green-500/20',
  club: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  // Membership-based team types
  retailer: 'bg-green-500/10 text-green-400 border-green-500/20',
  manufacturer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  competitor_team: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  owner: { label: 'Owner', color: 'bg-orange-500 text-white' },
  co_owner: { label: 'Co-Owner', color: 'bg-yellow-500 text-black' },
  moderator: { label: 'Moderator', color: 'bg-blue-500 text-white' },
  member: { label: 'Member', color: 'bg-slate-600 text-white' },
};

export default function TeamPublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [stats, setStats] = useState<TeamPublicStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Season filtering
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [loadingStats, setLoadingStats] = useState(false);

  // Position editing state
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [savingPosition, setSavingPosition] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Cover image upload state
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  // Join request state
  const [myPendingRequest, setMyPendingRequest] = useState<PendingRequest | null>(null);
  const [requestingToJoin, setRequestingToJoin] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [joinRequestMessage, setJoinRequestMessage] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Check if logged-in user is the team owner
  const isTeamOwner = user?.id === team?.captainId;

  // Check if logged-in user is already a member of this team
  const isTeamMember = team?.members?.some(m => m.userId === user?.id && m.status === 'active');

  // Check if user has a pending request to this team
  const hasPendingRequest = myPendingRequest?.teamId === team?.id;

  useEffect(() => {
    if (id) {
      fetchInitialData();
    }
  }, [id]);

  // Fetch user's team membership status and pending requests when logged in
  useEffect(() => {
    if (user) {
      fetchUserTeamStatus();
    }
  }, [user]);

  useEffect(() => {
    // Initialize position from team data
    if (team?.coverImagePosition) {
      setPosition(team.coverImagePosition);
    }
  }, [team]);

  // Re-fetch stats when season changes (but not on initial load)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  useEffect(() => {
    if (id && team && initialLoadComplete) {
      fetchStats(selectedSeason === 'all' ? undefined : selectedSeason);
    }
  }, [selectedSeason]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch team and seasons in parallel
      const [teamData, seasonsData] = await Promise.all([
        teamsApi.getPublicTeamById(id!),
        seasonsApi.getAll(),
      ]);

      setTeam(teamData);
      setSeasons(seasonsData);

      // Find current season and set as default
      const currentSeason = seasonsData.find(s => s.is_current || s.isCurrent);
      const defaultSeasonId = currentSeason?.id || 'all';
      setSelectedSeason(defaultSeasonId);

      // Fetch stats with the current season filter
      const statsData = await teamsApi.getTeamPublicStats(
        id!,
        defaultSeasonId === 'all' ? undefined : defaultSeasonId
      );
      setStats(statsData);

      setInitialLoadComplete(true);
    } catch (err: any) {
      console.error('Error fetching team:', err);
      setError('Team not found or is not public');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (seasonId?: string) => {
    if (!id) return;

    try {
      setLoadingStats(true);
      const statsData = await teamsApi.getTeamPublicStats(id, seasonId);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUserTeamStatus = async () => {
    try {
      // Get user's pending join requests
      const pendingRequests = await teamsApi.getMyPendingRequests();

      // Find if user has a pending request for this team
      const requestForThisTeam = pendingRequests.find(r => r.teamId === id);
      setMyPendingRequest(requestForThisTeam || null);
    } catch (err) {
      console.error('Error fetching user team status:', err);
    }
  };

  const handleRequestToJoin = async () => {
    if (!team) return;

    try {
      setRequestingToJoin(true);
      setJoinError(null);
      await teamsApi.requestToJoin(team.id, joinRequestMessage || undefined);
      setShowJoinModal(false);
      setJoinRequestMessage('');
      // Refresh pending request status
      await fetchUserTeamStatus();
    } catch (err: any) {
      console.error('Error requesting to join:', err);
      setJoinError(err.response?.data?.message || 'Failed to send join request');
    } finally {
      setRequestingToJoin(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!team) return;

    try {
      setCancellingRequest(true);
      await teamsApi.cancelJoinRequest(team.id);
      setMyPendingRequest(null);
    } catch (err) {
      console.error('Error cancelling request:', err);
    } finally {
      setCancellingRequest(false);
    }
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
    if (!team) return;

    try {
      setSavingPosition(true);
      await teamsApi.updateCoverImagePosition(team.id, position);
      setTeam({ ...team, coverImagePosition: position });
      setIsEditingPosition(false);
    } catch (err) {
      console.error('Error saving position:', err);
    } finally {
      setSavingPosition(false);
    }
  };

  const cancelEditing = () => {
    // Reset to saved position
    if (team?.coverImagePosition) {
      setPosition(team.coverImagePosition);
    } else {
      setPosition({ x: 50, y: 50 });
    }
    setIsEditingPosition(false);
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !team) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingCoverImage(true);
      const updatedTeam = await teamsApi.updateTeamLogo(team.id, file);
      setTeam(updatedTeam);
    } catch (err) {
      console.error('Error uploading cover image:', err);
      alert('Failed to upload cover image. Please try again.');
    } finally {
      setUploadingCoverImage(false);
      // Clear the input so the same file can be selected again
      if (coverImageInputRef.current) {
        coverImageInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Team Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'This team is not available'}</p>
          <button
            onClick={() => navigate('/teams')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Team Directory
          </button>
        </div>
      </div>
    );
  }

  // Sort members by role hierarchy
  const sortedMembers = [...(team.members || [])].sort((a, b) => {
    const roleOrder = { owner: 0, co_owner: 1, moderator: 2, member: 3 };
    return (roleOrder[a.role] ?? 4) - (roleOrder[b.role] ?? 4);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hidden file input for cover image upload */}
        <input
          type="file"
          ref={coverImageInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleCoverImageUpload}
        />

        {/* Page Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Team Profile</h1>
          <button
            onClick={() => navigate('/teams')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Team Directory
          </button>
        </div>

        {/* Team Header */}
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg mb-6">
          <div
            ref={imageContainerRef}
            className={`relative h-64 bg-gradient-to-br from-slate-700 to-slate-800 ${isEditingPosition ? 'cursor-move' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={`${team.name} logo`}
                className={`w-full h-full object-cover ${!isEditingPosition ? 'cursor-pointer' : ''} select-none`}
                style={{ objectPosition: `${position.x}% ${position.y}%` }}
                onClick={() => !isEditingPosition && setLightboxImage(team.logoUrl!)}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center relative group">
                <Shield className="h-32 w-32 text-slate-600" />
                {/* Upload prompt for team owners when no image */}
                {isTeamOwner && (
                  <button
                    onClick={() => coverImageInputRef.current?.click()}
                    disabled={uploadingCoverImage}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {uploadingCoverImage ? (
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    ) : (
                      <>
                        <Camera className="h-8 w-8 text-white mb-2" />
                        <span className="text-white text-sm font-medium">Upload Cover Image</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Position editing overlay */}
            {isEditingPosition && team.logoUrl && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                  Drag to reposition image
                </div>
              </div>
            )}

            {/* Edit buttons - only show for team owner with an image */}
            {isTeamOwner && team.logoUrl && !isEditingPosition && (
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={() => coverImageInputRef.current?.click()}
                  disabled={uploadingCoverImage}
                  className="bg-black/70 hover:bg-black/90 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {uploadingCoverImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  Change Image
                </button>
                <button
                  onClick={() => setIsEditingPosition(true)}
                  className="bg-black/70 hover:bg-black/90 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  <Move className="h-4 w-4" />
                  Adjust Position
                </button>
              </div>
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

          <div className="p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Team {team.name}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-gray-400">
                  {team.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {team.location}
                    </span>
                  )}

                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {team.members?.length || 0} members
                  </span>

                  {team.website && (
                    <a
                      href={team.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-orange-500 hover:text-orange-400 transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className={`px-4 py-2 rounded-full border font-medium ${TEAM_TYPE_COLORS[team.teamType] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                  {TEAM_TYPE_LABELS[team.teamType] || team.teamType}
                </div>

                {/* Join Request Button - show for logged-in users who are not already members of THIS team */}
                {user && !isTeamOwner && !isTeamMember && (
                  <>
                    {hasPendingRequest ? (
                      <button
                        onClick={handleCancelRequest}
                        disabled={cancellingRequest}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-600/30 transition-colors disabled:opacity-50"
                      >
                        {cancellingRequest ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                        Request Pending
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowJoinModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
                      >
                        <UserPlus className="h-4 w-4" />
                        Request to Join
                      </button>
                    )}
                  </>
                )}

                {/* Show member badge if user is already a member */}
                {isTeamMember && !isTeamOwner && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 border border-green-500/30 rounded-lg">
                    <Check className="h-4 w-4" />
                    Team Member
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {team.description && (
              <div className="mt-6">
                <p className="text-gray-300">{team.description}</p>
              </div>
            )}

            {/* Bio */}
            {team.bio && (
              <div className="mt-4">
                <p className="text-gray-400 whitespace-pre-wrap">{team.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Season Selector */}
        {stats && (
          <div className="bg-slate-800 rounded-xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-orange-500" />
                <span className="text-white font-semibold">Team Statistics</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-gray-400 text-sm">Season:</label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none min-w-[180px]"
                >
                  <option value="all">All Seasons</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name} ({season.year})
                      {(season.is_current || season.isCurrent) ? ' - Current' : ''}
                    </option>
                  ))}
                </select>
                {loadingStats && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-orange-500 border-r-transparent"></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 ${loadingStats ? 'opacity-50' : ''}`}>
            <div className="bg-slate-800 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="text-3xl font-bold text-white">{stats.totalFirstPlace}</div>
              <div className="text-sm text-gray-400">1st Place</div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-400/10 flex items-center justify-center mx-auto mb-3">
                <Medal className="h-6 w-6 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats.totalSecondPlace}</div>
              <div className="text-sm text-gray-400">2nd Place</div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-600/10 flex items-center justify-center mx-auto mb-3">
                <Award className="h-6 w-6 text-amber-600" />
              </div>
              <div className="text-3xl font-bold text-white">{stats.totalThirdPlace}</div>
              <div className="text-sm text-gray-400">3rd Place</div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-orange-500" />
              </div>
              <div className="text-3xl font-bold text-white">{stats.totalPoints}</div>
              <div className="text-sm text-gray-400">Total Points</div>
            </div>
          </div>
        )}

        {/* Additional Stats Row */}
        {stats && (
          <div className={`grid grid-cols-2 gap-4 mb-6 ${loadingStats ? 'opacity-50' : ''}`}>
            <div className="bg-slate-800 rounded-xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.totalCompetitions}</div>
                <div className="text-sm text-gray-400">Total Competitions</div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.totalEventsAttended}</div>
                <div className="text-sm text-gray-400">Events Attended</div>
              </div>
            </div>
          </div>
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 ${loadingStats ? 'opacity-50' : ''}`}>
          {/* Top SPL Scores */}
          {stats && stats.topSplScores.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Volume2 className="h-5 w-5 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-white">Top SPL Scores</h2>
              </div>
              <div className="space-y-3">
                {stats.topSplScores.map((score, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        'bg-amber-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">{score.competitorName}</div>
                        <div className="text-xs text-gray-400">
                          {score.eventName} {score.date && `- ${score.date}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-red-400">{score.score.toFixed(1)} dB</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top SQ Scores */}
          {stats && stats.topSqScores.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Music className="h-5 w-5 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-white">Top SQ Scores</h2>
              </div>
              <div className="space-y-3">
                {stats.topSqScores.map((score, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        'bg-amber-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">{score.competitorName}</div>
                        <div className="text-xs text-gray-400">
                          {score.eventName} {score.date && `- ${score.date}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-green-400">{score.score.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Events */}
        {stats && stats.recentEvents.length > 0 && (
          <div className={`bg-slate-800 rounded-xl p-6 shadow-lg mb-6 ${loadingStats ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Recent Events</h2>
            </div>
            <div className="space-y-3">
              {stats.recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <div>
                    <div className="text-white font-medium">{event.name}</div>
                    <div className="text-sm text-gray-400">
                      {event.date} {event.location && `- ${event.location}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-orange-500">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{event.membersAttended}</span>
                    <span className="text-gray-400 text-sm">attended</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Team Members</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                onClick={() => member.user?.id && navigate(`/members/${member.user.id}`)}
              >
                {member.user?.profile_picture_url ? (
                  <img
                    src={member.user.profile_picture_url}
                    alt={`${member.user.first_name}'s avatar`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center">
                    <User className="h-6 w-6 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium truncate">
                      {member.user?.first_name} {member.user?.last_name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_BADGES[member.role]?.color || 'bg-slate-600 text-white'}`}>
                      {ROLE_BADGES[member.role]?.label || member.role}
                    </span>
                  </div>
                  {member.user?.meca_id && (
                    <div className="text-sm text-orange-500 font-mono">#{member.user.meca_id}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gallery */}
        {team.galleryImages && team.galleryImages.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {team.galleryImages.map((imageUrl, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setLightboxImage(imageUrl)}
                >
                  <img
                    src={imageUrl}
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Join Request Modal */}
      {showJoinModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Request to Join Team</h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4 p-3 bg-slate-700/50 rounded-lg">
                <Shield className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-white font-semibold">Team {team?.name}</p>
                  <p className="text-sm text-gray-400">{team?.members?.length || 0} members</p>
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message to Team Owner (optional)
              </label>
              <textarea
                value={joinRequestMessage}
                onChange={(e) => setJoinRequestMessage(e.target.value)}
                placeholder="Introduce yourself and explain why you'd like to join this team..."
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{joinRequestMessage.length}/500 characters</p>

              {joinError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{joinError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestToJoin}
                disabled={requestingToJoin}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {requestingToJoin ? (
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
          </div>
        </div>
      )}
    </div>
  );
}
