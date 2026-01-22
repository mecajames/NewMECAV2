import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, RefreshCw, Info, AlertTriangle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import type { PointsConfiguration, UpdatePointsConfigurationDto } from '@newmeca/shared';
import axios from '@/lib/axios';
import {
  getConfigForSeason,
  updateSeasonConfig,
  getPointsPreview,
} from '../../api-client/points-configuration.api-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Season {
  id: string;
  year: number;
  name: string;
  isCurrent?: boolean;
  is_current?: boolean;
}

interface FormData {
  // Standard Event Base Points
  standard_1st_place: number;
  standard_2nd_place: number;
  standard_3rd_place: number;
  standard_4th_place: number;
  standard_5th_place: number;
  // 4X Event Points
  four_x_1st_place: number;
  four_x_2nd_place: number;
  four_x_3rd_place: number;
  four_x_4th_place: number;
  four_x_5th_place: number;
  // Extended 4X
  four_x_extended_enabled: boolean;
  four_x_extended_points: number;
  four_x_extended_max_place: number;
  // Meta
  description: string;
}

interface PointsPreviewItem {
  placement: number;
  standard_1x: number;
  standard_2x: number;
  standard_3x: number;
  four_x: number;
}

const defaultFormData: FormData = {
  standard_1st_place: 5,
  standard_2nd_place: 4,
  standard_3rd_place: 3,
  standard_4th_place: 2,
  standard_5th_place: 1,
  four_x_1st_place: 30,
  four_x_2nd_place: 27,
  four_x_3rd_place: 24,
  four_x_4th_place: 21,
  four_x_5th_place: 18,
  four_x_extended_enabled: false,
  four_x_extended_points: 15,
  four_x_extended_max_place: 50,
  description: '',
};

const placementLabels: Record<number, string> = {
  1: '1st Place',
  2: '2nd Place',
  3: '3rd Place',
  4: '4th Place',
  5: '5th Place',
};

