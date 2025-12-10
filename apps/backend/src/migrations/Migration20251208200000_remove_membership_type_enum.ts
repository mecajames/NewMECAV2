import { Migration } from '@mikro-orm/migrations';

export class Migration20251208200000_remove_membership_type_enum extends Migration {

  async up(): Promise<void> {
    // First, make sure all memberships have a membership_type_config_id
    // For any that don't, we'll need to set them based on their current membership_type

    // Update any memberships that might be missing membership_type_config_id
    // Map old types to new config IDs:
    // domestic/annual/lifetime/international -> Competitor Membership (854d992c-4f6f-452b-8f81-649eb10425f0)
    // team -> Team Membership (65f8b5f4-14e8-4e21-b265-256fdc8f7b7e)
    // retailer -> Retailer Membership (9ad7c4ee-f3d8-45f5-94c2-5259d032314b)

    this.addSql(`
      UPDATE memberships
      SET membership_type_config_id = '854d992c-4f6f-452b-8f81-649eb10425f0'
      WHERE membership_type_config_id IS NULL
        AND membership_type IN ('domestic', 'annual', 'lifetime', 'international');
    `);

    this.addSql(`
      UPDATE memberships
      SET membership_type_config_id = '65f8b5f4-14e8-4e21-b265-256fdc8f7b7e'
      WHERE membership_type_config_id IS NULL
        AND membership_type = 'team';
    `);

    this.addSql(`
      UPDATE memberships
      SET membership_type_config_id = '9ad7c4ee-f3d8-45f5-94c2-5259d032314b'
      WHERE membership_type_config_id IS NULL
        AND membership_type = 'retailer';
    `);

    // Drop the membership_type column
    this.addSql('ALTER TABLE "memberships" DROP COLUMN IF EXISTS "membership_type";');

    // Make membership_type_config_id NOT NULL now that it's the primary identifier
    this.addSql('ALTER TABLE "memberships" ALTER COLUMN "membership_type_config_id" SET NOT NULL;');

    // Drop the membership_type enum type
    this.addSql('DROP TYPE IF EXISTS "membership_type";');
  }

  async down(): Promise<void> {
    // Recreate the enum type
    this.addSql(`
      CREATE TYPE "membership_type" AS ENUM (
        'domestic', 'international', 'team', 'retailer', 'annual', 'lifetime'
      );
    `);

    // Make membership_type_config_id nullable again
    this.addSql('ALTER TABLE "memberships" ALTER COLUMN "membership_type_config_id" DROP NOT NULL;');

    // Add back the membership_type column
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN "membership_type" "membership_type" NOT NULL DEFAULT 'domestic';
    `);

    // Restore membership_type values based on membership_type_config_id category
    this.addSql(`
      UPDATE memberships m
      SET membership_type = CASE
        WHEN mtc.category = 'competitor' THEN 'domestic'::membership_type
        WHEN mtc.category = 'team' THEN 'team'::membership_type
        WHEN mtc.category = 'retail' THEN 'retailer'::membership_type
        ELSE 'domestic'::membership_type
      END
      FROM membership_type_configs mtc
      WHERE m.membership_type_config_id = mtc.id;
    `);
  }
}
