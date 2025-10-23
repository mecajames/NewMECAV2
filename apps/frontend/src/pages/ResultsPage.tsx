import { useEffect, useState } from 'react';
import { Trophy, Calendar, Award, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, Event, CompetitionResult } from '../lib/supabase';
import SeasonSelector from '../components/SeasonSelector';

export default function ResultsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [selectedSeasonId]);

  useEffect(() => {
    if (selectedEventId) {
      fetchResults();
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    setLoading(true);
    let query = supabase
      .from('events')
      .select('*, season:seasons(*)')
      .eq('status', 'completed')
      .order('event_date', { ascending: false });

    if (selectedSeasonId) {
      query = query.eq('season_id', selectedSeasonId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setEvents(data);
      if (data.length > 0) {
        setSelectedEventId(data[0].id);
      } else {
        setSelectedEventId('');
        setResults([]);
      }
    }
    setLoading(false);
  };

  const fetchResults = async () => {
    setResultsLoading(true);
    const { data, error } = await supabase
      .from('competition_results')
      .select('*, competitor:profiles(*)')
      .eq('event_id', selectedEventId)
      .order('placement', { ascending: true });

    if (!error && data) {
      setResults(data);
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
              <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                          Place
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                          Competitor
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                          Class
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                          Vehicle
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                          Score
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {results.map((result) => (
                        <tr
                          key={result.id}
                          className="hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold ${getPlacementBadge(
                                result.placement
                              )}`}
                            >
                              {result.placement}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white">
                              {result.competitor_name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-500/10 text-orange-400">
                              {result.competition_class}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            {result.vehicle_info || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-lg font-bold text-white">
                              {result.score}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-orange-500 font-semibold">
                              <Award className="h-5 w-5" />
                              {result.points_earned}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
