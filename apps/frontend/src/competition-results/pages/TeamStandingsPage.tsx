import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, ArrowUpDown, ArrowUp, ArrowDown, Medal, Users, Calendar } from 'lucide-react';
import { competitionResultsApi, TeamStandingsEntry } from '@/competition-results';
import { SeasonSelector } from '@/seasons';
import { SEOHead } from '@/shared/seo';
import { Pagination } from '@/shared/components';

type SortColumn = 'rank' | 'team' | 'points' | 'members' | 'events';
type SortDirection = 'asc' | 'desc';

export default function TeamStandingsPage() {
  const navigate = useNavigate();
  const [standings, setStandings] = useState<TeamStandingsEntry[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    fetchData();
  }, [selectedSeasonId]);

  const fetchData = async () => {
    setLoading(true);

    try {
      const data = await competitionResultsApi.getTeamStandings(
        selectedSeasonId || undefined,
        100
      );
      // Add rank if not provided
      const rankedData = data.map((entry, index) => ({
        ...entry,
        rank: entry.rank || index + 1,
      }));
      setStandings(rankedData);
    } catch (error) {
      console.error('Error fetching team standings:', error);
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
      setSortDirection(column === 'rank' ? 'asc' : 'desc');
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSeasonId, searchTerm, sortColumn, sortDirection]);

  const getDisplayData = () => {
    // Apply search filter
    let filtered = standings.filter(entry => {
      if (!searchTerm) return true;
      const name = (entry.teamName || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      return name.includes(search);
    });

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'rank':
          comparison = (a.rank || 0) - (b.rank || 0);
          break;
        case 'team':
          comparison = (a.teamName || '').localeCompare(b.teamName || '');
          break;
        case 'points':
          comparison = (a.totalPoints || 0) - (b.totalPoints || 0);
          break;
        case 'members':
          comparison = (a.memberCount || 0) - (b.memberCount || 0);
          break;
        case 'events':
          comparison = (a.eventsParticipated || 0) - (b.eventsParticipated || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const handleTeamClick = (teamId: string) => {
    navigate(`/teams/${teamId}`);
  };

  return (
    <>
      <SEOHead
        title="Team Standings | MECA Car Audio"
        description="View team standings for MECA car audio competitions. See which teams are leading in total points this season."
        canonical="/team-standings"
      />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Team Standings</h1>
            <p className="text-gray-400 text-lg">
              Point standings aggregated by team from competition results
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 bg-slate-800 rounded-xl p-6">
            <div className="flex flex-wrap items-center gap-6 mb-6">
              <SeasonSelector
                selectedSeasonId={selectedSeasonId}
                onSeasonChange={setSelectedSeasonId}
                showAllOption={true}
                autoSelectCurrent={true}
              />
            </div>

            <label className="block text-sm font-medium text-gray-300 mb-3">
              Search by Team Name
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Enter team name..."
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
            const displayData = getDisplayData();
            const totalPages = Math.ceil(displayData.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const paginatedData = displayData.slice(startIndex, startIndex + itemsPerPage);

            return displayData.length > 0 ? (
              <>
                <div className="mb-4 text-gray-400">
                  Showing {paginatedData.length} of {displayData.length} teams
                </div>

                <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden mb-8">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-700">
                        <tr>
                          <th
                            className="px-6 py-4 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                            onClick={() => handleSort('rank')}
                          >
                            Rank{getSortIcon('rank')}
                          </th>
                          <th
                            className="px-6 py-4 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                            onClick={() => handleSort('team')}
                          >
                            Team{getSortIcon('team')}
                          </th>
                          <th
                            className="px-6 py-4 text-center text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                            onClick={() => handleSort('members')}
                          >
                            Members{getSortIcon('members')}
                          </th>
                          <th
                            className="px-6 py-4 text-center text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                            onClick={() => handleSort('events')}
                          >
                            Events{getSortIcon('events')}
                          </th>
                          <th
                            className="px-6 py-4 text-right text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                            onClick={() => handleSort('points')}
                          >
                            Points{getSortIcon('points')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {paginatedData.map((entry, index) => {
                          const rank = entry.rank || (startIndex + index + 1);
                          const isTopThree = rank <= 3;

                          return (
                            <tr
                              key={entry.teamId}
                              className={`hover:bg-slate-700/50 transition-colors cursor-pointer ${
                                isTopThree ? 'bg-slate-700/30' : ''
                              }`}
                              onClick={() => handleTeamClick(entry.teamId)}
                            >
                              <td className="px-6 py-4">
                                <div
                                  className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${getMedalColor(rank)} shadow-lg`}
                                >
                                  {getMedalIcon(rank)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
                                    <Shield className="h-5 w-5 text-orange-500" />
                                  </div>
                                  <div className="font-semibold text-white">
                                    {entry.teamName}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-1 text-gray-300">
                                  <Users className="h-4 w-4" />
                                  <span>{entry.memberCount}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-1 text-gray-300">
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

                {/* Pagination */}
                <div className="mb-8 rounded-xl overflow-hidden">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={displayData.length}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>

                <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-white mb-3">Team Scoring Information</h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500">*</span>
                      <span>Team points are the sum of all member points</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500">*</span>
                      <span>Click on a team row to view their full profile</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500">*</span>
                      <span>Events count shows unique events where team members competed</span>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-20 bg-slate-800 rounded-xl">
                <Shield className="h-20 w-20 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-xl">
                  No team standings available for the selected season.
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
