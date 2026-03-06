import { useState, useEffect, useMemo } from 'react';
import { Trophy, Trash2, AlertTriangle, Plus, ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSeasons } from '@/shared/contexts';
import { eventsApi, Event } from '@/events/events.api-client';
import { competitionClassesApi, CompetitionClass } from '@/competition-classes/competition-classes.api-client';
import { splWorldRecordsApi, SplWorldRecord, CreateSplWorldRecordDto } from '../spl-world-records.api-client';
import ActiveMemberLookup from '@/shared/components/MemberSearchInput';
import type { Profile } from '@/profiles/profiles.api-client';

export default function WorldRecordsAdminPage() {
  const navigate = useNavigate();
  const { seasons, currentSeason } = useSeasons();

  // Form state
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [events, setEvents] = useState<Event[]>([]);
  const [classes, setClasses] = useState<CompetitionClass[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [competitorName, setCompetitorName] = useState('');
  const [mecaId, setMecaId] = useState('');
  const [score, setScore] = useState('');
  const [wattage, setWattage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [notes, setNotes] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Data state
  const [records, setRecords] = useState<SplWorldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Set default season
  useEffect(() => {
    if (currentSeason && !selectedSeasonId) {
      setSelectedSeasonId(currentSeason.id);
    }
  }, [currentSeason, selectedSeasonId]);

  // Load records
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const data = await splWorldRecordsApi.getAll();
        setRecords(data);
      } catch (err: any) {
        console.error('Failed to load records:', err);
      } finally {
        setLoading(false);
      }
    };
    loadRecords();
  }, []);

  // Load events and classes when season changes
  useEffect(() => {
    if (!selectedSeasonId) {
      setEvents([]);
      setClasses([]);
      return;
    }

    const loadData = async () => {
      try {
        const [eventsData, classesData] = await Promise.all([
          eventsApi.getAllBySeason(selectedSeasonId),
          competitionClassesApi.getBySeason(selectedSeasonId),
        ]);
        setEvents(eventsData);
        setClasses(classesData);
      } catch (err: any) {
        console.error('Failed to load events/classes:', err);
      }
    };
    loadData();
  }, [selectedSeasonId]);

  // Filter to only SPL classes
  const splClasses = useMemo(
    () => classes.filter(c => c.format?.toLowerCase() === 'spl'),
    [classes],
  );

  // Filter to only 4X events (points_multiplier === 4)
  const fourXEvents = useMemo(
    () => events.filter(ev => ev.points_multiplier === 4),
    [events],
  );

  // Check if selected class already has a record
  const existingRecordForClass = useMemo(
    () => records.find(r => r.class_id === selectedClassId),
    [records, selectedClassId],
  );

  // Filter records for table search
  const filteredRecords = useMemo(() => {
    if (!searchFilter) return records;
    const q = searchFilter.toLowerCase();
    return records.filter(r =>
      r.competitor_name.toLowerCase().includes(q) ||
      r.class_name.toLowerCase().includes(q) ||
      (r.meca_id || '').toLowerCase().includes(q) ||
      (r.event_name || '').toLowerCase().includes(q)
    );
  }, [records, searchFilter]);

  const handleMemberSelect = (profile: Profile) => {
    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
    setCompetitorName(fullName);
    setMecaId(profile.meca_id || '');
  };

  const resetForm = () => {
    setSelectedEventId('');
    setSelectedClassId('');
    setCompetitorName('');
    setMecaId('');
    setScore('');
    setWattage('');
    setFrequency('');
    setNotes('');
    setRecordDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedClassId || !competitorName || !score) {
      setError('Class, Competitor Name, and Score are required.');
      return;
    }

    const selectedClass = splClasses.find(c => c.id === selectedClassId);
    const selectedEvent = fourXEvents.find(ev => ev.id === selectedEventId);

    const dto: CreateSplWorldRecordDto = {
      class_id: selectedClassId,
      class_name: selectedClass?.name || '',
      event_id: selectedEventId || null,
      event_name: selectedEvent?.title || null,
      season_id: selectedSeasonId || null,
      competitor_name: competitorName,
      meca_id: mecaId || null,
      score: parseFloat(score),
      wattage: wattage ? parseInt(wattage) : null,
      frequency: frequency ? parseInt(frequency) : null,
      notes: notes || null,
      record_date: recordDate || null,
    };

    try {
      setSaving(true);
      await splWorldRecordsApi.create(dto);
      setSuccess(
        existingRecordForClass
          ? `Record updated! Replaced ${existingRecordForClass.competitor_name}'s record.`
          : 'World record created successfully!',
      );
      resetForm();
      setShowForm(false);
      // Reload records
      const data = await splWorldRecordsApi.getAll();
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to save world record');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: SplWorldRecord) => {
    if (!confirm(`Delete world record for ${record.class_name} held by ${record.competitor_name}?`)) {
      return;
    }
    try {
      await splWorldRecordsApi.delete(record.id);
      setRecords(prev => prev.filter(r => r.id !== record.id));
      setSuccess('Record deleted.');
    } catch (err: any) {
      setError(err.message || 'Failed to delete record');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back to Admin Dashboard */}
        <button
          onClick={() => navigate('/dashboard/admin')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Admin Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              SPL World Records
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage SPL world record entries. Select a season and class, then enter the record holder's information.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setSuccess(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Record
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6">
            <p className="text-green-400">{success}</p>
          </div>
        )}

        {/* Entry Form (shown when Add clicked) */}
        {showForm && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-orange-500" />
              Enter World Record
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Season / Event / Class Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Season</label>
                  <select
                    value={selectedSeasonId}
                    onChange={e => {
                      setSelectedSeasonId(e.target.value);
                      setSelectedEventId('');
                      setSelectedClassId('');
                    }}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select Season</option>
                    {seasons.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Event - 4X Only (optional)</label>
                  <select
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    disabled={!selectedSeasonId}
                  >
                    <option value="">Select Event</option>
                    {fourXEvents.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">SPL Class *</label>
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    disabled={!selectedSeasonId}
                    required
                  >
                    <option value="">Select Class</option>
                    {splClasses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Replacement Warning */}
              {existingRecordForClass && (
                <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                  <p className="text-yellow-300 text-sm">
                    This will replace the current record held by{' '}
                    <strong>{existingRecordForClass.competitor_name}</strong> (score:{' '}
                    {Number(existingRecordForClass.score).toFixed(2)})
                  </p>
                </div>
              )}

              {/* Competitor Name & MECA ID (type in either to auto-lookup active members) */}
              <ActiveMemberLookup
                name={competitorName}
                mecaId={mecaId}
                onNameChange={setCompetitorName}
                onMecaIdChange={setMecaId}
                onSelect={handleMemberSelect}
              />

              {/* Score / Wattage / Frequency Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Score (dB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={score}
                    onChange={e => setScore(e.target.value)}
                    placeholder="e.g. 165.50"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Wattage</label>
                  <input
                    type="number"
                    value={wattage}
                    onChange={e => setWattage(e.target.value)}
                    placeholder="e.g. 3000"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Frequency</label>
                  <input
                    type="number"
                    value={frequency}
                    onChange={e => setFrequency(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Record Date</label>
                  <input
                    type="date"
                    value={recordDate}
                    onChange={e => setRecordDate(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes about this record..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { resetForm(); setShowForm(false); }}
                  className="px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : existingRecordForClass ? 'Replace Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Current Records Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Current World Records ({records.length})
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter by name, class, MECA ID..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-1.5 text-white text-sm placeholder-gray-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {records.length === 0 ? 'No world records have been entered yet.' : 'No records match your search.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Class</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Record Holder</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">MECA ID</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-300">Score</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-300">Watt</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-300">Freq</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Event</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Date</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => (
                    <tr
                      key={record.id}
                      className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                        index % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/60'
                      }`}
                    >
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        {record.class_name}
                      </td>
                      <td className="px-4 py-3 text-orange-400 font-semibold whitespace-nowrap">
                        {record.competitor_name}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {record.meca_id || '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-right text-yellow-400 font-bold whitespace-nowrap">
                        {Number(record.score).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">
                        {record.wattage != null ? record.wattage : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">
                        {record.frequency != null ? record.frequency : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {record.event_name || '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {record.record_date
                          ? new Date(record.record_date).toLocaleDateString()
                          : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(record)}
                          className="text-red-400 hover:text-red-300 transition-colors p-1"
                          title="Delete record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
