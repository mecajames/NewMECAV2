import { useEffect, useState, useRef } from 'react';
import { Search, ChevronDown, ChevronUp, Upload, Download, FileSpreadsheet, File, Save, Calculator, Edit2, Trash2, Filter, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Check, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { eventsApi, Event } from '@/events';
import { profilesApi, Profile } from '@/profiles';
import { competitionResultsApi } from '@/competition-results';
import { competitionClassesApi, CompetitionClass } from '@/competition-classes';
import { seasonsApi, Season } from '@/seasons';
import { useAuth } from '@/auth';
import { SeasonSelector } from '@/seasons';
import { AuditLogModal } from '@/admin';

interface DuplicateItem {
  index: number;
  importData: any;
  existingData: any;
  matchType: 'meca_id' | 'name';
}

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
  wattage?: number | string;
  frequency?: number | string;
  notes: string;
  created_by?: string;
  created_at?: string;
  updated_by?: string;
  updated_at?: string;
  revision_count?: number;
  modification_reason?: string;
}

interface PreviewResult {
  memberID: string;
  name: string;
  class: string;
  classAbbreviation: string;
  score: number;
  placement?: number;
  points?: number;
  vehicleInfo?: string;
  format?: string;
  wattage?: number;
  frequency?: number;
}

type EntryMethod = 'manual' | 'excel' | 'termlab';

