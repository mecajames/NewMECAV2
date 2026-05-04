import { Entity, PrimaryKey, Property, ManyToOne, Index } from '@mikro-orm/core';
import { Profile } from '../profiles/profiles.entity';

/**
 * One row per page view by a logged-in member. Anonymous traffic continues
 * to flow through Google Analytics 4 — this table is exclusively for the
 * member-level behavior reporting on /admin/members and /admin/member-activity.
 *
 * `duration_ms` is filled in retroactively when the same session navigates
 * to the next page; the final page of a session has duration_ms = null.
 */
@Entity({ tableName: 'member_page_views', schema: 'public' })
@Index({ name: 'idx_member_page_views_user_viewed', properties: ['user', 'viewedAt'] })
export class MemberPageView {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Profile, { fieldName: 'user_id', nullable: false, deleteRule: 'cascade' })
  user!: Profile;

  // Same session_id used by login_audit_log. Lets us reconstruct full
  // sessions and join with login events.
  @Property({ fieldName: 'session_id', type: 'uuid', nullable: true })
  sessionId?: string;

  @Property({ fieldName: 'page_path', type: 'text' })
  pagePath!: string;

  @Property({ fieldName: 'page_title', type: 'text', nullable: true })
  pageTitle?: string;

  @Property({ type: 'text', nullable: true })
  referrer?: string;

  // Raw user-agent string preserved for forensics; the parsed columns below
  // are what the admin UI actually displays.
  @Property({ fieldName: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Property({ fieldName: 'os_family', type: 'text', nullable: true })
  osFamily?: string;

  @Property({ fieldName: 'os_version', type: 'text', nullable: true })
  osVersion?: string;

  @Property({ fieldName: 'browser_family', type: 'text', nullable: true })
  browserFamily?: string;

  @Property({ fieldName: 'browser_version', type: 'text', nullable: true })
  browserVersion?: string;

  // 'desktop' | 'mobile' | 'tablet'
  @Property({ fieldName: 'device_type', type: 'text', nullable: true })
  deviceType?: string;

  @Property({ fieldName: 'ip_country', type: 'text', nullable: true })
  ipCountry?: string;

  @Property({ fieldName: 'viewed_at', type: 'timestamptz', defaultRaw: 'now()' })
  viewedAt: Date = new Date();

  // Filled in when the next page-view from the same session is recorded.
  @Property({ fieldName: 'duration_ms', type: 'integer', nullable: true })
  durationMs?: number;
}
