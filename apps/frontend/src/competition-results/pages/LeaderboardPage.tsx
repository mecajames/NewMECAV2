import { useEffect, useState, useCallback } from 'react';
import { Trophy, TrendingUp, Filter, Medal } from 'lucide-react';
import { competitionResultsApi } from '@/competition-results';
import { SeasonSelector } from '@/seasons';
import { SEOHead, useLeaderboardSEO } from '@/shared/seo';

interface LeaderboardEntry {
  competitor_id: string;
  competitor_name: string;
  competition_class: string;
  total_points: number;
  events_participated: number;
  event_ids: Set<string>; // Track unique event IDs
  first_place: number;
  second_place: number;
  third_place: number;
  best_score: number;
  meca_id?: string;
  membership_expiry?: string;
}

type RankByType = 'points' | 'score';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [rankBy, setRankBy] = useState<RankByType>('points');
  const [classes, setClasses] = useState<string[]>([]);
  const [_formats, setFormats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostEventsAttended, setMostEventsAttended] = useState<LeaderboardEntry[]>([]);
  const [highestSPLScores, setHighestSPLScores] = useState<any[]>([]);
  const seoProps = useLeaderboardSEO();

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedSeasonId, selectedClass, selectedFormat, rankBy]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Use optimized backend endpoint with SQL aggregation
      const leaderboardData = await competitionResultsApi.getLeaderboard({
        seasonId: selectedSeasonId || undefined,
        format: selectedFormat !== 'all' ? selectedFormat : undefined,
        competitionClass: selectedClass !== 'all' ? selectedClass : undefined,
        rankBy,
        limit: 10,
      });

      // Transform backend data to match frontend interface
      const processed: LeaderboardEntry[] = leaderboardData.map((entry: any) => ({
        competitor_id: entry.competitor_id || '',
        competitor_name: entry.competitor_name,
        competition_class: entry.competition_class || 'Overall',
        total_points: entry.total_points || 0,
        events_participated: entry.events_participated || 0,
        event_ids: new Set<string>(), // Not used with backend aggregation
        first_place: entry.first_place || 0,
        second_place: entry.second_place || 0,
        third_place: entry.third_place || 0,
        best_score: entry.best_score || 0,
        meca_id: entry.meca_id,
        membership_expiry: entry.membership_expiry,
      }));

      setLeaderboard(processed);

      // Fetch additional stats for "All Classes" view (only if showing all classes)
      if (selectedClass === 'all') {
        // Get top 3 by events attended
        const byEventsData = await competitionResultsApi.getLeaderboard({
          seasonId: selectedSeasonId || undefined,
          format: selectedFormat !== 'all' ? selectedFormat : undefined,
          rankBy: 'points', // Sorted by points, but we'll re-sort by events
          limit: 50, // Get more to find top event attendees
        });
        const byEvents = byEventsData
          .map((e: any) => ({
            competitor_id: e.competitor_id || '',
            competitor_name: e.competitor_name,
            competition_class: 'Overall',
            total_points: e.total_points || 0,
            events_participated: e.events_participated || 0,
            event_ids: new Set<string>(),
            first_place: e.first_place || 0,
            second_place: e.second_place || 0,
            third_place: e.third_place || 0,
            best_score: e.best_score || 0,
            meca_id: e.meca_id,
            membership_expiry: e.membership_expiry,
          }))
          .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.events_participated - a.events_participated)
          .slice(0, 3);
        setMostEventsAttended(byEvents);

        // Get top 3 SPL scores
        const splData = await competitionResultsApi.getLeaderboard({
          seasonId: selectedSeasonId || undefined,
          format: 'SPL',
          rankBy: 'score',
          limit: 3,
        });
        const splByScore = splData.map((e: any) => ({
          competitor_name: e.competitor_name,
          meca_id: e.meca_id,
          score: e.best_score || 0,
          competition_class: e.competition_class,
          membership_expiry: e.membership_expiry,
        }));
        setHighestSPLScores(splByScore);
      } else {
        setMostEventsAttended([]);
        setHighestSPLScores([]);
      }

      // Fetch available classes for the dropdown using dedicated endpoint
      try {
        const classesData = await competitionResultsApi.getClassesWithResults(
          selectedFormat !== 'all' ? selectedFormat : undefined,
          selectedSeasonId || undefined
        );
        const classNames = classesData
          .map((c) => c.className)
          .filter(Boolean);
        setClasses(Array.from(new Set(classNames)).sort());
      } catch {
        // Ignore error for classes fetch
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }

    setLoading(false);
  };

  const getMecaIdDisplay = useCallback((mecaId?: string, membershipExpiry?: string) => {
    // Non-member
    if (!mecaId || mecaId === '999999') {
      return { text: 'Non Member', color: 'text-gray-500' };
    }

    // Check if membership is expired
    if (membershipExpiry) {
      const expiryDate = new Date(membershipExpiry);
      const now = new Date();
      if (expiryDate < now) {
        return { text: mecaId, color: 'text-red-500' };
      }
    }

    // Valid membership
    return { text: mecaId, color: 'text-green-500' };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <SEOHead {...seoProps} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-yellow-400 to-orange-600 rounded-full mb-4">
            <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">Top 10 Leaderboard</h1>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg">
            The best competitors based on {rankBy === 'points' ? 'total points earned' : 'highest score achieved'}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-16 bg-slate-800 rounded-xl p-6">
          <div className="flex flex-wrap items-center gap-6 mb-6">
            {/* Season Filter */}
            <SeasonSelector
              selectedSeasonId={selectedSeasonId}
              onSeasonChange={setSelectedSeasonId}
              showAllOption={true}
              autoSelectCurrent={true}
            />

            {/* Rank By Filter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-300">
                <TrendingUp className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">Rank By:</span>
              </div>
              <select
                value={rankBy}
                onChange={(e) => setRankBy(e.target.value as RankByType)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 hover:bg-slate-600 transition-colors"
              >
                <option value="points">Total Points</option>
                <option value="score">Highest Score</option>
              </select>
            </div>

            {/* Class Filter */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 text-gray-300">
                <Filter className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">Class:</span>
              </div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="min-w-0 max-w-[200px] sm:max-w-[250px] px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 hover:bg-slate-600 transition-colors truncate"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Format Toggle Buttons */}
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-300">Format:</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedFormat(selectedFormat === 'SPL' ? 'all' : 'SPL');
                  setSelectedClass('all');
                }}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  selectedFormat === 'SPL'
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                SPL
              </button>
              <button
                onClick={() => {
                  setSelectedFormat(selectedFormat === 'SQL' ? 'all' : 'SQL');
                  setSelectedClass('all');
                }}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  selectedFormat === 'SQL'
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                SQL
              </button>
            </div>
            {selectedFormat !== 'all' && (
              <button
                onClick={() => {
                  setSelectedFormat('all');
                  setSelectedClass('all');
                }}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Class Name Heading */}
        {selectedClass !== 'all' && (
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-white">{selectedClass}</h2>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : leaderboard.length > 0 ? (
          <>
            {/* Top 3 Podium - Only show if we have 3 or more */}
            {leaderboard.length >= 3 ? (
              <div className="mb-12">
                {/* Podium Display */}
                <div className="flex items-end justify-center gap-4 mb-8">
                  {/* 2nd Place - Left */}
                  {leaderboard[1] && (() => {
                    const entry = leaderboard[1];
                    const mecaDisplay = getMecaIdDisplay(entry.meca_id, entry.membership_expiry);
                    return (
                      <div className="flex flex-col items-center">
                        <div className="bg-slate-800 rounded-xl p-6 border-2 border-gray-400 mb-4 w-64 text-center">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Medal className="h-10 w-10 text-white" />
                          </div>
                          <div className="text-gray-400 text-sm font-semibold mb-1">2nd</div>
                          <h3 className="text-xl font-bold text-white mb-2">{entry.competitor_name}</h3>
                          <div className={`text-sm font-semibold ${mecaDisplay.color} mb-3`}>{mecaDisplay.text}</div>
                          <div className="text-3xl font-bold text-gray-400">
                            {rankBy === 'points' ? entry.total_points : entry.best_score.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">{rankBy === 'points' ? 'points' : 'score'}</div>
                        </div>
                        <div className="w-64 h-32 bg-gradient-to-t from-gray-400 to-gray-500 rounded-t-lg flex items-center justify-center">
                          <span className="text-6xl font-bold text-white opacity-50">2</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 1st Place - Center (Elevated) */}
                  {leaderboard[0] && (() => {
                    const entry = leaderboard[0];
                    const mecaDisplay = getMecaIdDisplay(entry.meca_id, entry.membership_expiry);
                    return (
                      <div className="flex flex-col items-center -mt-8">
                        <div className="bg-slate-800 rounded-xl p-6 border-4 border-yellow-500 mb-4 w-72 text-center shadow-2xl">
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Trophy className="h-12 w-12 text-white" />
                          </div>
                          <div className="text-yellow-500 text-sm font-semibold mb-1">1st</div>
                          <h3 className="text-2xl font-bold text-white mb-2">{entry.competitor_name}</h3>
                          <div className={`text-sm font-semibold ${mecaDisplay.color} mb-3`}>{mecaDisplay.text}</div>
                          <div className="text-4xl font-bold text-yellow-500">
                            {rankBy === 'points' ? entry.total_points : entry.best_score.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">{rankBy === 'points' ? 'points' : 'score'}</div>
                        </div>
                        <div className="w-72 h-40 bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-lg flex items-center justify-center">
                          <span className="text-7xl font-bold text-white opacity-50">1</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3rd Place - Right */}
                  {leaderboard[2] && (() => {
                    const entry = leaderboard[2];
                    const mecaDisplay = getMecaIdDisplay(entry.meca_id, entry.membership_expiry);
                    return (
                      <div className="flex flex-col items-center">
                        <div className="bg-slate-800 rounded-xl p-6 border-2 border-orange-500 mb-4 w-64 text-center">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Medal className="h-10 w-10 text-white" />
                          </div>
                          <div className="text-orange-500 text-sm font-semibold mb-1">3rd</div>
                          <h3 className="text-xl font-bold text-white mb-2">{entry.competitor_name}</h3>
                          <div className={`text-sm font-semibold ${mecaDisplay.color} mb-3`}>{mecaDisplay.text}</div>
                          <div className="text-3xl font-bold text-orange-500">
                            {rankBy === 'points' ? entry.total_points : entry.best_score.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">{rankBy === 'points' ? 'points' : 'score'}</div>
                        </div>
                        <div className="w-64 h-24 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg flex items-center justify-center">
                          <span className="text-6xl font-bold text-white opacity-50">3</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              /* Show simple list for 1-2 results */
              <div className="mb-12">
                <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-slate-700">
                    <h2 className="text-2xl font-bold text-white">Top Performers</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-700">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Rank</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Competitor</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">MECA ID</th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Events</th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Wins</th>
                          <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">
                            {rankBy === 'points' ? 'Total Points' : 'Best Score'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {leaderboard.map((entry, index) => {
                          const rank = index + 1;
                          const mecaDisplay = getMecaIdDisplay(entry.meca_id, entry.membership_expiry);
                          return (
                            <tr key={`${entry.competitor_id || entry.competitor_name}_${index}`} className="hover:bg-slate-700/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                                  rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                                  rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                                  'bg-slate-700 text-white'
                                }`}>
                                  {rank}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-semibold text-white text-lg">{entry.competitor_name}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`font-semibold ${mecaDisplay.color}`}>{mecaDisplay.text}</div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-1 text-gray-400">
                                  <TrendingUp className="h-4 w-4" />
                                  <span>{entry.events_participated}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {entry.first_place > 0 && (
                                    <span className="inline-flex items-center gap-1 text-yellow-400 text-sm">
                                      <Trophy className="h-4 w-4" />
                                      {entry.first_place}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="text-3xl font-bold text-orange-500">
                                  {rankBy === 'points' ? entry.total_points : entry.best_score.toFixed(2)}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Remaining Rankings (4-10) */}
            {leaderboard.length > 3 && (
              <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 bg-slate-700">
                  <h2 className="text-2xl font-bold text-white">Complete Rankings</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Rank</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Competitor</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">MECA ID</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Events</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Wins</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">
                          {rankBy === 'points' ? 'Total Points' : 'Best Score'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {leaderboard.slice(3).map((entry, index) => {
                        const rank = index + 4;
                        const mecaDisplay = getMecaIdDisplay(entry.meca_id, entry.membership_expiry);

                        return (
                          <tr key={`${entry.competitor_id || entry.competitor_name}_${index}`} className="hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-700 text-white font-bold">
                                {rank}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-white">{entry.competitor_name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`font-semibold ${mecaDisplay.color}`}>{mecaDisplay.text}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-1 text-gray-400">
                                <TrendingUp className="h-4 w-4" />
                                <span>{entry.events_participated}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {entry.first_place > 0 && (
                                  <span className="inline-flex items-center gap-1 text-yellow-400 text-sm">
                                    <Trophy className="h-4 w-4" />
                                    {entry.first_place}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="text-2xl font-bold text-orange-500">
                                {rankBy === 'points' ? entry.total_points : entry.best_score.toFixed(2)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Additional Stats for "All Classes" View */}
            {selectedClass === 'all' && (mostEventsAttended.length > 0 || highestSPLScores.length > 0) && (
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Most Events Attended */}
                {mostEventsAttended.length > 0 && (
                  <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
                      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="h-6 w-6" />
                        Most Events Attended
                      </h3>
                    </div>
                    <div className="p-6">
                      {mostEventsAttended.map((entry, index) => {
                        const mecaDisplay = getMecaIdDisplay(entry.meca_id, entry.membership_expiry);
                        return (
                          <div key={index} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-b-0">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                index === 0 ? 'bg-yellow-500 text-white' :
                                index === 1 ? 'bg-gray-400 text-white' :
                                'bg-orange-500 text-white'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{entry.competitor_name}</div>
                                <div className={`text-sm ${mecaDisplay.color}`}>{mecaDisplay.text}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-400">{entry.events_participated}</div>
                              <div className="text-xs text-gray-400">events</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Highest SPL Scores */}
                {highestSPLScores.length > 0 && (
                  <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700">
                      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Trophy className="h-6 w-6" />
                        Highest SPL Scores
                      </h3>
                    </div>
                    <div className="p-6">
                      {highestSPLScores.map((entry, index) => {
                        const mecaDisplay = getMecaIdDisplay(entry.meca_id, entry.membership_expiry);
                        return (
                          <div key={index} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-b-0">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                index === 0 ? 'bg-yellow-500 text-white' :
                                index === 1 ? 'bg-gray-400 text-white' :
                                'bg-orange-500 text-white'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{entry.competitor_name}</div>
                                <div className={`text-sm ${mecaDisplay.color}`}>{mecaDisplay.text}</div>
                                <div className="text-xs text-gray-400">{entry.competition_class}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-purple-400">{entry.score.toFixed(2)}</div>
                              <div className="text-xs text-gray-400">dB</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-500 mb-4">NO RESULTS</h2>
            <p className="text-2xl text-red-500">No competitors competed in this class for the selected season</p>
          </div>
        )}
      </div>
    </div>
  );
}
