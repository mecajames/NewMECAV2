import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'moderation_log', schema: 'public' })
export class ModerationLog {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @ManyToOne(() => Profile, { fieldName: 'moderator_id', nullable: true })
  moderator?: Profile;

  @Property({ type: 'varchar', length: 50 })
  action!: string;

  @Property({ type: 'varchar', length: 100, nullable: true })
  reason?: string;

  @Property({ type: 'json', nullable: true })
  details?: Record<string, any>;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();
}
