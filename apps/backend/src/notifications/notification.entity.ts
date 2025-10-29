import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { NotificationType } from '../types/enums';

@Entity({ tableName: 'notifications', schema: 'public' })
export class Notification {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'uuid', fieldName: 'user_id' })
  userId!: string;

  @Property({ type: 'uuid', fieldName: 'from_user_id', nullable: true })
  fromUserId?: string;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text' })
  message!: string;

  @Enum(() => NotificationType)
  type: NotificationType = NotificationType.INFO;

  @Property({ type: 'boolean' })
  read: boolean = false;

  @Property({ type: 'text', nullable: true })
  link?: string;

  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'read_at', nullable: true })
  readAt?: Date;
}
