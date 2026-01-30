import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'achievement_templates', schema: 'public' })
export class AchievementTemplate {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'varchar', length: 100, unique: true })
  key!: string;

  @Property({ type: 'varchar', length: 255 })
  name!: string;

  @Property({ type: 'varchar', length: 500, fieldName: 'base_image_path', serializedName: 'base_image_path' })
  baseImagePath!: string;

  @Property({ type: 'integer', fieldName: 'font_size', serializedName: 'font_size', default: 500 })
  fontSize: number = 500;

  @Property({ type: 'integer', fieldName: 'text_x', serializedName: 'text_x' })
  textX!: number;

  @Property({ type: 'integer', fieldName: 'text_y', serializedName: 'text_y' })
  textY!: number;

  @Property({ type: 'varchar', length: 20, fieldName: 'text_color', serializedName: 'text_color', default: '#CC0F00' })
  textColor: string = '#CC0F00';

  @Property({ type: 'boolean', fieldName: 'is_active', serializedName: 'is_active', default: true })
  isActive: boolean = true;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
