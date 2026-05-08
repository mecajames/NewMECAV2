import { Migration } from '@mikro-orm/migrations';

/**
 * Membership comps — admin-granted free periods, free-secondary slots, and
 * renewal discounts attached to a specific membership row.
 *
 * Conceptually parallel to coupons (one-time discount at checkout) but
 * scoped to a specific member/membership and stateful across renewals.
 *
 *  comp_type:
 *    free_period          — value = months free; ends_at = grant + value months
 *                           (or NULL = indefinite). Renewal is skipped during
 *                           the period; a $0 invoice is still generated each
 *                           cycle for audit/reporting.
 *    free_secondary_slots — value = number of free secondary memberships the
 *                           member can add under this master. uses_remaining
 *                           tracks claims. ends_at = deadline to claim, NULL
 *                           = until-revoked.
 *    renewal_discount_pct — value = percent off (e.g. 25). max_uses bounds
 *                           how many renewals it applies to (1 = "next
 *                           renewal only"). When two discount comps are
 *                           active for the same renewal, the one with the
 *                           higher dollar impact wins (only one applies).
 *    renewal_discount_fixed — value = $ off. Same uses model.
 *
 * Granting a comp on a Forever Member is blocked at the service layer
 * because that membership has no renewal cycle.
 */
export class Migration20260508000000_membership_comps extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TYPE membership_comp_type AS ENUM (
        'free_period',
        'free_secondary_slots',
        'renewal_discount_pct',
        'renewal_discount_fixed'
      );
    `);

    this.addSql(`
      CREATE TYPE membership_comp_status AS ENUM (
        'active',
        'expired_unused',
        'consumed',
        'revoked'
      );
    `);

    this.addSql(`
      CREATE TABLE membership_comps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
        comp_type membership_comp_type NOT NULL,
        value numeric(10,2) NOT NULL,
        starts_at timestamptz NOT NULL DEFAULT now(),
        ends_at timestamptz NULL,
        max_uses int NULL,
        uses_remaining int NULL,
        status membership_comp_status NOT NULL DEFAULT 'active',
        granted_by_admin_id uuid NULL REFERENCES profiles(id),
        granted_at timestamptz NOT NULL DEFAULT now(),
        revoked_by_admin_id uuid NULL REFERENCES profiles(id),
        revoked_at timestamptz NULL,
        reason text NULL,
        notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    this.addSql(`CREATE INDEX membership_comps_membership_id_idx ON membership_comps(membership_id);`);
    this.addSql(`CREATE INDEX membership_comps_active_idx ON membership_comps(status) WHERE status='active';`);
    this.addSql(`CREATE INDEX membership_comps_ends_at_idx ON membership_comps(ends_at) WHERE status='active' AND ends_at IS NOT NULL;`);
    this.addSql(`CREATE INDEX membership_comps_active_type_idx ON membership_comps(membership_id, comp_type) WHERE status='active';`);

    // Optional fields on membership_type_configs so a type can ship default
    // comps automatically when purchased (e.g. "Master gives 2 free
    // secondary slots for 12 months").
    this.addSql(`
      ALTER TABLE membership_type_configs
        ADD COLUMN IF NOT EXISTS default_free_secondary_slots integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS default_secondary_free_duration_months integer NOT NULL DEFAULT 0;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE membership_type_configs
        DROP COLUMN IF EXISTS default_free_secondary_slots,
        DROP COLUMN IF EXISTS default_secondary_free_duration_months;
    `);
    this.addSql(`DROP TABLE IF EXISTS membership_comps;`);
    this.addSql(`DROP TYPE IF EXISTS membership_comp_status;`);
    this.addSql(`DROP TYPE IF EXISTS membership_comp_type;`);
  }
}
