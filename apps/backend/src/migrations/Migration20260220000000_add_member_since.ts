import { Migration } from '@mikro-orm/migrations';

export class Migration20260220000000_add_member_since extends Migration {

  override async up(): Promise<void> {
    // Step 1: Add the member_since column
    this.addSql(`alter table "profiles" add column if not exists "member_since" timestamptz null;`);

    // Step 2: Backfill from earliest V2 membership start_date per user
    this.addSql(`
      UPDATE profiles p
      SET member_since = sub.earliest_start
      FROM (
        SELECT user_id, MIN(start_date) AS earliest_start
        FROM memberships
        WHERE start_date IS NOT NULL
        GROUP BY user_id
      ) sub
      WHERE p.id = sub.user_id
        AND p.member_since IS NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "profiles" drop column if exists "member_since";`);
  }
}
