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
  // Display names resolved server-side from created_by/updated_by
  created_by_name?: string;
  updated_by_name?: string;
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

// ---- Admin revenue report ----
export interface RevenueReportEvent {
  event_id: string;
  title: string;
  event_date: string;
  director_id: string | null;
  director_name: string | null;
  member_count: number;
  non_member_count: number;
  member_fee: number | null;
  non_member_fee: number | null;
  fees_set: boolean;
  member_revenue: number;
  non_member_revenue: number;
  total_revenue: number;
}

export interface RevenueReportDirector {
  director_id: string | null;
  director_name: string;
  event_count: number;
  total_revenue: number;
  events: RevenueReportEvent[];
}

export interface RevenueReport {
  season_id: string;
  directors: RevenueReportDirector[];
  season_total: number;
  event_count: number;
  result_count: number;
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

  // Admin-only: per-event entry-fee revenue grouped by event director for a season.
  getRevenueReport: async (seasonId: string): Promise<RevenueReport> => {
    const response = await axios.get('/api/competition-results/revenue-report', { params: { seasonId } });
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
      // Set on rows whose class name doesn't match any existing
      // competition_classes row. Frontend uses this to drive the
      // "Unknown Classes" section of the import review modal.
      unknownClass?: string;
      // Present when a matching result already exists for this event. Drives
      // the "already in the system" duplicate banner + skip/overwrite choice.
      existing?: { id: string; score: number; placement: number; wattage: number | null; frequency: number | null } | null;
    }>;
    totalCount: number;
    needsNameConfirmation: number;
    needsDataCompletion: number;
    fileExtension: string;
    // De-duped list of class names from the file that aren't yet in
    // the system. Admin/ED must create each before the import can run.
    unknownClasses: string[];
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
    fileExtension: string,
    file?: File
  ): Promise<{ message: string; imported: number; updated: number; skipped: number; errors: string[] }> => {
    // Sent as multipart so the original upload rides along and the backend can
    // store it (Supabase) for the Imported Files tab. JSON payloads are
    // stringified into form fields; the controller parses them back.
    const formData = new FormData();
    if (file) formData.append('file', file);
    formData.append('parsedResults', JSON.stringify(parsedResults));
    formData.append('resolutions', JSON.stringify(resolutions));
    formData.append('createdBy', createdBy);
    formData.append('fileExtension', fileExtension);

    const response = await axios.post(
      `/api/competition-results/import-with-resolution/${eventId}`,
      formData
    );
    return response.data;
  },

  /**
   * Admin-only one-shot backfill. Walks every result with a class_id
   * linked and corrects result.format / result.competition_class to
   * match the linked class. Cleans up legacy rows where the old
   * "default to SPL" path silently mis-tagged results. Idempotent —
   * already-correct rows are no-ops.
   */
  backfillFormatFromClass: async (): Promise<{
    scanned: number;
    formatFixed: number;
    classNameFixed: number;
    skippedNoClass: number;
  }> => {
    const response = await axios.post('/api/competition-results/admin/backfill-format-from-class');
    return response.data;
  },

  /** Admin — suggested duplicate-class groups for a season. */
  getDuplicateClasses: async (seasonId: string): Promise<Array<{
    format: string;
    canonical: { id: string; name: string; abbreviation: string; resultCount: number };
    duplicates: Array<{ id: string; name: string; abbreviation: string; resultCount: number }>;
  }>> => {
    const response = await axios.get('/api/competition-results/admin/duplicate-classes', { params: { seasonId } });
    return response.data;
  },

  /** Admin — merge duplicate classes into a canonical class (same season). */
  mergeClasses: async (canonicalClassId: string, duplicateClassIds: string[]): Promise<{
    resultsMoved: number;
    classesDeleted: number;
    seasonId: string;
    collisions: Array<{ eventId: string; mecaId: string; count: number }>;
  }> => {
    const response = await axios.post('/api/competition-results/admin/merge-classes', {
      canonicalClassId,
      duplicateClassIds,
    });
    return response.data;
  },

  /** Admin — mark a group of classes as NOT duplicates so the scan skips them. */
  ignoreDuplicateClasses: async (classIds: string[]): Promise<{ ignored: string }> => {
    const response = await axios.post('/api/competition-results/admin/ignore-duplicate-classes', { classIds });
    return response.data;
  },

  /**
   * Admin-only — list every result whose class_id can't be resolved
   * (deleted/inactive class AND no text fallback match). These rows
   * are hidden from public results pages but tracked here so an
   * admin can fix them.
   */
  getOrphanResults: async (): Promise<Array<{
    id: string;
    eventId: string | null;
    eventTitle: string | null;
    eventDate: string | null;
    competitorName: string | null;
    mecaId: string | null;
    competitionClass: string;
    format: string | null;
    classId: string | null;
    score: number | null;
    placement: number | null;
    createdAt: string;
    suggestedClass: {
      id: string;
      name: string;
      abbreviation: string;
      format: string;
      isActive: boolean;
    } | null;
    linkedClass: {
      id: string;
      name: string;
      abbreviation: string;
      format: string;
      isActive: boolean;
    } | null;
    mappingMatch: {
      mappingId: string;
      sourceName: string;
      targetClass: {
        id: string;
        name: string;
        abbreviation: string;
        format: string;
        isActive: boolean;
      } | null;
    } | null;
  }>> => {
    const response = await axios.get('/api/competition-results/admin/orphan-results');
    return response.data;
  },

  /**
   * Admin-only — point a set of orphan results at a specific class.
   * Updates each row's class_id + auto-syncs format / competition_class
   * text from the target class.
   */
  repointToClass: async (resultIds: string[], classId: string): Promise<{ updated: number }> => {
    const response = await axios.post('/api/competition-results/admin/repoint-to-class', {
      resultIds,
      classId,
    });
    return response.data;
  },

  // ==========================================
  // PENDING CLASS REVIEW (admin queue)
  // ==========================================

  /**
   * Admin-only — results an Event Director submitted whose class didn't match
   * the system and that were sent for review. EDs can't create classes, so
   * this queue is where an admin either assigns an existing class or creates
   * the class and accepts the result.
   */
  getPendingClassReview: async (): Promise<Array<{
    id: string;
    eventId: string | null;
    eventTitle: string | null;
    eventDate: string | null;
    seasonId: string | null;
    competitorName: string | null;
    mecaId: string | null;
    competitionClass: string;
    format: string | null;
    score: number | null;
    placement: number | null;
    createdAt: string;
    suggestedClass: { id: string; name: string; abbreviation: string; format: string } | null;
  }>> => {
    const response = await axios.get('/api/competition-results/admin/pending-class-review');
    return response.data;
  },

  /**
   * Admin-only — assign pending result(s) to an EXISTING class. Clears the
   * pending flag and recalculates points for the affected events.
   */
  assignPendingToClass: async (resultIds: string[], classId: string): Promise<{ updated: number }> => {
    const response = await axios.post('/api/competition-results/admin/pending/assign', {
      resultIds,
      classId,
    });
    return response.data;
  },

  /**
   * Admin-only — create a NEW class and accept the pending result(s) into it.
   */
  createClassAndAcceptPending: async (params: {
    resultIds: string[];
    name: string;
    abbreviation?: string;
    format: string;
    seasonId: string;
  }): Promise<{ classId: string; updated: number }> => {
    const response = await axios.post(
      '/api/competition-results/admin/pending/create-class-and-accept',
      params,
    );
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
  /**
   * Lightweight list of formats that have results for the given season.
   * Used to render the dynamic format chips on the Standings + Top 10
   * pages so we never show a chip for a format with no data.
   */
  getAvailableFormats: async (
    seasonId?: string,
  ): Promise<{ format: string; resultCount: number; competitorCount: number }[]> => {
    const queryParams = new URLSearchParams();
    if (seasonId) queryParams.set('seasonId', seasonId);
    const url = queryParams.toString()
      ? `/api/standings/available-formats?${queryParams}`
      : '/api/standings/available-formats';
    const response = await axios.get(url);
    // Defensive: older deploys returned just `resultCount`. Fall back to it
    // so the chip badge still renders during the rollout window before
    // the backend ships the new field.
    return (response.data ?? []).map((f: any) => ({
      format: f.format,
      resultCount: f.resultCount ?? 0,
      competitorCount: f.competitorCount ?? f.resultCount ?? 0,
    }));
  },

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
  // Highest single-result score this competitor achieved in the leaderboard
  // scope (season / format / class). Null when no numeric score is available.
  highestScore: number | null;
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
