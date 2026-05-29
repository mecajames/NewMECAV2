import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * Per-agent signature appended to outbound ticket reply emails. One
 * row per profile. Stores both an HTML version (rendered in HTML email
 * body) and a plain_text version (used in the text/plain alternative
 * part), kept separate so plain-text recipients see something sensible
 * without HTML stripping artifacts.
 *
 * Saved HTML is sanitized server-side via a strict allowlist on every
 * write (see StaffSignaturesService.upsert + sanitizeSignatureHtml).
 *
 * is_active=false lets an agent disable their signature without
 * deleting it.
 *
 * Schema note: user_id is BOTH the primary key and the FK to profiles.
 * MikroORM disallows two property decorators owning the same column,
 * so we model the column with a scalar PK and load the Profile via
 * an explicit em.findOne(Profile, { id: userId }) where needed.
 */
@Entity({ tableName: 'staff_signatures', schema: 'public' })
export class StaffSignature {
  @PrimaryKey({ type: 'uuid', fieldName: 'user_id' })
  userId!: string;

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