export default function PointsConfigurationPage() {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [config, setConfig] = useState<PointsConfiguration | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [preview, setPreview] = useState<PointsPreviewItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load seasons on mount
  useEffect(() => {
    loadSeasons();
  }, []);

  // Load config when season changes
  useEffect(() => {
    if (selectedSeasonId) {
      loadConfigForSeason(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  // Update preview when form data changes
  useEffect(() => {
    updatePreview();
  }, [formData]);

  const loadSeasons = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/seasons`);
      const allSeasons: Season[] = response.data;
      // Sort by year descending (most recent first)
      const sorted = allSeasons.sort((a, b) => b.year - a.year);
      setSeasons(sorted);

      // Auto-select current season if available
      const current = sorted.find(s => s.isCurrent || s.is_current);
      if (current) {
        setSelectedSeasonId(current.id);
      } else if (sorted.length > 0) {
        setSelectedSeasonId(sorted[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load seasons');
    } finally {
      setLoading(false);
    }
  };

  const loadConfigForSeason = async (seasonId: string) => {
    try {
      setLoading(true);
      setError(null);

      const configData = await getConfigForSeason(seasonId);
      setConfig(configData);

      // Populate form with config values
      setFormData({
        standard_1st_place: configData.standard_1st_place,
        standard_2nd_place: configData.standard_2nd_place,
        standard_3rd_place: configData.standard_3rd_place,
        standard_4th_place: configData.standard_4th_place,
        standard_5th_place: configData.standard_5th_place,
        four_x_1st_place: configData.four_x_1st_place,
        four_x_2nd_place: configData.four_x_2nd_place,
        four_x_3rd_place: configData.four_x_3rd_place,
        four_x_4th_place: configData.four_x_4th_place,
        four_x_5th_place: configData.four_x_5th_place,
        four_x_extended_enabled: configData.four_x_extended_enabled,
        four_x_extended_points: configData.four_x_extended_points,
        four_x_extended_max_place: configData.four_x_extended_max_place,
        description: configData.description || '',
      });

      setHasChanges(false);

      // Also load preview
      const previewData = await getPointsPreview(seasonId);
      setPreview(previewData.preview);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const updatePreview = () => {
    // Calculate preview based on current form values
    const previewItems: PointsPreviewItem[] = [];

    // Standard placements 1-5
    for (let i = 1; i <= 5; i++) {
      const basePoints = formData[`standard_${i}${i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th'}_place` as keyof FormData] as number;
      const fourXPoints = formData[`four_x_${i}${i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th'}_place` as keyof FormData] as number;

      previewItems.push({
        placement: i,
        standard_1x: basePoints * 1,
        standard_2x: basePoints * 2,
        standard_3x: basePoints * 3,
        four_x: fourXPoints,
      });
    }

    // Extended 4X if enabled
    if (formData.four_x_extended_enabled) {
      previewItems.push({
        placement: 6,
        standard_1x: 0,
        standard_2x: 0,
        standard_3x: 0,
        four_x: formData.four_x_extended_points,
      });

      if (formData.four_x_extended_max_place > 6) {
        previewItems.push({
          placement: formData.four_x_extended_max_place,
          standard_1x: 0,
          standard_2x: 0,
          standard_3x: 0,
          four_x: formData.four_x_extended_points,
        });
      }
    }

    setPreview(previewItems);
  };

  const handleInputChange = (field: keyof FormData, value: number | boolean | string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSuccess(null);
  };

  const validateForm = (): string | null => {
    // Validate standard points order (1st >= 2nd >= 3rd >= 4th >= 5th)
    if (formData.standard_1st_place < formData.standard_2nd_place ||
        formData.standard_2nd_place < formData.standard_3rd_place ||
        formData.standard_3rd_place < formData.standard_4th_place ||
        formData.standard_4th_place < formData.standard_5th_place) {
      return 'Standard points must be in descending order (1st >= 2nd >= 3rd >= 4th >= 5th)';
    }

    // Validate 4X points order
    if (formData.four_x_1st_place < formData.four_x_2nd_place ||
        formData.four_x_2nd_place < formData.four_x_3rd_place ||
        formData.four_x_3rd_place < formData.four_x_4th_place ||
        formData.four_x_4th_place < formData.four_x_5th_place) {
      return '4X event points must be in descending order (1st >= 2nd >= 3rd >= 4th >= 5th)';
    }

    // Validate extended placement range
    if (formData.four_x_extended_enabled) {
      if (formData.four_x_extended_max_place < 6 || formData.four_x_extended_max_place > 100) {
        return 'Extended max placement must be between 6 and 100';
      }
      if (formData.four_x_extended_points < 0) {
        return 'Extended points must be 0 or greater';
      }
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updateData: UpdatePointsConfigurationDto = {
        standard_1st_place: formData.standard_1st_place,
        standard_2nd_place: formData.standard_2nd_place,
        standard_3rd_place: formData.standard_3rd_place,
        standard_4th_place: formData.standard_4th_place,
        standard_5th_place: formData.standard_5th_place,
        four_x_1st_place: formData.four_x_1st_place,
        four_x_2nd_place: formData.four_x_2nd_place,
        four_x_3rd_place: formData.four_x_3rd_place,
        four_x_4th_place: formData.four_x_4th_place,
        four_x_5th_place: formData.four_x_5th_place,
        four_x_extended_enabled: formData.four_x_extended_enabled,
        four_x_extended_points: formData.four_x_extended_points,
        four_x_extended_max_place: formData.four_x_extended_max_place,
        description: formData.description || undefined,
      };

      const result = await updateSeasonConfig(selectedSeasonId, updateData);
      setConfig(result.config);
      setHasChanges(false);
      setSuccess('Points configuration saved successfully! Note: Existing competition results will use the new point values when recalculated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData({
        standard_1st_place: config.standard_1st_place,
        standard_2nd_place: config.standard_2nd_place,
        standard_3rd_place: config.standard_3rd_place,
        standard_4th_place: config.standard_4th_place,
        standard_5th_place: config.standard_5th_place,
        four_x_1st_place: config.four_x_1st_place,
        four_x_2nd_place: config.four_x_2nd_place,
        four_x_3rd_place: config.four_x_3rd_place,
        four_x_4th_place: config.four_x_4th_place,
        four_x_5th_place: config.four_x_5th_place,
        four_x_extended_enabled: config.four_x_extended_enabled,
        four_x_extended_points: config.four_x_extended_points,
        four_x_extended_max_place: config.four_x_extended_max_place,
        description: config.description || '',
      });
      setHasChanges(false);
      setError(null);
    }
  };

  if (loading && seasons.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Points Configuration</h1>
            <p className="text-gray-400">
              Configure competition points for each season
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Season Selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400">Season:</label>
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:border-orange-500 focus:ring-orange-500"
              >
                {seasons.map(season => (
                  <option key={season.id} value={season.id}>
                    {season.name} {(season.isCurrent || season.is_current) && '(Current)'}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-400">{success}</p>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-blue-300 text-sm">
            <p className="font-medium mb-1">How Points Work</p>
            <ul className="list-disc list-inside space-y-1 text-blue-300/80">
              <li><strong>Standard Events (1X, 2X, 3X):</strong> Base points multiplied by the event multiplier. Only top 5 placements receive points.</li>
              <li><strong>4X Events (Championship):</strong> Special fixed point values for each placement. Can optionally award participation points to placements 6th through the configured maximum.</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Standard Events Configuration */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <span className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 text-sm font-bold">
                1X
              </span>
              <span className="w-8 h-8 bg-orange-500/30 rounded-lg flex items-center justify-center text-orange-400 text-sm font-bold">
                2X
              </span>
              <span className="w-8 h-8 bg-orange-500/40 rounded-lg flex items-center justify-center text-orange-400 text-sm font-bold">
                3X
              </span>
              Standard Event Base Points
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Set base points for each placement. These are multiplied by the event multiplier (1X, 2X, or 3X).
            </p>

            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(place => (
                <div key={place} className="flex items-center gap-4">
                  <label className="w-24 text-slate-300">{placementLabels[place]}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData[`standard_${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}_place` as keyof FormData] as number}
                    onChange={(e) => handleInputChange(
                      `standard_${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}_place` as keyof FormData,
                      parseInt(e.target.value) || 0
                    )}
                    className="w-20 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-center focus:border-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-slate-500 text-sm">base pts</span>
                  <span className="text-slate-600 text-xs">
                    → 1X: {(formData[`standard_${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}_place` as keyof FormData] as number)} |
                    2X: {(formData[`standard_${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}_place` as keyof FormData] as number) * 2} |
                    3X: {(formData[`standard_${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}_place` as keyof FormData] as number) * 3}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 4X Events Configuration */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 text-sm font-bold">
                4X
              </span>
              4X Event Points (Championship)
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Fixed point values for 4X championship events (SQ, Install, RTA, etc.).
            </p>

            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(place => (
                <div key={place} className="flex items-center gap-4">
                  <label className="w-24 text-slate-300">{placementLabels[place]}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData[`four_x_${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}_place` as keyof FormData] as number}
                    onChange={(e) => handleInputChange(
                      `four_x_${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}_place` as keyof FormData,
                      parseInt(e.target.value) || 0
                    )}
                    className="w-20 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-center focus:border-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-slate-500 text-sm">pts</span>
                </div>
              ))}
            </div>

            {/* Extended 4X Placements */}
            <div className="mt-6 pt-6 border-t border-slate-700">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.four_x_extended_enabled}
                  onChange={(e) => handleInputChange('four_x_extended_enabled', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-white font-medium">Enable Extended Placements (6th+)</span>
              </label>
              <p className="text-slate-400 text-xs mt-1 ml-8">
                Award participation points for placements beyond 5th place at 4X events
              </p>

              {formData.four_x_extended_enabled && (
                <div className="mt-4 ml-8 space-y-4 animate-in fade-in duration-200 bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-slate-300">Points per placement</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.four_x_extended_points}
                      onChange={(e) => handleInputChange('four_x_extended_points', parseInt(e.target.value) || 0)}
                      className="w-20 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-center focus:border-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-slate-500 text-sm">pts each</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-slate-300">Max placement</label>
                    <input
                      type="number"
                      min="6"
                      max="100"
                      value={formData.four_x_extended_max_place}
                      onChange={(e) => handleInputChange('four_x_extended_max_place', parseInt(e.target.value) || 50)}
                      className="w-20 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-center focus:border-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-slate-500 text-sm">(6th - {formData.four_x_extended_max_place}th get {formData.four_x_extended_points} pts)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Points Preview Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Points Preview</h2>
          <p className="text-slate-400 text-sm mb-4">
            This preview shows how many points competitors will earn at each placement based on your configuration.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Placement</th>
                  <th className="text-center py-3 px-4 text-orange-400 font-medium">1X Event</th>
                  <th className="text-center py-3 px-4 text-orange-400 font-medium">2X Event</th>
                  <th className="text-center py-3 px-4 text-orange-400 font-medium">3X Event</th>
                  <th className="text-center py-3 px-4 text-purple-400 font-medium">4X Event</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-white font-medium">
                      {row.placement <= 5 ? placementLabels[row.placement] : (
                        row.placement === 6 ? '6th Place' : `${row.placement}th Place`
                      )}
                      {row.placement === 6 && formData.four_x_extended_enabled && (
                        <span className="text-slate-500 text-xs ml-2">(6th - {formData.four_x_extended_max_place}th)</span>
                      )}
                      {row.placement === formData.four_x_extended_max_place && row.placement > 6 && (
                        <span className="text-slate-500 text-xs ml-2">(max)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block min-w-[3rem] px-2 py-1 rounded ${row.standard_1x > 0 ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-700 text-slate-500'}`}>
                        {row.standard_1x}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block min-w-[3rem] px-2 py-1 rounded ${row.standard_2x > 0 ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-700 text-slate-500'}`}>
                        {row.standard_2x}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block min-w-[3rem] px-2 py-1 rounded ${row.standard_3x > 0 ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-700 text-slate-500'}`}>
                        {row.standard_3x}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block min-w-[3rem] px-2 py-1 rounded ${row.four_x > 0 ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-700 text-slate-500'}`}>
                        {row.four_x}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Description */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Configuration Notes</h2>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Add notes about this configuration (optional)..."
            rows={3}
            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:border-orange-500 focus:ring-orange-500 placeholder:text-slate-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {config?.updated_at && (
              <span>Last updated: {new Date(config.updated_at).toLocaleString()}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4 inline mr-2" />
                Reset Changes
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
