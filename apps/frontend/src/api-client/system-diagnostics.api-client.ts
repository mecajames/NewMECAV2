import axios from '@/lib/axios';

export interface SchemaDriftReport {
  checkedTables: number;
  driftCount: number;
  problems: Array<{ table: string; missingTable: boolean; missingColumns: string[] }>;
}

export interface PointsPipelineReport {
  eligibility: { ok: boolean; eligibleMembers?: number; error?: string };
  season: { id?: string; name?: string; has_points_config?: boolean; error?: string } | null;
  migrations: Array<{ name?: string; executed_at?: string; error?: string }>;
}

export interface MecaIdMismatchRow {
  email: string;
  member: string | null;
  profile_meca_id: string;
  active_membership_meca_id: string;
  active_membership_id: string;
  active_until: string | null;
  results_on_profile_id: number;
  held_results_on_profile_id: number;
}

export interface MecaIdMismatchReport {
  mismatchCount: number;
  mismatchedMembers: MecaIdMismatchRow[];
  strandedHeldResults: Array<{
    result_meca_id: string;
    email: string;
    active_membership_meca_id: string;
    held_results: number;
  }>;
}

export interface ResultsHygieneReport {
  whitespaceIds: number;
  unlinkedResults: number;
  guestStamped: number;
  heldResults: number;
}

/**
 * Admin system health checks (Site Settings → System). Compares every backend
 * entity against the live DB schema and probes the points pipeline — built
 * after schema drift silently zeroed members' points on prod (2026-08-12).
 * The mismatch/hygiene endpoints feed the Results & Points Diagnostic Center.
 */
export const systemDiagnosticsApi = {
  schemaDrift: async (): Promise<SchemaDriftReport> => {
    const response = await axios.get('/api/system-diagnostics/schema-drift');
    return response.data;
  },
  pointsPipeline: async (): Promise<PointsPipelineReport> => {
    const response = await axios.get('/api/system-diagnostics/points-pipeline');
    return response.data;
  },
  mecaIdMismatch: async (): Promise<MecaIdMismatchReport> => {
    const response = await axios.get('/api/system-diagnostics/meca-id-mismatch');
    return response.data;
  },
  resultsHygiene: async (): Promise<ResultsHygieneReport> => {
    const response = await axios.get('/api/system-diagnostics/results-hygiene');
    return response.data;
  },
};
