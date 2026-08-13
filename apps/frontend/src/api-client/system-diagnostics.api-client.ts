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

/**
 * Admin system health checks (Site Settings → System). Compares every backend
 * entity against the live DB schema and probes the points pipeline — built
 * after schema drift silently zeroed members' points on prod (2026-08-12).
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
};
