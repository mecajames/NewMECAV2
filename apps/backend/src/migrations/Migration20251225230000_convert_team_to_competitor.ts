import { Migration } from '@mikro-orm/migrations';

/**
 * Migration to convert standalone TEAM memberships to COMPETITOR + Team Add-on.
 *
 * This changes:
 * 1. All membership_type_configs with category='team' to category='competitor'
 * 2. All memberships using those configs get has_team_addon=true
 * 3. Ensures team functionality is preserved through the hasTeamAddon flag
 */
export class Migration20251225230000_convert_team_to_competitor extends Migration {

  override async up(): Promise<void> {
    // Step 1: Set has_team_addon=true for all memberships that reference a TEAM category config
    this.addSql(`
      UPDATE memberships m
      SET has_team_addon = true
      FROM membership_type_configs mtc
      WHERE m.membership_type_config_id = mtc.id
        AND mtc.category = 'team';
    `);

    // Step 2: Update all TEAM category configs to COMPETITOR
    this.addSql(`
      UPDATE membership_type_configs
      SET category = 'competitor'
      WHERE category = 'team';
    `);

    // Log the conversion for reference
    this.addSql(`
      DO $$
      DECLARE
        configs_updated INTEGER;
        memberships_updated INTEGER;
      BEGIN
        SELECT COUNT(*) INTO configs_updated FROM membership_type_configs WHERE category = 'competitor';
        SELECT COUNT(*) INTO memberships_updated FROM memberships WHERE has_team_addon = true;
        RAISE NOTICE 'Converted TEAM configs to COMPETITOR. Total COMPETITOR configs: %, Memberships with team addon: %', configs_updated, memberships_updated;
      END $$;
    `);
  }

  override async down(): Promise<void> {
    // Note: This is a best-effort rollback. We can't perfectly reverse this
    // because we don't know which configs were originally TEAM vs COMPETITOR.
    // The rollback will revert configs that were recently converted (within this session)
    // but won't restore the exact original state if run later.

    this.addSql(`
      -- Rollback: Convert configs that have the word "Team" in their name back to team category
      UPDATE membership_type_configs
      SET category = 'team'
      WHERE category = 'competitor'
        AND (name ILIKE '%team%' OR description ILIKE '%team only%');
    `);

    this.addSql(`
      -- Rollback: Remove has_team_addon flag from memberships using team configs
      UPDATE memberships m
      SET has_team_addon = false
      FROM membership_type_configs mtc
      WHERE m.membership_type_config_id = mtc.id
        AND mtc.category = 'team';
    `);
  }
}
