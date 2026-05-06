import { Migration } from '@mikro-orm/migrations';

/**
 * One-shot data migration: relink retailer/manufacturer business listings
 * that are still owned by a protected super-admin profile back to the
 * actual business owner.
 *
 * Background: when the directory was originally seeded, every listing was
 * created under James's account (MECA 202401). That broke the "my listing"
 * lookup on each business owner's dashboard, because the listing's user_id
 * didn't match their profile id. This migration auto-corrects high-confidence
 * matches in stage and production the same way the local script did.
 *
 * Strategies, applied in priority order (a listing is updated by the first
 * one that produces a unique match — multiple matches abort that strategy
 * for that listing to avoid wrong assignments):
 *
 *   1. Profile full name (first + last) equals listing.business_name
 *   2. The membership.business_name field on a candidate's active membership
 *      equals listing.business_name
 *   3. Profile.first_name equals listing.business_name
 *   4. The slug of listing.business_name (alphanumerics only, lowercased)
 *      appears in the slug of the candidate's email
 *
 * Idempotency: every update is guarded by `WHERE owner.meca_id IN (...)`,
 * so once a listing has been relinked, the migration is a no-op the next
 * time it runs.
 *
 * Safety: only updates user_id. No deletes, no schema changes. Listings
 * without a high-confidence match are left under the super-admin account
 * and surface in the new admin "Needs Owner" tab for manual reassignment.
 */
export class Migration20260505120000_relink_business_listings extends Migration {
  async up(): Promise<void> {
    for (const t of ['retailer_listings', 'manufacturer_listings']) {
      const category = t === 'retailer_listings' ? 'retail' : 'manufacturer';
      // Strategy 1: exact full-name match
      this.addSql(this.relinkSql(t, category, `
        LOWER(TRIM(COALESCE(cand.first_name, '') || ' ' || COALESCE(cand.last_name, ''))) = LOWER(TRIM(l2.business_name))
      `));
      // Strategy 2: membership.business_name match (via candidate's active membership)
      this.addSql(this.relinkSql(t, category, `
        LOWER(TRIM(COALESCE(cand_m.business_name, ''))) = LOWER(TRIM(l2.business_name))
      `));
      // Strategy 3: profile first_name match
      this.addSql(this.relinkSql(t, category, `
        LOWER(TRIM(COALESCE(cand.first_name, ''))) = LOWER(TRIM(l2.business_name))
      `));
      // Strategy 4: email slug contains business slug (only when slug ≥ 4 chars)
      this.addSql(this.relinkSql(t, category, `
        REGEXP_REPLACE(LOWER(cand.email), '[^a-z0-9]', '', 'g')
          LIKE '%' || REGEXP_REPLACE(LOWER(l2.business_name), '[^a-z0-9]', '', 'g') || '%'
        AND LENGTH(REGEXP_REPLACE(LOWER(l2.business_name), '[^a-z0-9]', '', 'g')) >= 4
      `));
    }
  }

  /**
   * Builds an UPDATE statement that:
   *   - finds listings still owned by a protected super-admin (PROTECTED_MECA_IDS)
   *   - for each, finds eligible candidate profiles (active paid membership of
   *     the matching category) that satisfy `matchCondition`
   *   - applies the update only when there's *exactly one* candidate, so
   *     ambiguous matches don't get a wrong assignment
   */
  private relinkSql(table: string, category: 'retail' | 'manufacturer', matchCondition: string): string {
    // The subquery aliases the same table as `l2` and joins each candidate
    // profile via their active matching-category membership. The HAVING
    // clause requires exactly one match — ambiguous matches are skipped.
    return `
      UPDATE "public"."${table}" l
      SET user_id = sub.match_id, updated_at = now()
      FROM (
        SELECT l2.id AS listing_id, MIN(cand.id::text)::uuid AS match_id
        FROM "public"."${table}" l2
        JOIN profiles owner ON owner.id = l2.user_id AND owner.meca_id IN (202401, 700947)
        JOIN profiles cand ON cand.id <> owner.id
        JOIN memberships cand_m ON cand_m.user_id = cand.id
                               AND cand_m.payment_status = 'paid'
                               AND cand_m.cancelled_at IS NULL
                               AND (cand_m.end_date IS NULL OR cand_m.end_date >= CURRENT_DATE)
        JOIN membership_type_configs cand_mtc ON cand_mtc.id = cand_m.membership_type_config_id
                                              AND cand_mtc.category = '${category}'
        WHERE ${matchCondition}
        GROUP BY l2.id
        HAVING COUNT(DISTINCT cand.id) = 1
      ) sub
      WHERE l.id = sub.listing_id
        AND EXISTS (
          SELECT 1 FROM profiles owner2
          WHERE owner2.id = l.user_id AND owner2.meca_id IN (202401, 700947)
        );
    `;
  }

  async down(): Promise<void> {
    // Reversing data migrations like this isn't safe — once listings are
    // relinked to their real owners, we can't reliably know which super-admin
    // they came from. Manual rollback required if ever needed.
  }
}
