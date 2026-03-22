import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'score_sheet_config', schema: 'public' })
export class ScoreSheetConfig {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', unique: true, fieldName: 'config_key' })
  configKey!: string;

  @Property({ type: 'jsonb', fieldName: 'config_value' })
  configValue!: Record<string, any>;

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
