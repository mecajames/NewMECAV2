import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Trophy, Award, User, MapPin, ArrowLeft, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/auth';
import { competitionResultsApi, CompetitionResult } from '@/competition-results';
import { competitionClassesApi, CompetitionClass } from '@/competition-classes';
import { profilesApi, Profile } from '@/profiles';
import { SeasonSelector } from '@/seasons';
import { getStorageUrl } from '@/lib/storage';

interface GroupedResults {
  [format: string]: {
    [className: string]: CompetitionResult[];
  };
}

export default function MemberResultsPage() {
  const { mecaId } = useParams<{ mecaId: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile, loading: authLoading } = useAuth();

  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [classes, setClasses] = useState<CompetitionClass[]>([]);
  const [memberProfile, setMemberProfile] = useState<Profile | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if current user has active membership
  const isActiveMember = useMemo(() => {
    if (!currentUserProfile) return false;
    if (currentUserProfile.membership_status === 'active') return true;
    // Also allow admins
    if (currentUserProfile.role === 'admin') return true;
    return false;
  }, [currentUserProfile]);

  // Check if the member being viewed has a public profile
  const hasPublicProfile = memberProfile?.is_public === true;

  useEffect(() => {
    if (!mecaId) return;

    fetchClasses();
    fetchMemberProfile();
  }, [mecaId]);

  useEffect(() => {
    if (!mecaId || authLoading) return;

    // Only fetch results if user is logged in and is an active member
    if (user && isActiveMember) {
      fetchResults();
    }
  }, [mecaId, selectedSeasonId, authLoading, user, isActiveMember]);

  const fetchClasses = async () => {
    try {
      const data = await competitionClassesApi.getActive();
      setClasses(data);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchMemberProfile = async () => {
    if (!mecaId) return;

    try {
      // Try to fetch the member's public profile by MECA ID
      const profiles = await profilesApi.searchByMecaId(mecaId);
      if (profiles && profiles.length > 0) {
        setMemberProfile(profiles[0]);
      }
    } catch (err) {
      console.error('Error fetching member profile:', err);
      // Not a critical error - profile may not exist or be public
    }
  };

  const fetchResults = async () => {
    if (!mecaId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await competitionResultsApi.getByMecaId(mecaId);

      // Filter by season if selected
      let filtered = data;
      if (selectedSeasonId) {
        filtered = data.filter(r =>
          (r.seasonId || r.season_id) === selectedSeasonId
        );
      }

      // Sort by event date descending, then by score
      filtered.sort((a, b) => {
        const dateA = a.event?.event_date ? new Date(a.event.event_date).getTime() : 0;
        const dateB = b.event?.event_date ? new Date(b.event.event_date).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.score || 0) - (a.score || 0);
      });

      setResults(filtered);
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('Failed to load competition results');
    }
    setLoading(false);
  };

  const getPlacementBadge = (placement: number) => {
    if (placement === 1) {
      return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
    }
    if (placement === 2) {
      return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
    }
    if (placement === 3) {
      return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
    }
    return 'bg-slate-700 text-gray-300';
  };

  // Group results by format and class
  const groupedResults: GroupedResults = useMemo(() => {
    const grouped: GroupedResults = {};

    results.forEach(result => {
      const classData = classes.find(c => c.id === (result.classId || result.class_id));
      const format = classData?.format || 'Unknown';
      const className = result.competitionClass || result.competition_class || 'Unknown';

      if (!grouped[format]) {
        grouped[format] = {};
      }
      if (!grouped[format][className]) {
        grouped[format][className] = [];
      }
      grouped[format][className].push(result);
    });

    return grouped;
  }, [results, classes]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalPoints = results.reduce((sum, r) => sum + (r.pointsEarned ?? r.points_earned ?? 0), 0);
    const eventsParticipated = new Set(results.map(r => r.eventId || r.event_id)).size;
    const firstPlace = results.filter(r => r.placement === 1).length;
    const secondPlace = results.filter(r => r.placement === 2).length;
    const thirdPlace = results.filter(r => r.placement === 3).length;

    return { totalPoints, eventsParticipated, firstPlace, secondPlace, thirdPlace };
  }, [results]);

  // Get member display name
  const memberName = useMemo(() => {
    if (memberProfile && hasPublicProfile) {
      return `${memberProfile.first_name || ''} ${memberProfile.last_name || ''}`.trim() || `MECA ID: ${mecaId}`;
    }
    // If no public profile, try to get name from results
    if (results.length > 0) {
      const name = results[0].competitorName || results[0].competitor_name;
      if (name) return name;
    }
    return `MECA ID: ${mecaId}`;
  }, [memberProfile, hasPublicProfile, results, mecaId]);

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20 bg-slate-800 rounded-xl">
            <Lock className="h-20 w-20 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Login Required</h2>
            <p className="text-gray-400 mb-6">
              You must be logged in to view member competition results.
            </p>
            <Link
              to="/login"
              className="inline-block px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not an active member
  if (!authLoading && user && !isActiveMember) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20 bg-slate-800 rounded-xl">
            <AlertCircle className="h-20 w-20 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Active Membership Required</h2>
            <p className="text-gray-400 mb-6">
              Only active MECA members can view detailed competitor results.
            </p>
            <Link
              to="/membership"
              className="inline-block px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              View Membership Options
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Results
        </button>

        {/* Header with Member Info */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Picture or Avatar */}
            <div className="flex-shrink-0">
              {memberProfile?.avatar_url && hasPublicProfile ? (
                <img
                  src={getStorageUrl(memberProfile.avatar_url)}
                  alt={memberName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-orange-500"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center border-4 border-orange-500">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            {/* Member Details */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{memberName}</h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-400">
                <span className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-orange-500" />
                  MECA ID: <span className="text-green-500 font-semibold">{mecaId}</span>
                </span>
                {memberProfile?.state && hasPublicProfile && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {memberProfile.city && `${memberProfile.city}, `}{memberProfile.state}
                  </span>
                )}
              </div>

              {/* Bio if public */}
              {memberProfile?.bio && hasPublicProfile && (
                <p className="mt-3 text-gray-300">{memberProfile.bio}</p>
              )}

              {/* Link to full public profile if available */}
              {hasPublicProfile && memberProfile?.id && (
                <Link
                  to={`/members/${memberProfile.id}`}
                  className="inline-block mt-3 text-orange-500 hover:text-orange-400 text-sm"
                >
                  View Full Profile
                </Link>
              )}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.totalPoints}</div>
                <div className="text-xs text-gray-400">Total Points</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{stats.eventsParticipated}</div>
                <div className="text-xs text-gray-400">Events</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.firstPlace}</div>
                <div className="text-xs text-gray-400">1st Place</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-300">{stats.secondPlace}</div>
                <div className="text-xs text-gray-400">2nd Place</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-400">{stats.thirdPlace}</div>
                <div className="text-xs text-gray-400">3rd Place</div>
              </div>
            </div>
          </div>
        </div>

        {/* Season Filter */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8">
          <SeasonSelector
            selectedSeasonId={selectedSeasonId}
            onSeasonChange={setSelectedSeasonId}
            showAllOption={true}
            autoSelectCurrent={true}
          />
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-slate-800 rounded-xl">
            <AlertCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">{error}</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedResults).map(([format, classesByName]) => (
              <div key={format} className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="bg-slate-700 px-6 py-4">
                  <h2 className="text-2xl font-bold text-white">
                    {format} Results
                    <span className="ml-3 text-sm bg-orange-500 text-white px-2.5 py-1 rounded-full">
                      {Object.values(classesByName).reduce((sum, arr) => sum + arr.length, 0)}
                    </span>
                  </h2>
                </div>

                <div className="p-6 space-y-6">
                  {Object.entries(classesByName).map(([className, classResults]) => (
                    <div key={className}>
                      <h3 className="text-lg font-semibold text-orange-400 mb-3 px-3">
                        {className}
                      </h3>
                      <div className="overflow-x-auto rounded-lg">
                        <table className="w-full">
                          <thead className="bg-slate-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Event</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Date</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Place</th>
                              {format === 'SPL' && (
                                <>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Wattage</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Frequency</th>
                                </>
                              )}
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Score</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Points</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {classResults.map((result) => {
                              const eventTitle = result.event?.title || 'Unknown Event';
                              const eventDate = result.event?.event_date
                                ? new Date(result.event.event_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'N/A';

                              return (
                                <tr
                                  key={result.id}
                                  className="hover:bg-slate-700/50 transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <Link
                                      to={`/results?eventId=${result.eventId || result.event_id}`}
                                      className="text-white hover:text-orange-400 transition-colors"
                                    >
                                      {eventTitle}
                                    </Link>
                                  </td>
                                  <td className="px-4 py-3 text-gray-400">{eventDate}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getPlacementBadge(
                                        result.placement
                                      )}`}
                                    >
                                      {result.placement}
                                    </span>
                                  </td>
                                  {format === 'SPL' && (
                                    <>
                                      <td className="px-4 py-3 text-gray-300">{result.wattage || '-'}</td>
                                      <td className="px-4 py-3 text-gray-300">{result.frequency || '-'}</td>
                                    </>
                                  )}
                                  <td className="px-4 py-3 text-right">
                                    <span className="text-lg font-bold text-white">{result.score}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 text-orange-500 font-semibold">
                                      <Award className="h-4 w-4" />
                                      {result.pointsEarned ?? result.points_earned}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-800 rounded-xl">
            <Trophy className="h-20 w-20 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">No competition results found</p>
            <p className="text-gray-500 mt-2">
              {selectedSeasonId ? 'Try selecting a different season.' : 'This member has no recorded results.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
