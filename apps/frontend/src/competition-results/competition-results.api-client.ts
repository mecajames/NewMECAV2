const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    const response = await fetch(`${API_BASE_URL}/api/competition-results?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch competition results');
    return response.json();
  },

  getById: async (id: string): Promise<CompetitionResult> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/${id}`);
    if (!response.ok) throw new Error('Failed to fetch competition result');
    return response.json();
  },

  getByEvent: async (eventId: string): Promise<CompetitionResult[]> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/by-event/${eventId}`);
    if (!response.ok) throw new Error('Failed to fetch results for event');
    return response.json();
  },

  getResultCountsByEventIds: async (eventIds: string[]): Promise<Record<string, number>> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/counts-by-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventIds }),
    });
    if (!response.ok) throw new Error('Failed to fetch result counts');
    return response.json();
  },

  getByCompetitor: async (competitorId: string): Promise<CompetitionResult[]> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/by-competitor/${competitorId}`);
    if (!response.ok) throw new Error('Failed to fetch results for competitor');
    return response.json();
  },

  getByMecaId: async (mecaId: string): Promise<CompetitionResult[]> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/by-meca-id/${mecaId}`);
    if (!response.ok) throw new Error('Failed to fetch results for MECA ID');
    return response.json();
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
      ? `${API_BASE_URL}/api/competition-results/leaderboard?${queryString}`
      : `${API_BASE_URL}/api/competition-results/leaderboard`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    return response.json();
  },

  // Get result counts for all events in a single call (efficient bulk endpoint)
  getResultCountsByEvent: async (): Promise<Record<string, number>> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/counts-by-event`);
    if (!response.ok) throw new Error('Failed to fetch result counts');
    return response.json();
  },

  create: async (data: Partial<CompetitionResult>): Promise<CompetitionResult> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create competition result');
    return response.json();
  },

  update: async (id: string, data: Partial<CompetitionResult>, userId?: string): Promise<CompetitionResult> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userId }),
    });
    if (!response.ok) throw new Error('Failed to update competition result');
    return response.json();
  },

  delete: async (id: string, userId?: string, reason?: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, reason }),
    });
    if (!response.ok) throw new Error('Failed to delete competition result');
  },

  recalculatePoints: async (eventId: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/recalculate-points/${eventId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to recalculate points');
    return response.json();
  },

  importResults: async (
    eventId: string,
    file: File,
    createdBy: string
  ): Promise<{ message: string; imported: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('createdBy', createdBy);

    const response = await fetch(`${API_BASE_URL}/api/competition-results/import/${eventId}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to import results');
    }

    return response.json();
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

    const response = await fetch(`${API_BASE_URL}/api/competition-results/check-duplicates/${eventId}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to check for duplicates');
    }

    return response.json();
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

    const response = await fetch(`${API_BASE_URL}/api/competition-results/parse-and-validate/${eventId}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to parse and validate file');
    }

    return response.json();
  },

  importWithResolution: async (
    eventId: string,
    parsedResults: any[],
    resolutions: Record<number, 'skip' | 'replace'>,
    createdBy: string,
    fileExtension: string
  ): Promise<{ message: string; imported: number; updated: number; skipped: number; errors: string[] }> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/import-with-resolution/${eventId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parsedResults,
        resolutions,
        createdBy,
        fileExtension,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to import results with resolution');
    }

    return response.json();
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
      ? `${API_BASE_URL}/api/standings/leaderboard?${queryParams}`
      : `${API_BASE_URL}/api/standings/leaderboard`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch standings leaderboard');
    return response.json();
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

    const response = await fetch(
      `${API_BASE_URL}/api/standings/format/${format}?${queryParams}`
    );
    if (!response.ok) throw new Error(`Failed to fetch ${format} standings`);
    return response.json();
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

    const response = await fetch(
      `${API_BASE_URL}/api/standings/format/${format}/class/${encodeURIComponent(className)}?${queryParams}`
    );
    if (!response.ok) throw new Error(`Failed to fetch class standings`);
    return response.json();
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

    const response = await fetch(`${API_BASE_URL}/api/standings/teams?${queryParams}`);
    if (!response.ok) throw new Error('Failed to fetch team standings');
    return response.json();
  },

  /**
   * Get format summaries (overview of all formats)
   */
  getFormatSummaries: async (seasonId?: string): Promise<FormatStandingsSummary[]> => {
    const queryParams = new URLSearchParams();
    if (seasonId) queryParams.set('seasonId', seasonId);

    const url = queryParams.toString()
      ? `${API_BASE_URL}/api/standings/formats?${queryParams}`
      : `${API_BASE_URL}/api/standings/formats`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch format summaries');
    return response.json();
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
      ? `${API_BASE_URL}/api/standings/competitor/${mecaId}?${queryParams}`
      : `${API_BASE_URL}/api/standings/competitor/${mecaId}`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch competitor stats');
    }
    return response.json();
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
      ? `${API_BASE_URL}/api/standings/classes?${queryParams}`
      : `${API_BASE_URL}/api/standings/classes`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch classes');
    return response.json();
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
