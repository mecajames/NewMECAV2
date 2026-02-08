import { useEffect, useState } from 'react';
import { Trophy, Medal, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown, Users } from 'lucide-react';
import { competitionResultsApi, StandingsEntry, ClassStandingsEntry } from '@/competition-results';
import { SeasonSelector } from '@/seasons';
import { SEOHead, useStandingsSEO } from '@/shared/seo';
import { Pagination } from '@/shared/components';

type ViewMode = 'overall' | 'byFormat' | 'byClass';
type SortColumn = 'rank' | 'competitor' | 'mecaId' | 'points' | 'events' | 'placements';
type SortDirection = 'asc' | 'desc';

const FORMATS = ['SPL', 'SQL', 'SSI', 'MK'];

export default function StandingsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('overall');
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [classStandings, setClassStandings] = useState<ClassStandingsEntry[]>([]);
  const [classes, setClasses] = useState<{ format: string; className: string; resultCount: number }[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('SPL');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(true);
  const seoProps = useStandingsSEO();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    fetchData();
  }, [viewMode, selectedFormat, selectedClass, selectedSeasonId]);

  useEffect(() => {
    // Fetch classes when format changes (for byClass view)
    if (viewMode === 'byClass') {
      fetchClasses();
    }
  }, [selectedFormat, selectedSeasonId, viewMode]);

  const fetchClasses = async () => {
    try {
      const classData = await competitionResultsApi.getClassesWithResults(
        selectedFormat,
        selectedSeasonId || undefined
      );
      setClasses(classData);
      // Auto-select first class if none selected
      if (classData.length > 0 && !selectedClass) {
        setSelectedClass(classData[0].className);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);

    try {
      if (viewMode === 'overall') {
        // Fetch overall leaderboard
        const response = await competitionResultsApi.getStandingsLeaderboard({
          seasonId: selectedSeasonId || undefined,
          limit: 100,
        });
        setStandings(response.entries);
      } else if (viewMode === 'byFormat') {
        // Fetch standings by format
        const data = await competitionResultsApi.getStandingsByFormat(
          selectedFormat,
          selectedSeasonId || undefined,
          100
        );
        setStandings(data);
      } else if (viewMode === 'byClass' && selectedClass) {
        // Fetch standings by class
        const data = await competitionResultsApi.getStandingsByClass(
          selectedFormat,
          selectedClass,
          selectedSeasonId || undefined,
          100
        );
        setClassStandings(data);
      }
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
  }, [viewMode, selectedFormat, selectedClass, selectedSeasonId, searchTerm, sortColumn, sortDirection]);

  const getMecaIdDisplay = (mecaId: string | null, isGuest: boolean) => {
    if (isGuest || !mecaId || mecaId === '999999') {
      return { text: 'Non Member', color: 'text-gray-500' };
    }
    return { text: mecaId, color: 'text-green-500' };
  };

  const getDisplayData = () => {
    const data = viewMode === 'byClass' ? classStandings : standings;

    // Apply search filter
    let filtered = data.filter(entry => {
      if (!searchTerm) return true;
      const name = (entry.competitorName || '').toLowerCase();
      const mecaId = (entry.mecaId || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      return name.includes(search) || mecaId.includes(search);
    });

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'rank':
          comparison = (a.rank || 0) - (b.rank || 0);
          break;
        case 'competitor':
          comparison = (a.competitorName || '').localeCompare(b.competitorName || '');
          break;
        case 'mecaId':
          comparison = (a.mecaId || '').localeCompare(b.mecaId || '');
          break;
        case 'points':
          comparison = (a.totalPoints || 0) - (b.totalPoints || 0);
          break;
        case 'events':
          comparison = (a.eventsParticipated || 0) - (b.eventsParticipated || 0);
          break;
        case 'placements':
          comparison = (a.firstPlace || 0) - (b.firstPlace || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  return (
    <>
      <SEOHead {...seoProps} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">Competition Standings</h1>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg">
            Point standings aggregated from competition results
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode('overall')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-sm sm:text-base transition-colors ${
              viewMode === 'overall'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Overall Standings
          </button>
          <button
            onClick={() => setViewMode('byFormat')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-sm sm:text-base transition-colors ${
              viewMode === 'byFormat'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            By Format
          </button>
          <button
            onClick={() => setViewMode('byClass')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-sm sm:text-base transition-colors ${
              viewMode === 'byClass'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            By Class
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 sm:mb-8 bg-slate-800 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
            <SeasonSelector
              selectedSeasonId={selectedSeasonId}
              onSeasonChange={setSelectedSeasonId}
              showAllOption={true}
              autoSelectCurrent={true}
            />

            {(viewMode === 'byFormat' || viewMode === 'byClass') && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-gray-300">
                  <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base whitespace-nowrap">Format:</span>
                </div>
                <select
                  value={selectedFormat}
                  onChange={(e) => {
                    setSelectedFormat(e.target.value);
                    setSelectedClass(''); // Reset class when format changes
                  }}
                  className="px-3 sm:px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {FORMATS.map((fmt) => (
                    <option key={fmt} value={fmt}>{fmt}</option>
                  ))}
                </select>
              </div>
            )}

            {viewMode === 'byClass' && classes.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base whitespace-nowrap">Class:</span>
                </div>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 sm:px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {classes.map((cls) => (
                    <option key={cls.className} value={cls.className}>
                      {cls.className} ({cls.resultCount} results)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2 sm:mb-3">
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
          const displayData = getDisplayData();
          const totalPages = Math.ceil(displayData.length / itemsPerPage);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const paginatedData = displayData.slice(startIndex, startIndex + itemsPerPage);

          return displayData.length > 0 ? (
            <>
              <div className="mb-4 text-gray-400">
                Showing {paginatedData.length} of {displayData.length} competitors
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
                          className="px-6 py-4 text-center text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                          onClick={() => handleSort('events')}
                        >
                          Events{getSortIcon('events')}
                        </th>
                        <th
                          className="px-6 py-4 text-center text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                          onClick={() => handleSort('placements')}
                        >
                          Podiums{getSortIcon('placements')}
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
                        const mecaDisplay = getMecaIdDisplay(entry.mecaId, entry.isGuest);

                        return (
                          <tr
                            key={`${entry.mecaId || entry.competitorName}_${index}`}
                            className={`hover:bg-slate-700/50 transition-colors ${
                              isTopThree ? 'bg-slate-700/30' : ''
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div
                                className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${getMedalColor(rank)} shadow-lg`}
                              >
                                {getMedalIcon(rank)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-white">
                                {entry.competitorName}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`font-semibold ${mecaDisplay.color}`}>
                                {mecaDisplay.text}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-gray-300">
                                {entry.eventsParticipated}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="inline-flex items-center px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-sm">
                                  {entry.firstPlace}x 1st
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded bg-gray-500/20 text-gray-400 text-sm">
                                  {entry.secondPlace}x 2nd
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded bg-orange-500/20 text-orange-400 text-sm">
                                  {entry.thirdPlace}x 3rd
                                </span>
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
                <h3 className="text-lg font-semibold text-white mb-3">Scoring Information</h3>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">*</span>
                    <span>1X Events: 1st=5, 2nd=4, 3rd=3, 4th=2, 5th=1 points</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">*</span>
                    <span>2X Events: Double points (1st=10, 2nd=8, 3rd=6, 4th=4, 5th=2)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">*</span>
                    <span>3X Events (SOUNDFEST): Triple points</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">*</span>
                    <span>4X Events (SQ/Install): 1st=20, 2nd=19, 3rd=18, 4th=17, 5th=16</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500">*</span>
                    <span>Only top 5 placements who are active members receive points</span>
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
    </>
  );
}
