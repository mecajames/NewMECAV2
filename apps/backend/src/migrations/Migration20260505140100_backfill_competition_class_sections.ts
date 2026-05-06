import { Migration } from '@mikro-orm/migrations';

/**
 * Re-classifies every competition class by abbreviation, fixing two long-
 * standing issues at once:
 *
 *  1. Many classes were stored with `format = 'SPL'` regardless of what
 *     they actually were (Show & Shine, MECA Kids, RTL, PHAT awards, etc.)
 *     because the import path defaulted to SPL when the source row had no
 *     explicit format. This migration corrects those assignments using the
 *     V1 react app's hardcoded panels as the source of truth.
 *
 *  2. `section` (added in 20260505140000) is populated so the results UI
 *     can render each format as named sub-panels in the V1 order:
 *       SPL → Street, Trunk, Modified Street, Modified, Radical X,
 *             Park n Pound, Dueling Demos, Motorcycle SPL
 *       SQL → Sound Quality, Install, RTA, SQ2, Motorcycle SQ
 *       PHAT Awards → SPL Phat Awards, SQL Phat Awards, Phat Awards
 *       Show and Shine → Show & Shine, Specialty Awards
 *       MECA Kids / Ride the Light → single section each
 *
 * `display_order` is populated as a global integer; sections sort by their
 * minimum display_order so the panel order stays stable. Within a section,
 * classes appear in V1 array order.
 *
 * Re-running is safe: the temp mapping is rebuilt each run and only updates
 * rows whose abbreviation matches a known entry.
 */

interface ClassMapping {
  abbreviation: string;
  format: string;
  section: string;
  displayOrder: number;
}

// Format names must match the rows in competition_formats so dropdowns and
// joins line up. Stored exactly as seen in that table.
const FMT_SPL = 'SPL';
const FMT_SQL = 'SQL';
const FMT_MK = 'MECA Kids';
const FMT_RTL = 'Ride the Light';
const FMT_SNS = 'Show and Shine';
const FMT_PHAT = 'PHAT Awards';

// Helper: build mappings for an ordered list of abbreviations within a section.
// Keeps the migration body terse while preserving the exact V1 order.
function group(
  format: string,
  section: string,
  startOrder: number,
  abbrevs: string[],
): ClassMapping[] {
  return abbrevs.map((abbreviation, i) => ({
    abbreviation,
    format,
    section,
    displayOrder: startOrder + i,
  }));
}

