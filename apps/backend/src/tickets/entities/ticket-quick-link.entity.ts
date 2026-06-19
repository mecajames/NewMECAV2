import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../../profiles/profiles.entity';

/**
 * A quick "Insert link" entry for the ticket reply composer.
 *
 * Either a GLOBAL link (is_global=true, no owner) — visible to all support
 * staff and editable by admins — or a PERSONAL link (is_global=false) owned by
 * one agent and visible/editable only by them (or an admin).
 *
 * `category` groups entries in the dropdown picker (e.g. "Support", "Membership").
 */
@Entity({ tableName: 'ticket_quick_links', schema: 'public' })
export class TicketQuickLink {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  // Owner of a personal link. Null for global/system links.
  @ManyToOne(() => Profile, { fieldName: 'user_id', nullable: true })
  user?: Profile;

  @Property({ type: 'text' })
  label!: string;

  @Property({ type: 'text' })
  url!: string;

  @Property({ type: 'text', nullable: true })
  category?: string;

  @Property({ type: 'boolean', fieldName: 'is_global', default: false })
  isGlobal: boolean = false;

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
      label: this.label,
      url: this.url,
      category: this.category ?? null,
      is_global: this.isGlobal,
      sort_order: this.sortOrder,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
