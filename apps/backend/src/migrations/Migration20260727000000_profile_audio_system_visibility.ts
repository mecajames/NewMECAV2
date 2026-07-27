import { Migration } from '@mikro-orm/migrations';

/**
 * Structured audio system + per-section visibility (James, 2026-07-27).
 *
 * - profiles.audio_system (jsonb): structured car-audio components (source
 *   unit, amplifiers, subwoofers, speakers, sound deadening, signal
 *   processing, power wire, batteries, other, description). Replaces the
 *   legacy free-text car_audio_system, which is kept as a display fallback.
 * - profiles.vehicle_public: member opted in to showing their membership's
 *   vehicle (make/model/color — NEVER the license plate) on their public
 *   member profile. Default private.
 * - profiles.audio_system_public: same opt-in for the audio system. Default
 *   private.
 */
export class Migration20260727000000_profile_audio_system_visibility extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS audio_system jsonb;`);
    this.addSql(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_public boolean NOT NULL DEFAULT false;`);
    this.addSql(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS audio_system_public boolean NOT NULL DEFAULT false;`);
    this.addSql(`COMMENT ON COLUMN profiles.audio_system IS 'Structured car-audio components (AudioSystemSchema in @newmeca/shared); car_audio_system is the legacy free-text fallback.';`);
    this.addSql(`COMMENT ON COLUMN profiles.vehicle_public IS 'Member opt-in: show vehicle make/model/color (never plate) on the public member profile.';`);
    this.addSql(`COMMENT ON COLUMN profiles.audio_system_public IS 'Member opt-in: show the audio system on the public member profile.';`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE profiles DROP COLUMN IF EXISTS audio_system;`);
    this.addSql(`ALTER TABLE profiles DROP COLUMN IF EXISTS vehicle_public;`);
    this.addSql(`ALTER TABLE profiles DROP COLUMN IF EXISTS audio_system_public;`);
  }
}
