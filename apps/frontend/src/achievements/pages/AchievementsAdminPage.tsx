import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, Plus, Edit3, Trash2, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Loader2, RefreshCw, Users, X, Check, PlusCircle, RotateCcw, AlertCircle,
  Search, ArrowLeft
} from 'lucide-react';
import { achievementsApi } from '../achievements.api-client';
import { seasonsApi } from '../../seasons/seasons.api-client';
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
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Recipients state
  const [recipients, setRecipients] = useState<AchievementRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsPagination, setRecipientsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

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

  // Backfill state
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{
    processed: number;
    awarded: number;
    imagesGenerated?: number;
    imagesFailed?: number;
  } | null>(null);

  // Generate images state
  const [generatingImages, setGeneratingImages] = useState(false);
  const [generateImagesResult, setGenerateImagesResult] = useState<{ generated: number; failed: number } | null>(null);

  // Regenerate single image state
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Seasons list for filter
  const [seasons, setSeasons] = useState<Array<{ id: string; name: string }>>([]);

  // Recipients filters
  const [recipientFilters, setRecipientFilters] = useState({
    achievement_id: '',
    season_id: '',
    search: '',
  });

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  const fetchDefinitions = async (page = 1) => {
    try {
      setDefinitionsLoading(true);
      const response = await achievementsApi.getAllDefinitions({ page, limit: 20 });
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

  const fetchRecipients = async (page = 1) => {
    try {
      setRecipientsLoading(true);
      const params: Record<string, unknown> = { page, limit: 20 };
      if (recipientFilters.achievement_id) params.achievement_id = recipientFilters.achievement_id;
      if (recipientFilters.season_id) params.season_id = recipientFilters.season_id;
      if (recipientFilters.search) params.search = recipientFilters.search;

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

  const handleBackfill = async () => {
    if (!confirm('This will check all existing competition results, award achievements, and generate images. This may take a while. Continue?')) {
      return;
    }

    try {
      setBackfilling(true);
      setBackfillResult(null);
      setGenerateImagesResult(null);
      const result = await achievementsApi.triggerBackfill();
      setBackfillResult(result);
      fetchRecipients();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Backfill failed');
    } finally {
      setBackfilling(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!confirm('This will generate images for all achievements that are missing images. Continue?')) {
      return;
    }

    try {
      setGeneratingImages(true);
      setGenerateImagesResult(null);
      const result = await achievementsApi.generateMissingImages();
      setGenerateImagesResult(result);
      fetchRecipients();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Image generation failed');
    } finally {
      setGeneratingImages(false);
    }
  };

  const handleRegenerateImage = async (recipientId: string) => {
    try {
      setRegeneratingId(recipientId);
      setRegenerateError(null);
      const result = await achievementsApi.regenerateImage(recipientId);

      // Success if explicitly true OR if we got a new image URL
      if (result.success || result.newImageUrl) {
        // Refresh the recipients list to show the new image
        fetchRecipients();
      } else {
        setRegenerateError(result.error || 'Image regeneration failed. Check server logs for details.');
        console.error('Regenerate failed:', result);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Image regeneration failed';
      setRegenerateError(errorMsg);
      console.error('Regenerate error:', err);
    } finally {
      setRegeneratingId(null);
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
              onClick={handleGenerateImages}
              disabled={generatingImages || backfilling}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              title="Generate images for achievements missing images"
            >
              {generatingImages ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Award className="h-4 w-4" />
              )}
              Generate Images
            </button>
            <button
              onClick={handleBackfill}
              disabled={backfilling || generatingImages}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {backfilling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Backfill Achievements
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

        {/* Backfill Result */}
        {backfillResult && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
            <p className="text-green-400">
              Backfill complete: Processed {backfillResult.processed} results, awarded {backfillResult.awarded} achievements.
              {backfillResult.imagesGenerated !== undefined && (
                <span className="ml-2">
                  Images: {backfillResult.imagesGenerated} generated
                  {backfillResult.imagesFailed && backfillResult.imagesFailed > 0 && (
                    <span className="text-yellow-400 ml-1">({backfillResult.imagesFailed} failed)</span>
                  )}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Generate Images Result */}
        {generateImagesResult && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <p className="text-blue-400">
              Image generation complete: {generateImagesResult.generated} images generated
              {generateImagesResult.failed > 0 && (
                <span className="text-yellow-400 ml-1">({generateImagesResult.failed} failed)</span>
              )}
            </p>
          </div>
        )}

        {/* Regenerate Error */}
        {regenerateError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Image regeneration failed</p>
              <p className="text-red-300 text-sm mt-1">{regenerateError}</p>
              <p className="text-gray-500 text-xs mt-2">Check the backend logs for more details.</p>
            </div>
            <button
              onClick={() => setRegenerateError(null)}
              className="ml-auto p-1 hover:bg-red-500/20 rounded text-red-400"
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
                  {definitions.map((def) => (
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
            {definitionsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                <p className="text-sm text-gray-400">
                  Showing {(definitionsPagination.page - 1) * definitionsPagination.limit + 1} to{' '}
                  {Math.min(definitionsPagination.page * definitionsPagination.limit, definitionsPagination.total)} of{' '}
                  {definitionsPagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchDefinitions(1)}
                    disabled={definitionsPagination.page <= 1}
                    className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                    title="First page"
                  >
                    <ChevronsLeft className="h-4 w-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => fetchDefinitions(definitionsPagination.page - 1)}
                    disabled={definitionsPagination.page <= 1}
                    className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-400" />
                  </button>
                  <span className="text-gray-400 text-sm px-2">
                    {definitionsPagination.page} / {definitionsPagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchDefinitions(definitionsPagination.page + 1)}
                    disabled={definitionsPagination.page >= definitionsPagination.totalPages}
                    className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => fetchDefinitions(definitionsPagination.totalPages)}
                    disabled={definitionsPagination.page >= definitionsPagination.totalPages}
                    className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                    title="Last page"
                  >
                    <ChevronsRight className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>
            )}
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
                {(recipientFilters.search || recipientFilters.achievement_id || recipientFilters.season_id) && (
                  <button
                    onClick={() => setRecipientFilters({ achievement_id: '', season_id: '', search: '' })}
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
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Achievement</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">MECA ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Value</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Earned</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Image</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {recipients.map((recipient) => (
                      <tr key={recipient.id} className="hover:bg-slate-700/50">
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{recipient.achievement?.name}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{recipient.profile_name || 'N/A'}</td>
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
                        <td className="px-4 py-3 text-center">
                          {recipient.image_url ? (
                            <button
                              onClick={() => setPreviewImage(recipient.image_url)}
                              className="text-orange-400 hover:text-orange-300"
                              title="View image"
                            >
                              <Eye className="h-4 w-4 inline" />
                            </button>
                          ) : (
                            <span className="text-gray-500 text-sm">No image</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRegenerateImage(recipient.id)}
                            disabled={regeneratingId === recipient.id}
                            className="text-yellow-500 hover:text-yellow-400 flex items-center gap-1 mx-auto disabled:opacity-50"
                            title="Regenerate image"
                          >
                            {regeneratingId === recipient.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            <span className="text-xs">Retry</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Pagination */}
              {recipientsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                  <p className="text-sm text-gray-400">
                    Showing {(recipientsPagination.page - 1) * recipientsPagination.limit + 1} to{' '}
                    {Math.min(recipientsPagination.page * recipientsPagination.limit, recipientsPagination.total)} of{' '}
                    {recipientsPagination.total}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => fetchRecipients(1)}
                      disabled={recipientsPagination.page <= 1}
                      className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                      title="First page"
                    >
                      <ChevronsLeft className="h-4 w-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => fetchRecipients(recipientsPagination.page - 1)}
                      disabled={recipientsPagination.page <= 1}
                      className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                      title="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4 text-gray-400" />
                    </button>
                    <span className="text-gray-400 text-sm px-2">
                      {recipientsPagination.page} / {recipientsPagination.totalPages}
                    </span>
                    <button
                      onClick={() => fetchRecipients(recipientsPagination.page + 1)}
                      disabled={recipientsPagination.page >= recipientsPagination.totalPages}
                      className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                      title="Next page"
                    >
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => fetchRecipients(recipientsPagination.totalPages)}
                      disabled={recipientsPagination.page >= recipientsPagination.totalPages}
                      className="p-2 hover:bg-slate-700 rounded-lg disabled:opacity-50"
                      title="Last page"
                    >
                      <ChevronsRight className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              )}
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

        {/* Image Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-md" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 p-2 text-white hover:text-orange-400"
              >
                <X className="h-6 w-6" />
              </button>
              <img
                src={previewImage}
                alt="Achievement"
                className="max-w-full h-auto rounded-lg shadow-2xl"
                style={{ maxHeight: '400px' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
