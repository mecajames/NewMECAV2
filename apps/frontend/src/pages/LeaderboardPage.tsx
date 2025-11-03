import { useEffect, useState } from 'react';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { competitionResultsApi, CompetitionResult } from '../api-client/competition-results.api-client';
import SeasonSelector from '../components/SeasonSelector';

interface LeaderboardEntry {
  competitor_id: string;
  competitor_name: string;
  total_points: number;
  events_participated: number;
  first_place: number;
  second_place: number;
  third_place: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedSeasonId]);

  const processResults = (results: any[]): LeaderboardEntry[] => {
    const aggregated: { [key: string]: LeaderboardEntry } = {};

    results.forEach((result) => {
      const key = result.competitor_id || result.competitor_name;
      if (!aggregated[key]) {
        aggregated[key] = {
          competitor_id: result.competitor_id || '',
          competitor_name: result.competitor_name,
          total_points: 0,
          events_participated: 0,
          first_place: 0,
          second_place: 0,
          third_place: 0,
        };
      }

      aggregated[key].total_points += result.points_earned;
      aggregated[key].events_participated += 1;

      if (result.placement === 1) aggregated[key].first_place += 1;
      if (result.placement === 2) aggregated[key].second_place += 1;
      if (result.placement === 3) aggregated[key].third_place += 1;
    });

    return Object.values(aggregated).sort((a, b) => b.total_points - a.total_points);
  };

  const fetchLeaderboard = async () => {
    try {
      const data = await competitionResultsApi.getLeaderboard(selectedSeasonId || undefined);
      setLeaderboard(data.slice(0, 10));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Fallback: fetch all results and process manually
      try {
        const results = await competitionResultsApi.getAll(1, 1000);
        const filtered = selectedSeasonId
          ? results.filter((r: CompetitionResult) => r.season_id === selectedSeasonId)
          : results;
        const processed = processResults(filtered).slice(0, 10);
        setLeaderboard(processed);
      } catch (fallbackError) {
        console.error('Error in fallback leaderboard fetch:', fallbackError);
      }
    }

    setLoading(false);
  };

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600';
    if (rank === 2) return 'from-gray-300 to-gray-500';
    if (rank === 3) return 'from-orange-400 to-orange-600';
    return 'from-slate-600 to-slate-700';
  };

  const getMedalIcon = (rank: number) => {
    if (rank <= 3) return <Medal className="h-8 w-8 text-white" />;
    return <span className="text-2xl font-bold text-white">{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-600 rounded-full mb-4">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Top 10 Leaderboard</h1>
          <p className="text-gray-400 text-lg">
            The best competitors based on total points earned
          </p>
        </div>

        {/* Season Filter */}
        <div className="mb-8 bg-slate-800 rounded-xl p-6">
          <SeasonSelector
            selectedSeasonId={selectedSeasonId}
            onSeasonChange={setSelectedSeasonId}
            showAllOption={true}
          />
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="space-y-4">
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isTopThree = rank <= 3;

              return (
                <div
                  key={entry.competitor_id || entry.competitor_name}
                  className={`bg-slate-800 rounded-xl shadow-lg overflow-hidden transition-all transform hover:-translate-y-1 hover:shadow-2xl ${
                    isTopThree ? 'border-2 border-orange-500' : ''
                  }`}
                >
                  <div className="flex items-center p-6 gap-6">
                    <div
                      className={`flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br ${getMedalColor(
                        rank
                      )} flex items-center justify-center shadow-lg`}
                    >
                      {getMedalIcon(rank)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {entry.competitor_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>{entry.events_participated} Events</span>
                        </div>
                        {entry.first_place > 0 && (
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Medal className="h-4 w-4" />
                            <span>{entry.first_place} × 1st</span>
                          </div>
                        )}
                        {entry.second_place > 0 && (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Medal className="h-4 w-4" />
                            <span>{entry.second_place} × 2nd</span>
                          </div>
                        )}
                        {entry.third_place > 0 && (
                          <div className="flex items-center gap-1 text-orange-400">
                            <Medal className="h-4 w-4" />
                            <span>{entry.third_place} × 3rd</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-4xl font-bold text-orange-500">
                        {entry.total_points}
                      </div>
                      <div className="text-sm text-gray-400">Total Points</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-800 rounded-xl">
            <Trophy className="h-20 w-20 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">No competition results available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
