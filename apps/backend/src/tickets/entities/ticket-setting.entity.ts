import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'ticket_settings', schema: 'public' })
export class TicketSetting {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'varchar', length: 100, unique: true, fieldName: 'setting_key', serializedName: 'setting_key' })
  settingKey!: string;

  @Property({ type: 'text', fieldName: 'setting_value', serializedName: 'setting_value' })
  settingValue!: string;

  @Property({ type: 'varchar', length: 20, fieldName: 'setting_type', serializedName: 'setting_type', default: 'string' })
  settingType: string = 'string'; // 'string', 'number', 'boolean', 'json'

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
