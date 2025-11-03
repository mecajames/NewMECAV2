import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'site_settings', schema: 'public' })
export class SiteSettings {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', unique: true, fieldName: 'setting_key' })
  setting_key!: string;

  @Property({ type: 'text', fieldName: 'setting_value' })
  setting_value!: string;

  @Property({ type: 'text', fieldName: 'setting_type' })
  setting_type!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'updated_by' })
  updated_by?: string;

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onCreate: () => new Date(), onUpdate: () => new Date() })
  updated_at: Date = new Date();
}
