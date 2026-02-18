import axios from '@/lib/axios';

export interface CompetitionResult {
  id: string;
  eventId: string;
  competitorId?: string;
  competitorName: string;
  competitionClass: string;
  format?: string;
  score: number;
  placement: number;
  pointsEarned: number;
  vehicleInfo?: string;
  wattage?: number;
  frequency?: number;
  notes?: string;
  createdBy: string;
  seasonId?: string;
  classId?: string;
  createdAt: string;
  mecaId?: string;
  stateCode?: string;
  event?: any;
  competitor?: any;
  updatedBy?: string;
  updatedAt?: string;
  revisionCount?: number;
  modificationReason?: string;
  // Legacy snake_case aliases for backwards compatibility
  event_id?: string;
  competitor_id?: string;
  competitor_name?: string;
  competition_class?: string;
  points_earned?: number;
  vehicle_info?: string;
  created_by?: string;
  season_id?: string;
  class_id?: string;
  created_at?: string;
  meca_id?: string;
  state_code?: string;
  updated_by?: string;
  updated_at?: string;
  revision_count?: number;
  modification_reason?: string;
}

export const competitionResultsApi = {
  getAll: async (page: number = 1, limit: number = 100): Promise<CompetitionResult[]> => {
    const response = await axios.get(`/api/competition-results?page=${page}&limit=${limit}`);
    return response.data;
  },

  getById: async (id: string): Promise<CompetitionResult> => {
    const response = await axios.get(`/api/competition-results/${id}`);
    return response.data;
  },

  getByEvent: async (eventId: string): Promise<CompetitionResult[]> => {
    const response = await axios.get(`/api/competition-results/by-event/${eventId}`);
    return response.data;
  },

  getResultCountsByEventIds: async (eventIds: string[]): Promise<Record<string, number>> => {
    const response = await axios.post('/api/competition-results/counts-by-events', { eventIds });
    return response.data;
  },

  getByCompetitor: async (competitorId: string): Promise<CompetitionResult[]> => {
    const response = await axios.get(`/api/competition-results/by-competitor/${competitorId}`);
    return response.data;
  },

  getByMecaId: async (mecaId: string): Promise<CompetitionResult[]> => {
    const response = await axios.get(`/api/competition-results/by-meca-id/${mecaId}`);
    return response.data;
  },

  getLeaderboard: async (options?: {
    seasonId?: string;
    format?: string;
    competitionClass?: string;
    rankBy?: 'points' | 'score';
    limit?: number;
  }): Promise<any[]> => {
    const params = new URLSearchParams();
    if (options?.seasonId) params.append('seasonId', options.seasonId);
    if (options?.format) params.append('format', options.format);
    if (options?.competitionClass) params.append('class', options.competitionClass);
    if (options?.rankBy) params.append('rankBy', options.rankBy);
    if (options?.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const url = queryString
      ? `/api/competition-results/leaderboard?${queryString}`
      : '/api/competition-results/leaderboard';
    const response = await axios.get(url);
    return response.data;
  },

  // Get result counts for all events in a single call (efficient bulk endpoint)
  getResultCountsByEvent: async (): Promise<Record<string, number>> => {
    const response = await axios.get('/api/competition-results/counts-by-event');
    return response.data;
  },

  create: async (data: Partial<CompetitionResult>): Promise<CompetitionResult> => {
    const response = await axios.post('/api/competition-results', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CompetitionResult>, userId?: string): Promise<CompetitionResult> => {
    const response = await axios.put(`/api/competition-results/${id}`, { ...data, userId });
    return response.data;
  },

  delete: async (id: string, userId?: string, reason?: string): Promise<void> => {
    await axios.delete(`/api/competition-results/${id}`, {
      data: { userId, reason },
    });
  },

  recalculatePoints: async (eventId: string): Promise<{ message: string }> => {
    const response = await axios.post(`/api/competition-results/recalculate-points/${eventId}`);
    return response.data;
  },

  importResults: async (
    eventId: string,
    file: File,
    createdBy: string
  ): Promise<{ message: string; imported: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('createdBy', createdBy);

    const response = await axios.post(`/api/competition-results/import/${eventId}`, formData);
    return response.data;
  },

  checkDuplicates: async (
    eventId: string,
    file: File
  ): Promise<{
    duplicates: Array<{
      index: number;
      importData: any;
      existingData: any;
      matchType: 'meca_id' | 'name';
    }>;
    nonDuplicates: number[];
    parsedResults: any[];
  }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`/api/competition-results/check-duplicates/${eventId}`, formData);
    return response.data;
  },

  parseAndValidate: async (
    eventId: string,
    file: File
  ): Promise<{
    results: Array<{
      index: number;
      data: any;
      nameMatch?: {
        matchedMecaId: string;
        matchedName: string;
        matchedCompetitorId: string | null;
        confidence: 'exact' | 'partial';
      };
      missingFields: string[];
      isValid: boolean;
      validationErrors: string[];
    }>;
    totalCount: number;
    needsNameConfirmation: number;
    needsDataCompletion: number;
    fileExtension: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`/api/competition-results/parse-and-validate/${eventId}`, formData);
    return response.data;
  },

  importWithResolution: async (
    eventId: string,
    parsedResults: any[],
    resolutions: Record<number, 'skip' | 'replace'>,
    createdBy: string,
    fileExtension: string
  ): Promise<{ message: string; imported: number; updated: number; skipped: number; errors: string[] }> => {
    const response = await axios.post(`/api/competition-results/import-with-resolution/${eventId}`, {
      parsedResults,
      resolutions,
      createdBy,
      fileExtension,
    });
    return response.data;
  },

  // ==========================================
  // STANDINGS ENDPOINTS (New optimized backend)
  // ==========================================

  /**
   * Get season leaderboard with pagination
   */
  getStandingsLeaderboard: async (params: {
    seasonId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    entries: StandingsEntry[];
    total: number;
  }> => {
    const queryParams = new URLSearchParams();
    if (params.seasonId) queryParams.set('seasonId', params.seasonId);
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());

    const url = queryParams.toString()
      ? `/api/standings/leaderboard?${queryParams}`
      : '/api/standings/leaderboard';

    const response = await axios.get(url);
    return response.data;
  },

  /**
   * Get standings by format (SPL, SQL, SSI, MK)
   */
  getStandingsByFormat: async (
    format: string,
    seasonId?: string,
    limit: number = 50
  ): Promise<StandingsEntry[]> => {
    const queryParams = new URLSearchParams();
    if (seasonId) queryParams.set('seasonId', seasonId);
    queryParams.set('limit', limit.toString());

    const response = await axios.get(
      `/api/standings/format/${format}?${queryParams}`
    );
    return response.data;
  },

  /**
   * Get standings by competition class within a format
   */
  getStandingsByClass: async (
    format: string,
    className: string,
    seasonId?: string,
    limit: number = 50
  ): Promise<ClassStandingsEntry[]> => {
    const queryParams = new URLSearchParams();
    if (seasonId) queryParams.set('seasonId', seasonId);
    queryParams.set('limit', limit.toString());

    const response = await axios.get(
      `/api/standings/format/${format}/class/${encodeURIComponent(className)}?${queryParams}`
    );
    return response.data;
  },

  /**
   * Get team standings
   */
  getTeamStandings: async (
    seasonId?: string,
    limit: number = 50
  ): Promise<TeamStandingsEntry[]> => {
    const queryParams = new URLSearchParams();
    if (seasonId) queryParams.set('seasonId', seasonId);
    queryParams.set('limit', limit.toString());

    const response = await axios.get(`/api/standings/teams?${queryParams}`);
    return response.data;
  },

  /**
   * Get format summaries (overview of all formats)
   */
  getFormatSummaries: async (seasonId?: string): Promise<FormatStandingsSummary[]> => {
    const queryParams = new URLSearchParams();
    if (seasonId) queryParams.set('seasonId', seasonId);

    const url = queryParams.toString()
      ? `/api/standings/formats?${queryParams}`
      : '/api/standings/formats';

    const response = await axios.get(url);
    return response.data;
  },

  /**
   * Get competitor statistics
   */
  getCompetitorStats: async (
    mecaId: string,
    seasonId?: string
  ): Promise<CompetitorStats | null> => {
    const queryParams = new URLSearchParams();
    if (seasonId) queryParams.set('seasonId', seasonId);

    const url = queryParams.toString()
      ? `/api/standings/competitor/${mecaId}?${queryParams}`
      : `/api/standings/competitor/${mecaId}`;

    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  /**
   * Get list of classes with results
   */
  getClassesWithResults: async (
    format?: string,
    seasonId?: string
  ): Promise<{ format: string; className: string; resultCount: number }[]> => {
    const queryParams = new URLSearchParams();
    if (format) queryParams.set('format', format);
    if (seasonId) queryParams.set('seasonId', seasonId);

    const url = queryParams.toString()
      ? `/api/standings/classes?${queryParams}`
      : '/api/standings/classes';

    const response = await axios.get(url);
    return response.data;
  },
};

// ==========================================
// Standings Types
// ==========================================

export interface StandingsEntry {
  mecaId: string | null;
  competitorName: string;
  competitorId: string | null;
  totalPoints: number;
  eventsParticipated: number;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  isGuest: boolean;
  rank?: number;
}

export interface ClassStandingsEntry extends StandingsEntry {
  competitionClass: string;
  format: string;
}

export interface TeamStandingsEntry {
  teamId: string;
  teamName: string;
  totalPoints: number;
  memberCount: number;
  eventsParticipated: number;
  rank?: number;
}

export interface FormatStandingsSummary {
  format: string;
  totalCompetitors: number;
  totalEvents: number;
  topCompetitors: StandingsEntry[];
}

export interface CompetitorStats {
  mecaId: string;
  totalPoints: number;
  ranking: number;
  eventsParticipated: number;
  placements: {
    first: number;
    second: number;
    third: number;
  };
  byFormat: Array<{
    format: string;
    points: number;
    events: number;
  }>;
  byClass: Array<{
    format: string;
    className: string;
    points: number;
    events: number;
  }>;
}
