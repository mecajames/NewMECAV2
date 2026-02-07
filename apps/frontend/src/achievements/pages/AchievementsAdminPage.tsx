import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, Plus, Edit3, Trash2, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, Users, X, Check, PlusCircle, Calendar,
  Search, ArrowLeft, Gift
} from 'lucide-react';
import { achievementsApi, BackfillProgress } from '../achievements.api-client';
import { seasonsApi } from '../../seasons/seasons.api-client';
import { useAuth } from '@/auth';
import {
  AchievementDefinition,
  AchievementRecipient,
  AchievementTemplate,
  AchievementFormat,
  AchievementCompetitionType,
  AchievementMetricType,
  AchievementType,
  ThresholdOperator,
  CreateAchievementDefinitionDto,
  UpdateAchievementDefinitionDto,
} from '@newmeca/shared';

// Condition types for the UI
interface AchievementCondition {
  id: string;
  field: 'class' | 'division' | 'score' | 'points' | 'multiplier';
  operator: 'in' | '>=' | '>' | '=' | '<' | '<=';
  value: string; // For 'in' this is comma-separated, for others it's a number
}

export default function AchievementsAdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'definitions' | 'recipients'>('definitions');

  // Definitions state
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [definitionsLoading, setDefinitionsLoading] = useState(true);
  const [definitionsPagination, setDefinitionsPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [definitionsPageSize, setDefinitionsPageSize] = useState(50);
  const [definitionsGroupFilter, setDefinitionsGroupFilter] = useState('');

  // Recipients state
  const [recipients, setRecipients] = useState<AchievementRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsPagination, setRecipientsPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [recipientsPageSize, setRecipientsPageSize] = useState(50);

  // Templates state
  const [templates, setTemplates] = useState<AchievementTemplate[]>([]);

  // Modal state
  const [showDefinitionModal, setShowDefinitionModal] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<AchievementDefinition | null>(null);
  const [formData, setFormData] = useState<Partial<CreateAchievementDefinitionDto>>({
    name: '',
    description: '',
    group_name: '',
    achievement_type: 'dynamic' as AchievementType,
    template_key: '',
    render_value: 130,
    format: undefined,
    competition_type: 'Certified at the Headrest' as AchievementCompetitionType,
    metric_type: 'score' as AchievementMetricType,
    threshold_value: 130,
    threshold_operator: '>=' as ThresholdOperator,
    class_filter: null,
    division_filter: null,
    points_multiplier: null,
    is_active: true,
    display_order: 0,
  });
  const [conditions, setConditions] = useState<AchievementCondition[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-check modal state
  const [showRecheckModal, setShowRecheckModal] = useState(false);
  const [recheckTimeframe, setRecheckTimeframe] = useState<'30days' | '90days' | 'thisYear' | 'custom' | 'all'>('30days');
  const [recheckCustomStart, setRecheckCustomStart] = useState('');
  const [recheckCustomEnd, setRecheckCustomEnd] = useState('');

  // Backfill/Re-check progress state
  const [backfilling, setBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<BackfillProgress | null>(null);
  const [backfillResult, setBackfillResult] = useState<{
    processed: number;
    awarded: number;
  } | null>(null);

  // Auth context for session token
  const { session } = useAuth();

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Manual Award modal state
  const [showManualAwardModal, setShowManualAwardModal] = useState(false);
  const [manualAwardData, setManualAwardData] = useState({
    achievement_id: '',
    profile_id: '',
    achieved_value: '',
    notes: '',
  });
  const [eligibleProfiles, setEligibleProfiles] = useState<Array<{
    id: string;
    meca_id: string;
    name: string;
    email: string;
  }>>([]);
  const [profileSearch, setProfileSearch] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [awardingManual, setAwardingManual] = useState(false);

  // Seasons list for filter
  const [seasons, setSeasons] = useState<Array<{ id: string; name: string }>>([]);

  // Recipients filters
  const [recipientFilters, setRecipientFilters] = useState({
    achievement_id: '',
    season_id: '',
    search: '',
    group_name: '',
  });

  // Delete recipient state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recipientToDelete, setRecipientToDelete] = useState<AchievementRecipient | null>(null);
  const [deletingRecipient, setDeletingRecipient] = useState(false);

  // Get unique group names from definitions for filter dropdown
  const uniqueGroups = [...new Set(definitions.map(d => d.group_name).filter(Boolean))];


  useEffect(() => {
    fetchDefinitions();
    fetchTemplates();
    fetchSeasons();
    // Also fetch recipients count on initial load so the tab shows the correct number
    fetchRecipientsCount();
  }, []);

  // Fetch just the count for the tab badge (doesn't load full data)
  const fetchRecipientsCount = async () => {
    try {
      const response = await achievementsApi.getRecipients({ page: 1, limit: 1 });
      setRecipientsPagination(prev => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages,
      }));
    } catch (err) {
      console.error('Failed to fetch recipients count:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'recipients') {
      fetchRecipients();
    }
  }, [activeTab, recipientFilters]);

  const fetchDefinitions = async (page = 1, limit = definitionsPageSize) => {
    try {
      setDefinitionsLoading(true);
      const response = await achievementsApi.getAllDefinitions({ page, limit });
      setDefinitions(response.items);
      setDefinitionsPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err) {
      console.error('Failed to fetch definitions:', err);
    } finally {
      setDefinitionsLoading(false);
    }
  };

  const fetchRecipients = async (page = 1, limit = recipientsPageSize) => {
    try {
      setRecipientsLoading(true);
      const params: Record<string, unknown> = { page, limit };
      if (recipientFilters.achievement_id) params.achievement_id = recipientFilters.achievement_id;
      if (recipientFilters.season_id) params.season_id = recipientFilters.season_id;
      if (recipientFilters.search) params.search = recipientFilters.search;
      if (recipientFilters.group_name) params.group_name = recipientFilters.group_name;

      const response = await achievementsApi.getRecipients(params);
      setRecipients(response.items);
      setRecipientsPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err) {
      console.error('Failed to fetch recipients:', err);
    } finally {
      setRecipientsLoading(false);
    }
  };

  const handleDeleteRecipient = async () => {
    if (!recipientToDelete) return;

    try {
      setDeletingRecipient(true);
      await achievementsApi.deleteRecipient(recipientToDelete.id);
      // Refresh the recipients list
      await fetchRecipients(recipientsPagination.page, recipientsPageSize);
      setShowDeleteConfirm(false);
      setRecipientToDelete(null);
    } catch (err) {
      console.error('Failed to delete recipient:', err);
      alert('Failed to delete achievement award. Please try again.');
    } finally {
      setDeletingRecipient(false);
    }
  };

  const openDeleteConfirm = (recipient: AchievementRecipient) => {
    setRecipientToDelete(recipient);
    setShowDeleteConfirm(true);
  };

  const fetchTemplates = async () => {
    try {
      const data = await achievementsApi.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const fetchSeasons = async () => {
    try {
      const data = await seasonsApi.getAll();
      setSeasons(data.map((s) => ({ id: s.id, name: s.name })));
    } catch (err) {
      console.error('Failed to fetch seasons:', err);
    }
  };

  // Convert conditions array to DTO format
  const conditionsToDto = (conds: AchievementCondition[]): Partial<CreateAchievementDefinitionDto> => {
    const result: Partial<CreateAchievementDefinitionDto> = {
      class_filter: null,
      division_filter: null,
      points_multiplier: null,
    };

    for (const cond of conds) {
      if (cond.field === 'class' && cond.operator === 'in') {
        result.class_filter = cond.value.split(',').map(v => v.trim()).filter(Boolean);
      } else if (cond.field === 'division' && cond.operator === 'in') {
        result.division_filter = cond.value.split(',').map(v => v.trim()).filter(Boolean);
      } else if (cond.field === 'multiplier' && cond.operator === '=') {
        result.points_multiplier = parseInt(cond.value) || null;
      } else if (cond.field === 'score' || cond.field === 'points') {
        result.metric_type = cond.field as AchievementMetricType;
        result.threshold_value = parseFloat(cond.value) || 130;
        result.threshold_operator = cond.operator as ThresholdOperator;
      }
    }

    return result;
  };

  // Convert DTO to conditions array for UI
  const dtoToConditions = (def: AchievementDefinition): AchievementCondition[] => {
    const conds: AchievementCondition[] = [];

    // Add class filter condition if exists
    if (def.class_filter && def.class_filter.length > 0) {
      conds.push({
        id: crypto.randomUUID(),
        field: 'class',
        operator: 'in',
        value: def.class_filter.join(', '),
      });
    }

    // Add division filter condition if exists
    if (def.division_filter && def.division_filter.length > 0) {
      conds.push({
        id: crypto.randomUUID(),
        field: 'division',
        operator: 'in',
        value: def.division_filter.join(', '),
      });
    }

    // Add threshold condition (score or points)
    conds.push({
      id: crypto.randomUUID(),
      field: def.metric_type as 'score' | 'points',
      operator: def.threshold_operator as AchievementCondition['operator'],
      value: String(def.threshold_value),
    });

    // Add points multiplier condition if exists
    if (def.points_multiplier) {
      conds.push({
        id: crypto.randomUUID(),
        field: 'multiplier',
        operator: '=',
        value: String(def.points_multiplier),
      });
    }

    return conds;
  };

  const handleCreateNew = () => {
    setEditingDefinition(null);
    setFormData({
      name: '',
      description: '',
      group_name: 'dB Clubs',
      achievement_type: 'dynamic' as AchievementType,
      template_key: templates[0]?.key || '',
      render_value: 130,
      format: 'SPL' as AchievementFormat,
      competition_type: 'Certified at the Headrest' as AchievementCompetitionType,
      metric_type: 'score' as AchievementMetricType,
      threshold_value: 130,
      threshold_operator: '>=' as ThresholdOperator,
      class_filter: null,
      division_filter: null,
      points_multiplier: null,
      is_active: true,
      display_order: 0,
    });
    // Default condition: score >= 130
    setConditions([
      {
        id: crypto.randomUUID(),
        field: 'score',
        operator: '>=',
        value: '130',
      },
    ]);
    setShowDefinitionModal(true);
  };

  const handleEdit = (definition: AchievementDefinition) => {
    setEditingDefinition(definition);
    setFormData({
      name: definition.name,
      description: definition.description || '',
      group_name: definition.group_name || '',
      achievement_type: definition.achievement_type || ('dynamic' as AchievementType),
      template_key: definition.template_key,
      render_value: definition.render_value || definition.threshold_value,
      format: definition.format || undefined,
      competition_type: definition.competition_type as AchievementCompetitionType,
      metric_type: definition.metric_type,
      threshold_value: definition.threshold_value,
      threshold_operator: definition.threshold_operator,
      class_filter: definition.class_filter,
      division_filter: definition.division_filter,
      points_multiplier: definition.points_multiplier,
      is_active: definition.is_active,
      display_order: definition.display_order,
    });
    setConditions(dtoToConditions(definition));
    setShowDefinitionModal(true);
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: crypto.randomUUID(),
        field: 'class',
        operator: 'in',
        value: '',
      },
    ]);
  };

  const updateCondition = (id: string, updates: Partial<AchievementCondition>) => {
    setConditions(conditions.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.template_key || !formData.competition_type) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Merge conditions into form data
      const conditionData = conditionsToDto(conditions);
      const finalData = {
        ...formData,
        ...conditionData,
      };

      if (editingDefinition) {
        await achievementsApi.updateDefinition(editingDefinition.id, finalData as UpdateAchievementDefinitionDto);
      } else {
        await achievementsApi.createDefinition(finalData as CreateAchievementDefinitionDto);
      }

      setShowDefinitionModal(false);
      fetchDefinitions(definitionsPagination.page);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save definition');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      await achievementsApi.deleteDefinition(id);
      setDeleteConfirmId(null);
      fetchDefinitions(definitionsPagination.page);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete definition');
    } finally {
      setDeleting(false);
    }
  };

  // Calculate date range based on timeframe selection
  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    switch (recheckTimeframe) {
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
        break;
      case 'custom':
        if (recheckCustomStart) startDate = new Date(recheckCustomStart).toISOString();
        if (recheckCustomEnd) endDate = new Date(recheckCustomEnd + 'T23:59:59').toISOString();
        break;
      case 'all':
        // No date filter
        break;
    }

    return { startDate, endDate };
  }, [recheckTimeframe, recheckCustomStart, recheckCustomEnd]);

  const handleBackfill = async () => {
    setShowRecheckModal(false);
    setBackfilling(true);
    setBackfillResult(null);
    setBackfillProgress(null);

    const { startDate, endDate } = getDateRange();

    try {
      // Build URL with params
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (session?.access_token) params.append('authorization', `Bearer ${session.access_token}`);

      const url = `/api/achievements/admin/backfill-stream${params.toString() ? `?${params.toString()}` : ''}`;
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as BackfillProgress;
          setBackfillProgress(data);

          if (data.type === 'complete') {
            setBackfillResult({
              processed: data.processed,
              awarded: data.awarded,
            });
            setBackfilling(false);
            eventSource.close();
            fetchRecipients();
            fetchRecipientsCount();
          } else if (data.type === 'error') {
            alert(data.message || 'Re-check failed');
            setBackfilling(false);
            eventSource.close();
          }
        } catch (parseError) {
          console.error('Failed to parse SSE data:', parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        alert('Connection error during re-check. Please try again.');
        setBackfilling(false);
        eventSource.close();
      };
    } catch (err: any) {
      alert(err.response?.data?.message || 'Re-check failed');
      setBackfilling(false);
    }
  };

  // Manual Award handlers
  const handleOpenManualAward = () => {
    setManualAwardData({ achievement_id: '', profile_id: '', achieved_value: '', notes: '' });
    setEligibleProfiles([]);
    setProfileSearch('');
    setShowManualAwardModal(true);
  };

  const handleAchievementSelect = async (achievementId: string) => {
    setManualAwardData(prev => ({ ...prev, achievement_id: achievementId, profile_id: '' }));
    setEligibleProfiles([]);
    setProfileSearch('');

    if (achievementId) {
      // Get the selected achievement's threshold value as default
      const selectedDef = definitions.find(d => d.id === achievementId);
      if (selectedDef) {
        setManualAwardData(prev => ({ ...prev, achieved_value: String(selectedDef.threshold_value) }));
      }

      // Load eligible profiles
      setLoadingProfiles(true);
      try {
        const profiles = await achievementsApi.getEligibleProfiles(achievementId);
        setEligibleProfiles(profiles);
      } catch (err) {
        console.error('Failed to load eligible profiles:', err);
      } finally {
        setLoadingProfiles(false);
      }
    }
  };

  const handleProfileSearch = async (search: string) => {
    setProfileSearch(search);
    if (!manualAwardData.achievement_id) return;

    setLoadingProfiles(true);
    try {
      const profiles = await achievementsApi.getEligibleProfiles(manualAwardData.achievement_id, search);
      setEligibleProfiles(profiles);
    } catch (err) {
      console.error('Failed to search profiles:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleManualAward = async () => {
    if (!manualAwardData.achievement_id || !manualAwardData.profile_id || !manualAwardData.achieved_value) {
      alert('Please fill in all required fields');
      return;
    }

    setAwardingManual(true);
    try {
      const result = await achievementsApi.manualAwardAchievement({
        profile_id: manualAwardData.profile_id,
        achievement_id: manualAwardData.achievement_id,
        achieved_value: parseFloat(manualAwardData.achieved_value),
        notes: manualAwardData.notes || undefined,
      });

      alert(`Successfully awarded "${result.recipient.achievement_name}" to ${result.recipient.profile_name}`);
      setShowManualAwardModal(false);
      fetchRecipients(); // Refresh recipients list
      fetchRecipientsCount();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to award achievement');
    } finally {
      setAwardingManual(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Award className="h-8 w-8 text-orange-500" />
              Achievements Management
            </h1>
            <p className="text-gray-400 mt-1">Manage achievement definitions and view recipients</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRecheckModal(true)}
              disabled={backfilling}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              title="Re-check competition results and award any missing achievements"
            >
              {backfilling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Re-check Results
            </button>
            <button
              onClick={handleOpenManualAward}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
              title="Manually award an achievement to a member"
            >
              <Gift className="h-4 w-4" />
              Manual Award
            </button>
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Definition
            </button>
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>

        {/* Re-check Progress */}
        {backfilling && backfillProgress && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-blue-400 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Re-checking results...
              </p>
              <span className="text-blue-300 font-mono">{backfillProgress.percentage}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${backfillProgress.percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">
              {backfillProgress.processed} of {backfillProgress.total} results processed
              {backfillProgress.awarded > 0 && (
                <span className="text-green-400 ml-2">• {backfillProgress.awarded} achievements awarded</span>
              )}
            </p>
          </div>
        )}

        {/* Re-check Result */}
        {backfillResult && !backfilling && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex items-center justify-between">
            <p className="text-green-400">
              Re-check complete: Processed {backfillResult.processed} results, awarded {backfillResult.awarded} new achievements.
            </p>
            <button
              onClick={() => setBackfillResult(null)}
              className="p-1 hover:bg-green-500/20 rounded text-green-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('definitions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'definitions'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            Definitions ({definitionsPagination.total})
          </button>
          <button
            onClick={() => setActiveTab('recipients')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'recipients'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            Recipients ({recipientsPagination.total})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'definitions' && (
          <div className="space-y-4">
            {/* Definitions Filters */}
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Group Filter */}
                <select
                  value={definitionsGroupFilter}
                  onChange={(e) => {
                    setDefinitionsGroupFilter(e.target.value);
                    // Re-fetch will happen via filtered definitions
                  }}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white min-w-[200px]"
                >
                  <option value="">All Groups</option>
                  {uniqueGroups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>

                {/* Clear Filters */}
                {definitionsGroupFilter && (
                  <button
                    onClick={() => setDefinitionsGroupFilter('')}
                    className="px-3 py-2 text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            {definitionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : definitions.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No achievement definitions yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Group</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Competition</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Threshold</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Format</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {definitions
                    .filter(def => !definitionsGroupFilter || def.group_name === definitionsGroupFilter)
                    .map((def) => (
                    <tr key={def.id} className="hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-sm">{def.group_name || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{def.name}</p>
                        <p className="text-gray-500 text-sm">{def.template_key}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{def.competition_type}</td>
                      <td className="px-4 py-3">
                        <span className="text-orange-400 font-mono">
                          {def.threshold_operator} {def.threshold_value}
                          {def.metric_type === 'score' ? ' dB' : ' pts'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          def.format === 'SPL' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'
                        }`}>
                          {def.format || 'All'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {def.is_active ? (
                          <span className="text-green-400">Active</span>
                        ) : (
                          <span className="text-gray-500">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(def)}
                            className="p-2 hover:bg-slate-600 rounded-lg text-gray-400 hover:text-white"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          {deleteConfirmId === def.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(def.id)}
                                disabled={deleting}
                                className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                              >
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="p-2 hover:bg-slate-600 rounded-lg text-gray-400"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(def.id)}
                              className="p-2 hover:bg-red-600/20 rounded-lg text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-400">
                    Page {definitionsPagination.page} of {definitionsPagination.totalPages || 1}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Show:</span>
                    <select
                      value={definitionsPageSize}
                      onChange={(e) => {
                        const newSize = Number(e.target.value);
                        setDefinitionsPageSize(newSize);
                        fetchDefinitions(1, newSize);
                      }}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={250}>250</option>
                    </select>
                    <span className="text-sm text-gray-400">per page</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchDefinitions(1, definitionsPageSize)}
                    disabled={definitionsPagination.page <= 1}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-gray-300 text-sm disabled:opacity-50"
                  >
                    First
                  </button>
                  <button
                    onClick={() => fetchDefinitions(definitionsPagination.page - 1, definitionsPageSize)}
                    disabled={definitionsPagination.page <= 1}
                    className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-400" />
                  </button>
                  <span className="text-gray-400 text-sm px-2">
                    {definitionsPagination.page}
                  </span>
                  <button
                    onClick={() => fetchDefinitions(definitionsPagination.page + 1, definitionsPageSize)}
                    disabled={definitionsPagination.page >= definitionsPagination.totalPages}
                    className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => fetchDefinitions(definitionsPagination.totalPages, definitionsPageSize)}
                    disabled={definitionsPagination.page >= definitionsPagination.totalPages}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-gray-300 text-sm disabled:opacity-50"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recipients' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by MECA ID or name..."
                    value={recipientFilters.search}
                    onChange={(e) => setRecipientFilters({ ...recipientFilters, search: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400"
                  />
                </div>

                {/* Achievement Filter */}
                <select
                  value={recipientFilters.achievement_id}
                  onChange={(e) => setRecipientFilters({ ...recipientFilters, achievement_id: e.target.value })}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white min-w-[200px]"
                >
                  <option value="">All Achievements</option>
                  {definitions.map((def) => (
                    <option key={def.id} value={def.id}>{def.name}</option>
                  ))}
                </select>

                {/* Group Filter */}
                <select
                  value={recipientFilters.group_name}
                  onChange={(e) => setRecipientFilters({ ...recipientFilters, group_name: e.target.value })}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white min-w-[180px]"
                >
                  <option value="">All Groups</option>
                  {uniqueGroups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>

                {/* Season Filter */}
                <select
                  value={recipientFilters.season_id}
                  onChange={(e) => setRecipientFilters({ ...recipientFilters, season_id: e.target.value })}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white min-w-[150px]"
                >
                  <option value="">All Seasons</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>{season.name}</option>
                  ))}
                </select>

                {/* Clear Filters */}
                {(recipientFilters.search || recipientFilters.achievement_id || recipientFilters.season_id || recipientFilters.group_name) && (
                  <button
                    onClick={() => setRecipientFilters({ achievement_id: '', season_id: '', search: '', group_name: '' })}
                    className="px-3 py-2 text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
              {recipientsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              ) : recipients.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No achievement recipients found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Group</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Achievement</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Event</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">MECA ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Value</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Earned</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {recipients.map((recipient) => (
                      <tr key={recipient.id} className="hover:bg-slate-700/50">
                        <td className="px-4 py-3">
                          <span className="text-gray-400 text-sm">{recipient.achievement?.group_name || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{recipient.achievement?.name}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{recipient.profile_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{recipient.event_name || '-'}</td>
                        <td className="px-4 py-3 text-gray-300 font-mono">{recipient.meca_id || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className="text-orange-400 font-mono">
                            {recipient.achieved_value}
                            {recipient.achievement?.metric_type === 'score' ? ' dB' : ' pts'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {new Date(recipient.achieved_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openDeleteConfirm(recipient)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                            title="Remove award"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-400">
                      Page {recipientsPagination.page} of {recipientsPagination.totalPages || 1}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Show:</span>
                      <select
                        value={recipientsPageSize}
                        onChange={(e) => {
                          const newSize = Number(e.target.value);
                          setRecipientsPageSize(newSize);
                          fetchRecipients(1, newSize);
                        }}
                        className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                      </select>
                      <span className="text-sm text-gray-400">per page</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => fetchRecipients(1, recipientsPageSize)}
                      disabled={recipientsPagination.page <= 1}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-gray-300 text-sm disabled:opacity-50"
                    >
                      First
                    </button>
                    <button
                      onClick={() => fetchRecipients(recipientsPagination.page - 1, recipientsPageSize)}
                      disabled={recipientsPagination.page <= 1}
                      className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                      title="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4 text-gray-400" />
                    </button>
                    <span className="text-gray-400 text-sm px-2">
                      {recipientsPagination.page}
                    </span>
                    <button
                      onClick={() => fetchRecipients(recipientsPagination.page + 1, recipientsPageSize)}
                      disabled={recipientsPagination.page >= recipientsPagination.totalPages}
                      className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                      title="Next page"
                    >
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => fetchRecipients(recipientsPagination.totalPages, recipientsPageSize)}
                      disabled={recipientsPagination.page >= recipientsPagination.totalPages}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-gray-300 text-sm disabled:opacity-50"
                    >
                      Last
                    </button>
                  </div>
                </div>
            </div>
          </div>
        )}

        {/* Definition Modal - Enhanced Editor */}
        {showDefinitionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingDefinition ? 'Edit Award Definition' : 'New Award Definition'}
                </h2>
                <button
                  onClick={() => setShowDefinitionModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Basic Info Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Group</label>
                    <input
                      type="text"
                      value={formData.group_name || ''}
                      onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="e.g., dB Clubs"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Achievement Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="e.g., 140 dB"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    rows={2}
                    placeholder="Description of this achievement"
                  />
                </div>

                {/* Template & Type Section */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                    <select
                      value={formData.achievement_type || 'dynamic'}
                      onChange={(e) => setFormData({ ...formData, achievement_type: e.target.value as AchievementType })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="dynamic">Dynamic</option>
                      <option value="static">Static</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Template *</label>
                    <select
                      value={formData.template_key}
                      onChange={(e) => setFormData({ ...formData, template_key: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="">Select template...</option>
                      {templates.map((t) => (
                        <option key={t.key} value={t.key}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Value to Render</label>
                    <input
                      type="number"
                      value={formData.render_value || ''}
                      onChange={(e) => setFormData({ ...formData, render_value: parseFloat(e.target.value) || undefined })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="e.g., 130"
                    />
                  </div>
                </div>

                {/* Format & Competition Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Format</label>
                    <select
                      value={formData.format || ''}
                      onChange={(e) => setFormData({ ...formData, format: e.target.value as AchievementFormat || undefined })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="">All Formats</option>
                      <option value="SPL">SPL</option>
                      <option value="SQL">SQL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Competition Type *</label>
                    <select
                      value={formData.competition_type}
                      onChange={(e) => setFormData({ ...formData, competition_type: e.target.value as AchievementCompetitionType })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="Certified at the Headrest">Certified at the Headrest</option>
                      <option value="Radical X">Radical X</option>
                      <option value="Park and Pound">Park and Pound</option>
                      <option value="Dueling Demos">Dueling Demos</option>
                      <option value="Dueling Demos - Certified 360 Sound">Dueling Demos - Certified 360 Sound</option>
                      <option value="Certified Sound">Certified Sound</option>
                    </select>
                  </div>
                </div>

                {/* Achievement Conditions Section */}
                <div className="border border-slate-600 rounded-lg p-4 bg-slate-700/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Achievement Conditions</h3>
                    <button
                      type="button"
                      onClick={addCondition}
                      className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm flex items-center gap-1"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add Condition
                    </button>
                  </div>

                  <div className="space-y-3">
                    {conditions.map((condition, index) => (
                      <div key={condition.id} className="flex items-center gap-2 bg-slate-800 rounded-lg p-3">
                        <span className="text-gray-400 text-sm min-w-[20px]">{index + 1}.</span>

                        {/* Field dropdown */}
                        <select
                          value={condition.field}
                          onChange={(e) => {
                            const newField = e.target.value as AchievementCondition['field'];
                            let newOperator = condition.operator;
                            // Set default operator based on field type
                            if (newField === 'class' || newField === 'division') {
                              newOperator = 'in';
                            } else if (newField === 'multiplier') {
                              newOperator = '=';
                            } else {
                              newOperator = '>=';
                            }
                            updateCondition(condition.id, { field: newField, operator: newOperator });
                          }}
                          className="px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm min-w-[100px]"
                        >
                          <option value="class">class</option>
                          <option value="division">division</option>
                          <option value="score">score</option>
                          <option value="points">points</option>
                          <option value="multiplier">multiplier</option>
                        </select>

                        {/* Operator dropdown */}
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(condition.id, { operator: e.target.value as AchievementCondition['operator'] })}
                          className="px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm min-w-[70px]"
                        >
                          {(condition.field === 'class' || condition.field === 'division') ? (
                            <option value="in">in</option>
                          ) : (
                            <>
                              <option value=">=">≥</option>
                              <option value=">">{'>'}</option>
                              <option value="=">=</option>
                              <option value="<">{'<'}</option>
                              <option value="<=">≤</option>
                            </>
                          )}
                        </select>

                        {/* Value input */}
                        <input
                          type={condition.field === 'class' || condition.field === 'division' ? 'text' : 'number'}
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                          placeholder={
                            condition.field === 'class' || condition.field === 'division'
                              ? 'Value1, Value2, ...'
                              : 'Value'
                          }
                          className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        />

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => removeCondition(condition.id)}
                          className="p-1.5 hover:bg-red-600/20 rounded text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {conditions.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-4">
                        No conditions defined. Click "Add Condition" to add requirements.
                      </p>
                    )}
                  </div>
                </div>

                {/* Status & Order */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-gray-300">Active</span>
                </label>
              </div>
              <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowDefinitionModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingDefinition ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Re-check Results Modal */}
        {showRecheckModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-md w-full">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  Re-check Results
                </h2>
                <button
                  onClick={() => setShowRecheckModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-400 text-sm">
                  Select a time frame to re-check competition results and award any missing achievements.
                </p>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="timeframe"
                      value="30days"
                      checked={recheckTimeframe === '30days'}
                      onChange={(e) => setRecheckTimeframe(e.target.value as typeof recheckTimeframe)}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-white">Last 30 days</span>
                    <span className="text-gray-500 text-sm ml-auto">(Recommended)</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="timeframe"
                      value="90days"
                      checked={recheckTimeframe === '90days'}
                      onChange={(e) => setRecheckTimeframe(e.target.value as typeof recheckTimeframe)}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-white">Last 90 days</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="timeframe"
                      value="thisYear"
                      checked={recheckTimeframe === 'thisYear'}
                      onChange={(e) => setRecheckTimeframe(e.target.value as typeof recheckTimeframe)}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-white">This year ({new Date().getFullYear()})</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="timeframe"
                      value="custom"
                      checked={recheckTimeframe === 'custom'}
                      onChange={(e) => setRecheckTimeframe(e.target.value as typeof recheckTimeframe)}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-white">Custom date range</span>
                  </label>

                  {recheckTimeframe === 'custom' && (
                    <div className="grid grid-cols-2 gap-3 pl-8 mt-2">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={recheckCustomStart}
                          onChange={(e) => setRecheckCustomStart(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">End Date</label>
                        <input
                          type="date"
                          value={recheckCustomEnd}
                          onChange={(e) => setRecheckCustomEnd(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                    <input
                      type="radio"
                      name="timeframe"
                      value="all"
                      checked={recheckTimeframe === 'all'}
                      onChange={(e) => setRecheckTimeframe(e.target.value as typeof recheckTimeframe)}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-white">All time</span>
                    <span className="text-yellow-500 text-sm ml-auto">(May take a while)</span>
                  </label>
                </div>
              </div>
              <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowRecheckModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBackfill}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Start Re-check
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Award Modal */}
        {showManualAwardModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Gift className="h-5 w-5 text-green-500" />
                  Manual Award Achievement
                </h2>
                <button
                  onClick={() => setShowManualAwardModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-400 text-sm">
                  Manually award an achievement to an active member. Only members with active memberships can receive achievements.
                </p>

                {/* Achievement Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Achievement <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={manualAwardData.achievement_id}
                    onChange={(e) => handleAchievementSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Select an achievement...</option>
                    {definitions.map((def) => (
                      <option key={def.id} value={def.id}>
                        {def.name} ({def.group_name || def.competition_type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Profile Selection */}
                {manualAwardData.achievement_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Member <span className="text-red-400">*</span>
                    </label>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by name, MECA ID, or email..."
                          value={profileSearch}
                          onChange={(e) => handleProfileSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400"
                        />
                      </div>
                      {loadingProfiles ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                        </div>
                      ) : eligibleProfiles.length === 0 ? (
                        <p className="text-gray-500 text-sm py-2">
                          {profileSearch ? 'No matching members found' : 'No eligible members for this achievement'}
                        </p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto border border-slate-600 rounded-lg divide-y divide-slate-700">
                          {eligibleProfiles.map((profile) => (
                            <button
                              key={profile.id}
                              onClick={() => setManualAwardData(prev => ({ ...prev, profile_id: profile.id }))}
                              className={`w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors ${
                                manualAwardData.profile_id === profile.id ? 'bg-orange-500/20 border-l-2 border-orange-500' : ''
                              }`}
                            >
                              <p className="text-white font-medium">{profile.name}</p>
                              <p className="text-gray-400 text-sm">
                                MECA ID: {profile.meca_id} • {profile.email}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Achieved Value */}
                {manualAwardData.profile_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Achieved Value <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAwardData.achieved_value}
                      onChange={(e) => setManualAwardData(prev => ({ ...prev, achieved_value: e.target.value }))}
                      placeholder="e.g., 155.5"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400"
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      The score or points value for this achievement
                    </p>
                  </div>
                )}

                {/* Notes */}
                {manualAwardData.profile_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={manualAwardData.notes}
                      onChange={(e) => setManualAwardData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Reason for manual award..."
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 resize-none"
                    />
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowManualAwardModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualAward}
                  disabled={!manualAwardData.achievement_id || !manualAwardData.profile_id || !manualAwardData.achieved_value || awardingManual}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {awardingManual ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Gift className="h-4 w-4" />
                  )}
                  Award Achievement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && recipientToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 border border-slate-700">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Remove Achievement Award</h3>
                </div>
                <p className="text-gray-300 mb-2">
                  Are you sure you want to remove this achievement award?
                </p>
                <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
                  <p className="text-white font-medium">{recipientToDelete.achievement?.name}</p>
                  <p className="text-gray-400 text-sm">
                    Awarded to: {recipientToDelete.profile_name || 'Unknown'} (MECA ID: {recipientToDelete.meca_id || 'N/A'})
                  </p>
                  <p className="text-orange-400 text-sm font-mono">
                    Value: {recipientToDelete.achieved_value} {recipientToDelete.achievement?.metric_type === 'score' ? 'dB' : 'pts'}
                  </p>
                </div>
                <p className="text-red-400 text-sm">
                  This action cannot be undone. The achievement image will also be deleted.
                </p>
              </div>
              <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setRecipientToDelete(null);
                  }}
                  disabled={deletingRecipient}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRecipient}
                  disabled={deletingRecipient}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {deletingRecipient ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Remove Award
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
