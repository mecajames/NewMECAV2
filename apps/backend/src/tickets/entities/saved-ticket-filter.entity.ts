import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../../profiles/profiles.entity';

/**
 * A named filter combination saved by a support agent. Replaces the
 * per-browser localStorage presets in TicketManagement with a
 * server-backed, cross-device store. The criteria JSON is opaque to
 * the database — the frontend writes the same shape it would feed to
 * the ticket-list endpoint.
 *
 * Sharing model:
 *   - is_shared_with_team=false: visible only to the owner
 *   - is_shared_with_team=true: visible to any other support staff
 *     (read-only); the owner is still the only one who can edit/delete
 *
 * is_default is the row that auto-loads when the agent opens the
 * ticket queue. Only one default per user is allowed (enforced by a
 * partial unique index on the migration).
 */
@Entity({ tableName: 'saved_ticket_filters', schema: 'public' })
export class SavedTicketFilter {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'jsonb' })
  criteria: Record<string, unknown> = {};

  @Property({ type: 'boolean', fieldName: 'is_default', default: false })
  isDefault: boolean = false;

  @Property({ type: 'boolean', fieldName: 'is_shared_with_team', default: false })
  isSharedWithTeam: boolean = false;

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
      name: this.name,
      criteria: this.criteria,
      is_default: this.isDefault,
      is_shared_with_team: this.isSharedWithTeam,
      sort_order: this.sortOrder,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
