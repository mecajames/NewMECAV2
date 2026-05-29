import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../../profiles/profiles.entity';

/**
 * A reusable reply template owned by one support agent. Variables in
 * the body — {{customer_name}}, {{ticket_id}}, {{ticket_number}},
 * {{ticket_subject}}, {{agent_name}} — are resolved client-side at
 * insert time so the backend stores the raw template only.
 *
 * is_shared exposes the response to all support staff for read access.
 * The owner remains the only one allowed to edit / delete.
 *
 * category is a free-form bucket (e.g. "Refunds", "Account") used to
 * group entries in the dropdown picker.
 */
@Entity({ tableName: 'ticket_canned_responses', schema: 'public' })
export class TicketCannedResponse {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text' })
  body!: string;

  @Property({ type: 'text', nullable: true })
  category?: string;

  @Property({ type: 'boolean', fieldName: 'is_shared', default: false })
  isShared: boolean = false;

  @Property({ type: 'integer', fieldName: 'sort_order', default: 0 })
  sortOrder: number = 0;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();

  toJSON() {
    return {
      id: this.id,
      user_id: this.user?.id ?? null,
      title: this.title,
      body: this.body,
      category: this.category ?? null,
      is_shared: this.isShared,
      sort_order: this.sortOrder,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
