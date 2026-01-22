import { useEffect, useState } from 'react';
import { Trophy, Calendar, Award, Search, ArrowUpDown, ArrowUp, ArrowDown, Layers } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { eventsApi, Event } from '@/events';
import { competitionResultsApi, CompetitionResult } from '@/competition-results';
import { competitionClassesApi, CompetitionClass } from '@/competition-classes';
import { SeasonSelector } from '@/seasons';
import { SEOHead, useResultsSEO } from '@/shared/seo';

interface GroupedResults {
  [format: string]: {
    [className: string]: CompetitionResult[];
  };
}

type SortColumn = 'placement' | 'competitor' | 'state' | 'mecaId' | 'wattage' | 'frequency' | 'score' | 'points';
type SortDirection = 'asc' | 'desc';

export default function ResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const seoProps = useResultsSEO();

  // Get event ID from URL query params
  const eventIdFromUrl = searchParams.get('eventId');

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(eventIdFromUrl || '');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [classes, setClasses] = useState<CompetitionClass[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [availableFormats, setAvailableFormats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('placement');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [multiDayEvents, setMultiDayEvents] = useState<Event[]>([]);
  const [isAggregatedView, setIsAggregatedView] = useState(false);

  // Computed list of events for the dropdown - groups multi-day State/World Finals into single entries
  const displayEvents = (() => {
    const grouped: Event[] = [];
    const processedGroups = new Set<string>();

    events.forEach(event => {
      // Check if this is a multi-day State/World Finals event
      if (event.multi_day_group_id &&
          (event.event_type === 'state_finals' || event.event_type === 'world_finals')) {
        // Only add one entry per multi-day group
        if (!processedGroups.has(event.multi_day_group_id)) {
          processedGroups.add(event.multi_day_group_id);
          // Find all events in this group to get the earliest one (Day 1)
          const groupEvents = events.filter(e => e.multi_day_group_id === event.multi_day_group_id);
          const dayOne = groupEvents.find(e => e.day_number === 1) || groupEvents[0];
          grouped.push(dayOne);
        }
      } else {
        // Regular event or non-State/World Finals multi-day - show normally
        grouped.push(event);
      }
    });

    return grouped;
  })();

  useEffect(() => {
    fetchEvents();
    fetchClasses();
  }, [selectedSeasonId]);

  useEffect(() => {
    if (selectedEventId) {
      fetchResults();
    }
  }, [selectedEventId]);

  // Extract formats when results or classes change
  useEffect(() => {
    if (results.length > 0 && classes.length > 0) {
      const formats = new Set<string>();
      results.forEach(result => {
        const classData = classes.find(c => c.id === (result.classId || result.class_id));
        if (classData?.format) {
          formats.add(classData.format);
        }
      });
      setAvailableFormats(Array.from(formats).sort());
    }
  }, [results, classes]);

  // Handle URL param change - set selected event when URL param changes
  useEffect(() => {
    if (eventIdFromUrl && eventIdFromUrl !== selectedEventId) {
      setSelectedEventId(eventIdFromUrl);
    }
  }, [eventIdFromUrl]);

  const fetchClasses = async () => {
    try {
      const data = await competitionClassesApi.getActive();
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await eventsApi.getAll(1, 1000);

      // Filter for completed events
      let filtered = data.filter(e => e.status === 'completed');

      if (selectedSeasonId) {
        filtered = filtered.filter(e => e.season_id === selectedSeasonId);
      }

      // Sort by event_date descending
      filtered.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

      setEvents(filtered);

      // Only auto-select first event if we didn't come from URL with a specific event
      if (eventIdFromUrl && filtered.some(e => e.id === eventIdFromUrl)) {
        // Event from URL exists in the filtered list, keep it selected
        setSelectedEventId(eventIdFromUrl);
      } else if (filtered.length > 0 && !eventIdFromUrl) {
        setSelectedEventId(filtered[0].id);
      } else if (filtered.length === 0) {
        setSelectedEventId('');
        setResults([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
    setLoading(false);
  };

  const fetchResults = async () => {
    setResultsLoading(true);
    try {
      // Get the selected event to check if it's a multi-day State/World Finals
      const selectedEvent = events.find(e => e.id === selectedEventId);

      // Check if this is a multi-day State Finals or World Finals event
      const isMultiDayFinals = selectedEvent?.multi_day_group_id &&
        (selectedEvent.event_type === 'state_finals' || selectedEvent.event_type === 'world_finals');

      if (isMultiDayFinals && selectedEvent.multi_day_group_id) {
        // Fetch all events in this multi-day group
        const allDays = await eventsApi.getByMultiDayGroup(selectedEvent.multi_day_group_id);
        setMultiDayEvents(allDays);

        // Fetch results from all days
        const allResults: CompetitionResult[] = [];
        for (const dayEvent of allDays) {
          const dayResults = await competitionResultsApi.getByEvent(dayEvent.id);
          allResults.push(...dayResults);
        }

        // Aggregate results: for each (competitor + format + class), keep only highest score
        const aggregatedResults = aggregateResults(allResults);
        setResults(aggregatedResults);
        setIsAggregatedView(true);
      } else {
        // Standard single event results
        const data = await competitionResultsApi.getByEvent(selectedEventId);
        data.sort((a, b) => a.placement - b.placement);
        setResults(data);
        setMultiDayEvents([]);
        setIsAggregatedView(false);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    }
    setResultsLoading(false);
  };

  // Aggregate results from multiple days - keep only highest score per competitor per format/class
  const aggregateResults = (allResults: CompetitionResult[]): CompetitionResult[] => {
    // Group by (mecaId or competitorName) + classId
    const resultMap = new Map<string, CompetitionResult>();

    allResults.forEach(result => {
      // Create a unique key for each competitor + class combination
      const competitorKey = result.mecaId || result.meca_id || result.competitorName || result.competitor_name || '';
      const classId = result.classId || result.class_id || '';
      const key = `${competitorKey}-${classId}`;

      const existing = resultMap.get(key);
      if (!existing || (result.score || 0) > (existing.score || 0)) {
        // Keep the result with the highest score
        resultMap.set(key, result);
      }
    });

    // Convert to array and recalculate placements within each class
    const aggregated = Array.from(resultMap.values());

    // Group by classId and recalculate placements
    const classGroups = new Map<string, CompetitionResult[]>();
    aggregated.forEach(result => {
      const classId = result.classId || result.class_id || '';
      if (!classGroups.has(classId)) {
        classGroups.set(classId, []);
      }
      classGroups.get(classId)!.push(result);
    });

    // Sort each group by score (descending) and assign placements
    const finalResults: CompetitionResult[] = [];
    classGroups.forEach((classResults) => {
      classResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      classResults.forEach((result, index) => {
        finalResults.push({
          ...result,
          placement: index + 1
        });
      });
    });

    return finalResults;
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

  const sortResults = (resultsArray: CompetitionResult[]) => {
    return [...resultsArray].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'placement':
          comparison = (a.placement || 0) - (b.placement || 0);
          break;
        case 'competitor':
          comparison = (a.competitorName || a.competitor_name || '').localeCompare(
            b.competitorName || b.competitor_name || ''
          );
          break;
        case 'state':
          comparison = (a.competitor?.state || '').localeCompare(b.competitor?.state || '');
          break;
        case 'mecaId':
          comparison = (a.mecaId || a.meca_id || '').localeCompare(b.mecaId || b.meca_id || '');
          break;
        case 'wattage':
          comparison = (parseFloat(String(a.wattage || '0'))) - (parseFloat(String(b.wattage || '0')));
          break;
        case 'frequency':
          comparison = (parseFloat(String(a.frequency || '0'))) - (parseFloat(String(b.frequency || '0')));
          break;
        case 'score':
          comparison = (a.score || 0) - (b.score || 0);
          break;
        case 'points':
          comparison = (a.pointsEarned ?? a.points_earned ?? 0) - (b.pointsEarned ?? b.points_earned ?? 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Group results by format and class with search filtering
  const groupedResults: GroupedResults = {};
  results.forEach(result => {
    const classData = classes.find(c => c.id === (result.classId || result.class_id));
    const format = classData?.format || 'Unknown';
    const className = result.competitionClass || result.competition_class || 'Unknown';

    if (selectedFormat !== 'all' && format !== selectedFormat) {
      return;
    }

    // Apply search filter
    if (searchTerm) {
      const competitorName = (result.competitorName || result.competitor_name || '').toLowerCase();
      const mecaId = (result.mecaId || result.meca_id || '').toLowerCase();
      const search = searchTerm.toLowerCase();

      if (!competitorName.includes(search) && !mecaId.includes(search)) {
        return;
      }
    }

    if (!groupedResults[format]) {
      groupedResults[format] = {};
    }
    if (!groupedResults[format][className]) {
      groupedResults[format][className] = [];
    }
    groupedResults[format][className].push(result);
  });

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <SEOHead {...seoProps} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Competition Results</h1>
          <p className="text-gray-400 text-lg">
            View detailed results from completed events
          </p>
        </div>

        {/* Season Filter - Always visible */}
        <div className="mb-8 bg-slate-800 rounded-xl p-6">
          <SeasonSelector
            selectedSeasonId={selectedSeasonId}
            onSeasonChange={setSelectedSeasonId}
            showAllOption={true}
            autoSelectCurrent={true}
          />
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : events.length > 0 ? (
          <>
            <div className="mb-8 bg-slate-800 rounded-xl p-6">
              {/* Event Selector */}
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Event
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {displayEvents.map((event) => {
                    // Check if this is a combined multi-day State/World Finals event
                    const isMultiDayFinals = event.multi_day_group_id &&
                      (event.event_type === 'state_finals' || event.event_type === 'world_finals');
                    const groupEvents = isMultiDayFinals
                      ? events.filter(e => e.multi_day_group_id === event.multi_day_group_id)
                      : [];

                    return (
                      <option key={event.id} value={event.id}>
                        {event.title}
                        {isMultiDayFinals && groupEvents.length > 1
                          ? ` (${groupEvents.length}-Day Event)`
                          : ` - ${new Date(event.event_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}`
                        }
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedEvent && (() => {
                // Check if this is an aggregated multi-day State/World Finals
                const isMultiDayFinals = selectedEvent.multi_day_group_id &&
                  (selectedEvent.event_type === 'state_finals' || selectedEvent.event_type === 'world_finals');
                const showDayBadge = selectedEvent.day_number && !isMultiDayFinals;

                return (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-1">
                          {selectedEvent.title}
                          {showDayBadge && (
                            <span className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500">
                              Day {selectedEvent.day_number}
                            </span>
                          )}
                          {isMultiDayFinals && multiDayEvents.length > 1 && (
                            <span className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500">
                              {multiDayEvents.length}-Day Event
                            </span>
                          )}
                        </h3>
                        <p className="text-gray-400">
                          {isMultiDayFinals && multiDayEvents.length > 1
                            ? `${new Date(multiDayEvents[0]?.event_date || selectedEvent.event_date).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                              })} - ${new Date(multiDayEvents[multiDayEvents.length - 1]?.event_date || selectedEvent.event_date).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}`
                            : new Date(selectedEvent.event_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })
                          }
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/events/${selectedEvent.id}`)}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        View Event
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Aggregated Results Banner */}
              {isAggregatedView && multiDayEvents.length > 1 && (
                <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Layers className="h-6 w-6 text-purple-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-purple-400 font-semibold">
                        Combined Results from {multiDayEvents.length} Days
                      </h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Showing highest score per competitor per class across all days of this{' '}
                        {selectedEvent?.event_type === 'world_finals' ? 'World Finals' : 'State Finals'} event.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {multiDayEvents.map((dayEvent) => (
                          <span
                            key={dayEvent.id}
                            className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-700 text-gray-300"
                          >
                            Day {dayEvent.day_number}: {new Date(dayEvent.event_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {resultsLoading ? (
              <div className="text-center py-20">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
              </div>
            ) : results.length > 0 ? (
              <>
                {/* Format Filter and Search */}
                <div className="mb-6 bg-slate-800 rounded-xl p-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Filter by Format/Division:
                  </label>
                  <div className="flex flex-wrap gap-2 mb-6">
                    <button
                      onClick={() => setSelectedFormat('all')}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        selectedFormat === 'all'
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      All Formats
                    </button>
                    {availableFormats.map((format) => (
                      <button
                        key={format}
                        onClick={() => setSelectedFormat(format)}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                          selectedFormat === format
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        }`}
                      >
                        {format}
                      </button>
                    ))}
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

                {/* Results grouped by format and class */}
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
                                    <th
                                      className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                                      onClick={() => handleSort('placement')}
                                    >
                                      Place{getSortIcon('placement')}
                                    </th>
                                    <th
                                      className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                                      onClick={() => handleSort('competitor')}
                                    >
                                      Competitor{getSortIcon('competitor')}
                                    </th>
                                    <th
                                      className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                                      onClick={() => handleSort('state')}
                                    >
                                      State{getSortIcon('state')}
                                    </th>
                                    <th
                                      className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                                      onClick={() => handleSort('mecaId')}
                                    >
                                      MECA ID{getSortIcon('mecaId')}
                                    </th>
                                    {format === 'SPL' && (
                                      <>
                                        <th
                                          className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                                          onClick={() => handleSort('wattage')}
                                        >
                                          Wattage{getSortIcon('wattage')}
                                        </th>
                                        <th
                                          className="px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                                          onClick={() => handleSort('frequency')}
                                        >
                                          Frequency{getSortIcon('frequency')}
                                        </th>
                                      </>
                                    )}
                                    <th
                                      className="px-4 py-3 text-right text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                                      onClick={() => handleSort('score')}
                                    >
                                      Score{getSortIcon('score')}
                                    </th>
                                    <th
                                      className="px-4 py-3 text-right text-sm font-semibold text-gray-300 cursor-pointer hover:bg-slate-600 transition-colors"
                                      onClick={() => handleSort('points')}
                                    >
                                      Points{getSortIcon('points')}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                  {sortResults(classResults).map((result) => {
                                    const mecaId = result.mecaId || result.meca_id;
                                    const membershipExpiry = result.competitor?.membership_expiry;
                                    const mecaDisplay = getMecaIdDisplay(mecaId, membershipExpiry);
                                    const state = result.competitor?.state || 'N/E';

                                    return (
                                      <tr
                                        key={result.id}
                                        className="hover:bg-slate-700/50 transition-colors"
                                      >
                                        <td className="px-4 py-3">
                                          <span
                                            className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getPlacementBadge(
                                              result.placement
                                            )}`}
                                          >
                                            {result.placement}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="font-semibold text-white">
                                            {result.competitorName || result.competitor_name}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="text-gray-300">
                                            {state}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className={`font-semibold ${mecaDisplay.color}`}>
                                            {mecaDisplay.text}
                                          </div>
                                        </td>
                                        {format === 'SPL' && (
                                          <>
                                            <td className="px-4 py-3 text-gray-300">
                                              {result.wattage || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300">
                                              {result.frequency || '-'}
                                            </td>
                                          </>
                                        )}
                                        <td className="px-4 py-3 text-right">
                                          <span className="text-lg font-bold text-white">
                                            {result.score}
                                          </span>
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
              </>
            ) : (
              <div className="text-center py-20 bg-slate-800 rounded-xl">
                <Trophy className="h-20 w-20 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-xl">
                  No results available for this event yet.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-slate-800 rounded-xl">
            <Calendar className="h-20 w-20 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">No completed events with results for this season.</p>
            <p className="text-gray-500 mt-2">Try selecting a different season above to view past results.</p>
          </div>
        )}
      </div>
    </div>
  );
}
