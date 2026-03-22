import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'score_sheet_templates', schema: 'public' })
export class ScoreSheetTemplate {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', unique: true, fieldName: 'template_key' })
  templateKey!: string;

  @Property({ type: 'text', fieldName: 'display_name' })
  displayName!: string;

  @Property({ type: 'bytea', fieldName: 'image_data' })
  imageData!: Buffer;

  @Property({ type: 'jsonb', fieldName: 'coords' })
  coords!: Record<string, any>;

  @Property({ type: 'timestamptz', fieldName: 'created_at', onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
