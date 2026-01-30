import { Entity, PrimaryKey, Property, Enum, Collection, OneToMany } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import {
  AchievementMetricType,
  AchievementType,
  ThresholdOperator,
  AchievementFormat,
} from '@newmeca/shared';

@Entity({ tableName: 'achievement_definitions', schema: 'public' })
export class AchievementDefinition {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'varchar', length: 255 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'varchar', length: 100, nullable: true, fieldName: 'group_name', serializedName: 'group_name' })
  groupName?: string;

  @Enum({ items: () => AchievementType, fieldName: 'achievement_type', serializedName: 'achievement_type', default: AchievementType.DYNAMIC })
  achievementType: AchievementType = AchievementType.DYNAMIC;

  @Property({ type: 'varchar', length: 100, fieldName: 'template_key', serializedName: 'template_key' })
  templateKey!: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'render_value', serializedName: 'render_value' })
  renderValue?: number;

  @Enum({ items: () => AchievementFormat, nullable: true })
  format?: AchievementFormat;

  @Property({ type: 'varchar', length: 100, fieldName: 'competition_type', serializedName: 'competition_type' })
  competitionType!: string;

  @Enum({ items: () => AchievementMetricType, fieldName: 'metric_type', serializedName: 'metric_type' })
  metricType!: AchievementMetricType;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'threshold_value', serializedName: 'threshold_value' })
  thresholdValue!: number;

  @Enum({ items: () => ThresholdOperator, fieldName: 'threshold_operator', serializedName: 'threshold_operator', default: ThresholdOperator.GREATER_THAN_OR_EQUAL })
  thresholdOperator: ThresholdOperator = ThresholdOperator.GREATER_THAN_OR_EQUAL;

  @Property({ type: 'text[]', nullable: true, fieldName: 'class_filter', serializedName: 'class_filter' })
  classFilter?: string[];

  @Property({ type: 'text[]', nullable: true, fieldName: 'division_filter', serializedName: 'division_filter' })
  divisionFilter?: string[];

  @Property({ type: 'integer', nullable: true, fieldName: 'points_multiplier', serializedName: 'points_multiplier' })
  pointsMultiplier?: number;

  @Property({ type: 'boolean', fieldName: 'is_active', serializedName: 'is_active', default: true })
  isActive: boolean = true;

  @Property({ type: 'integer', fieldName: 'display_order', serializedName: 'display_order', default: 0 })
  displayOrder: number = 0;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();

  // Relationship to recipients (lazy loaded)
  @OneToMany('AchievementRecipient', 'achievement')
  recipients = new Collection<import('./achievement-recipient.entity').AchievementRecipient>(this);
}
