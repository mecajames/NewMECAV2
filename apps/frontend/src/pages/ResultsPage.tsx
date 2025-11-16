import { useEffect, useState } from 'react';
import { Trophy, Calendar, Award, Search } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { eventsApi, Event } from '../api-client/events.api-client';
import { competitionResultsApi, CompetitionResult } from '../api-client/competition-results.api-client';
import { competitionClassesApi, CompetitionClass } from '../api-client/competition-classes.api-client';
import SeasonSelector from '../components/SeasonSelector';

interface GroupedResults {
  [format: string]: {
    [className: string]: CompetitionResult[];
  };
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [classes, setClasses] = useState<CompetitionClass[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [availableFormats, setAvailableFormats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchEvents();
    fetchClasses();
  }, [selectedSeasonId]);

  useEffect(() => {
    if (selectedEventId) {
      fetchResults();
    }
  }, [selectedEventId]);

  // Handle event pre-selection from navigation state
  useEffect(() => {
    if (location.state?.eventId) {
      setSelectedEventId(location.state.eventId);
      // Clear the state to prevent re-selection on page refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

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
      if (filtered.length > 0) {
        setSelectedEventId(filtered[0].id);
      } else {
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
      const data = await competitionResultsApi.getByEvent(selectedEventId);

      // Sort by placement ascending
      data.sort((a, b) => a.placement - b.placement);

      setResults(data);

      // Extract unique formats from results
      const formats = new Set<string>();
      data.forEach(result => {
        const classData = classes.find(c => c.id === (result.classId || result.class_id));
        if (classData?.format) {
          formats.add(classData.format);
        }
      });
      setAvailableFormats(Array.from(formats).sort());
    } catch (error) {
      console.error('Error fetching results:', error);
    }
    setResultsLoading(false);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Competition Results</h1>
          <p className="text-gray-400 text-lg">
            View detailed results from completed events
          </p>
        </div>

        {/* Season Filter */}
        <div className="mb-6 bg-slate-800 rounded-xl p-6">
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
        ) : events.length > 0 ? (
          <>
            <div className="mb-8 bg-slate-800 rounded-xl p-6">
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
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} -{' '}
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEvent && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">
                        {selectedEvent.title}
                      </h3>
                      <p className="text-gray-400">
                        {new Date(selectedEvent.event_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
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
              )}
            </div>

            {resultsLoading ? (
              <div className="text-center py-20">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
              </div>
            ) : results.length > 0 ? (
              <>
                {/* Format Filter Tabs */}
                <div className="mb-6 bg-slate-800 rounded-xl p-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Filter by Format/Division:
                  </label>
                  <div className="flex flex-wrap gap-2">
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
                </div>

                {/* Search Filter */}
                <div className="mb-6 bg-slate-800 rounded-xl p-6">
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
                        <h2 className="text-2xl font-bold text-white">{format} Results</h2>
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
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Place</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Competitor</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">State</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">MECA ID</th>
                                    {format === 'SPL' && (
                                      <>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Wattage</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Frequency</th>
                                      </>
                                    )}
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Score</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Points</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                  {classResults.map((result) => {
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
            <p className="text-gray-400 text-xl">No completed events with results yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