const MAPPINGS: ClassMapping[] = [
  // ── SPL ────────────────────────────────────────────────────────────────
  // Order matches V1's SplResults.tsx panel ordering:
  // Street, Trunk, Modified Street, Modified, Radical X, Park n Pound,
  // Dueling Demos, Motorcycle SPL.
  ...group(FMT_SPL, 'Street',           100, ['S1', 'S2', 'S3', 'S4', 'S5']),
  ...group(FMT_SPL, 'Trunk',            110, ['T1', 'T2']),
  ...group(FMT_SPL, 'Modified Street',  120, ['MS1', 'MS2', 'MS3', 'MS4']),
  ...group(FMT_SPL, 'Modified',         130, ['M1', 'M2', 'M3', 'M4', 'M5']),
  ...group(FMT_SPL, 'Radical X',        140, ['XS', 'XT', 'XST1', 'XST2', 'XMS', 'XM1', 'XM2', 'X', 'XTC', 'XM']),
  // V1 grouped MOPNP/MCPP under Park & Pound, not Motorcycle SPL.
  ...group(FMT_SPL, 'Park n Pound',     150, ['DB1', 'DB2', 'DB3', 'DB4', 'DB5', 'MOPNP', 'MCPP']),
  // V1 grouped MCDD under Dueling Demos. Newer 2025 classes (DDBOS, DDMO1,
  // DDMO2, DDopn) land here too.
  ...group(FMT_SPL, 'Dueling Demos',    160, ['DDS', 'DDMS', 'DDM', 'DDM2', 'DDX', 'MCDD', 'DDBOS', 'DDMO1', 'DDMO2', 'DDopn']),
  ...group(FMT_SPL, 'Motorcycle SPL',   170, ['MCSP', 'MotSP']),

  // ── SQL ────────────────────────────────────────────────────────────────
  ...group(FMT_SQL, 'Sound Quality',    200, ['SQAS1', 'SQAS2', 'STO', 'STR', 'MS', 'MOD', 'MODX', 'XTR', 'MSTR']),
  ...group(FMT_SQL, 'Install',          210, ['STOIN', 'STRIN', 'MOINS', 'MODIN', 'XTRIN']),
  ...group(FMT_SQL, 'RTA',              220, ['RTA']),
  ...group(FMT_SQL, 'SQ2',              230, ['SQ2', 'SQ2P']),
  ...group(FMT_SQL, 'Motorcycle SQ',    240, ['MCCST', 'MCSTK']),

  // ── MECA Kids ──────────────────────────────────────────────────────────
  ...group(FMT_MK,  'MECA Kids',        300, ['MKSP', 'MKX', 'MKDB', 'DDK']),

  // ── Ride the Light ─────────────────────────────────────────────────────
  // V1 hardcoded RTLEX/RTLIN; current data uses EXT/INT/RTLMK/RTLMC. Map all
  // of them to the same section so historical and current data render
  // together.
  ...group(FMT_RTL, 'Ride The Light',   400, ['EXT', 'INT', 'RTLMK', 'RTLMC', 'RTLEX', 'RTLIN']),

  // ── Show and Shine: vehicle classes (V1 SSI division) ─────────────────
  ...group(FMT_SNS, 'Show & Shine',     500, [
    'DOMMC', 'SSAC', 'SSAT', 'ATV', 'CCAR', 'CTRK', 'CRUMI', 'CRUWI',
    'SSDCM', 'SSDCS', 'SSDCW', 'SSEM', 'SSES', 'SSEW', 'HDMLD', 'HDWLD',
    'SSHM', 'SSHW', 'SSICM', 'SSICS', 'SSICW', 'IMPMC', 'SSJDM', 'SSJDW',
    'SSJM', 'SSJV', 'SSJW', 'SSKDM', 'SSKDW', 'SSLOW', 'SSKID', 'SSMK',
    'MTRK', 'MOTOR', 'MCM', 'MCW', 'RATRD', 'RESMO', 'SPECL', 'STRBM',
    'STRBW', 'SSVAN', 'SUVM', 'SUVS', 'SUVW', 'THREE', 'SSTM', 'SSTS',
    'SSTW', 'SSVNT', 'SSVC', 'SSVT', 'SSO',
  ]),
  // V1 SSA division (Show & Shine Specialty awards)
  ...group(FMT_SNS, 'Specialty Awards', 560, [
    'SSCST', 'SSDSP', 'ENGIN', 'SSINT', 'SSPNT', 'SSPRF', 'SSRMS',
    'SSBOS', 'SSCLB', 'SSICE',
  ]),

  // ── PHAT Awards ────────────────────────────────────────────────────────
  // V2 collapses V1's three PHAT divisions (PHP/PHQ/PHT) into a single
  // "PHAT Awards" format. Sections preserve the original split so the UI
  // can still render them under their V1 sub-headings.
  ...group(FMT_PHAT, 'SPL Phat Awards', 700, [
    'PPBOS', 'P10', 'P12', 'P15', 'P18', 'P21', 'SPBOS', 'BOS', 'MOST',
    'PCAR', 'PINS', 'PTRU',
  ]),
  ...group(FMT_PHAT, 'SQL Phat Awards', 720, [
    'IN B', 'SQ B', 'SQLBO', 'SQBOS', 'SQMST', 'SQCAR', 'SQINS', 'SQTRU',
  ]),
  ...group(FMT_PHAT, 'Phat Awards',     740, ['BOBOS', 'PICE', 'TEAMP']),
];

export class Migration20260505140100_backfill_competition_class_sections extends Migration {
  async up(): Promise<void> {
    // Build a single VALUES list of (abbreviation, format, section, display_order)
    // tuples, then JOIN it against competition_classes so we only write rows we
    // actually have a mapping for. Unknown abbreviations are left untouched
    // (their format/section will stay whatever was already in the row).
    const valuesSql = MAPPINGS
      .map(m => {
        const abbrev = m.abbreviation.replace(/'/g, "''");
        const section = m.section.replace(/'/g, "''");
        return `('${abbrev}', '${m.format}', '${section}', ${m.displayOrder})`;
      })
      .join(',\n        ');

    this.addSql(`
      WITH mapping (abbreviation, format, section, display_order) AS (
        VALUES
        ${valuesSql}
      )
      UPDATE "public"."competition_classes" cc
      SET
        format = m.format,
        section = m.section,
        display_order = m.display_order,
        updated_at = NOW()
      FROM mapping m
      WHERE cc.abbreviation = m.abbreviation
        AND (
          cc.format IS DISTINCT FROM m.format
          OR cc.section IS DISTINCT FROM m.section
          OR cc.display_order IS DISTINCT FROM m.display_order
        );
    `);

    // Drop the duplicate "Park And Pound 1" row that exists in the source
    // 2025 spreadsheet — abbreviation DB1 should appear once. Keep the row
    // with the lowest id (oldest) per (season_id, abbreviation), delete the
    // rest. Skipped if no duplicates exist.
    this.addSql(`
      DELETE FROM "public"."competition_classes" cc
      USING (
        SELECT season_id, abbreviation, MIN(id::text) AS keep_id
        FROM "public"."competition_classes"
        WHERE abbreviation = 'DB1'
        GROUP BY season_id, abbreviation
        HAVING COUNT(*) > 1
      ) dup
      WHERE cc.season_id = dup.season_id
        AND cc.abbreviation = dup.abbreviation
        AND cc.id::text <> dup.keep_id;
    `);
  }

  async down(): Promise<void> {
    // Reverting wipes section and resets display_order/format to defaults.
    // We do not restore the duplicate DB1 row.
    this.addSql(`
      UPDATE "public"."competition_classes"
      SET section = NULL, updated_at = NOW();
    `);
  }
}
