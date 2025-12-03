import { useEffect, useState } from 'react';
import { Trophy, Medal, TrendingUp, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { competitionResultsApi } from '../api-client/competition-results.api-client';
import SeasonSelector from '../components/SeasonSelector';

interface StandingsEntry {
  competitor_id: string;
  competitor_name: string;
  competition_class: string;
  total_points: number;
  events_participated: number;
  best_placement: number;
  first_place: number;
  second_place: number;
  third_place: number;
  best_score: number;
  meca_id?: string;
  membership_expiry?: string;
}

type SortColumn = 'competitor' | 'mecaId' | 'class' | 'placement' | 'score' | 'points';
type SortDirection = 'asc' | 'desc';

export default function StandingsPage() {
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('points');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStandings();
  }, [selectedClass, selectedSeasonId]);

  const fetchStandings = async () => {
    setLoading(true);

    try {
      let results = await competitionResultsApi.getAll(1, 1000);

      // Filter by season if selected
      if (selectedSeasonId) {
        results = results.filter(r => r.season_id === selectedSeasonId);
      }

      const classSet = new Set<string>();
      const aggregated: { [key: string]: StandingsEntry } = {};

      results.forEach((result) => {
        const compClass = result.competitionClass || result.competition_class || '';
        const compId = result.competitorId || result.competitor_id || '';
        const compName = result.competitorName || result.competitor_name || '';
        const points = result.pointsEarned ?? result.points_earned ?? 0;
        const mecaId = result.mecaId || result.meca_id;
        const membershipExpiry = result.competitor?.membership_expiry;

        classSet.add(compClass);

        if (selectedClass !== 'all' && compClass !== selectedClass) {
          return;
        }

        const key = `${compId || compName}_${compClass}`;

        if (!aggregated[key]) {
          aggregated[key] = {
            competitor_id: compId,
            competitor_name: compName,
            competition_class: compClass,
            total_points: 0,
            events_participated: 0,
            best_placement: result.placement || 999,
            first_place: 0,
            second_place: 0,
            third_place: 0,
            best_score: result.score || 0,
            meca_id: mecaId,
            membership_expiry: membershipExpiry,
          };
        }

        aggregated[key].total_points += points;
        aggregated[key].events_participated += 1;
        aggregated[key].best_score = Math.max(aggregated[key].best_score, result.score || 0);
        aggregated[key].best_placement = Math.min(aggregated[key].best_placement, result.placement || 999);

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
    } catch (error) {
      console.error('Error fetching standings:', error);
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

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 inline ml-1 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 inline ml-1" />
      : <ArrowDown className="h-4 w-4 inline ml-1" />;
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Competition Standings</h1>
          <p className="text-gray-400 text-lg">
            Current point standings by competition class
          </p>
        </div>

        {/* Season and Class Filters */}
        <div className="mb-8 bg-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-6 mb-6">
            <SeasonSelector
              selectedSeasonId={selectedSeasonId}
              onSeasonChange={setSelectedSeasonId}
              showAllOption={true}
              autoSelectCurrent={true}
            />

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-300">
                <Filter className="h-5 w-5 text-orange-500" />
                <span className="font-medium">Filter by Class:</span>
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

          <label className="block text-sm font-medium text-gray-300 mb-3">
            Search by Name or MECA ID
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Enter competitor name or MECA ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : (() => {
          // Apply search filter
          let filteredStandings = standings.filter(entry => {
            if (!searchTerm) return true;

            const competitorName = (entry.competitor_name || '').toLowerCase();
            const mecaId = (entry.meca_id || '').toLowerCase();
            const search = searchTerm.toLowerCase();

            return competitorName.includes(search) || mecaId.includes(search);
          });

          // Apply sorting
          filteredStandings = [...filteredStandings].sort((a, b) => {
            let comparison = 0;

            switch (sortColumn) {
              case 'competitor':
                comparison = (a.competitor_name || '').localeCompare(b.competitor_name || '');
                break;
              case 'mecaId':
                comparison = (a.meca_id || '').localeCompare(b.meca_id || '');
                break;
              case 'class':
                comparison = (a.competition_class || '').localeCompare(b.competition_class || '');
                break;
              case 'placement':
                comparison = (a.best_placement || 0) - (b.best_placement || 0);
                break;
              case 'score':
                comparison = (a.best_score || 0) - (b.best_score || 0);
                break;
              case 'points':
                comparison = (a.total_points || 0) - (b.total_points || 0);
                break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
          });

          return filteredStandings.length > 0 ? (
          <>
            <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                        Rank
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                        onClick={() => handleSort('competitor')}
                      >
                        Competitor{getSortIcon('competitor')}
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                        onClick={() => handleSort('mecaId')}
                      >
                        MECA ID{getSortIcon('mecaId')}
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                        onClick={() => handleSort('class')}
                      >
                        Class{getSortIcon('class')}
                      </th>
                      <th
                        className="px-6 py-4 text-center text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                        onClick={() => handleSort('placement')}
                      >
                        Place{getSortIcon('placement')}
                      </th>
                      <th
                        className="px-6 py-4 text-center text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                        onClick={() => handleSort('score')}
                      >
                        Best Score{getSortIcon('score')}
                      </th>
                      <th
                        className="px-6 py-4 text-right text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                        onClick={() => handleSort('points')}
                      >
                        Total Points{getSortIcon('points')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredStandings.map((entry, index) => {
                      const rank = index + 1;
                      const isTopThree = rank <= 3;
                      const mecaDisplay = getMecaIdDisplay(entry.meca_id, entry.membership_expiry);

                      return (
                        <tr
                          key={`${entry.competitor_id || entry.competitor_name}_${entry.competition_class}_${index}`}
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
                            <div className={`font-semibold ${mecaDisplay.color}`}>
                              {mecaDisplay.text}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-500/10 text-orange-400">
                              {entry.competition_class}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full font-bold bg-slate-700 text-white">
                              {entry.best_placement}
                            </span>
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
              No standings available for the selected filters.
            </p>
          </div>
        );
        })()}
      </div>
    </div>
  );
}
