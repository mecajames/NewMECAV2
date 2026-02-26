import { useEffect, useState, useMemo } from 'react';
import { Trophy, Calendar, Award, Search, ArrowUpDown, ArrowUp, ArrowDown, Layers, MapPin } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { eventsApi, Event } from '@/events';
import { competitionResultsApi, CompetitionResult } from '@/competition-results';
import { competitionClassesApi, CompetitionClass } from '@/competition-classes';
import { SeasonSelector } from '@/seasons';
import { SEOHead, useResultsSEO } from '@/shared/seo';
import { useAuth } from '@/auth';
import { BannerDisplay, useBanners } from '@/banners';
import { BannerPosition } from '@newmeca/shared';

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
  const { profile } = useAuth();
  const isAuthenticated = !!profile;

  // Get event ID from URL query params
  const eventIdFromUrl = searchParams.get('eventId');

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(eventIdFromUrl || '');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [classes, setClasses] = useState<CompetitionClass[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [availableFormats, setAvailableFormats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('placement');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [multiDayEvents, setMultiDayEvents] = useState<Event[]>([]);
  const [isAggregatedView, setIsAggregatedView] = useState(false);
  const [eventResultCounts, setEventResultCounts] = useState<Record<string, number>>({});
  const { banners: resultsBanners } = useBanners(BannerPosition.RESULTS_TOP);

  // Memoized list of recent events (past 10 days to capture weekend events)
  const recentEvents = useMemo(() => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    tenDaysAgo.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Filter for events in the past 10 days and group multi-day finals
    const recent: Event[] = [];
    const processedGroups = new Set<string>();

    events.forEach(event => {
      const eventDate = new Date(event.event_date);
      if (eventDate < tenDaysAgo || eventDate > today) return;

      // Check if this is a multi-day State/World Finals event
      if (event.multi_day_group_id &&
          (event.event_type === 'state_finals' || event.event_type === 'world_finals')) {
        // Only add one entry per multi-day group
        if (!processedGroups.has(event.multi_day_group_id)) {
          processedGroups.add(event.multi_day_group_id);
          // Find Day 1 of this group
          const groupEvents = events.filter(e => e.multi_day_group_id === event.multi_day_group_id);
          const dayOne = groupEvents.find(e => e.day_number === 1) || groupEvents[0];
          recent.push(dayOne);
        }
      } else {
        recent.push(event);
      }
    });

    // Sort by date descending (most recent first)
    return recent.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  }, [events]);

  // Memoized list of events for the dropdown - groups multi-day State/World Finals into single entries
  const displayEvents = useMemo(() => {
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
  }, [events]);

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
      // Use the optimized completed-with-results endpoint which handles
      // server-side filtering for completed events and includes result counts
      const response = await eventsApi.getCompletedEventsWithResults({
        page: 1,
        limit: 500,
        seasonId: selectedSeasonId || undefined,
      });

      const completedEvents = response.events as Event[];

      // Build result counts from the response data
      const resultCounts: Record<string, number> = {};
      completedEvents.forEach(e => {
        if (e.result_count !== undefined) {
          resultCounts[e.id] = Number(e.result_count) || 0;
        }
      });
      setEventResultCounts(resultCounts);

      // Sort by event_date descending
      completedEvents.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

      setEvents(completedEvents);

      // Only auto-select if we came from URL with a specific event
      if (eventIdFromUrl && completedEvents.some(e => e.id === eventIdFromUrl)) {
        // Event from URL exists in the filtered list, keep it selected
        setSelectedEventId(eventIdFromUrl);
      } else if (completedEvents.length === 0) {
        setSelectedEventId('');
        setResults([]);
      } else if (!eventIdFromUrl) {
        // Don't auto-select - let user choose from dropdown
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
          comparison = (a.stateCode || a.state_code || '').localeCompare(b.stateCode || b.state_code || '');
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

  // Memoized available classes based on loaded results and selected format
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    results.forEach(result => {
      const classData = classes.find(c => c.id === (result.classId || result.class_id));
      const format = classData?.format || 'Unknown';
      const className = result.competitionClass || result.competition_class || 'Unknown';

      // Only include classes for the selected format (or all if no format filter)
      if (selectedFormat === 'all' || format === selectedFormat) {
        classSet.add(className);
      }
    });
    return Array.from(classSet).sort();
  }, [results, classes, selectedFormat]);

  // Memoized grouped results by format and class with search/filter applied
  const groupedResults: GroupedResults = useMemo(() => {
    const grouped: GroupedResults = {};
    results.forEach(result => {
      const classData = classes.find(c => c.id === (result.classId || result.class_id));
      const format = classData?.format || 'Unknown';
      const className = result.competitionClass || result.competition_class || 'Unknown';

      if (selectedFormat !== 'all' && format !== selectedFormat) {
        return;
      }

      if (selectedClass !== 'all' && className !== selectedClass) {
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

      if (!grouped[format]) {
        grouped[format] = {};
      }
      if (!grouped[format][className]) {
        grouped[format][className] = [];
      }
      grouped[format][className].push(result);
    });
    return grouped;
  }, [results, classes, selectedFormat, selectedClass, searchTerm]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
      <SEOHead {...seoProps} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">Competition Results</h1>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg">
            View detailed results from completed events
          </p>
        </div>

        {/* RESULTS_TOP banner */}
        {resultsBanners.length > 0 && <BannerDisplay banner={resultsBanners[0]} />}

        {/* Season and Event Selectors - Same Row */}
        <div className="mb-6 sm:mb-8 bg-slate-800 rounded-xl p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Season Selector */}
            <SeasonSelector
              selectedSeasonId={selectedSeasonId}
              onSeasonChange={setSelectedSeasonId}
              showAllOption={true}
              autoSelectCurrent={true}
            />

            {/* Event Selector */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2 sm:mb-3">
                Select Event
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  <option value="">-- Select an Event --</option>
                  {displayEvents.map((event) => {
                    // Check if this is a combined multi-day State/World Finals event
                    const isMultiDayFinals = event.multi_day_group_id &&
                      (event.event_type === 'state_finals' || event.event_type === 'world_finals');
                    const groupEvents = isMultiDayFinals
                      ? events.filter(e => e.multi_day_group_id === event.multi_day_group_id)
                      : [];

                    // Check if event has results - for multi-day, check all days
                    const hasResults = isMultiDayFinals && groupEvents.length > 0
                      ? groupEvents.some(e => (eventResultCounts[e.id] || 0) > 0)
                      : (eventResultCounts[event.id] || 0) > 0;

                    // Style: green for has results, yellow for pending
                    const optionStyle = hasResults
                      ? { backgroundColor: '#166534', color: '#fff' } // green-800
                      : { backgroundColor: '#854d0e', color: '#fff' }; // yellow-800

                    return (
                      <option
                        key={event.id}
                        value={event.id}
                        style={optionStyle}
                      >
                        {hasResults ? '\u2713 ' : '\u25cb '}{event.title}
                        {isMultiDayFinals && groupEvents.length > 1
                          ? ` (${groupEvents.length}-Day)`
                          : ` - ${new Date(event.event_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}`
                        }
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Legend for dropdown colors */}
              <div className="mt-2 flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded" style={{ backgroundColor: '#166534' }}></span>
                  <span className="text-gray-400">Results Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded" style={{ backgroundColor: '#854d0e' }}></span>
                  <span className="text-gray-400">Results Pending</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : events.length > 0 ? (
          <>
            {/* Selected Event Info */}
            {selectedEvent && (
              <div className="mb-6 sm:mb-8 bg-slate-800 rounded-xl p-4 sm:p-6">
                {(() => {
                  // Check if this is an aggregated multi-day State/World Finals
                  const isMultiDayFinals = selectedEvent.multi_day_group_id &&
                    (selectedEvent.event_type === 'state_finals' || selectedEvent.event_type === 'world_finals');
                  const showDayBadge = selectedEvent.day_number && !isMultiDayFinals;

                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 flex flex-wrap items-center gap-2">
                          <span className="break-words">{selectedEvent.title}</span>
                          {showDayBadge && (
                            <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500 whitespace-nowrap">
                              Day {selectedEvent.day_number}
                            </span>
                          )}
                          {isMultiDayFinals && multiDayEvents.length > 1 && (
                            <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500 whitespace-nowrap">
                              {multiDayEvents.length}-Day Event
                            </span>
                          )}
                        </h3>
                        <p className="text-sm sm:text-base text-gray-400">
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
                        className="w-full sm:w-auto px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm sm:text-base font-semibold rounded-lg transition-colors text-center flex-shrink-0"
                      >
                        View Event
                      </button>
                    </div>
                  );
                })()}

                {/* Aggregated Results Banner */}
                {isAggregatedView && multiDayEvents.length > 1 && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-purple-500/10 border border-purple-500 rounded-lg">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-base text-purple-400 font-semibold">
                          Combined Results from {multiDayEvents.length} Days
                        </h4>
                        <p className="text-gray-400 text-xs sm:text-sm mt-1">
                          Showing highest score per competitor per class across all days of this{' '}
                          {selectedEvent?.event_type === 'world_finals' ? 'World Finals' : 'State Finals'} event.
                        </p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                          {multiDayEvents.map((dayEvent) => (
                            <span
                              key={dayEvent.id}
                              className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-slate-700 text-gray-300"
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
            )}

            {/* Recent Events Section */}
            {recentEvents.length > 0 && !selectedEventId && (
              <div className="mb-6 sm:mb-8 bg-slate-800 rounded-xl p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                  Recent Events (Past 10 Days)
                </h2>
                <div className="space-y-3">
                  {recentEvents.map((event) => {
                    // Check if this is a combined multi-day State/World Finals event
                    const isMultiDayFinals = event.multi_day_group_id &&
                      (event.event_type === 'state_finals' || event.event_type === 'world_finals');
                    const groupEvents = isMultiDayFinals
                      ? events.filter(e => e.multi_day_group_id === event.multi_day_group_id)
                      : [];

                    // Check if event has results
                    const hasResults = isMultiDayFinals && groupEvents.length > 0
                      ? groupEvents.some(e => (eventResultCounts[e.id] || 0) > 0)
                      : (eventResultCounts[event.id] || 0) > 0;

                    // Location display
                    const location = [event.venue_city, event.venue_state].filter(Boolean).join(', ') || event.venue_name;

                    return (
                      <div
                        key={event.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border-l-4 gap-3 ${
                          hasResults
                            ? 'bg-green-900/20 border-green-500'
                            : 'bg-yellow-900/20 border-yellow-500'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h3 className="text-base sm:text-lg font-semibold text-white">
                              {event.title}
                            </h3>
                            {isMultiDayFinals && groupEvents.length > 1 && (
                              <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500">
                                {groupEvents.length}-Day
                              </span>
                            )}
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold ${
                              hasResults
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {hasResults ? 'Results Available' : 'Results Pending'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              {isMultiDayFinals && groupEvents.length > 1
                                ? `${new Date(groupEvents[0]?.event_date || event.event_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })} - ${new Date(groupEvents[groupEvents.length - 1]?.event_date || event.event_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}`
                                : new Date(event.event_date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                              }
                            </span>
                            {location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                {location}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedEventId(event.id)}
                          className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
                            hasResults
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          }`}
                        >
                          <Trophy className="h-4 w-4" />
                          View Results
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!selectedEventId && recentEvents.length === 0 ? (
              <div className="text-center py-12 sm:py-20 bg-slate-800 rounded-xl px-4">
                <Calendar className="h-14 w-14 sm:h-20 sm:w-20 text-gray-500 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-400 text-base sm:text-xl">Please select an event from the dropdown above</p>
                <p className="text-gray-500 text-sm sm:text-base mt-2">Choose an event to view its competition results.</p>
              </div>
            ) : !selectedEventId ? (
              null
            ) : resultsLoading ? (
              <div className="text-center py-20">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
              </div>
            ) : results.length > 0 ? (
              <>
                {/* Format Filter and Search */}
                <div className="mb-4 sm:mb-6 bg-slate-800 rounded-xl p-4 sm:p-6">
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2 sm:mb-3">
                    Filter by Format/Division:
                  </label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                    <button
                      onClick={() => { setSelectedFormat('all'); setSelectedClass('all'); }}
                      className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
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
                        onClick={() => {
                          setSelectedFormat(format);
                          setSelectedClass('all');
                        }}
                        className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
                          selectedFormat === format
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        }`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>

                  {/* Class Filter Dropdown */}
                  {availableClasses.length > 1 && (
                    <div className="mb-4 sm:mb-6">
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2 sm:mb-3">
                        Filter by Class:
                      </label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full sm:w-64 px-4 py-2.5 sm:py-3 bg-slate-700 border border-slate-600 rounded-lg text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="all">All Classes</option>
                        {availableClasses.map((cls) => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2 sm:mb-3">
                    Search by Name or MECA ID
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Enter competitor name or MECA ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-slate-700 border border-slate-600 rounded-lg text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Results grouped by format and class */}
                <div className="space-y-6 sm:space-y-8">
                  {Object.entries(groupedResults).map(([format, classesByName]) => (
                    <div key={format} className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                      <div className="bg-slate-700 px-4 sm:px-6 py-3 sm:py-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3">
                          {format} Results
                          <span className="text-xs sm:text-sm bg-orange-500 text-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                            {Object.values(classesByName).reduce((sum, arr) => sum + arr.length, 0)}
                          </span>
                        </h2>
                      </div>

                      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
                        {Object.entries(classesByName).map(([className, classResults]) => (
                          <div key={className}>
                            <h3 className="text-base sm:text-lg font-semibold text-orange-400 mb-2 sm:mb-3 px-1 sm:px-3">
                              {className}
                            </h3>

                            {/* Mobile Card Layout */}
                            <div className="sm:hidden space-y-2">
                              {sortResults(classResults).map((result) => {
                                const mecaId = result.mecaId || result.meca_id;
                                const membershipExpiry = result.competitor?.membership_expiry;
                                const mecaDisplay = getMecaIdDisplay(mecaId, membershipExpiry);
                                const state = result.stateCode || result.state_code || 'N/E';

                                return (
                                  <div
                                    key={result.id}
                                    className="bg-slate-700/50 rounded-lg p-3 flex items-start gap-3"
                                  >
                                    {/* Placement Badge */}
                                    <span
                                      className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm flex-shrink-0 ${getPlacementBadge(
                                        result.placement
                                      )}`}
                                    >
                                      {result.placement}
                                    </span>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-white text-sm">
                                        {result.competitorName || result.competitor_name}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
                                        <span>{state}</span>
                                        {mecaId && mecaId !== '999999' && isAuthenticated ? (
                                          <Link
                                            to={`/results/member/${mecaId}`}
                                            className={`font-semibold ${mecaDisplay.color} hover:underline hover:text-orange-400 transition-colors`}
                                          >
                                            ID: {mecaDisplay.text}
                                          </Link>
                                        ) : (
                                          <span className={`font-semibold ${mecaDisplay.color}`}>
                                            {mecaId && mecaId !== '999999' ? `ID: ${mecaDisplay.text}` : mecaDisplay.text}
                                          </span>
                                        )}
                                        {format === 'SPL' && result.wattage && (
                                          <span>{result.wattage}W</span>
                                        )}
                                        {format === 'SPL' && result.frequency && (
                                          <span>{result.frequency}Hz</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Score & Points */}
                                    <div className="text-right flex-shrink-0">
                                      <div className="text-base font-bold text-white">
                                        {result.score}
                                      </div>
                                      <div className="flex items-center justify-end gap-0.5 text-orange-500 text-xs font-semibold">
                                        <Award className="h-3 w-3" />
                                        {result.pointsEarned ?? result.points_earned}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Desktop Table Layout */}
                            <div className="hidden sm:block overflow-x-auto rounded-lg">
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
                                    const state = result.stateCode || result.state_code || 'N/E';

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
                                          {mecaId && mecaId !== '999999' && isAuthenticated ? (
                                            <Link
                                              to={`/results/member/${mecaId}`}
                                              className={`font-semibold ${mecaDisplay.color} hover:underline hover:text-orange-400 transition-colors`}
                                            >
                                              {mecaDisplay.text}
                                            </Link>
                                          ) : (
                                            <div className={`font-semibold ${mecaDisplay.color}`}>
                                              {mecaDisplay.text}
                                            </div>
                                          )}
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
              <div className="text-center py-12 sm:py-20 bg-slate-800 rounded-xl px-4">
                <Trophy className="h-14 w-14 sm:h-20 sm:w-20 text-gray-500 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-400 text-base sm:text-xl">
                  Results have not been entered for this event yet.
                </p>
                <p className="text-gray-500 text-sm sm:text-base mt-2">
                  Please check back later or contact the event director.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 sm:py-20 bg-slate-800 rounded-xl px-4">
            <Calendar className="h-14 w-14 sm:h-20 sm:w-20 text-gray-500 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-400 text-base sm:text-xl">No completed events with results for this season.</p>
            <p className="text-gray-500 text-sm sm:text-base mt-2">Try selecting a different season above to view past results.</p>
          </div>
        )}
      </div>
    </div>
  );
}
