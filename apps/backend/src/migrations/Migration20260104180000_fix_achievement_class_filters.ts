import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Fix Achievement Definitions with FULL CLASS NAMES
 *
 * The database stores full class names like "Modified 4", "Park And Pound 1", etc.
 * NOT short codes like "M4", "DB1", etc.
 *
 * Based on actual competition_results in database:
 * - Certified at the Headrest: Modified 1-5, Modified Street 1-4, Street 1-5, Trunk 1-2 | 125-180 dB
 * - Certified Sound: Modified Install, Stock Install (SQL format) | 65-95 pts
 * - Park and Pound: Park And Pound 1-5 | 110-180 dB
 * - Radical X: Radical X, Radical X Modified 1-2, Radical X Mod Street, Radical X Street/Trunk 1-2, X Modified 1 | 140-180 dB
 */
export class Migration20260104180000 extends Migration {
  async up(): Promise<void> {
    // Clear all existing data
    this.addSql(`DELETE FROM "achievement_recipients" WHERE true;`);
    this.addSql(`DELETE FROM "achievement_definitions" WHERE true;`);

    // =============================================================================
    // Certified at the Headrest - dB Clubs (125-180 dB in 5 dB increments)
    // Classes: Modified 1-5, Modified Street 1-4, Street 1-5, Trunk 1-2
    // =============================================================================
    const cathClasses = `'{Modified 1,Modified 2,Modified 3,Modified 4,Modified 5,Modified Street 1,Modified Street 2,Modified Street 3,Modified Street 4,Street 1,Street 2,Street 3,Street 4,Street 5,Trunk 1,Trunk 2}'`;
    const cathThresholds = [125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180];

    for (let i = 0; i < cathThresholds.length; i++) {
      const t = cathThresholds[i];
      this.addSql(`
        INSERT INTO "achievement_definitions"
          ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "class_filter", "display_order")
        VALUES
          ('${t}+dB Club', 'Achieved ${t}+ dB in Certified at the Headrest competition', 'Certified at the Headrest', 'dynamic', 'certified-at-the-headrest.v1', ${t}, 'SPL', 'Certified at the Headrest', 'score', ${t}.00, '>=', ${cathClasses}, ${100 + i});
      `);
    }

    // =============================================================================
    // Certified Sound - Points Clubs (65-95 in 5 point increments)
    // Classes: Modified Install, Stock Install (SQL format)
    // =============================================================================
    const csClasses = `'{Modified Install,Stock Install}'`;
    const csThresholds = [65, 70, 75, 80, 85, 90, 95];

    for (let i = 0; i < csThresholds.length; i++) {
      const t = csThresholds[i];
      this.addSql(`
        INSERT INTO "achievement_definitions"
          ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "class_filter", "display_order")
        VALUES
          ('${t}+ Points Club', 'Achieved ${t}+ Points in Certified Sound competition', 'Certified Sound', 'dynamic', 'certified-sound.v1', ${t}, 'SQL', 'Certified Sound', 'score', ${t}.00, '>=', ${csClasses}, ${200 + i});
      `);
    }

    // =============================================================================
    // Park and Pound - dB Clubs (110-180 dB in 5 dB increments)
    // Classes: Park And Pound 1-5
    // =============================================================================
    const ppClasses = `'{Park And Pound 1,Park And Pound 2,Park And Pound 3,Park And Pound 4,Park And Pound 5}'`;
    const ppThresholds = [110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180];

    for (let i = 0; i < ppThresholds.length; i++) {
      const t = ppThresholds[i];
      this.addSql(`
        INSERT INTO "achievement_definitions"
          ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "class_filter", "display_order")
        VALUES
          ('${t}+dB Club', 'Achieved ${t}+ dB in Park and Pound competition', 'Park and Pound', 'dynamic', 'park-pound.v1', ${t}, 'SPL', 'Park and Pound', 'score', ${t}.00, '>=', ${ppClasses}, ${300 + i});
      `);
    }

    // =============================================================================
    // Radical X - dB Clubs (140-180 dB in 5 dB increments)
    // Classes: Radical X, Radical X Modified 1-2, Radical X Mod Street, Radical X Street/Trunk 1-2, X Modified 1, Extreme
    // =============================================================================
    const rxClasses = `'{Radical X,Radical X Modified 1,Radical X Modified 2,Radical X Mod Street,Radical X Street/Trunk 1,Radical X Street/Trunk 2,X Modified 1,Extreme}'`;
    const rxThresholds = [140, 145, 150, 155, 160, 165, 170, 175, 180];

    for (let i = 0; i < rxThresholds.length; i++) {
      const t = rxThresholds[i];
      this.addSql(`
        INSERT INTO "achievement_definitions"
          ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "class_filter", "display_order")
        VALUES
          ('${t}+dB Club', 'Achieved ${t}+ dB in Radical X competition', 'Radical X', 'dynamic', 'radicalx.v1', ${t}, 'SPL', 'Radical X', 'score', ${t}.00, '>=', ${rxClasses}, ${400 + i});
      `);
    }

    // Note: Dueling Demos classes not present in current competition_results data
    // Will add when data is available
  }

  async down(): Promise<void> {
    this.addSql(`DELETE FROM "achievement_recipients" WHERE true;`);
    this.addSql(`DELETE FROM "achievement_definitions" WHERE true;`);
  }
}
