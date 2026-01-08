import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Seed Full Achievement Definitions
 *
 * Populates all achievement definitions matching the legacy system:
 * - Certified at the Headrest: 125-180 dB (5 dB increments)
 * - Certified Sound: 65-95 Points (5 point increments)
 * - Dueling Demos: 65-95 Points (5 point increments)
 * - Dueling Demos - Certified 360 Sound: 65-95 Points (5 point increments)
 * - Park and Pound: 125-180 dB (5 dB increments)
 * - Radical X: 125-180 dB (5 dB increments)
 */
export class Migration20260104160000 extends Migration {
  async up(): Promise<void> {
    // First, delete existing achievement definitions to replace with full set
    // (keeping recipients intact)
    this.addSql(`DELETE FROM "achievement_definitions" WHERE true;`);

    // =============================================================================
    // Certified at the Headrest - dB Clubs (125-180 dB in 5 dB increments)
    // Template: certified-at-the-headrest.v1 (v1.cath.png)
    // =============================================================================
    this.addSql(`
      INSERT INTO "achievement_definitions"
        ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "display_order")
      VALUES
        ('Certified at the Headrest - 125+dB Club', 'Achieved 125+ dB in Certified at the Headrest competition', 'dB Clubs', 'dynamic', 'certified-at-the-headrest.v1', 125, 'SPL', 'Certified at the Headrest', 'score', 125.00, '>=', 100),
        ('Certified at the Headrest - 130+dB Club', 'Achieved 130+ dB in Certified at the Headrest competition', 'dB Clubs', 'dynamic', 'certified-at-the-headrest.v1', 130, 'SPL', 'Certified at the Headrest', 'score', 130.00, '>=', 101),
        ('Certified at the Headrest - 135+dB Club', 'Achieved 135+ dB in Certified at the Headrest competition', 'dB Clubs', 'dynamic', 'certified-at-the-headrest.v1', 135, 'SPL', 'Certified at the Headrest', 'score', 135.00, '>=', 102),
        ('Certified at the Headrest - 140+dB Club', 'Achieved 140+ dB in Certified at the Headrest competition', 'dB Clubs', 'dynamic', 'certified-at-the-headrest.v1', 140, 'SPL', 'Certified at the Headrest', 'score', 140.00, '>=', 103),
        ('Certified at the Headrest - 145+dB Club', 'Achieved 145+ dB in Certified at the Headrest competition', 'dB Clubs', 'dynamic', 'certified-at-the-headrest.v1', 145, 'SPL', 'Certified at the Headrest', 'score', 145.00, '>=', 104),
        ('Certified at the Headrest - 150+dB Club', 'Achieved 150+ dB in Certified at the Headrest competition', 'dB Clubs', 'dynamic', 'certified-at-the-headrest.v1', 150, 'SPL', 'Certified at the Headrest', 'score', 150.00, '>=', 105),
        ('Certified at the Headrest - 155+dB Club', 'Achieved 155+ dB in Certified at the Headrest competition', 'dB Clubs', 'dynamic', 'certified-at-the-headrest.v1', 155, 'SPL', 'Certified at the Headrest', 'score', 155.00, '>=', 106),
        ('Certified at the Headrest - 160+dB Club', 'Achieved 160+ dB in Certified at the Headrest competition', 'dB Clubs', 'dynamic', 'certified-at-the-headrest.v1', 160, 'SPL', 'Certified at the Headrest', 'score', 160.00, '>=', 107),
        ('Certified at the Headrest - 165+dB Club', 'Achieved 165+ dB in Certified at the Headrest competition', 'dB Clubs', 'dynamic', 'certified-at-the-headrest.v1', 165, 'SPL', 'Certified at the Headrest', 'score', 165.00, '>=', 108),
        ('Certified at the Headrest - 170+dB Club', 'Achieved 170+ dB in Certified at the Headrest competition', 'dB Clubs', 'dynamic', 'certified-at-the-headrest.v1', 170, 'SPL', 'Certified at the Headrest', 'score', 170.00, '>=', 109),
        ('Certified at the Headrest - 175+dB Club', 'Achieved 175+ dB in Certified at the Headrest competition', 'dB Clubs', 'dynamic', 'certified-at-the-headrest.v1', 175, 'SPL', 'Certified at the Headrest', 'score', 175.00, '>=', 110),
        ('Certified at the Headrest - 180+dB Club', 'Achieved 180+ dB in Certified at the Headrest competition', 'dB Clubs', 'dynamic', 'certified-at-the-headrest.v1', 180, 'SPL', 'Certified at the Headrest', 'score', 180.00, '>=', 111);
    `);

    // =============================================================================
    // Certified Sound - Points Clubs (65-95 points in 5 point increments)
    // Template: certified-sound.v1 (v1.cs.png)
    // =============================================================================
    this.addSql(`
      INSERT INTO "achievement_definitions"
        ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "display_order")
      VALUES
        ('Certified Sound - 65+ Points Club', 'Achieved 65+ Points in Certified Sound competition', 'Points Clubs', 'dynamic', 'certified-sound.v1', 65, 'SQL', 'Certified Sound', 'points', 65.00, '>=', 200),
        ('Certified Sound - 70+ Points Club', 'Achieved 70+ Points in Certified Sound competition', 'Points Clubs', 'dynamic', 'certified-sound.v1', 70, 'SQL', 'Certified Sound', 'points', 70.00, '>=', 201),
        ('Certified Sound - 75+ Points Club', 'Achieved 75+ Points in Certified Sound competition', 'Points Clubs', 'dynamic', 'certified-sound.v1', 75, 'SQL', 'Certified Sound', 'points', 75.00, '>=', 202),
        ('Certified Sound - 80+ Points Club', 'Achieved 80+ Points in Certified Sound competition', 'Points Clubs', 'dynamic', 'certified-sound.v1', 80, 'SQL', 'Certified Sound', 'points', 80.00, '>=', 203),
        ('Certified Sound - 85+ Points Club', 'Achieved 85+ Points in Certified Sound competition', 'Points Clubs', 'dynamic', 'certified-sound.v1', 85, 'SQL', 'Certified Sound', 'points', 85.00, '>=', 204),
        ('Certified Sound - 90+ Points Club', 'Achieved 90+ Points in Certified Sound competition', 'Points Clubs', 'dynamic', 'certified-sound.v1', 90, 'SQL', 'Certified Sound', 'points', 90.00, '>=', 205),
        ('Certified Sound - 95+ Points Club', 'Achieved 95+ Points in Certified Sound competition', 'Points Clubs', 'dynamic', 'certified-sound.v1', 95, 'SQL', 'Certified Sound', 'points', 95.00, '>=', 206);
    `);

    // =============================================================================
    // Dueling Demos - Points Clubs (65-95 points in 5 point increments)
    // Template: dueling-demos.v1 (v1.dd.png)
    // =============================================================================
    this.addSql(`
      INSERT INTO "achievement_definitions"
        ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "display_order")
      VALUES
        ('Dueling Demos - 65+ Points Club', 'Achieved 65+ Points in Dueling Demos competition', 'Points Clubs', 'dynamic', 'dueling-demos.v1', 65, 'SPL', 'Dueling Demos', 'points', 65.00, '>=', 300),
        ('Dueling Demos - 70+ Points Club', 'Achieved 70+ Points in Dueling Demos competition', 'Points Clubs', 'dynamic', 'dueling-demos.v1', 70, 'SPL', 'Dueling Demos', 'points', 70.00, '>=', 301),
        ('Dueling Demos - 75+ Points Club', 'Achieved 75+ Points in Dueling Demos competition', 'Points Clubs', 'dynamic', 'dueling-demos.v1', 75, 'SPL', 'Dueling Demos', 'points', 75.00, '>=', 302),
        ('Dueling Demos - 80+ Points Club', 'Achieved 80+ Points in Dueling Demos competition', 'Points Clubs', 'dynamic', 'dueling-demos.v1', 80, 'SPL', 'Dueling Demos', 'points', 80.00, '>=', 303),
        ('Dueling Demos - 85+ Points Club', 'Achieved 85+ Points in Dueling Demos competition', 'Points Clubs', 'dynamic', 'dueling-demos.v1', 85, 'SPL', 'Dueling Demos', 'points', 85.00, '>=', 304),
        ('Dueling Demos - 90+ Points Club', 'Achieved 90+ Points in Dueling Demos competition', 'Points Clubs', 'dynamic', 'dueling-demos.v1', 90, 'SPL', 'Dueling Demos', 'points', 90.00, '>=', 305),
        ('Dueling Demos - 95+ Points Club', 'Achieved 95+ Points in Dueling Demos competition', 'Points Clubs', 'dynamic', 'dueling-demos.v1', 95, 'SPL', 'Dueling Demos', 'points', 95.00, '>=', 306);
    `);

    // =============================================================================
    // Dueling Demos - Certified 360 Sound - Points Clubs (65-95 points)
    // Template: dueling-demos.certified-360-sound.v1 (v1.dd.c360s.png)
    // =============================================================================
    this.addSql(`
      INSERT INTO "achievement_definitions"
        ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "display_order")
      VALUES
        ('Dueling Demos - Certified 360 Sound - 65+ Points Club', 'Achieved 65+ Points in Dueling Demos Certified 360 Sound competition', 'Points Clubs', 'dynamic', 'dueling-demos.certified-360-sound.v1', 65, 'SPL', 'Dueling Demos - Certified 360 Sound', 'points', 65.00, '>=', 400),
        ('Dueling Demos - Certified 360 Sound - 70+ Points Club', 'Achieved 70+ Points in Dueling Demos Certified 360 Sound competition', 'Points Clubs', 'dynamic', 'dueling-demos.certified-360-sound.v1', 70, 'SPL', 'Dueling Demos - Certified 360 Sound', 'points', 70.00, '>=', 401),
        ('Dueling Demos - Certified 360 Sound - 75+ Points Club', 'Achieved 75+ Points in Dueling Demos Certified 360 Sound competition', 'Points Clubs', 'dynamic', 'dueling-demos.certified-360-sound.v1', 75, 'SPL', 'Dueling Demos - Certified 360 Sound', 'points', 75.00, '>=', 402),
        ('Dueling Demos - Certified 360 Sound - 80+ Points Club', 'Achieved 80+ Points in Dueling Demos Certified 360 Sound competition', 'Points Clubs', 'dynamic', 'dueling-demos.certified-360-sound.v1', 80, 'SPL', 'Dueling Demos - Certified 360 Sound', 'points', 80.00, '>=', 403),
        ('Dueling Demos - Certified 360 Sound - 85+ Points Club', 'Achieved 85+ Points in Dueling Demos Certified 360 Sound competition', 'Points Clubs', 'dynamic', 'dueling-demos.certified-360-sound.v1', 85, 'SPL', 'Dueling Demos - Certified 360 Sound', 'points', 85.00, '>=', 404),
        ('Dueling Demos - Certified 360 Sound - 90+ Points Club', 'Achieved 90+ Points in Dueling Demos Certified 360 Sound competition', 'Points Clubs', 'dynamic', 'dueling-demos.certified-360-sound.v1', 90, 'SPL', 'Dueling Demos - Certified 360 Sound', 'points', 90.00, '>=', 405),
        ('Dueling Demos - Certified 360 Sound - 95+ Points Club', 'Achieved 95+ Points in Dueling Demos Certified 360 Sound competition', 'Points Clubs', 'dynamic', 'dueling-demos.certified-360-sound.v1', 95, 'SPL', 'Dueling Demos - Certified 360 Sound', 'points', 95.00, '>=', 406);
    `);

    // =============================================================================
    // Park and Pound - dB Clubs (125-180 dB in 5 dB increments)
    // Template: park-pound.v1 (v1.pp.png)
    // =============================================================================
    this.addSql(`
      INSERT INTO "achievement_definitions"
        ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "display_order")
      VALUES
        ('Park and Pound - 125+dB Club', 'Achieved 125+ dB in Park and Pound competition', 'dB Clubs', 'dynamic', 'park-pound.v1', 125, 'SPL', 'Park and Pound', 'score', 125.00, '>=', 500),
        ('Park and Pound - 130+dB Club', 'Achieved 130+ dB in Park and Pound competition', 'dB Clubs', 'dynamic', 'park-pound.v1', 130, 'SPL', 'Park and Pound', 'score', 130.00, '>=', 501),
        ('Park and Pound - 135+dB Club', 'Achieved 135+ dB in Park and Pound competition', 'dB Clubs', 'dynamic', 'park-pound.v1', 135, 'SPL', 'Park and Pound', 'score', 135.00, '>=', 502),
        ('Park and Pound - 140+dB Club', 'Achieved 140+ dB in Park and Pound competition', 'dB Clubs', 'dynamic', 'park-pound.v1', 140, 'SPL', 'Park and Pound', 'score', 140.00, '>=', 503),
        ('Park and Pound - 145+dB Club', 'Achieved 145+ dB in Park and Pound competition', 'dB Clubs', 'dynamic', 'park-pound.v1', 145, 'SPL', 'Park and Pound', 'score', 145.00, '>=', 504),
        ('Park and Pound - 150+dB Club', 'Achieved 150+ dB in Park and Pound competition', 'dB Clubs', 'dynamic', 'park-pound.v1', 150, 'SPL', 'Park and Pound', 'score', 150.00, '>=', 505),
        ('Park and Pound - 155+dB Club', 'Achieved 155+ dB in Park and Pound competition', 'dB Clubs', 'dynamic', 'park-pound.v1', 155, 'SPL', 'Park and Pound', 'score', 155.00, '>=', 506),
        ('Park and Pound - 160+dB Club', 'Achieved 160+ dB in Park and Pound competition', 'dB Clubs', 'dynamic', 'park-pound.v1', 160, 'SPL', 'Park and Pound', 'score', 160.00, '>=', 507),
        ('Park and Pound - 165+dB Club', 'Achieved 165+ dB in Park and Pound competition', 'dB Clubs', 'dynamic', 'park-pound.v1', 165, 'SPL', 'Park and Pound', 'score', 165.00, '>=', 508),
        ('Park and Pound - 170+dB Club', 'Achieved 170+ dB in Park and Pound competition', 'dB Clubs', 'dynamic', 'park-pound.v1', 170, 'SPL', 'Park and Pound', 'score', 170.00, '>=', 509),
        ('Park and Pound - 175+dB Club', 'Achieved 175+ dB in Park and Pound competition', 'dB Clubs', 'dynamic', 'park-pound.v1', 175, 'SPL', 'Park and Pound', 'score', 175.00, '>=', 510),
        ('Park and Pound - 180+dB Club', 'Achieved 180+ dB in Park and Pound competition', 'dB Clubs', 'dynamic', 'park-pound.v1', 180, 'SPL', 'Park and Pound', 'score', 180.00, '>=', 511);
    `);

    // =============================================================================
    // Radical X - dB Clubs (125-180 dB in 5 dB increments)
    // Template: radicalx.v1 (v1.radx.png)
    // =============================================================================
    this.addSql(`
      INSERT INTO "achievement_definitions"
        ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "display_order")
      VALUES
        ('Radical X - 125+dB Club', 'Achieved 125+ dB in Radical X competition', 'dB Clubs', 'dynamic', 'radicalx.v1', 125, 'SPL', 'Radical X', 'score', 125.00, '>=', 600),
        ('Radical X - 130+dB Club', 'Achieved 130+ dB in Radical X competition', 'dB Clubs', 'dynamic', 'radicalx.v1', 130, 'SPL', 'Radical X', 'score', 130.00, '>=', 601),
        ('Radical X - 135+dB Club', 'Achieved 135+ dB in Radical X competition', 'dB Clubs', 'dynamic', 'radicalx.v1', 135, 'SPL', 'Radical X', 'score', 135.00, '>=', 602),
        ('Radical X - 140+dB Club', 'Achieved 140+ dB in Radical X competition', 'dB Clubs', 'dynamic', 'radicalx.v1', 140, 'SPL', 'Radical X', 'score', 140.00, '>=', 603),
        ('Radical X - 145+dB Club', 'Achieved 145+ dB in Radical X competition', 'dB Clubs', 'dynamic', 'radicalx.v1', 145, 'SPL', 'Radical X', 'score', 145.00, '>=', 604),
        ('Radical X - 150+dB Club', 'Achieved 150+ dB in Radical X competition', 'dB Clubs', 'dynamic', 'radicalx.v1', 150, 'SPL', 'Radical X', 'score', 150.00, '>=', 605),
        ('Radical X - 155+dB Club', 'Achieved 155+ dB in Radical X competition', 'dB Clubs', 'dynamic', 'radicalx.v1', 155, 'SPL', 'Radical X', 'score', 155.00, '>=', 606),
        ('Radical X - 160+dB Club', 'Achieved 160+ dB in Radical X competition', 'dB Clubs', 'dynamic', 'radicalx.v1', 160, 'SPL', 'Radical X', 'score', 160.00, '>=', 607),
        ('Radical X - 165+dB Club', 'Achieved 165+ dB in Radical X competition', 'dB Clubs', 'dynamic', 'radicalx.v1', 165, 'SPL', 'Radical X', 'score', 165.00, '>=', 608),
        ('Radical X - 170+dB Club', 'Achieved 170+ dB in Radical X competition', 'dB Clubs', 'dynamic', 'radicalx.v1', 170, 'SPL', 'Radical X', 'score', 170.00, '>=', 609),
        ('Radical X - 175+dB Club', 'Achieved 175+ dB in Radical X competition', 'dB Clubs', 'dynamic', 'radicalx.v1', 175, 'SPL', 'Radical X', 'score', 175.00, '>=', 610),
        ('Radical X - 180+dB Club', 'Achieved 180+ dB in Radical X competition', 'dB Clubs', 'dynamic', 'radicalx.v1', 180, 'SPL', 'Radical X', 'score', 180.00, '>=', 611);
    `);
  }

  async down(): Promise<void> {
    // Note: This will delete all achievement definitions
    // In production, you'd want a more careful rollback strategy
    this.addSql(`DELETE FROM "achievement_definitions" WHERE true;`);
  }
}
