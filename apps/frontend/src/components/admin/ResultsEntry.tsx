import { useEffect, useState } from 'react';
import { Trophy, Plus, X, Save, Search } from 'lucide-react';
import { eventsApi, Event } from '../../api-client/events.api-client';
import { profilesApi, Profile } from '../../api-client/profiles.api-client';
import { competitionResultsApi } from '../../api-client/competition-results.api-client';
import { useAuth } from '../../contexts/AuthContext';

interface ResultEntry {
  id?: string;
  competitor_id: string;
  competitor_name: string;
  competition_class: string;
  score: string;
  placement: string;
  points_earned: string;
  vehicle_info: string;
  notes: string;
}

export default function ResultsEntry() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [competitors, setCompetitors] = useState<Profile[]>([]);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEvents();
    fetchCompetitors();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchExistingResults();
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const data = await eventsApi.getAll(1, 1000);
      const filtered = data.filter(e =>
        ['upcoming', 'ongoing', 'completed'].includes(e.status)
      );
      setEvents(filtered);
      if (filtered.length > 0) setSelectedEventId(filtered[0].id);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
    setLoading(false);
  };

  const fetchCompetitors = async () => {
    try {
      const data = await profilesApi.getAll(1, 1000);
      setCompetitors(data);
    } catch (error) {
      console.error('Error fetching competitors:', error);
    }
  };

  const fetchExistingResults = async () => {
    try {
      const data = await competitionResultsApi.getByEvent(selectedEventId);
      const formattedResults: ResultEntry[] = data.map((r) => ({
        id: r.id,
        competitor_id: r.competitor_id || '',
        competitor_name: r.competitor_name,
        competition_class: r.competition_class,
        score: r.score.toString(),
        placement: r.placement.toString(),
        points_earned: r.points_earned.toString(),
        vehicle_info: r.vehicle_info || '',
        notes: r.notes || '',
      }));
      setResults(formattedResults);
    } catch (error) {
      console.error('Error fetching existing results:', error);
      setResults([]);
    }
  };

  const addResultRow = () => {
    setResults([
      ...results,
      {
        competitor_id: '',
        competitor_name: '',
        competition_class: '',
        score: '',
        placement: '',
        points_earned: '',
        vehicle_info: '',
        notes: '',
      },
    ]);
  };

  const updateResult = (index: number, field: keyof ResultEntry, value: string) => {
    const updated = [...results];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'competitor_id' && value) {
      const competitor = competitors.find((c) => c.id === value);
      if (competitor) {
        updated[index].competitor_name = competitor.full_name;
      }
    }

    setResults(updated);
  };

  const removeResult = (index: number) => {
    setResults(results.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedEventId || results.length === 0) return;

    setSaving(true);

    const validResults = results.filter(
      (r) =>
        r.competitor_name &&
        r.competition_class &&
        r.score &&
        r.placement &&
        r.points_earned
    );

    try {
      // TODO: Backend should support bulk delete/replace for event results
      // For now, we'll create/update individual results
      for (const r of validResults) {
        const resultData = {
          event_id: selectedEventId,
          competitor_id: r.competitor_id || null,
          competitor_name: r.competitor_name,
          competition_class: r.competition_class,
          score: parseFloat(r.score),
          placement: parseInt(r.placement),
          points_earned: parseInt(r.points_earned),
          vehicle_info: r.vehicle_info || null,
          notes: r.notes || null,
          created_by: profile!.id,
        };

        if (r.id) {
          await competitionResultsApi.update(r.id, resultData as any);
        } else {
          await competitionResultsApi.create(resultData as any);
        }
      }

      alert('Results saved successfully!');
      fetchExistingResults();
    } catch (error: any) {
      alert('Error saving results: ' + error.message);
    }

    setSaving(false);
  };

  const filteredCompetitors = competitors.filter((c) =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Competition Results Entry</h2>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        </div>
      ) : (
        <>
          <div className="bg-slate-700 rounded-lg p-6 mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select Event *
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} -{' '}
                  {new Date(event.event_date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-700 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Results</h3>
              <div className="flex gap-2">
                <button
                  onClick={addResultRow}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Result
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || results.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save All Results'}
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="bg-slate-800 rounded-lg p-4 grid grid-cols-1 md:grid-cols-6 gap-4"
                >
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">
                      Competitor *
                    </label>
                    <select
                      value={result.competitor_id}
                      onChange={(e) =>
                        updateResult(index, 'competitor_id', e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select or enter manually</option>
                      {filteredCompetitors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={result.competitor_name}
                      onChange={(e) =>
                        updateResult(index, 'competitor_name', e.target.value)
                      }
                      placeholder="Or type name"
                      className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Class *</label>
                    <input
                      type="text"
                      value={result.competition_class}
                      onChange={(e) =>
                        updateResult(index, 'competition_class', e.target.value)
                      }
                      placeholder="e.g., Pro, Street"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Score *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={result.score}
                      onChange={(e) => updateResult(index, 'score', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Place *</label>
                    <input
                      type="number"
                      value={result.placement}
                      onChange={(e) => updateResult(index, 'placement', e.target.value)}
                      placeholder="1"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Points *</label>
                    <input
                      type="number"
                      value={result.points_earned}
                      onChange={(e) =>
                        updateResult(index, 'points_earned', e.target.value)
                      }
                      placeholder="100"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="md:col-span-5">
                    <label className="block text-xs text-gray-400 mb-1">
                      Vehicle Info
                    </label>
                    <input
                      type="text"
                      value={result.vehicle_info}
                      onChange={(e) =>
                        updateResult(index, 'vehicle_info', e.target.value)
                      }
                      placeholder="Year, Make, Model"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => removeResult(index)}
                      className="w-full p-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                      <X className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}

              {results.length === 0 && (
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No results added yet</p>
                  <button
                    onClick={addResultRow}
                    className="mt-4 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Add First Result
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
