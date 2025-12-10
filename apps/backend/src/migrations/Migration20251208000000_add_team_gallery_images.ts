import { Migration } from '@mikro-orm/migrations';

export class Migration20251208000000_add_team_gallery_images extends Migration {
  async up(): Promise<void> {
    // Add gallery_images column to teams table (JSONB array for storing image URLs)
    this.addSql(`
      ALTER TABLE public.teams
      ADD COLUMN IF NOT EXISTS gallery_images jsonb DEFAULT '[]'::jsonb;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE public.teams
      DROP COLUMN IF EXISTS gallery_images;
    `);
  }
}
