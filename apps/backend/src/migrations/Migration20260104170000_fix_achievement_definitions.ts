import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Fix Achievement Definitions with correct class filters
 *
 * Based on legacy system configuration:
 * - Certified at the Headrest: classes M1,M2,M3,M4,M5,MS1,MS2,MS3,MS4,MCSP,S1,S2,S3,S4,S5,T1,T2 | 125-180 dB
 * - Certified Sound: classes XTR,MSTR,MODX,MOD,MS,MCCST,MCSTK,SQAS1,RTA,SQ2,SQ2P,STO,STR | 65-95 pts
 * - Dueling Demos: classes DDX,DDM,DDM2,DDMS,DDS,MCDD (no multiplier requirement) | 65-95 pts
 * - Dueling Demos - Certified 360 Sound: classes DDX,DDM,DDM2,DDMS,DDS,MCDD + multiplier >= 3 | 65-95 pts
 * - Park and Pound: classes DB1,DB2,DB3,DB4,DB5 | 110-180 dB (starts at 110!)
 * - Radical X: classes X,XM1,XM2,XMS,XS,XT | 140-180 dB (starts at 140!)
 */
export class Migration20260104170000 extends Migration {
  async up(): Promise<void> {
    // Clear all existing data
    this.addSql(`DELETE FROM "achievement_recipients" WHERE true;`);
    this.addSql(`DELETE FROM "achievement_definitions" WHERE true;`);

    // =============================================================================
    // Certified at the Headrest - dB Clubs (125-180 dB in 5 dB increments)
    // Classes: M1,M2,M3,M4,M5,MS1,MS2,MS3,MS4,MCSP,S1,S2,S3,S4,S5,T1,T2
    // =============================================================================
    const cathClasses = '{M1,M2,M3,M4,M5,MS1,MS2,MS3,MS4,MCSP,S1,S2,S3,S4,S5,T1,T2}';
    const cathThresholds = [125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180];

    for (let i = 0; i < cathThresholds.length; i++) {
      const t = cathThresholds[i];
      this.addSql(`
        INSERT INTO "achievement_definitions"
          ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "class_filter", "display_order")
        VALUES
          ('${t}+dB Club', 'Achieved ${t}+ dB in Certified at the Headrest competition', 'Certified at the Headrest', 'dynamic', 'certified-at-the-headrest.v1', ${t}, 'SPL', 'Certified at the Headrest', 'score', ${t}.00, '>=', '${cathClasses}', ${100 + i});
      `);
    }

    // =============================================================================
    // Certified Sound - Points Clubs (65-95 in 5 point increments)
    // Classes: XTR,MSTR,MODX,MOD,MS,MCCST,MCSTK,SQAS1,RTA,SQ2,SQ2P,STO,STR
    // =============================================================================
    const csClasses = '{XTR,MSTR,MODX,MOD,MS,MCCST,MCSTK,SQAS1,RTA,SQ2,SQ2P,STO,STR}';
    const csThresholds = [65, 70, 75, 80, 85, 90, 95];

    for (let i = 0; i < csThresholds.length; i++) {
      const t = csThresholds[i];
      this.addSql(`
        INSERT INTO "achievement_definitions"
          ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "class_filter", "display_order")
        VALUES
          ('${t}+ Points Club', 'Achieved ${t}+ Points in Certified Sound competition', 'Certified Sound', 'dynamic', 'certified-sound.v1', ${t}, 'SQL', 'Certified Sound', 'score', ${t}.00, '>=', '${csClasses}', ${200 + i});
      `);
    }

    // =============================================================================
    // Dueling Demos - Points Clubs (65-95 in 5 point increments)
    // Classes: DDX,DDM,DDM2,DDMS,DDS,MCDD (no multiplier requirement)
    // =============================================================================
    const ddClasses = '{DDX,DDM,DDM2,DDMS,DDS,MCDD}';
    const ddThresholds = [65, 70, 75, 80, 85, 90, 95];

    for (let i = 0; i < ddThresholds.length; i++) {
      const t = ddThresholds[i];
      this.addSql(`
        INSERT INTO "achievement_definitions"
          ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "class_filter", "display_order")
        VALUES
          ('${t}+ Points Club', 'Achieved ${t}+ Points in Dueling Demos competition', 'Dueling Demos', 'dynamic', 'dueling-demos.v1', ${t}, 'SPL', 'Dueling Demos', 'score', ${t}.00, '>=', '${ddClasses}', ${300 + i});
      `);
    }

    // =============================================================================
    // Dueling Demos - Certified 360 Sound - Points Clubs (65-95 in 5 point increments)
    // Classes: DDX,DDM,DDM2,DDMS,DDS,MCDD + multiplier >= 3
    // =============================================================================
    const dd360Classes = '{DDX,DDM,DDM2,DDMS,DDS,MCDD}';
    const dd360Thresholds = [65, 70, 75, 80, 85, 90, 95];

    for (let i = 0; i < dd360Thresholds.length; i++) {
      const t = dd360Thresholds[i];
      this.addSql(`
        INSERT INTO "achievement_definitions"
          ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "class_filter", "points_multiplier", "display_order")
        VALUES
          ('${t}+ Points Club', 'Achieved ${t}+ Points in Dueling Demos Certified 360 Sound competition', 'Dueling Demos - Certified 360 Sound', 'dynamic', 'dueling-demos.certified-360-sound.v1', ${t}, 'SPL', 'Dueling Demos - Certified 360 Sound', 'score', ${t}.00, '>=', '${dd360Classes}', 3, ${400 + i});
      `);
    }

    // =============================================================================
    // Park and Pound - dB Clubs (110-180 dB in 5 dB increments) - STARTS AT 110!
    // Classes: DB1,DB2,DB3,DB4,DB5
    // =============================================================================
    const ppClasses = '{DB1,DB2,DB3,DB4,DB5}';
    const ppThresholds = [110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180];

    for (let i = 0; i < ppThresholds.length; i++) {
      const t = ppThresholds[i];
      this.addSql(`
        INSERT INTO "achievement_definitions"
          ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "class_filter", "display_order")
        VALUES
          ('${t}+dB Club', 'Achieved ${t}+ dB in Park and Pound competition', 'Park and Pound', 'dynamic', 'park-pound.v1', ${t}, 'SPL', 'Park and Pound', 'score', ${t}.00, '>=', '${ppClasses}', ${500 + i});
      `);
    }

    // =============================================================================
    // Radical X - dB Clubs (140-180 dB in 5 dB increments) - STARTS AT 140!
    // Classes: X,XM1,XM2,XMS,XS,XT
    // =============================================================================
    const rxClasses = '{X,XM1,XM2,XMS,XS,XT}';
    const rxThresholds = [140, 145, 150, 155, 160, 165, 170, 175, 180];

    for (let i = 0; i < rxThresholds.length; i++) {
      const t = rxThresholds[i];
      this.addSql(`
        INSERT INTO "achievement_definitions"
          ("name", "description", "group_name", "achievement_type", "template_key", "render_value", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "class_filter", "display_order")
        VALUES
          ('${t}+dB Club', 'Achieved ${t}+ dB in Radical X competition', 'Radical X', 'dynamic', 'radicalx.v1', ${t}, 'SPL', 'Radical X', 'score', ${t}.00, '>=', '${rxClasses}', ${600 + i});
      `);
    }
  }

  async down(): Promise<void> {
    this.addSql(`DELETE FROM "achievement_recipients" WHERE true;`);
    this.addSql(`DELETE FROM "achievement_definitions" WHERE true;`);
  }
}
