import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Ticket } from './ticket.entity';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'ticket_comments', schema: 'public' })
export class TicketComment {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Ticket, { fieldName: 'ticket_id' })
  ticket!: Ticket;

  // Author is nullable for guest comments
  @ManyToOne(() => Profile, { nullable: true, fieldName: 'author_id' })
  author?: Profile;

  @Property({ type: 'text' })
  content!: string;

  @Property({ type: 'boolean', fieldName: 'is_internal', default: false })
  isInternal: boolean = false;

  // Guest comment fields
  @Property({ type: 'text', nullable: true, fieldName: 'guest_author_name' })
  guestAuthorName?: string;

  @Property({ type: 'boolean', fieldName: 'is_guest_comment', default: false })
  isGuestComment: boolean = false;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();

  toJSON() {
    return {
      id: this.id,
      ticket_id: this.ticket?.id || null,
      author_id: this.author?.id || null,
      author: this.author ? {
        id: this.author.id,
        email: this.author.email || '',
        first_name: this.author.first_name || null,
        last_name: this.author.last_name || null,
        role: this.author.role || null,
      } : null,
      content: this.content,
      is_internal: this.isInternal,
      guest_author_name: this.guestAuthorName || null,
      is_guest_comment: this.isGuestComment,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
