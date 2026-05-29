import { Entity, PrimaryKey, Property, OneToOne } from '@mikro-orm/core';
import { Profile } from '../../profiles/profiles.entity';

/**
 * Per-agent signature appended to outbound ticket reply emails. One
 * row per profile (user_id is the PK). Stores both an HTML version
 * (rendered in HTML email body) and a plain_text version (used in the
 * text/plain alternative part — kept separate so plain-text recipients
 * see something sensible without HTML stripping artifacts).
 *
 * Saved HTML is sanitized server-side via DOMPurify on every write
 * (see StaffSignaturesService.upsert). Disallowed tags / attributes
 * are stripped, so even if an admin pastes hostile markup the only
 * thing that lands in the column is the sanitized result.
 *
 * is_active=false lets an agent disable their signature without
 * deleting it — useful when they want to compose a reply without
 * the boilerplate.
 */
@Entity({ tableName: 'staff_signatures', schema: 'public' })
export class StaffSignature {
  @PrimaryKey({ type: 'uuid', fieldName: 'user_id' })
  userId!: string;

  @OneToOne(() => Profile, { fieldName: 'user_id', mapToPk: true })
  user!: Profile;

  @Property({ type: 'text', default: '' })
  html: string = '';

  @Property({ type: 'text', fieldName: 'plain_text', default: '' })
  plainText: string = '';

  @Property({ type: 'boolean', fieldName: 'is_active', default: true })
  isActive: boolean = true;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();

  toJSON() {
    return {
      user_id: this.userId,
      html: this.html,
      plain_text: this.plainText,
      is_active: this.isActive,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
