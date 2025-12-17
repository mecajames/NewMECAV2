import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

export type GuestTokenPurpose = 'create_ticket' | 'view_ticket' | 'respond_ticket';

@Entity({ tableName: 'ticket_guest_tokens', schema: 'public' })
export class TicketGuestToken {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  email!: string;

  @Property({ type: 'text', unique: true })
  token!: string;

  @Property({ type: 'text', default: 'create_ticket' })
  purpose: GuestTokenPurpose = 'create_ticket';

  @Property({ type: 'timestamptz', fieldName: 'expires_at', serializedName: 'expires_at' })
  expiresAt!: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'used_at', serializedName: 'used_at' })
  usedAt?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'ip_address', serializedName: 'ip_address' })
  ipAddress?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'user_agent', serializedName: 'user_agent' })
  userAgent?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();
}
