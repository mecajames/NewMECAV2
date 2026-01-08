import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { ContactStatus } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'contact_submissions', schema: 'public' })
export class ContactSubmission {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'varchar', length: 100 })
  name!: string;

  @Property({ type: 'varchar', length: 255 })
  email!: string;

  @Property({ type: 'varchar', length: 200 })
  subject!: string;

  @Property({ type: 'text' })
  message!: string;

  @Enum({ items: () => ContactStatus, default: ContactStatus.PENDING })
  status: ContactStatus = ContactStatus.PENDING;

  @Property({ type: 'varchar', length: 45, nullable: true, fieldName: 'ip_address' })
  ipAddress?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'user_agent' })
  userAgent?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamp', nullable: true, fieldName: 'replied_at' })
  repliedAt?: Date;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'replied_by' })
  repliedBy?: Profile;

  @Property({ type: 'text', nullable: true, fieldName: 'admin_notes' })
  adminNotes?: string;
}
