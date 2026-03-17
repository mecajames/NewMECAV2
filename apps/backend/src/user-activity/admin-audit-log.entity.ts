import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'admin_audit_log', schema: 'public' })
export class AdminAuditLog {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'admin_user_id' })
  adminUser!: Profile;

  @Property({ type: 'text' })
  action!: string;

  @Property({ type: 'text', fieldName: 'resource_type' })
  resource_type!: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'resource_id' })
  resource_id?: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'jsonb', nullable: true, fieldName: 'old_values' })
  old_values?: Record<string, any>;

  @Property({ type: 'jsonb', nullable: true, fieldName: 'new_values' })
  new_values?: Record<string, any>;

  @Property({ type: 'text', nullable: true, fieldName: 'ip_address' })
  ip_address?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', nullable: true })
  created_at?: Date = new Date();
}
