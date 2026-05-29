import { useEffect, useState } from 'react';
import { Trophy, Medal, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown, Users, ArrowDownUp, Eye } from 'lucide-react';
import { competitionResultsApi, StandingsEntry, ClassStandingsEntry } from '@/competition-results';
import { MecaIdLink } from '@/competition-results/components/MecaIdLink';
import {
  MecaIdActiveProvider,
  useMecaIdActive,
  useMecaIdActiveLookup,
} from '@/competition-results/components/MecaIdActiveContext';
import { SeasonSelector } from '@/seasons';
import { SEOHead, useStandingsSEO } from '@/shared/seo';
import { Pagination } from '@/shared/components';
import { BannerDisplay, useBanners } from '@/banners';
import { BannerPosition } from '@newmeca/shared';

// Only three sortable columns are exposed: Rank (server order), Points
// (totalPoints), and Score (highestScore). The other columns (Competitor,
// MECA ID, Events, Podiums) are displayed but not sortable — competitors
// asked for a focused sort UI, not every-column sortability.
type SortColumn = 'rank' | 'points' | 'score';
type SortDirection = 'asc' | 'desc';
type ViewFilter = 'active' | 'all';

/**
 * Renders the MECA ID cell on a standings row with three-state coloring:
 *   - grey "Non Member" for guests / 999999 / missing IDs
 *   - green for members whose MECA ID is currently active (clickable)
 *   - red for members whose MECA ID is currently expired (not clickable)
 */
function StandingsMecaIdCell({ mecaId, isGuest }: { mecaId: string | null; isGuest: boolean }) {
  const targetActive = useMecaIdActive(mecaId);
  if (isGuest || !mecaId || mecaId === '999999') {
    return (
      <MecaIdLink
        mecaId={mecaId}
        displayText="Non Member"
        className="font-semibold text-gray-500"
      />
    );
  }
  const color = targetActive === false ? 'text-red-400' : 'text-green-500';
  return (
    <MecaIdLink
      mecaId={mecaId}
      displayText={mecaId}
      className={`font-semibold ${color}`}
    />
  );
}

