import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Shield, Users, Calendar, Medal } from 'lucide-react';
import { competitionResultsApi, TeamStandingsEntry } from '@/competition-results';
import { SeasonSelector } from '@/seasons';
import { SEOHead } from '@/shared/seo';

export default function TeamLeaderboardPage() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<TeamStandingsEntry[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedSeasonId]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await competitionResultsApi.getTeamStandings(
        selectedSeasonId || undefined,
        10
      );
      // Add rank if not provided
      const rankedData = data.map((entry, index) => ({
        ...entry,
        rank: entry.rank || index + 1,
      }));
      setLeaderboard(rankedData);
    } catch (error) {
      console.error('Error fetching team leaderboard:', error);
    }
    setLoading(false);
  };

  const handleTeamClick = (teamId: string) => {
    navigate(`/teams/${teamId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <SEOHead
        title="Top 10 Teams | MECA Car Audio"
        description="View the top 10 teams in MECA car audio competitions. See which teams are leading in total points this season."
        canonical="/team-leaderboard"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-600 rounded-full mb-4">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Top 10 Teams</h1>
          <p className="text-gray-400 text-lg">
            The best teams based on total points earned by their members
          </p>
        </div>

        {/* Filters */}
        <div className="mb-16 bg-slate-800 rounded-xl p-6">
          <div className="flex flex-wrap items-center gap-6">
            <SeasonSelector
              selectedSeasonId={selectedSeasonId}
              onSeasonChange={setSelectedSeasonId}
              showAllOption={true}
              autoSelectCurrent={true}
            />
          </div>
        </div>

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
                    return (
                      <div
                        className="flex flex-col items-center cursor-pointer"
                        onClick={() => handleTeamClick(entry.teamId)}
                      >
                        <div className="bg-slate-800 rounded-xl p-6 border-2 border-gray-400 mb-4 w-64 text-center hover:bg-slate-700 transition-colors">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Medal className="h-10 w-10 text-white" />
                          </div>
                          <div className="text-gray-400 text-sm font-semibold mb-1">2nd</div>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Shield className="h-5 w-5 text-orange-500" />
                            <h3 className="text-xl font-bold text-white">{entry.teamName}</h3>
                          </div>
                          <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mb-3">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {entry.memberCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {entry.eventsParticipated}
                            </span>
                          </div>
                          <div className="text-3xl font-bold text-gray-400">
                            {entry.totalPoints}
                          </div>
                          <div className="text-sm text-gray-500">points</div>
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
                    return (
                      <div
                        className="flex flex-col items-center -mt-8 cursor-pointer"
                        onClick={() => handleTeamClick(entry.teamId)}
                      >
                        <div className="bg-slate-800 rounded-xl p-6 border-4 border-yellow-500 mb-4 w-72 text-center shadow-2xl hover:bg-slate-700 transition-colors">
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Trophy className="h-12 w-12 text-white" />
                          </div>
                          <div className="text-yellow-500 text-sm font-semibold mb-1">1st</div>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Shield className="h-6 w-6 text-orange-500" />
                            <h3 className="text-2xl font-bold text-white">{entry.teamName}</h3>
                          </div>
                          <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mb-3">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {entry.memberCount} members
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {entry.eventsParticipated} events
                            </span>
                          </div>
                          <div className="text-4xl font-bold text-yellow-500">
                            {entry.totalPoints}
                          </div>
                          <div className="text-sm text-gray-500">points</div>
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
                    return (
                      <div
                        className="flex flex-col items-center cursor-pointer"
                        onClick={() => handleTeamClick(entry.teamId)}
                      >
                        <div className="bg-slate-800 rounded-xl p-6 border-2 border-orange-500 mb-4 w-64 text-center hover:bg-slate-700 transition-colors">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Medal className="h-10 w-10 text-white" />
                          </div>
                          <div className="text-orange-500 text-sm font-semibold mb-1">3rd</div>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Shield className="h-5 w-5 text-orange-500" />
                            <h3 className="text-xl font-bold text-white">{entry.teamName}</h3>
                          </div>
                          <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mb-3">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {entry.memberCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {entry.eventsParticipated}
                            </span>
                          </div>
                          <div className="text-3xl font-bold text-orange-500">
                            {entry.totalPoints}
                          </div>
                          <div className="text-sm text-gray-500">points</div>
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
                    <h2 className="text-2xl font-bold text-white">Top Teams</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-700">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Rank</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Team</th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Members</th>
                          <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Events</th>
                          <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Total Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {leaderboard.map((entry, index) => {
                          const rank = index + 1;
                          return (
                            <tr
                              key={entry.teamId}
                              className="hover:bg-slate-700/50 transition-colors cursor-pointer"
                              onClick={() => handleTeamClick(entry.teamId)}
                            >
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
                                <div className="flex items-center gap-3">
                                  <Shield className="h-5 w-5 text-orange-500" />
                                  <span className="font-semibold text-white text-lg">{entry.teamName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-1 text-gray-400">
                                  <Users className="h-4 w-4" />
                                  <span>{entry.memberCount}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-1 text-gray-400">
                                  <Calendar className="h-4 w-4" />
                                  <span>{entry.eventsParticipated}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="text-3xl font-bold text-orange-500">
                                  {entry.totalPoints}
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
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Team</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Members</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Events</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Total Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {leaderboard.slice(3).map((entry, index) => {
                        const rank = index + 4;

                        return (
                          <tr
                            key={entry.teamId}
                            className="hover:bg-slate-700/50 transition-colors cursor-pointer"
                            onClick={() => handleTeamClick(entry.teamId)}
                          >
                            <td className="px-6 py-4">
                              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-700 text-white font-bold">
                                {rank}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Shield className="h-5 w-5 text-orange-500" />
                                <span className="font-semibold text-white">{entry.teamName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-1 text-gray-400">
                                <Users className="h-4 w-4" />
                                <span>{entry.memberCount}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-1 text-gray-400">
                                <Calendar className="h-4 w-4" />
                                <span>{entry.eventsParticipated}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="text-2xl font-bold text-orange-500">
                                {entry.totalPoints}
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
          </>
        ) : (
          <div className="text-center py-20">
            <Shield className="h-20 w-20 text-gray-500 mx-auto mb-4" />
            <h2 className="text-4xl font-bold text-gray-400 mb-4">No Teams</h2>
            <p className="text-xl text-gray-500">No teams have competed in the selected season</p>
          </div>
        )}
      </div>
    </div>
  );
}
