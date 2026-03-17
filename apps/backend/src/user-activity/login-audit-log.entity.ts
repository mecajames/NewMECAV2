import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'login_audit_log', schema: 'public' })
export class LoginAuditLog {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  email!: string;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'user_id' })
  user?: Profile;

  @Property({ type: 'text' })
  action!: string; // 'login' | 'logout' | 'failed_attempt'

  @Property({ type: 'uuid', nullable: true, fieldName: 'session_id' })
  session_id?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'logout_reason' })
  logout_reason?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'ip_address' })
  ip_address?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'user_agent' })
  user_agent?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'error_message' })
  error_message?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', nullable: true })
  created_at?: Date = new Date();
}
