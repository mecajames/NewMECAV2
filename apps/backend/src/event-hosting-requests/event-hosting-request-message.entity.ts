import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';
import { EventHostingRequest } from './event-hosting-requests.entity';

export type SenderRole = 'requestor' | 'event_director' | 'admin';
export type RecipientType = 'requestor' | 'event_director' | 'admin' | 'all';

@Entity({ tableName: 'event_hosting_request_messages', schema: 'public' })
export class EventHostingRequestMessage {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  // ID property (persist: false) + ManyToOne relationship (hidden: true)
  @Property({ type: 'uuid', fieldName: 'request_id', serializedName: 'request_id', persist: false })
  requestId!: string;

  @ManyToOne(() => EventHostingRequest, { fieldName: 'request_id', hidden: true })
  request!: EventHostingRequest;

  @Property({ type: 'uuid', fieldName: 'sender_id', serializedName: 'sender_id', persist: false })
  senderId!: string;

  @ManyToOne(() => Profile, { fieldName: 'sender_id', hidden: true })
  sender!: Profile;

  @Property({ type: 'text', fieldName: 'sender_role', serializedName: 'sender_role' })
  senderRole!: SenderRole;

  @Property({ type: 'text' })
  message!: string;

  @Property({ type: 'boolean', default: false, fieldName: 'is_private', serializedName: 'is_private' })
  isPrivate: boolean = false;

  @Property({ type: 'text', nullable: true, fieldName: 'recipient_type', serializedName: 'recipient_type' })
  recipientType?: RecipientType;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
