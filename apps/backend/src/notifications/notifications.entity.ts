import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

export type NotificationType = 'message' | 'system' | 'alert' | 'info';

@Entity({ tableName: 'notifications', schema: 'public' })
export class Notification {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'from_user_id' })
  fromUser?: Profile;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text' })
  message!: string;

  @Property({ type: 'text' })
  type: NotificationType = 'message';

  @Property({ type: 'boolean' })
  read: boolean = false;

  @Property({ type: 'text', nullable: true })
  link?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'read_at' })
  readAt?: Date;
}
