import { Entity, PrimaryKey, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

/**
 * One row per (member, year) birthday-email attempt. The unique constraint
 * doubles as the once-per-year send claim (concurrent cron instances insert
 * with ON CONFLICT DO NOTHING — only the winner sends), and the rows power
 * the admin "sent / failed" indicators on the upcoming-birthdays list.
 */
@Entity({ tableName: 'birthday_email_log', schema: 'public' })
@Unique({ properties: ['profile', 'year'] })
export class BirthdayEmailLog {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'profile_id', serializedName: 'profile_id' })
  profile!: Profile;

  @Property({ type: 'integer' })
  year!: number;

  @Property({ type: 'text', nullable: true })
  email?: string;

  // 'pending' | 'sent' | 'failed'
  @Property({ type: 'text' })
  status: string = 'pending';

  @Property({ type: 'text', nullable: true })
  error?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'sent_at', serializedName: 'sent_at' })
  sentAt?: Date;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();
}
