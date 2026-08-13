import { Injectable, Inject, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { MembershipCategory, PaymentStatus } from '@newmeca/shared';
import { Membership } from '../memberships/memberships.entity';

/**
 * System health diagnostics (admin, read-only).
 *
 * Born from the 2026-08-12 prod incident: the deployed code expected
 * memberships columns the prod DB didn't have, the points-eligibility query
 * threw, the error was swallowed, and every recalculation silently zeroed
 * members' points. This service turns that day of debugging into one click:
 *
 *  - SCHEMA DRIFT: compares EVERY MikroORM entity's mapped columns against
 *    information_schema. A column the code expects but the DB lacks is
 *    exactly the silent-breakage pattern — flagged loudly, per table.
 *  - POINTS PIPELINE: runs the real eligibility entity-query (the thing that
 *    broke), reports the eligible-member count or the EXACT error, plus the
 *    current season's points config and the recently applied migrations.
 */
@Injectable()
export class SystemDiagnosticsService {
  private readonly logger = new Logger(SystemDiagnosticsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Extract the DB columns each entity expects. Defensive across MikroORM
   * versions: props may be an array (`meta.props`) or a dict
   * (`meta.properties`); relation kind may live on `kind` or `reference`.
   */
  private expectedColumnsByTable(): Map<string, { schema: string; table: string; columns: Set<string> }> {
    const out = new Map<string, { schema: string; table: string; columns: Set<string> }>();
    const metadata: any = (this.em as any).getMetadata();
    const all: any[] = typeof metadata.getAll === 'function' ? Object.values(metadata.getAll()) : [];
    for (const meta of all) {
      if (!meta?.tableName || meta.abstract || meta.virtual || meta.expression) continue;
      const schema = meta.schema || 'public';
      const key = `${schema}.${meta.tableName}`;
      const entry = out.get(key) ?? { schema, table: meta.tableName, columns: new Set<string>() };
      const props: any[] = Array.isArray(meta.props) ? meta.props : Object.values(meta.properties ?? {});
      for (const p of props) {
        if (!p || p.persist === false || p.formula) continue;
        const kind = String(p.kind ?? p.reference ?? 'scalar');
        // Only kinds that own a local column: scalars, embedded leaves, and
        // owning to-one relations. Collections live on the other side.
        if (kind === '1:m' || kind === 'm:n') continue;
        if ((kind === '1:1' || kind === 'm:1') && p.owner === false) continue;
        for (const field of p.fieldNames ?? []) {
          if (field) entry.columns.add(field);
        }
      }
      if (entry.columns.size > 0) out.set(key, entry);
    }
    return out;
  }

  /**
   * Compare every entity's expected columns against the live database.
   * `missing` = code expects it, DB lacks it → queries on that table THROW
   * (or worse, get silently swallowed). `missingTable` = whole table absent
   * (pending migration).
   */
  async schemaDrift(): Promise<{
    checkedTables: number;
    driftCount: number;
    problems: Array<{ table: string; missingTable: boolean; missingColumns: string[] }>;
  }> {
    const expected = this.expectedColumnsByTable();
    const conn = this.em.fork().getConnection();
    const dbColumns: Array<{ table_schema: string; table_name: string; column_name: string }> = await conn.execute(
      `SELECT table_schema, table_name, column_name
         FROM information_schema.columns
        WHERE table_schema = 'public'`,
    );
    const actual = new Map<string, Set<string>>();
    for (const row of dbColumns) {
      const key = `${row.table_schema}.${row.table_name}`;
      if (!actual.has(key)) actual.set(key, new Set());
      actual.get(key)!.add(row.column_name);
    }

    const problems: Array<{ table: string; missingTable: boolean; missingColumns: string[] }> = [];
    for (const [key, entry] of expected) {
      const dbCols = actual.get(key);
      if (!dbCols) {
        problems.push({ table: key, missingTable: true, missingColumns: [...entry.columns] });
        continue;
      }
      const missing = [...entry.columns].filter(c => !dbCols.has(c));
      if (missing.length > 0) {
        problems.push({ table: key, missingTable: false, missingColumns: missing });
      }
    }
    problems.sort((a, b) => a.table.localeCompare(b.table));
    return { checkedTables: expected.size, driftCount: problems.length, problems };
  }

  /**
   * Points-pipeline diagnostics: the LIVE eligibility entity-query (the exact
   * query whose silent failure zeroed points), season/points-config presence,
   * and the migration trail.
   */
  async pointsPipeline(): Promise<any> {
    const em = this.em.fork();
    const conn = em.getConnection();

    // 1) The real eligibility query, via the ENTITY (so missing columns show).
    let eligibility: { ok: boolean; eligibleMembers?: number; error?: string };
    try {
      const count = await em.count(Membership, {
        mecaId: { $ne: null },
        paymentStatus: { $in: [PaymentStatus.PAID, PaymentStatus.CANCELLED] },
        membershipTypeConfig: {
          category: { $in: [MembershipCategory.COMPETITOR, MembershipCategory.RETAIL, MembershipCategory.MANUFACTURER] },
        },
        $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
      } as any);
      eligibility = { ok: true, eligibleMembers: count };
    } catch (err: any) {
      eligibility = { ok: false, error: err?.message ?? String(err) };
    }

    // 2) Current season + its points configuration.
    let season: any = null;
    try {
      const rows: any[] = await conn.execute(`
        SELECT s.id, s.name,
               (pc.id IS NOT NULL) AS has_points_config,
               pc.standard_1st_place, pc.four_x_1st_place
          FROM public.seasons s
          LEFT JOIN public.points_configurations pc ON pc.season_id = s.id
         WHERE s.is_current = true
         LIMIT 1`);
      season = rows[0] ?? { error: 'No current season flagged' };
    } catch (err: any) {
      season = { error: err?.message ?? String(err) };
    }

    // 3) Recently applied migrations (is prod behind?).
    let migrations: any[] = [];
    try {
      migrations = await conn.execute(
        `SELECT name, executed_at FROM public.mikro_orm_migrations ORDER BY executed_at DESC LIMIT 15`,
      );
    } catch (err: any) {
      migrations = [{ error: err?.message ?? String(err) }];
    }

    return { eligibility, season, migrations };
  }
}
