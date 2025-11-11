import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

export type NotificationType = 'message' | 'system' | 'alert' | 'info';

@Entity({ tableName: 'notifications', schema: 'public' })
export class Notification {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'user_id', serializedName: 'user' })
  user!: Profile;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'from_user_id', serializedName: 'fromUser' })
  fromUser?: Profile;

  @Property({ type: 'text', serializedName: 'title' })
  title!: string;

  @Property({ type: 'text', serializedName: 'message' })
  message!: string;

  @Property({ type: 'text', serializedName: 'type' })
  type: NotificationType = 'message';

  @Property({ type: 'boolean', serializedName: 'read' })
  read: boolean = false;

  @Property({ type: 'text', nullable: true, serializedName: 'link' })
  link?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'createdAt' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'read_at', serializedName: 'readAt' })
  readAt?: Date;
}
