import { useEffect, useState, useRef } from 'react';
import { Trophy, Plus, X, Save, Search, Calculator, Upload, Download, FileSpreadsheet, File } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { eventsApi, Event } from '../../api-client/events.api-client';
import { profilesApi, Profile } from '../../api-client/profiles.api-client';
import { competitionResultsApi } from '../../api-client/competition-results.api-client';
import { competitionClassesApi, CompetitionClass } from '../../api-client/competition-classes.api-client';
import { useAuth } from '../../contexts/AuthContext';

interface ResultEntry {
  id?: string;
  competitor_id: string;
  competitor_name: string;
  meca_id: string;
  competition_class: string;
  class_id: string;
  format: string;
  score: string;
  placement: string;
  points_earned: string;
  vehicle_info: string;
  notes: string;
}

interface ResultsEntryProps {
  preSelectedEventId?: string | null;
}

export default function ResultsEntry({ preSelectedEventId }: ResultsEntryProps = {}) {
  const { profile } = useAuth();
  const location = useLocation();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [competitors, setCompetitors] = useState<Profile[]>([]);
  const [competitionClasses, setCompetitionClasses] = useState<CompetitionClass[]>([]);
  const [currentEntry, setCurrentEntry] = useState<ResultEntry>({
    competitor_id: '',
    competitor_name: '',
    meca_id: '',
    competition_class: '',
    class_id: '',
    format: '',
    score: '',
    placement: '',
    points_earned: '',
    vehicle_info: '',
    notes: '',
  });
  const [existingResults, setExistingResults] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingResult, setEditingResult] = useState<ResultEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available formats (hardcoded for now, can be fetched from API later)
  const availableFormats = ['SPL', 'SQL', 'Show and Shine', 'Ride the Light'];

  useEffect(() => {
    fetchEvents();
    fetchCompetitors();
    fetchCompetitionClasses();
  }, []);

  // Handle pre-selection from prop or query parameter
  useEffect(() => {
    if (events.length > 0) {
      // First check if there's a preSelectedEventId prop
      if (preSelectedEventId) {
        const eventExists = events.find(e => e.id === preSelectedEventId);
        if (eventExists) {
          setSelectedEventId(preSelectedEventId);
          return;
        }
      }

      // Otherwise check query parameter
      const params = new URLSearchParams(location.search);
      const eventIdFromQuery = params.get('event');

      if (eventIdFromQuery) {
        const eventExists = events.find(e => e.id === eventIdFromQuery);
        if (eventExists) {
          setSelectedEventId(eventIdFromQuery);
          return;
        }
      }

      // If no pre-selection, select first event
      if (!selectedEventId && events.length > 0) {
        setSelectedEventId(events[0].id);
      }
    }
  }, [events, location.search, preSelectedEventId]);

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

  const fetchCompetitionClasses = async () => {
    try {
      const data = await competitionClassesApi.getActive();
      setCompetitionClasses(data);
    } catch (error) {
      console.error('Error fetching competition classes:', error);
    }
  };

  const fetchExistingResults = async () => {
    try {
      const data = await competitionResultsApi.getByEvent(selectedEventId);
      const formattedResults: ResultEntry[] = data.map((r) => {
        const competitor = competitors.find(c => c.id === r.competitor_id);
        const classData = competitionClasses.find(c => c.id === r.class_id);
        return {
          id: r.id,
          competitor_id: r.competitor_id || '',
          competitor_name: r.competitor_name || '',
          meca_id: competitor?.meca_id || (r.competitor_id ? '' : '999999'),
          competition_class: r.competition_class || '',
          class_id: r.class_id || '',
          format: classData?.format || '',
          score: r.score != null ? r.score.toString() : '',
          placement: r.placement != null ? r.placement.toString() : '',
          points_earned: r.points_earned != null ? r.points_earned.toString() : '0',
          vehicle_info: r.vehicle_info || '',
          notes: r.notes || '',
        };
      });
      setExistingResults(formattedResults);
    } catch (error) {
      console.error('Error fetching existing results:', error);
      setExistingResults([]);
    }
  };

  const resetForm = () => {
    setCurrentEntry({
      competitor_id: '',
      competitor_name: '',
      meca_id: '',
      competition_class: '',
      class_id: '',
      format: '',
      score: '',
      placement: '',
      points_earned: '',
      vehicle_info: '',
      notes: '',
    });
  };

  const updateField = (field: keyof ResultEntry, value: string) => {
    const updated = { ...currentEntry, [field]: value };

    // Handle MECA ID lookup
    if (field === 'meca_id' && value) {
      const competitor = competitors.find((c) => c.meca_id === value);
      if (competitor) {
        updated.competitor_id = competitor.id;
        updated.competitor_name = `${competitor.first_name || ''} ${competitor.last_name || ''}`.trim();
        updated.meca_id = competitor.meca_id || '';
      }
    }

    // Handle competitor selection from dropdown
    if (field === 'competitor_id' && value) {
      const competitor = competitors.find((c) => c.id === value);
      if (competitor) {
        updated.competitor_name = `${competitor.first_name || ''} ${competitor.last_name || ''}`.trim();
        updated.meca_id = competitor.meca_id || '';
      }
    }

    // Handle manual competitor name entry (non-member)
    if (field === 'competitor_name' && value && !updated.competitor_id) {
      updated.meca_id = '999999';
      updated.points_earned = '0';
    }

    // Handle class selection
    if (field === 'class_id' && value) {
      const selectedClass = competitionClasses.find((c) => c.id === value);
      if (selectedClass) {
        updated.competition_class = selectedClass.name;
        updated.format = selectedClass.format;
      }
    }

    // Update points to 0 if MECA ID is 999999 (non-member)
    if (field === 'points_earned' && updated.meca_id === '999999') {
      updated.points_earned = '0';
    }

    setCurrentEntry(updated);
  };

  const handleEditResult = (result: ResultEntry) => {
    setEditingResult(result);
    setShowEditModal(true);
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!confirm('Are you sure you want to delete this result?')) {
      return;
    }

    try {
      await competitionResultsApi.delete(resultId);
      alert('Result deleted successfully!');
      fetchExistingResults();
    } catch (error: any) {
      console.error('Error deleting result:', error);
      alert('Failed to delete result: ' + (error.message || 'Unknown error'));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingResult || !editingResult.id) return;

    try {
      const finalPointsEarned = editingResult.meca_id === '999999' ? 0 : parseInt(editingResult.points_earned || '0');

      const resultData = {
        event_id: selectedEventId,
        competitor_id: editingResult.competitor_id || null,
        competitor_name: editingResult.competitor_name,
        meca_id: editingResult.meca_id || null,
        competition_class: editingResult.competition_class,
        class_id: editingResult.class_id || null,
        score: parseFloat(editingResult.score),
        placement: parseInt(editingResult.placement),
        points_earned: finalPointsEarned,
        vehicle_info: editingResult.vehicle_info || null,
        notes: editingResult.notes || null,
        created_by: profile!.id,
      };

      await competitionResultsApi.update(editingResult.id, resultData as any);
      alert('Result updated successfully!');
      setShowEditModal(false);
      setEditingResult(null);
      fetchExistingResults();
    } catch (error: any) {
      console.error('Error updating result:', error);
      alert('Error updating result: ' + error.message);
    }
  };

  const handleSave = async () => {
    if (!selectedEventId) {
      alert('Please select an event');
      return;
    }

    // Validate the current entry
    if (!currentEntry.competitor_name || !currentEntry.competition_class || !currentEntry.score || !currentEntry.placement) {
      alert('Please fill in all required fields: Competitor, Class, Score, and Placement');
      return;
    }

    setSaving(true);

    try {
      const finalPointsEarned = currentEntry.meca_id === '999999' ? 0 : parseInt(currentEntry.points_earned || '0');

      const resultData = {
        event_id: selectedEventId,
        competitor_id: currentEntry.competitor_id || null,
        competitor_name: currentEntry.competitor_name,
        meca_id: currentEntry.meca_id || null,
        competition_class: currentEntry.competition_class,
        class_id: currentEntry.class_id || null,
        score: parseFloat(currentEntry.score),
        placement: parseInt(currentEntry.placement),
        points_earned: finalPointsEarned,
        vehicle_info: currentEntry.vehicle_info || null,
        notes: currentEntry.notes || null,
        created_by: profile!.id,
      };

      await competitionResultsApi.create(resultData as any);
      alert('Result saved successfully!');

      // Reset form and refresh results
      resetForm();
      fetchExistingResults();
    } catch (error: any) {
      console.error('Error saving result:', error);
      alert('Error saving result: ' + error.message);
    }

    setSaving(false);
  };

  const handleRecalculatePoints = async () => {
    if (!selectedEventId) {
      alert('Please select an event first');
      return;
    }

    setSaving(true);
    try {
      const response = await competitionResultsApi.recalculatePoints(selectedEventId);
      alert(response.message + '\n\nPoints have been recalculated based on:\n- Placement in each class\n- Event multiplier\n- Member eligibility (active membership)\n- Eligible divisions (SPL, SQL, SSI, MK)');
      fetchExistingResults();
    } catch (error: any) {
      console.error('Error recalculating points:', error);
      alert('Failed to recalculate points: ' + (error.message || 'Unknown error'));
    }
    setSaving(false);
  };

  const filteredCompetitors = competitors.filter((c) =>
    `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.tlab')) {
        alert('Please select a valid file (.xlsx, .xls, or .tlab)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImportFile = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    if (!selectedEventId) {
      alert('Please select an event first');
      return;
    }

    if (!profile?.id) {
      alert('User profile not found');
      return;
    }

    setUploading(true);

    try {
      const result = await competitionResultsApi.importResults(
        selectedEventId,
        selectedFile,
        profile.id
      );

      let message = result.message;
      if (result.errors && result.errors.length > 0) {
        message += '\n\nErrors:\n' + result.errors.join('\n');
      }

      alert(message);

      // Clear the file selection and refresh results
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchExistingResults();
    } catch (error: any) {
      console.error('Error importing file:', error);
      alert('Failed to import file: ' + (error.message || 'Unknown error'));
    }

    setUploading(false);
  };

  const handleDownloadTemplate = () => {
    // Download the Excel template
    const link = document.createElement('a');
    link.href = '/templates/MecaEventResults_Template.xlsx';
    link.download = 'MecaEventResults_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

            {selectedEventId && (() => {
              const selectedEvent = events.find(e => e.id === selectedEventId);
              return selectedEvent && selectedEvent.points_multiplier !== undefined && selectedEvent.points_multiplier !== null ? (
                <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-orange-400" />
                    <span className="text-orange-400 font-semibold">
                      {selectedEvent.points_multiplier}X Points Event
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Points awarded: 1st=<span className="text-white">{5 * selectedEvent.points_multiplier}pts</span>, 2nd=<span className="text-white">{4 * selectedEvent.points_multiplier}pts</span>, 3rd=<span className="text-white">{3 * selectedEvent.points_multiplier}pts</span>, 4th=<span className="text-white">{2 * selectedEvent.points_multiplier}pts</span>, 5th=<span className="text-white">{1 * selectedEvent.points_multiplier}pts</span>
                  </p>
                </div>
              ) : null;
            })()}
          </div>

          {/* Import Section */}
          <div className="bg-slate-700 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">Import Results from File</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Excel Import */}
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileSpreadsheet className="h-5 w-5 text-green-400" />
                  <h4 className="text-lg font-semibold text-white">Excel Import (.xlsx)</h4>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Download the template, fill it out with your results, and upload it back.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download Excel Template
                </button>
              </div>

              {/* TermLab Import */}
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <File className="h-5 w-5 text-blue-400" />
                  <h4 className="text-lg font-semibold text-white">TermLab Import (.tlab)</h4>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Upload a TermLab export file to import results directly.
                </p>
                <div className="h-10"></div>
              </div>
            </div>

            {/* File Upload Area */}
            <div className="mt-6 bg-slate-800 rounded-lg p-6 border-2 border-dashed border-slate-600">
              <div className="flex flex-col items-center">
                <Upload className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-white font-semibold mb-2">Upload Results File</p>
                <p className="text-sm text-gray-400 mb-4">
                  Supports: Excel (.xlsx, .xls) or TermLab (.tlab) files
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.tlab"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />

                <label
                  htmlFor="file-upload"
                  className="cursor-pointer px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Choose File
                </label>

                {selectedFile && (
                  <div className="mt-4 flex items-center gap-4">
                    <div className="text-sm text-gray-300">
                      Selected: <span className="text-white font-semibold">{selectedFile.name}</span>
                    </div>
                    <button
                      onClick={handleImportFile}
                      disabled={uploading}
                      className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {uploading ? 'Importing...' : 'Import Results'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-700 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Add New Result (Manual Entry)</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Result'}
                </button>
                <button
                  onClick={handleRecalculatePoints}
                  disabled={saving || !selectedEventId}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                  title="Recalculate points based on placement, event multiplier, and member eligibility"
                >
                  <Calculator className="h-4 w-4" />
                  Recalculate Points
                </button>
              </div>
            </div>

            {/* Single Entry Form */}
            <div className="bg-slate-800 rounded-lg p-4 grid grid-cols-1 md:grid-cols-7 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">
                  MECA ID / Competitor *
                </label>
                <input
                  type="text"
                  value={currentEntry.meca_id}
                  onChange={(e) => updateField('meca_id', e.target.value)}
                  placeholder="Enter MECA ID"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <select
                  value={currentEntry.competitor_id}
                  onChange={(e) => updateField('competitor_id', e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Or select from list</option>
                  {filteredCompetitors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {`${c.first_name || ''} ${c.last_name || ''}`.trim()} {c.meca_id ? `(${c.meca_id})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={currentEntry.competitor_name}
                  onChange={(e) => updateField('competitor_name', e.target.value)}
                  placeholder="Or type name (non-member)"
                  className="w-full mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Format *</label>
                <select
                  value={currentEntry.format}
                  onChange={(e) => updateField('format', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Format</option>
                  {availableFormats.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Class *</label>
                <select
                  value={currentEntry.class_id}
                  onChange={(e) => updateField('class_id', e.target.value)}
                  disabled={!currentEntry.format}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  <option value="">Select Class</option>
                  {competitionClasses
                    .filter(c => currentEntry.format ? c.format === currentEntry.format : true)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.abbreviation})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Score *</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentEntry.score}
                  onChange={(e) => updateField('score', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Place *</label>
                <input
                  type="number"
                  value={currentEntry.placement}
                  onChange={(e) => updateField('placement', e.target.value)}
                  placeholder="1"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Points * {currentEntry.meca_id === '999999' && <span className="text-yellow-400">(Non-member: 0)</span>}
                </label>
                <input
                  type="number"
                  value={currentEntry.points_earned}
                  onChange={(e) => updateField('points_earned', e.target.value)}
                  readOnly={currentEntry.meca_id === '999999'}
                  placeholder="0"
                  className={`w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    currentEntry.meca_id === '999999' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              <div className="md:col-span-7">
                <label className="block text-xs text-gray-400 mb-1">
                  Power Wattage
                </label>
                <input
                  type="text"
                  value={currentEntry.vehicle_info}
                  onChange={(e) => updateField('vehicle_info', e.target.value)}
                  placeholder="e.g., Power: 6000W"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Edit Modal */}
          {showEditModal && editingResult && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
              <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
                  <h2 className="text-2xl font-bold text-white">Edit Result</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingResult(null);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        MECA ID
                      </label>
                      <input
                        type="text"
                        value={editingResult.meca_id}
                        onChange={(e) => setEditingResult({...editingResult, meca_id: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Competitor Name *
                      </label>
                      <input
                        type="text"
                        value={editingResult.competitor_name}
                        onChange={(e) => setEditingResult({...editingResult, competitor_name: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Format *
                      </label>
                      <select
                        value={editingResult.format}
                        onChange={(e) => setEditingResult({...editingResult, format: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select Format</option>
                        {availableFormats.map((format) => (
                          <option key={format} value={format}>
                            {format}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Class *
                      </label>
                      <select
                        value={editingResult.class_id}
                        onChange={(e) => {
                          const selectedClass = competitionClasses.find(c => c.id === e.target.value);
                          setEditingResult({
                            ...editingResult,
                            class_id: e.target.value,
                            competition_class: selectedClass?.name || '',
                          });
                        }}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select Class</option>
                        {competitionClasses
                          .filter(c => editingResult.format ? c.format === editingResult.format : true)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.abbreviation})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Score *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingResult.score}
                        onChange={(e) => setEditingResult({...editingResult, score: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Placement *
                      </label>
                      <input
                        type="number"
                        value={editingResult.placement}
                        onChange={(e) => setEditingResult({...editingResult, placement: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Points
                      </label>
                      <input
                        type="number"
                        value={editingResult.points_earned}
                        onChange={(e) => setEditingResult({...editingResult, points_earned: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Power Wattage
                      </label>
                      <input
                        type="text"
                        value={editingResult.vehicle_info}
                        onChange={(e) => setEditingResult({...editingResult, vehicle_info: e.target.value})}
                        placeholder="e.g., Power: 6000W"
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingResult(null);
                      }}
                      className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing Results Table */}
          {existingResults.length > 0 && (
            <div className="bg-slate-700 rounded-lg p-6 mt-6">
              <h3 className="text-xl font-semibold text-white mb-4">All Results</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Member #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Competitor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Format</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Class</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Power Wattage</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Place</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Points</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingResults.map((result, index) => (
                      <tr
                        key={result.id || index}
                        className={`border-b border-slate-600 ${index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-700'} hover:bg-slate-600 transition-colors`}
                      >
                        <td className="px-4 py-3 text-sm text-white">
                          {result.meca_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="text-blue-400 font-medium">{result.competitor_name}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-white">
                          {result.format || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-white">
                          {result.competition_class || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {result.vehicle_info || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-white">
                          {result.score || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-white">
                          {result.placement || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-white font-semibold">
                          {result.points_earned || '0'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditResult(result)}
                              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors"
                              title="Edit Result"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteResult(result.id!)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs transition-colors"
                              title="Delete Result"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
