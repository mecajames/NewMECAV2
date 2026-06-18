import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AnnouncementType, AnnouncementAudience, DEFAULT_ANNOUNCEMENT_AUDIENCE } from '@newmeca/shared';

/**
 * A site-wide announcement banner shown above the navbar. Scheduled, styled,
 * audience-targeted, and optionally dismissible. Managed by admins from the
 * Notifications Center. `body` holds sanitized HTML (rendered via DOMPurify).
 */
@Entity({ tableName: 'announcements', schema: 'public' })
@Index({ properties: ['isActive', 'startsAt', 'endsAt'] })
export class Announcement {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text' })
  body!: string;

  // Stored as text (not a pg enum) so adding a future type never needs an ALTER TYPE migration.
  @Property({ type: 'text' })
  type: AnnouncementType = AnnouncementType.INFO;

  @Property({ type: 'text', fieldName: 'panel_color', nullable: true })
  panelColor: string | null = null;

  @Property({ type: 'text', fieldName: 'text_color', nullable: true })
  textColor: string | null = null;

  @Property({ type: 'timestamptz', fieldName: 'starts_at' })
  startsAt!: Date;

  @Property({ type: 'timestamptz', fieldName: 'ends_at' })
  endsAt!: Date;

  @Property({ type: 'boolean', fieldName: 'is_active' })
  isActive: boolean = true;

  @Property({ type: 'integer' })
  priority: number = 0;

  @Property({ type: 'boolean' })
  dismissible: boolean = true;

  @Property({ type: 'json', fieldName: 'audience' })
  audience: AnnouncementAudience = { ...DEFAULT_ANNOUNCEMENT_AUDIENCE };

  @Property({ type: 'uuid', fieldName: 'created_by', nullable: true })
  createdBy: string | null = null;

  @Property({ type: 'timestamptz', onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({
    type: 'timestamptz',
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
    fieldName: 'updated_at',
  })
  updatedAt: Date = new Date();
}