export default function StandingsPage() {
  // No tab strip — the page always shows format-level standings, and an
  // empty Class selection means "all classes in this format". Selecting a
  // class drills the same view into one class's standings. The old
  // Overall view was removed because mixing scoring scales across SPL /
  // SQL / SSI / MK produced a meaningless leaderboard.
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [classStandings, setClassStandings] = useState<ClassStandingsEntry[]>([]);
  const [classes, setClasses] = useState<{ format: string; className: string; resultCount: number }[]>([]);
  // Available formats for the current season — fetched, not hardcoded, so
  // we never render a chip for a format with zero results.
  const [availableFormats, setAvailableFormats] = useState<{ format: string; resultCount: number; competitorCount?: number }[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  // Competitors land on the page wanting to see "who has the highest score
  // this season" — default sort is Score, descending.
  const [sortColumn, setSortColumn] = useState<SortColumn>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  // Default to active-only view — expired members shouldn't pollute the
  // public standings. Switch to 'all' to include guests + expired members.
  const [viewFilter, setViewFilter] = useState<ViewFilter>('active');
  const [loading, setLoading] = useState(true);
  const seoProps = useStandingsSEO();
  const { banners: standingsBanners } = useBanners(BannerPosition.TEAMS_STANDINGS_TOP);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    fetchData();
  }, [selectedFormat, selectedClass, selectedSeasonId]);

  useEffect(() => {
    let cancelled = false;
    competitionResultsApi
      .getAvailableFormats(selectedSeasonId || undefined)
      .then((formats) => {
        if (cancelled) return;
        setAvailableFormats(formats);
        if (formats.length > 0) {
          const stillValid = formats.some((f) => f.format === selectedFormat);
          if (!selectedFormat || !stillValid) {
            // Default to SPL when it's available for this season — it's the
            // most popular format and the one the user expects to land on.
            // Falls back to the first format (by display_order) when SPL
            // has no results this season.
            const spl = formats.find((f) => f.format.toUpperCase() === 'SPL');
            setSelectedFormat((spl ?? formats[0]).format);
          }
        } else {
          setSelectedFormat('');
        }
      })
      .catch((err) => console.error('Error fetching available formats:', err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId]);

  useEffect(() => {
    // Class list refreshes whenever Format or Season changes, regardless
    // of whether a class is currently selected — the dropdown is always
    // visible so the options must stay in sync. We don't auto-select a
    // class; the default is "All Classes" (empty selectedClass).
    if (selectedFormat) {
      fetchClasses();
    } else {
      setClasses([]);
    }
  }, [selectedFormat, selectedSeasonId]);

  const fetchClasses = async () => {
    try {
      const classData = await competitionResultsApi.getClassesWithResults(
        selectedFormat,
        selectedSeasonId || undefined
      );
      setClasses(classData);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchData = async () => {
    if (!selectedFormat) {
      // No format chosen yet (e.g. season has zero results). Skip the
      // request; the empty-state UI will handle this.
      setStandings([]);
      setClassStandings([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      if (selectedClass) {
        // Class drill-down
        const data = await competitionResultsApi.getStandingsByClass(
          selectedFormat,
          selectedClass,
          selectedSeasonId || undefined,
          100
        );
        setClassStandings(data);
      } else {
        // All classes in this format
        const data = await competitionResultsApi.getStandingsByFormat(
          selectedFormat,
          selectedSeasonId || undefined,
          100
        );
        setStandings(data);
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
    // Rank reflects the server-assigned order (points DESC with tiebreaker).
    // Clicking Rank always restores that order — toggling direction here
    // produced visually distinct re-orderings of the same data, which is
    // confusing.
    if (column === 'rank') {
      setSortColumn('rank');
      setSortDirection('asc');
      return;
    }
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
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
  }, [selectedFormat, selectedClass, selectedSeasonId, searchTerm, sortColumn, sortDirection, viewFilter]);

  const rawData = selectedClass ? classStandings : standings;

  return (
    <MecaIdActiveProvider mecaIds={rawData.map((s: any) => s.meca_id ?? s.mecaId)}>
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

        {standingsBanners.length > 0 && <BannerDisplay banner={standingsBanners[0]} />}

        {/* Filters */}
        <div className="mb-6 sm:mb-8 bg-slate-800 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
            <SeasonSelector
              selectedSeasonId={selectedSeasonId}
              onSeasonChange={setSelectedSeasonId}
              showAllOption={true}
              autoSelectCurrent={true}
            />

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 text-gray-300">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base whitespace-nowrap">Format:</span>
              </div>
              <select
                value={selectedFormat}
                onChange={(e) => {
                  setSelectedFormat(e.target.value);
                  // Format change resets Class — the available class list
                  // is format-specific so the previously-selected class
                  // may not exist in the new format.
                  setSelectedClass('');
                }}
                className="px-3 sm:px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {availableFormats.length === 0 && (
                  <option value="" disabled>
                    No data for this season
                  </option>
                )}
                {availableFormats.map((f) => (
                  <option key={f.format} value={f.format}>
                    {f.format} ({f.resultCount})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base whitespace-nowrap">Class:</span>
              </div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={classes.length === 0}
                className="px-3 sm:px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.className} value={cls.className}>
                    {cls.className} ({cls.resultCount})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 text-gray-300">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base whitespace-nowrap">View:</span>
              </div>
              <select
                value={viewFilter}
                onChange={(e) => setViewFilter(e.target.value as ViewFilter)}
                className="px-3 sm:px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="active">Active Members</option>
                <option value="all">All Competitors</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 text-gray-300">
                <ArrowDownUp className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base whitespace-nowrap">Sort by:</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortColumn}
                  onChange={(e) => {
                    const next = e.target.value as SortColumn;
                    setSortColumn(next);
                    // Rank is always ascending (server order); Points/Score
                    // default to high→low because that's the meaningful order.
                    setSortDirection(next === 'rank' ? 'asc' : 'desc');
                  }}
                  className="px-3 sm:px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="rank">Rank</option>
                  <option value="points">Points</option>
                  <option value="score">Score</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                  }
                  disabled={sortColumn === 'rank'}
                  title={
                    sortColumn === 'rank'
                      ? 'Rank is always ascending'
                      : sortDirection === 'asc'
                        ? 'Ascending — click for descending'
                        : 'Descending — click for ascending'
                  }
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sortDirection === 'asc' ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
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

        <StandingsContent
          rawData={rawData}
          loading={loading}
          searchTerm={searchTerm}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          viewFilter={viewFilter}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          handleSort={handleSort}
          getSortIcon={getSortIcon}
          getMedalColor={getMedalColor}
          getMedalIcon={getMedalIcon}
        />
        </div>
      </div>
    </>
    </MecaIdActiveProvider>
  );
}

/**
 * Renders the standings table. Lives inside <MecaIdActiveProvider> so it can
 * call useMecaIdActiveLookup() to filter out expired members when the parent
 * has viewFilter === 'active'.
 */
function StandingsContent({
  rawData,
  loading,
  searchTerm,
  sortColumn,
  sortDirection,
  viewFilter,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  handleSort,
  getSortIcon,
  getMedalColor,
  getMedalIcon,
}: {
  rawData: StandingsEntry[];
  loading: boolean;
  searchTerm: string;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  viewFilter: ViewFilter;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (n: number) => void;
  handleSort: (col: SortColumn) => void;
  getSortIcon: (col: SortColumn) => JSX.Element;
  getMedalColor: (rank: number) => string;
  getMedalIcon: (rank: number) => JSX.Element;
}) {
  const activeLookup = useMecaIdActiveLookup();

  // Intentionally not memoized: when MecaIdActiveProvider's bulk fetch
  // completes it triggers a re-render via internal state, but its lookup
  // function reference is stable (useCallback with [] deps). A useMemo
  // here would skip recomputation when the cache fills, leaving the
  // active-members filter showing stale "loading" results forever.
  // Computing filter+sort over ~100 rows on every render is negligible.
  const displayData = (() => {
    // Search filter
    let filtered = rawData.filter(entry => {
      if (!searchTerm) return true;
      const name = (entry.competitorName || '').toLowerCase();
      const mecaId = (entry.mecaId || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      return name.includes(search) || mecaId.includes(search);
    });

    // Active-members filter. Hide guests and anyone whose MECA ID is known
    // to be expired. Rows whose lookup hasn't resolved yet (undefined) stay
    // visible — otherwise the table would flash empty on first paint and
    // then fill in once the bulk-active fetch completes.
    if (viewFilter === 'active') {
      filtered = filtered.filter(entry => {
        if (entry.isGuest) return false;
        if (!entry.mecaId || entry.mecaId === '999999') return false;
        const active = activeLookup(entry.mecaId);
        return active !== false;
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'rank':
          comparison = (a.rank || 0) - (b.rank || 0);
          break;
        case 'points':
          comparison = (a.totalPoints || 0) - (b.totalPoints || 0);
          break;
        case 'score':
          // Null highestScore sorts to the bottom regardless of direction.
          if (a.highestScore == null && b.highestScore == null) comparison = 0;
          else if (a.highestScore == null) return 1;
          else if (b.highestScore == null) return -1;
          else comparison = a.highestScore - b.highestScore;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  })();

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (displayData.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-800 rounded-xl">
        <Trophy className="h-20 w-20 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400 text-xl">
          {viewFilter === 'active' && rawData.length > 0
            ? 'No active members match the current filters. Try switching View to "All Competitors".'
            : 'No standings available for the selected filters.'}
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(displayData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = displayData.slice(startIndex, startIndex + itemsPerPage);

  return (
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  Competitor
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                  MECA ID
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                  Events
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                  Podiums
                </th>
                <th
                  className="px-6 py-4 text-right text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                  onClick={() => handleSort('score')}
                >
                  Score{getSortIcon('score')}
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
                // Rank reflects this row's position in the currently
                // displayed list — i.e. after filtering (Active Members,
                // search) and sorting (Score / Points / Rank, asc/desc).
                // We deliberately ignore entry.rank (server's points-DESC
                // rank) because keeping it leaves gaps when active filter
                // hides members, and shows a wrong rank when the user
                // sorts by Score: e.g. #1-by-Points may be #12-by-Score.
                const rank = startIndex + index + 1;
                const isTopThree = rank <= 3;

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
                      <StandingsMecaIdCell
                        mecaId={entry.mecaId}
                        isGuest={entry.isGuest}
                      />
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
                      <div className="text-lg font-semibold text-blue-400">
                        {entry.highestScore != null ? entry.highestScore.toFixed(2) : '—'}
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
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
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
  );
}
