import axios from '@/lib/axios';
import type {
  PointsConfiguration,
  UpdatePointsConfigurationDto,
  PointsPreview,
  RecalculationResult,
} from '@newmeca/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// =============================================================================
// TYPES
// =============================================================================

export interface PointsConfigWithSeason extends PointsConfiguration {
  season?: {
    id: string;
    name: string;
    year: number;
    is_current: boolean;
  };
}

export interface PointsPreviewResponse {
  season_id: string;
  config: PointsConfiguration;
  preview: PointsPreview[];
}

export interface UpdateAndRecalculateResponse {
  message: string;
  config: PointsConfiguration;
  recalculation_requested: boolean;
}

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

/**
 * Get points configuration for the current active season
 */
export async function getCurrentSeasonConfig(): Promise<PointsConfiguration | null> {
  const response = await axios.get(`${API_BASE_URL}/api/points-configuration/current`);
  if (response.data.config === null) {
    return null;
  }
  return response.data;
}

/**
 * Get points configuration for a specific season
 */
export async function getConfigForSeason(seasonId: string): Promise<PointsConfiguration> {
  const response = await axios.get(`${API_BASE_URL}/api/points-configuration/season/${seasonId}`);
  return response.data;
}

/**
 * Get points preview for a season
 * Shows calculated points for all placements
 */
export async function getPointsPreview(seasonId: string): Promise<PointsPreviewResponse> {
  const response = await axios.get(`${API_BASE_URL}/api/points-configuration/season/${seasonId}/preview`);
  return response.data;
}

/**
 * Calculate points for a specific placement (utility endpoint)
 */
export async function calculatePoints(
  seasonId: string,
  placement: number,
  multiplier: number
): Promise<{ season_id: string; placement: number; multiplier: number; points: number }> {
  const response = await axios.get(`${API_BASE_URL}/api/points-configuration/calculate`, {
    params: { seasonId, placement, multiplier },
  });
  return response.data;
}

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

/**
 * Get all points configurations (admin only)
 */
export async function getAllConfigs(): Promise<PointsConfiguration[]> {
  const response = await axios.get(`${API_BASE_URL}/api/points-configuration`);
  return response.data;
}

/**
 * Get points configuration by ID (admin only)
 */
export async function getConfigById(id: string): Promise<PointsConfiguration> {
  const response = await axios.get(`${API_BASE_URL}/api/points-configuration/${id}`);
  return response.data;
}

/**
 * Update points configuration for a season (admin only)
 */
export async function updateSeasonConfig(
  seasonId: string,
  data: UpdatePointsConfigurationDto
): Promise<{ message: string; config: PointsConfiguration }> {
  const response = await axios.put(`${API_BASE_URL}/api/points-configuration/season/${seasonId}`, data);
  return response.data;
}

/**
 * Update points configuration and optionally trigger recalculation (admin only)
 */
export async function updateAndRecalculate(
  seasonId: string,
  data: UpdatePointsConfigurationDto & { recalculate?: boolean }
): Promise<UpdateAndRecalculateResponse> {
  const response = await axios.put(
    `${API_BASE_URL}/api/points-configuration/season/${seasonId}/recalculate`,
    data
  );
  return response.data;
}

/**
 * Invalidate cache (admin only)
 */
export async function invalidateCache(seasonId?: string): Promise<{ message: string }> {
  const url = seasonId
    ? `${API_BASE_URL}/api/points-configuration/invalidate-cache?seasonId=${seasonId}`
    : `${API_BASE_URL}/api/points-configuration/invalidate-cache`;
  const response = await axios.post(url);
  return response.data;
}

// =============================================================================
// RECALCULATION ENDPOINTS
// =============================================================================

/**
 * Recalculate all competition results for a season
 * This is called after updating points configuration
 */
export async function recalculateSeasonResults(seasonId: string): Promise<RecalculationResult> {
  const response = await axios.post(`${API_BASE_URL}/api/competition-results/recalculate-season/${seasonId}`);
  return response.data;
}

// =============================================================================
// EXPORT API OBJECT
// =============================================================================

export const pointsConfigurationApi = {
  // Public
  getCurrentSeasonConfig,
  getConfigForSeason,
  getPointsPreview,
  calculatePoints,

  // Admin
  getAllConfigs,
  getConfigById,
  updateSeasonConfig,
  updateAndRecalculate,
  invalidateCache,

  // Recalculation
  recalculateSeasonResults,
};
