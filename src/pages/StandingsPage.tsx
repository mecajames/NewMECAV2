import { useEffect, useState } from 'react';
import { Trophy, Medal, TrendingUp, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StandingsEntry {
  competitor_id: string;
  competitor_name: string;
  competition_class: string;
  total_points: number;
  events_participated: number;
  first_place: number;
  second_place: number;
  third_place: number;
  best_score: number;
}

export default function StandingsPage() {
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStandings();
  }, [selectedClass]);

  const fetchStandings = async () => {
    setLoading(true);

    const { data: results } = await supabase
      .from('competition_results')
      .select('*')
      .order('points_earned', { ascending: false });

    if (results) {
      const classSet = new Set<string>();
      const aggregated: { [key: string]: StandingsEntry } = {};

      results.forEach((result) => {
        classSet.add(result.competition_class);

        if (selectedClass !== 'all' && result.competition_class !== selectedClass) {
          return;
        }

        const key = `${result.competitor_id || result.competitor_name}_${result.competition_class}`;

        if (!aggregated[key]) {
          aggregated[key] = {
            competitor_id: result.competitor_id || '',
            competitor_name: result.competitor_name,
            competition_class: result.competition_class,
            total_points: 0,
            events_participated: 0,
            first_place: 0,
            second_place: 0,
            third_place: 0,
            best_score: result.score,
          };
        }

        aggregated[key].total_points += result.points_earned;
        aggregated[key].events_participated += 1;
        aggregated[key].best_score = Math.max(aggregated[key].best_score, result.score);

        if (result.placement === 1) aggregated[key].first_place += 1;
        if (result.placement === 2) aggregated[key].second_place += 1;
        if (result.placement === 3) aggregated[key].third_place += 1;
      });

      setClasses(Array.from(classSet).sort());

      const sorted = Object.values(aggregated)
        .sort((a, b) => {
          if (b.total_points !== a.total_points) {
            return b.total_points - a.total_points;
          }
          return b.best_score - a.best_score;
        });

      setStandings(sorted);
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
    if (rank <= 3) return <Medal className="h-6 w-6 text-white" />;
    return <span className="text-xl font-bold text-white">{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Competition Standings</h1>
          <p className="text-gray-400 text-lg">
            Current point standings by competition class
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-gray-300">
            <Filter className="h-5 w-5" />
            <span className="font-medium">Filter by Class:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedClass('all')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedClass === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              All Classes
            </button>
            {classes.map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  selectedClass === cls
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : standings.length > 0 ? (
          <>
            <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                        Competitor
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                        Class
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                        Events
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                        1st
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                        2nd
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                        3rd
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                        Best Score
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">
                        Total Points
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {standings.map((entry, index) => {
                      const rank = index + 1;
                      const isTopThree = rank <= 3;

                      return (
                        <tr
                          key={`${entry.competitor_id}_${entry.competition_class}`}
                          className={`hover:bg-slate-700/50 transition-colors ${
                            isTopThree ? 'bg-slate-700/30' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${getMedalColor(
                                rank
                              )} shadow-lg`}
                            >
                              {getMedalIcon(rank)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white">
                              {entry.competitor_name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-500/10 text-orange-400">
                              {entry.competition_class}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-gray-300">{entry.events_participated}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {entry.first_place > 0 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-400 font-semibold">
                                {entry.first_place}
                              </span>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {entry.second_place > 0 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-500/10 text-gray-400 font-semibold">
                                {entry.second_place}
                              </span>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {entry.third_place > 0 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/10 text-orange-400 font-semibold">
                                {entry.third_place}
                              </span>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-lg font-semibold text-white">
                              {entry.best_score.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-2xl font-bold text-orange-500">
                              {entry.total_points}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Scoring Information</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Points are awarded based on placement and competition class</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Rankings are sorted first by total points, then by best score</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Competitors earn points across all events in their class</span>
                </li>
              </ul>
            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-slate-800 rounded-xl">
            <Trophy className="h-20 w-20 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">
              No standings available for the selected class.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