export default function ResultsEntryNew() {
  const { profile } = useAuth();
  const location = useLocation();

  // Season and Event Selection
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventSearchTerm, setEventSearchTerm] = useState('');

  // Entry Method
  const [entryMethod, setEntryMethod] = useState<EntryMethod>('manual');
  const [showEntrySection, setShowEntrySection] = useState(false);

  // Data
  const [competitors, setCompetitors] = useState<Profile[]>([]);
  const [competitionClasses, setCompetitionClasses] = useState<CompetitionClass[]>([]);
  const [existingResults, setExistingResults] = useState<ResultEntry[]>([]);
  const [filteredResults, setFilteredResults] = useState<ResultEntry[]>([]);

  // Manual Entry
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
    wattage: '',
    frequency: '',
    notes: '',
  });

  // File Import
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Modal
  const [editingResult, setEditingResult] = useState<ResultEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modificationReason, setModificationReason] = useState<string>('');

  // Results Filtering
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [resultsSearchTerm, setResultsSearchTerm] = useState('');

  // Bulk Delete
  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>('placement');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Audit Log Modal
  const [showAuditModal, setShowAuditModal] = useState(false);

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const availableFormats = ['SPL', 'SQL', 'Show and Shine', 'Ride the Light'];

  // Initialize
  useEffect(() => {
    fetchSeasons();
    fetchCompetitors();
    fetchCompetitionClasses();
    fetchEvents();
  }, []);

  // Filter events by season
  useEffect(() => {
    if (selectedSeasonId) {
      const filtered = events.filter(e => e.season_id === selectedSeasonId);
      setFilteredEvents(filtered);
    } else {
      setFilteredEvents(events);
    }
  }, [selectedSeasonId, events]);

  // Filter events by search term
  useEffect(() => {
    if (eventSearchTerm) {
      const filtered = filteredEvents.filter(e =>
        e.title.toLowerCase().includes(eventSearchTerm.toLowerCase())
      );
      setFilteredEvents(filtered);
    }
  }, [eventSearchTerm]);

  // Load results when event selected
  useEffect(() => {
    if (selectedEventId) {
      fetchExistingResults();
    }
  }, [selectedEventId]);

  // Reset class filter when format changes
  useEffect(() => {
    setSelectedClass('');
  }, [selectedFormat]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedResultIds(new Set());
    setSelectAll(false);
  }, [selectedFormat, selectedClass, resultsSearchTerm]);

  // Filter and sort results
  useEffect(() => {
    let filtered = existingResults;

    if (selectedFormat) {
      filtered = filtered.filter(r => r.format === selectedFormat);
    }

    if (selectedClass) {
      filtered = filtered.filter(r => r.competition_class === selectedClass);
    }

    if (resultsSearchTerm) {
      const search = resultsSearchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.meca_id?.toLowerCase().includes(search) ||
        r.competitor_name?.toLowerCase().includes(search) ||
        competitors.find(c => c.id === r.competitor_id)?.email?.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      switch (sortColumn) {
        case 'meca_id':
          aVal = a.meca_id || '';
          bVal = b.meca_id || '';
          break;
        case 'competitor_name':
          aVal = a.competitor_name || '';
          bVal = b.competitor_name || '';
          break;
        case 'format':
          aVal = a.format || '';
          bVal = b.format || '';
          break;
        case 'competition_class':
          aVal = a.competition_class || '';
          bVal = b.competition_class || '';
          break;
        case 'score':
          aVal = parseFloat(a.score) || 0;
          bVal = parseFloat(b.score) || 0;
          break;
        case 'placement':
          aVal = parseInt(a.placement) || 0;
          bVal = parseInt(b.placement) || 0;
          break;
        case 'points_earned':
          aVal = parseInt(a.points_earned) || 0;
          bVal = parseInt(b.points_earned) || 0;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === 'asc'
          ? aVal - bVal
          : bVal - aVal;
      }
    });

    setFilteredResults(sorted);
  }, [existingResults, selectedFormat, selectedClass, resultsSearchTerm, competitors, sortColumn, sortDirection]);

  const fetchSeasons = async () => {
    try {
      const data = await seasonsApi.getAll();
      setSeasons(data);

      // Set current season as default
      const currentSeason = data.find(s => s.is_current);
      if (currentSeason) {
        setSelectedSeasonId(currentSeason.id);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const data = await eventsApi.getAll(1, 1000);
      const filtered = data.filter(e =>
        ['upcoming', 'ongoing', 'completed'].includes(e.status)
      );
      setEvents(filtered);
      setFilteredEvents(filtered);
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

        // Try to find class_id from the API response (handle both snake_case and camelCase)
        let classId = r.class_id || (r as any).classId || '';

        // If class_id is missing but we have a class name, look it up
        if (!classId && r.competition_class) {
          const foundClass = competitionClasses.find(c => c.name === r.competition_class);
          if (foundClass) {
            classId = foundClass.id;
          }
        }

        const classData = competitionClasses.find(c => c.id === classId);

        return {
          id: r.id,
          competitor_id: r.competitor_id || '',
          competitor_name: r.competitor_name || '',
          meca_id: r.meca_id || competitor?.meca_id || '999999',
          competition_class: r.competition_class || '',
          class_id: classId,
          format: r.format || classData?.format || '',
          score: r.score != null ? r.score.toString() : '',
          placement: r.placement != null ? r.placement.toString() : '',
          points_earned: r.points_earned != null ? r.points_earned.toString() : '0',
          vehicle_info: r.vehicle_info || '',
          wattage: r.wattage || '',
          frequency: r.frequency || '',
          notes: r.notes || '',
          created_by: r.created_by || r.createdBy,
          created_at: r.created_at || r.createdAt,
          updated_by: r.updated_by || r.updatedBy,
          updated_at: r.updated_at || r.updatedAt,
          revision_count: r.revision_count || r.revisionCount || 0,
          modification_reason: r.modification_reason || r.modificationReason || '',
        };
      });
      setExistingResults(formattedResults);
    } catch (error) {
      console.error('Error fetching existing results:', error);
      setExistingResults([]);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.tlab')) {
      alert('Please select a valid file (.xlsx, .xls, or .tlab)');
      return;
    }

    setSelectedFile(file);

    // Parse file and show preview
    try {
      const formData = new FormData();
      formData.append('file', file);

      // For now, we'll show the preview modal
      // In a real implementation, you'd call an API endpoint to parse the file
      setShowPreviewModal(true);
    } catch (error: any) {
      alert('Error parsing file: ' + error.message);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile || !selectedEventId || !profile?.id) return;

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

      // Clear and refresh
      setSelectedFile(null);
      setPreviewResults([]);
      setShowPreviewModal(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Recalculate points after import
      await handleRecalculatePoints();

      fetchExistingResults();
    } catch (error: any) {
      alert('Failed to import file: ' + error.message);
    }

    setUploading(false);
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
      wattage: '',
      frequency: '',
      notes: '',
    });
  };

  const updateField = (field: keyof ResultEntry, value: string) => {
    const updated = { ...currentEntry, [field]: value };

    if (field === 'meca_id' && value) {
      const competitor = competitors.find((c) => c.meca_id === value);
      if (competitor) {
        updated.competitor_id = competitor.id;
        updated.competitor_name = `${competitor.first_name || ''} ${competitor.last_name || ''}`.trim();
        updated.meca_id = competitor.meca_id || '';
      }
    }

    if (field === 'competitor_id' && value) {
      const competitor = competitors.find((c) => c.id === value);
      if (competitor) {
        updated.competitor_name = `${competitor.first_name || ''} ${competitor.last_name || ''}`.trim();
        updated.meca_id = competitor.meca_id || '';
      }
    }

    if (field === 'competitor_name' && value && !updated.competitor_id) {
      updated.meca_id = '999999';
      updated.points_earned = '0';
    }

    if (field === 'class_id' && value) {
      const selectedClass = competitionClasses.find((c) => c.id === value);
      if (selectedClass) {
        updated.competition_class = selectedClass.name;
        updated.format = selectedClass.format;
      }
    }

    if (field === 'points_earned' && updated.meca_id === '999999') {
      updated.points_earned = '0';
    }

    setCurrentEntry(updated);
  };

  const handleSaveManualEntry = async () => {
    if (!selectedEventId) {
      alert('Please select an event');
      return;
    }

    if (!currentEntry.competitor_name || !currentEntry.competition_class || !currentEntry.score) {
      alert('Please fill in all required fields: Competitor, Class, and Score');
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
        placement: parseInt(currentEntry.placement) || 0,
        points_earned: finalPointsEarned,
        vehicle_info: currentEntry.vehicle_info || null,
        wattage: currentEntry.wattage ? parseInt(currentEntry.wattage.toString()) : null,
        frequency: currentEntry.frequency ? parseInt(currentEntry.frequency.toString()) : null,
        notes: currentEntry.notes || null,
        created_by: profile!.id,
      };

      await competitionResultsApi.create(resultData as any);
      alert('Result saved successfully!');

      resetForm();

      // Recalculate points after adding
      await handleRecalculatePoints();

      fetchExistingResults();
    } catch (error: any) {
      alert('Error saving result: ' + error.message);
    }

    setSaving(false);
  };

  const handleEditResult = (result: ResultEntry) => {
    setEditingResult(result);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingResult || !editingResult.id) return;

    // Require modification reason
    if (!modificationReason || modificationReason.trim() === '') {
      alert('Please provide a reason for this modification.');
      return;
    }

    setSaving(true);

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
        wattage: editingResult.wattage ? parseInt(editingResult.wattage.toString()) : null,
        frequency: editingResult.frequency ? parseInt(editingResult.frequency.toString()) : null,
        notes: editingResult.notes || null,
        created_by: profile!.id,
        updated_by: profile!.id,
        modification_reason: modificationReason,
      };

      await competitionResultsApi.update(editingResult.id, resultData as any, profile?.id);

      // Recalculate points after editing
      await handleRecalculatePoints();

      alert('Result updated successfully!');
      setShowEditModal(false);
      setEditingResult(null);
      setModificationReason('');
      fetchExistingResults();
    } catch (error: any) {
      alert('Error updating result: ' + error.message);
    }

    setSaving(false);
  };

  const handleDeleteResult = async (resultId: string) => {
    const reason = prompt('Please enter a reason for deleting this result:');
    if (reason === null) return; // User cancelled
    if (!reason.trim()) {
      alert('A reason is required to delete a result.');
      return;
    }

    if (!confirm('Are you sure you want to delete this result?')) return;

    try {
      await competitionResultsApi.delete(resultId, profile?.id, reason.trim());

      // Recalculate points after deletion
      await handleRecalculatePoints();

      alert('Result deleted successfully!');
      fetchExistingResults();
    } catch (error: any) {
      alert('Failed to delete result: ' + error.message);
    }
  };

  const handleRecalculatePoints = async () => {
    if (!selectedEventId) return;

    setSaving(true);
    try {
      await competitionResultsApi.recalculatePoints(selectedEventId);
      alert('Points recalculated successfully!');
      fetchExistingResults();
    } catch (error: any) {
      console.error('Error recalculating points:', error);
      alert('Failed to recalculate points: ' + error.message);
    }
    setSaving(false);
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/MecaEventResults_Template.xlsx';
    link.download = 'MecaEventResults_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedResultIds(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredResults.map(r => r.id).filter((id): id is string => Boolean(id)));
      setSelectedResultIds(allIds);
      setSelectAll(true);
    }
  };

  const handleSelectResult = (resultId: string) => {
    const newSelected = new Set(selectedResultIds);
    if (newSelected.has(resultId)) {
      newSelected.delete(resultId);
    } else {
      newSelected.add(resultId);
    }
    setSelectedResultIds(newSelected);
    setSelectAll(newSelected.size === filteredResults.length);
  };

  const handleBulkDelete = async () => {
    if (selectedResultIds.size === 0) {
      alert('Please select at least one result to delete');
      return;
    }

    const reason = prompt(`Please enter a reason for deleting ${selectedResultIds.size} result(s):`);
    if (reason === null) return; // User cancelled
    if (!reason.trim()) {
      alert('A reason is required to delete results.');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedResultIds.size} result(s)?\n\nThis action is IRREVERSIBLE and cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setSaving(true);

    try {
      // Delete each selected result
      const deletePromises = Array.from(selectedResultIds).map(id =>
        competitionResultsApi.delete(id, profile?.id, reason.trim())
      );

      await Promise.all(deletePromises);

      alert(`Successfully deleted ${selectedResultIds.size} result(s)`);

      // Clear selection and refresh
      setSelectedResultIds(new Set());
      setSelectAll(false);

      // Recalculate points after deletion
      await handleRecalculatePoints();

      fetchExistingResults();
    } catch (error: any) {
      alert('Failed to delete some results: ' + error.message);
    }

    setSaving(false);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Competition Results Entry</h2>

      {/* Season and Event Selection */}
      <div className="bg-slate-700 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column - Season and Event Info */}
          <div className="space-y-4">
            {/* Season Selector */}
            <div>
              <SeasonSelector
                selectedSeasonId={selectedSeasonId}
                onSeasonChange={setSelectedSeasonId}
                showAllOption={false}
                label="Season"
                className="w-full"
              />
            </div>

            {/* Event Info Badge */}
            {selectedEvent && selectedEvent.points_multiplier !== undefined && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-orange-400" />
                  <span className="text-orange-400 font-semibold">
                    {selectedEvent.points_multiplier}X Points Event
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {selectedEvent.points_multiplier === 4 ? (
                    <>Points (Top 5 only): 1st=20, 2nd=19, 3rd=18, 4th=17, 5th=16</>
                  ) : (
                    <>Points (Top 5 only): 1st={5 * selectedEvent.points_multiplier}, 2nd={4 * selectedEvent.points_multiplier}, 3rd={3 * selectedEvent.points_multiplier}, 4th={2 * selectedEvent.points_multiplier}, 5th={1 * selectedEvent.points_multiplier}</>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Event Search and Select */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Event *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={eventSearchTerm}
                onChange={(e) => setEventSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full mt-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select an event...</option>
              {filteredEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} - {new Date(event.event_date).toLocaleDateString()}
                  {event.day_number ? ` (Day ${event.day_number})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Entry Method Section */}
      {selectedEventId && (
        <div className="bg-slate-700 rounded-lg p-4 mb-4">
          <button
            onClick={() => setShowEntrySection(!showEntrySection)}
            className="w-full flex items-center justify-between text-white font-semibold hover:bg-slate-600 p-2 rounded-lg transition-colors"
          >
            <span className="text-lg">Enter Results for This Event</span>
            {showEntrySection ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {showEntrySection && (
            <div className="mt-4">
              {/* Entry Method Tabs */}
              <div className="flex gap-2 mb-4 border-b border-slate-600">
                <button
                  onClick={() => setEntryMethod('manual')}
                  className={`px-4 py-2 font-semibold transition-colors ${
                    entryMethod === 'manual'
                      ? 'text-orange-400 border-b-2 border-orange-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => setEntryMethod('excel')}
                  className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
                    entryMethod === 'excel'
                      ? 'text-orange-400 border-b-2 border-orange-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel Import
                </button>
                <button
                  onClick={() => setEntryMethod('termlab')}
                  className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
                    entryMethod === 'termlab'
                      ? 'text-orange-400 border-b-2 border-orange-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <File className="h-4 w-4" />
                  TermLab Import
                </button>
              </div>

              {/* Manual Entry */}
              {entryMethod === 'manual' && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">MECA ID</label>
                      <input
                        type="text"
                        value={currentEntry.meca_id}
                        onChange={(e) => updateField('meca_id', e.target.value)}
                        placeholder="Enter ID"
                        className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Name *</label>
                      <input
                        type="text"
                        value={currentEntry.competitor_name}
                        onChange={(e) => updateField('competitor_name', e.target.value)}
                        placeholder="Competitor"
                        className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Format *</label>
                      <select
                        value={currentEntry.format}
                        onChange={(e) => updateField('format', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      >
                        <option value="">Select</option>
                        {availableFormats.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Class *</label>
                      <select
                        value={currentEntry.class_id}
                        onChange={(e) => updateField('class_id', e.target.value)}
                        disabled={!currentEntry.format}
                        className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm disabled:opacity-50"
                      >
                        <option value="">Select</option>
                        {competitionClasses
                          .filter(c => currentEntry.format ? c.format === currentEntry.format : true)
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.abbreviation}</option>
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
                        className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Wattage (W)</label>
                      <input
                        type="number"
                        value={currentEntry.wattage}
                        onChange={(e) => updateField('wattage', e.target.value)}
                        placeholder="6000"
                        className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Freq (Hz)</label>
                      <input
                        type="number"
                        value={currentEntry.frequency}
                        onChange={(e) => updateField('frequency', e.target.value)}
                        placeholder="45"
                        className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleSaveManualEntry}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Save Result'}
                    </button>
                  </div>
                </div>
              )}

              {/* Excel Import */}
              {entryMethod === 'excel' && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-gray-300 mb-4">Download the template, fill it with results, and upload it back.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </button>
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="excel-upload"
                      />
                      <label
                        htmlFor="excel-upload"
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Excel File
                      </label>
                    </div>
                  </div>
                  {selectedFile && (
                    <div className="mt-3 text-sm text-gray-300">
                      Selected: <span className="text-white font-semibold">{selectedFile.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TermLab Import */}
              {entryMethod === 'termlab' && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-gray-300 mb-4">Upload a TermLab (.tlab) export file to import results.</p>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".tlab"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="tlab-upload"
                    />
                    <label
                      htmlFor="tlab-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      Upload TermLab File
                    </label>
                  </div>
                  {selectedFile && (
                    <div className="mt-3 text-sm text-gray-300">
                      Selected: <span className="text-white font-semibold">{selectedFile.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results Display */}
      {selectedEventId && existingResults.length > 0 && (
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Event Results
                <span className="ml-2 text-sm bg-orange-500 text-white px-2 py-0.5 rounded-full">
                  {existingResults.length}
                </span>
              </h3>
              {(() => {
                // Show audit summary for selected format only
                const formatResults = selectedFormat
                  ? existingResults.filter(r => r.format === selectedFormat)
                  : existingResults;

                if (formatResults.length > 0 && selectedFormat) {
                  // Get first result for this format to show entry info
                  const firstResult = formatResults[0];
                  const creator = competitors.find(c => c.id === firstResult.created_by);
                  const creatorName = creator?.first_name || creator?.email?.split('@')[0] || 'Unknown';

                  let method = 'Manual';
                  if (firstResult.notes?.includes('Imported from tlab file')) {
                    method = 'TermLab';
                  } else if (firstResult.notes?.includes('Imported from xlsx file') || firstResult.notes?.includes('Imported from xls file')) {
                    method = 'Excel';
                  }

                  return (
                    <div className="text-xs text-gray-400 mt-1">
                      <span className="text-orange-400">{selectedFormat}</span>
                      <span> entered via {method} by </span>
                      <span className="text-white">{creatorName}</span>
                      <span> on </span>
                      <span className="text-white">{firstResult.created_at ? new Date(firstResult.created_at).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex gap-2">
              {selectedResultIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedResultIds.size})
                </button>
              )}
              <button
                onClick={() => setShowAuditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                <File className="h-4 w-4" />
                View Audit Log
              </button>
              <button
                onClick={handleRecalculatePoints}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                <Calculator className="h-4 w-4" />
                {saving ? 'Recalculating...' : 'Recalculate All Points'}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Filter by Format</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
              >
                <option value="">All Formats</option>
                {availableFormats.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Filter by Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                disabled={!selectedFormat}
              >
                <option value="">All Classes</option>
                {selectedFormat &&
                  [...new Set(existingResults
                    .filter(r => r.format === selectedFormat)
                    .map(r => r.competition_class))]
                    .sort()
                    .map((className) => (
                      <option key={className} value={className}>{className}</option>
                    ))
                }
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Search Results</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="MECA ID, Name, or Email..."
                  value={resultsSearchTerm}
                  onChange={(e) => setResultsSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-3 py-2 text-center w-12">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                      title="Select All"
                    />
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => handleSort('meca_id')}
                  >
                    <div className="flex items-center">
                      MECA ID
                      {renderSortIcon('meca_id')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => handleSort('competitor_name')}
                  >
                    <div className="flex items-center">
                      Name
                      {renderSortIcon('competitor_name')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => handleSort('format')}
                  >
                    <div className="flex items-center">
                      Format
                      {renderSortIcon('format')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => handleSort('competition_class')}
                  >
                    <div className="flex items-center">
                      Class
                      {renderSortIcon('competition_class')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => handleSort('score')}
                  >
                    <div className="flex items-center">
                      Score
                      {renderSortIcon('score')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => handleSort('wattage')}
                  >
                    <div className="flex items-center">
                      Wattage
                      {renderSortIcon('wattage')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => handleSort('frequency')}
                  >
                    <div className="flex items-center">
                      Freq
                      {renderSortIcon('frequency')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => handleSort('placement')}
                  >
                    <div className="flex items-center">
                      Place
                      {renderSortIcon('placement')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => handleSort('points_earned')}
                  >
                    <div className="flex items-center">
                      Points
                      {renderSortIcon('points_earned')}
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs uppercase">Entered</th>
                  <th className="px-3 py-2 text-left text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result, index) => (
                  <tr
                    key={result.id || index}
                    className={`border-b border-slate-600 ${index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'} hover:bg-slate-600`}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedResultIds.has(result.id || '')}
                        onChange={() => handleSelectResult(result.id || '')}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 text-white">{result.meca_id || '-'}</td>
                    <td className="px-3 py-2 text-blue-400">{result.competitor_name}</td>
                    <td className="px-3 py-2 text-white">{result.format || '-'}</td>
                    <td className="px-3 py-2 text-white">{result.competition_class || '-'}</td>
                    <td className="px-3 py-2 text-white">{result.score || '-'}</td>
                    <td className="px-3 py-2 text-white">{result.wattage || '-'}</td>
                    <td className="px-3 py-2 text-white">{result.frequency || '-'}</td>
                    <td className="px-3 py-2 text-white font-semibold">{result.placement || '-'}</td>
                    <td className="px-3 py-2 text-orange-400 font-semibold">{result.points_earned || '0'}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs">
                      {(() => {
                        const creator = competitors.find(c => c.id === result.created_by);
                        const initials = creator?.first_name?.substring(0, 2).toUpperCase() ||
                                        creator?.email?.substring(0, 2).toUpperCase() ||
                                        'UK';
                        const date = result.created_at ? new Date(result.created_at).toLocaleDateString('en-US', {
                          month: 'numeric',
                          day: 'numeric'
                        }) : '-';
                        return `${initials} ${date}`;
                      })()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditResult(result)}
                          className="p-1 bg-gray-600 hover:bg-gray-500 text-white rounded"
                          title="Edit"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteResult(result.id!)}
                          className="p-1 bg-red-600 hover:bg-red-500 text-white rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
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

      {/* Edit Modal */}
      {showEditModal && editingResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-700 sticky top-0 bg-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <h2 className="text-xl font-bold text-white mb-1">Edit Result</h2>
                  {editingResult.created_at && (
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>
                        Entered by: <span className="text-white font-medium">
                          {(() => {
                            const creator = competitors.find(c => c.id === editingResult.created_by || c.auth_user_id === editingResult.created_by);
                            return creator?.email || creator?.first_name || profile?.email || 'Unknown';
                          })()}
                        </span>
                      </span>
                      <span>
                        Entered on: <span className="text-white font-medium">{new Date(editingResult.created_at).toLocaleDateString()}</span>
                      </span>
                      {editingResult.updated_at && editingResult.updated_by && (
                        <>
                          <span>
                            Last edited: <span className="text-white font-medium">{new Date(editingResult.updated_at).toLocaleDateString()}</span>
                          </span>
                          <span>
                            by: <span className="text-white font-medium">
                              {(() => {
                                const updater = competitors.find(c => c.id === editingResult.updated_by || c.auth_user_id === editingResult.updated_by);
                                return updater?.email || updater?.first_name || 'Unknown';
                              })()}
                            </span>
                          </span>
                        </>
                      )}
                      <span>
                        Revisions: <span className="text-white font-medium">{editingResult.revision_count || 0}</span>
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingResult(null);
                    setModificationReason('');
                  }}
                  className="text-gray-400 hover:text-white text-2xl leading-none flex-shrink-0"
                >
                  ✕
                </button>
              </div>
              {editingResult.modification_reason && (
                <div className="text-xs text-gray-400 mt-2 p-2 bg-slate-700/50 rounded">
                  <span className="text-gray-500">Last modification reason:</span>{' '}
                  <span className="text-yellow-300 italic">"{editingResult.modification_reason}"</span>
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">MECA ID</label>
                  <input
                    type="text"
                    value={editingResult.meca_id}
                    onChange={(e) => setEditingResult({...editingResult, meca_id: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    value={editingResult.competitor_name}
                    onChange={(e) => setEditingResult({...editingResult, competitor_name: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Format *</label>
                  <select
                    value={editingResult.format}
                    onChange={(e) => setEditingResult({...editingResult, format: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Select</option>
                    {availableFormats.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Class *</label>
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
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Select</option>
                    {competitionClasses
                      .filter(c => editingResult.format ? c.format === editingResult.format : true)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Score *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingResult.score}
                    onChange={(e) => setEditingResult({...editingResult, score: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Wattage (W)</label>
                  <input
                    type="number"
                    value={editingResult.wattage}
                    onChange={(e) => setEditingResult({...editingResult, wattage: e.target.value})}
                    placeholder="e.g., 6000"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Frequency (Hz)</label>
                  <input
                    type="number"
                    value={editingResult.frequency}
                    onChange={(e) => setEditingResult({...editingResult, frequency: e.target.value})}
                    placeholder="e.g., 45"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Modification Reason - REQUIRED */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Reason for Modification <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={modificationReason}
                  onChange={(e) => setModificationReason(e.target.value)}
                  placeholder="Please explain why you are making this change..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  This reason will be recorded in the audit log.
                </p>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingResult(null);
                    setModificationReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedFile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
              <h2 className="text-xl font-bold text-white">Preview Import - {selectedFile.name}</h2>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              <p className="text-gray-300 mb-4">
                Review the results below before importing. Click "Confirm & Import" to add these results to the event.
              </p>

              <div className="bg-slate-900 p-3 rounded-lg mb-4 text-sm text-gray-300">
                <p>File will be imported into: <span className="text-white font-semibold">{selectedEvent?.title}</span></p>
                <p className="mt-1">This action will add results and automatically recalculate placements and points.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmImport}
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  <Upload className="h-5 w-5" />
                  {uploading ? 'Importing...' : 'Confirm & Import'}
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        eventId={selectedEventId}
      />
    </div>
  );
}
