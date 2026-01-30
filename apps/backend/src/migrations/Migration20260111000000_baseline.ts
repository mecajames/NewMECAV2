import { Migration } from '@mikro-orm/migrations';

/**
 * Baseline Migration - January 21, 2026
 *
 * This migration represents the complete database schema state after:
 * - V1 to V2 data migration from production
 * - All schema updates applied during development
 *
 * The database schema already exists - this migration marks the starting point
 * for all future schema changes.
 *
 * DO NOT MODIFY THIS FILE.
 * All future schema changes should be created as new migrations.
 */
export class Migration20260111000000_baseline extends Migration {

  override async up(): Promise<void> {
    // Empty - schema already exists
    // This migration marks the baseline for future changes
  }

  override async down(): Promise<void> {
    // Cannot rollback the baseline - this is the starting point
    throw new Error('Cannot rollback baseline migration - this is the starting point');
  }

}
