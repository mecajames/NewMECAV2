import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Filter, Medal } from 'lucide-react';
import { competitionResultsApi, CompetitionResult } from '@/competition-results';
import { eventsApi } from '@/events';
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

  const processResults = (results: any[], sortBy: RankByType = 'points', allEvents: any[] = []): LeaderboardEntry[] => {
    const aggregated: { [key: string]: LeaderboardEntry } = {};

    // Build a map of event_id -> event data for quick lookup
    const eventMap = new Map<string, any>();
    allEvents.forEach(event => {
      eventMap.set(event.id, event);
    });

    results.forEach((result) => {
      const compClass = result.competitionClass || result.competition_class || '';
      const key = `${result.competitor_id || result.competitor_name}_${compClass}`;
      const mecaId = result.mecaId || result.meca_id;
      const membershipExpiry = result.competitor?.membership_expiry;
      const score = result.score || 0;
      const eventId = result.event_id || result.eventId || '';

      // Get event data to check if it's a multi-day State/World Finals
      const eventData = eventMap.get(eventId);
      const isMultiDayFinals = eventData?.multi_day_group_id &&
        (eventData?.event_type === 'state_finals' || eventData?.event_type === 'world_finals');

      // For multi-day State/World Finals, use the group ID to count as 1 event
      // For regular events (including regular multi-day), use event_id (each day = separate event)
      const eventKey = isMultiDayFinals ? eventData.multi_day_group_id : eventId;

      if (!aggregated[key]) {
        aggregated[key] = {
          competitor_id: result.competitor_id || '',
          competitor_name: result.competitor_name,
          competition_class: compClass,
          total_points: 0,
          events_participated: 0,
          event_ids: new Set<string>(),
          first_place: 0,
          second_place: 0,
          third_place: 0,
          best_score: score,
          meca_id: mecaId,
          membership_expiry: membershipExpiry,
        };
      }

      aggregated[key].total_points += result.points_earned || 0;
      // Track unique events - uses group ID for State/World Finals, event ID for others
      if (eventKey) {
        aggregated[key].event_ids.add(eventKey);
      }
      aggregated[key].best_score = Math.max(aggregated[key].best_score, score);

      if (result.placement === 1) aggregated[key].first_place += 1;
      if (result.placement === 2) aggregated[key].second_place += 1;
      if (result.placement === 3) aggregated[key].third_place += 1;
    });

    // Calculate events_participated from unique event IDs and sort
    const entries = Object.values(aggregated);
    entries.forEach(entry => {
      entry.events_participated = entry.event_ids.size;
    });

    return entries.sort((a, b) => {
      if (sortBy === 'score') {
        return b.best_score - a.best_score;
      }
      return b.total_points - a.total_points;
    });
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Fetch both results and events in parallel
      const [results, allEvents] = await Promise.all([
        competitionResultsApi.getAll(1, 1000),
        eventsApi.getAll(1, 1000)
      ]);

      // Extract unique classes based on selected format, and all formats
      const classSet = new Set<string>();
      const formatSet = new Set<string>();
      results.forEach((r: any) => {
        const compClass = r.competitionClass || r.competition_class;
        const format = r.format;
        if (format) formatSet.add(format);
        // Only add class if it matches selected format (or all formats selected)
        if (compClass && (selectedFormat === 'all' || format === selectedFormat)) {
          classSet.add(compClass);
        }
      });
      setClasses(Array.from(classSet).sort());
      setFormats(Array.from(formatSet).sort());

      // Filter by season if selected
      let filtered = selectedSeasonId
        ? results.filter((r: CompetitionResult) => r.season_id === selectedSeasonId)
        : results;

      // Filter by format if selected
      if (selectedFormat !== 'all') {
        filtered = filtered.filter((r: any) => r.format === selectedFormat);
      }

      // Process results to aggregate by competitor and class
      // Pass events so we can check for multi-day State/World Finals
      let processed = processResults(filtered, rankBy, allEvents);

      // Filter by class if selected
      if (selectedClass !== 'all') {
        processed = processed.filter(entry => entry.competition_class === selectedClass);
        // Clear these stats when a specific class is selected
        setMostEventsAttended([]);
        setHighestSPLScores([]);
      } else {
        // For "All Classes", aggregate across all classes for each competitor
        const overallAggregated: { [key: string]: LeaderboardEntry } = {};

        processed.forEach(entry => {
          const key = entry.competitor_id || entry.competitor_name;

          if (!overallAggregated[key]) {
            overallAggregated[key] = {
              ...entry,
              competition_class: 'Overall',
              event_ids: new Set(entry.event_ids), // Clone the Set
            };
          } else {
            // Aggregate data across classes
            overallAggregated[key].total_points += entry.total_points;
            // Merge event_ids from all classes to count unique events
            entry.event_ids.forEach(id => overallAggregated[key].event_ids.add(id));
            overallAggregated[key].first_place += entry.first_place;
            overallAggregated[key].second_place += entry.second_place;
            overallAggregated[key].third_place += entry.third_place;
            overallAggregated[key].best_score = Math.max(
              overallAggregated[key].best_score,
              entry.best_score
            );
          }
        });

        // Calculate events_participated from merged event_ids
        Object.values(overallAggregated).forEach(entry => {
          entry.events_participated = entry.event_ids.size;
        });

        // Sort by the selected criterion
        processed = Object.values(overallAggregated).sort((a, b) => {
          if (rankBy === 'score') {
            return b.best_score - a.best_score;
          }
          return b.total_points - a.total_points;
        });

        // Calculate additional stats for "All Classes" view
        // Top 3 by events attended
        const byEvents = [...processed].sort((a, b) => b.events_participated - a.events_participated).slice(0, 3);
        setMostEventsAttended(byEvents);

        // Top 3 by highest SPL score
        const splResults = filtered.filter((r: any) => r.format === 'SPL' && r.score);
        const splByScore = splResults
          .map((r: any) => ({
            competitor_name: r.competitorName || r.competitor_name,
            meca_id: r.mecaId || r.meca_id,
            score: r.score,
            competition_class: r.competitionClass || r.competition_class,
            membership_expiry: r.competitor?.membership_expiry,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        setHighestSPLScores(splByScore);
      }

      // Take top 10
      setLeaderboard(processed.slice(0, 10));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }

    setLoading(false);
  };

  const getMecaIdDisplay = (mecaId?: string, membershipExpiry?: string) => {
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <SEOHead {...seoProps} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-600 rounded-full mb-4">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Top 10 Leaderboard</h1>
          <p className="text-gray-400 text-lg">
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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-300">
                <Filter className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">Class:</span>
              </div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 hover:bg-slate-600 transition-colors"
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
            <h2 className="text-4xl font-bold text-red-500 mb-4">NO RESULTS</h2>
            <p className="text-2xl text-red-500">No competitors competed in this class for the selected season</p>
          </div>
        )}
      </div>
    </div>
  );
}
