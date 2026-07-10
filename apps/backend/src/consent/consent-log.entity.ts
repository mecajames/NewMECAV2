import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

/**
 * Audit log of cookie-consent choices made in the site's consent banner
 * (CMP). One row per explicit choice — proof of consent for GDPR/CIPA/CCPA
 * purposes. Deliberately minimal PII: an anonymous visitor id (random uuid
 * stored in the visitor's localStorage) + user agent; no IP address.
 */
@Entity({ tableName: 'consent_log' })
export class ConsentLog {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  /** Anonymous per-browser id (random uuid minted client-side). */
  @Property({ type: 'text', fieldName: 'visitor_id' })
  visitorId!: string;

  /** Optional link to a signed-in member (unused for now; kept for audits). */
  @Property({ type: 'uuid', nullable: true, fieldName: 'user_id' })
  userId?: string;

  /** 'accepted_all' | 'necessary_only' | 'custom' */
  @Property({ type: 'text' })
  choice!: string;

  @Property({ type: 'boolean', default: false })
  analytics: boolean = false;

  @Property({ type: 'boolean', default: false })
  functional: boolean = false;

  @Property({ type: 'text', nullable: true, fieldName: 'user_agent' })
  userAgent?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();
}
