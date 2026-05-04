import { Injectable, Inject, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { UAParser } from 'ua-parser-js';
import { Profile } from '../profiles/profiles.entity';
import { MemberPageView } from './member-page-view.entity';

/**
 * Service responsible for first-party per-member tracking.
 *
 * Anonymous traffic continues to flow through Google Analytics 4
 * (AnalyticsService). This service is invoked only for authenticated members
 * who haven't opted out via account settings.
 */
@Injectable()
export class MemberAnalyticsService {
  private readonly logger = new Logger(MemberAnalyticsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Record a single page view for a logged-in member.
   *
   *   - Looks up the member's opt-out flag; if true, returns silently.
   *   - Parses the User-Agent header into OS / browser / device families.
   *   - If the previous page view in the same session is still missing a
   *     duration_ms, fills it with (now - that view's viewed_at).
   *
   * Fire-and-forget from the controller — failures are logged but never
   * surface to the user.
   */
  async trackPageView(
    userId: string,
    data: {
      pagePath: string;
      pageTitle?: string;
      referrer?: string;
      userAgent?: string;
      sessionId?: string;
      ipCountry?: string;
    },
  ): Promise<{ tracked: boolean; reason?: string }> {
    const em = this.em.fork();

    // Honor opt-out without writing anything
    const profile = await em.findOne(Profile, { id: userId }, {
      fields: ['id', 'analytics_opt_out'] as any,
    });
    if (!profile) return { tracked: false, reason: 'profile_not_found' };
    if (profile.analytics_opt_out) return { tracked: false, reason: 'opted_out' };

    const parsed = this.parseUserAgent(data.userAgent);
    const now = new Date();

    // Backfill duration_ms on the previous page view in this session, if any.
    if (data.sessionId) {
      const prev = await em.findOne(
        MemberPageView,
        { user: { id: userId }, sessionId: data.sessionId, durationMs: null },
        { orderBy: { viewedAt: 'DESC' } },
      );
      if (prev) {
        const elapsed = now.getTime() - prev.viewedAt.getTime();
        // Cap at 30 minutes — anything longer is almost certainly the user
        // walking away from their computer rather than reading the page.
        prev.durationMs = Math.min(elapsed, 30 * 60 * 1000);
      }
    }

    const view = em.create(MemberPageView, {
      user: em.getReference(Profile, userId),
      sessionId: data.sessionId,
      pagePath: this.normalizePath(data.pagePath),
      pageTitle: data.pageTitle,
      referrer: data.referrer,
      userAgent: data.userAgent,
      osFamily: parsed.osFamily,
      osVersion: parsed.osVersion,
      browserFamily: parsed.browserFamily,
      browserVersion: parsed.browserVersion,
      deviceType: parsed.deviceType,
      ipCountry: data.ipCountry,
      viewedAt: now,
    });

    await em.persistAndFlush(view);
    return { tracked: true };
  }

  /**
   * Recent activity for a single member. Returns sessions grouped, with
   * page views sorted within each session newest-first.
   */
  async getMemberActivity(userId: string, limit = 100) {
    const em = this.em.fork();
    const views = await em.find(
      MemberPageView,
      { user: { id: userId } },
      {
        orderBy: { viewedAt: 'DESC' },
        limit,
      },
    );

    // Group by session for the admin UI. Sessions without a session_id
    // (older rows or anonymous-during-tracking) are grouped under 'no-session'.
    const sessionsMap = new Map<string, {
      sessionId: string | null;
      startedAt: Date;
      endedAt: Date;
      pageCount: number;
      durationMs: number;
      osFamily?: string;
      browserFamily?: string;
      deviceType?: string;
      ipCountry?: string;
      pages: typeof views;
    }>();

    for (const v of views) {
      const key = v.sessionId ?? 'no-session';
      const existing = sessionsMap.get(key);
      if (existing) {
        existing.pages.push(v);
        if (v.viewedAt < existing.startedAt) existing.startedAt = v.viewedAt;
        if (v.viewedAt > existing.endedAt) existing.endedAt = v.viewedAt;
        existing.pageCount += 1;
        if (v.durationMs) existing.durationMs += v.durationMs;
      } else {
        sessionsMap.set(key, {
          sessionId: v.sessionId ?? null,
          startedAt: v.viewedAt,
          endedAt: v.viewedAt,
          pageCount: 1,
          durationMs: v.durationMs ?? 0,
          osFamily: v.osFamily,
          browserFamily: v.browserFamily,
          deviceType: v.deviceType,
          ipCountry: v.ipCountry,
          pages: [v],
        });
      }
    }

    // Sort sessions by most recent activity
    const sessions = Array.from(sessionsMap.values()).sort(
      (a, b) => b.endedAt.getTime() - a.endedAt.getTime(),
    );

    return {
      totalViews: views.length,
      sessionCount: sessions.length,
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        durationMs: s.durationMs,
        pageCount: s.pageCount,
        osFamily: s.osFamily,
        browserFamily: s.browserFamily,
        deviceType: s.deviceType,
        ipCountry: s.ipCountry,
        pages: s.pages
          .sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime())
          .map(p => ({
            id: p.id,
            pagePath: p.pagePath,
            pageTitle: p.pageTitle,
            referrer: p.referrer,
            viewedAt: p.viewedAt,
            durationMs: p.durationMs,
          })),
      })),
    };
  }

  /**
   * Cross-member aggregates for the /admin/member-activity dashboard.
   */
  async getDashboard(days = 7) {
    const em = this.em.fork();
    const conn = em.getConnection();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      summary,
      topPages,
      topMembers,
      browserBreakdown,
      osBreakdown,
      deviceBreakdown,
    ] = await Promise.all([
      conn.execute<Array<{ total_views: string; distinct_users: string; distinct_sessions: string; avg_duration_ms: string }>>(
        `SELECT COUNT(*)::text AS total_views,
                COUNT(DISTINCT user_id)::text AS distinct_users,
                COUNT(DISTINCT session_id)::text AS distinct_sessions,
                COALESCE(AVG(duration_ms), 0)::text AS avg_duration_ms
         FROM member_page_views
         WHERE viewed_at >= ?`,
        [since],
      ),
      conn.execute<Array<{ page_path: string; views: string; users: string }>>(
        `SELECT page_path,
                COUNT(*)::text AS views,
                COUNT(DISTINCT user_id)::text AS users
         FROM member_page_views
         WHERE viewed_at >= ?
         GROUP BY page_path
         ORDER BY views::int DESC
         LIMIT 25`,
        [since],
      ),
      conn.execute<Array<{ user_id: string; first_name: string; last_name: string; email: string; meca_id: string; views: string; sessions: string }>>(
        `SELECT mpv.user_id,
                p.first_name, p.last_name, p.email, p.meca_id::text,
                COUNT(*)::text AS views,
                COUNT(DISTINCT mpv.session_id)::text AS sessions
         FROM member_page_views mpv
         JOIN profiles p ON p.id = mpv.user_id
         WHERE mpv.viewed_at >= ?
         GROUP BY mpv.user_id, p.first_name, p.last_name, p.email, p.meca_id
         ORDER BY views::int DESC
         LIMIT 25`,
        [since],
      ),
      conn.execute<Array<{ browser_family: string; views: string }>>(
        `SELECT COALESCE(browser_family, 'Unknown') AS browser_family,
                COUNT(*)::text AS views
         FROM member_page_views
         WHERE viewed_at >= ?
         GROUP BY browser_family
         ORDER BY views::int DESC
         LIMIT 10`,
        [since],
      ),
      conn.execute<Array<{ os_family: string; views: string }>>(
        `SELECT COALESCE(os_family, 'Unknown') AS os_family,
                COUNT(*)::text AS views
         FROM member_page_views
         WHERE viewed_at >= ?
         GROUP BY os_family
         ORDER BY views::int DESC
         LIMIT 10`,
        [since],
      ),
      conn.execute<Array<{ device_type: string; views: string }>>(
        `SELECT COALESCE(device_type, 'Unknown') AS device_type,
                COUNT(*)::text AS views
         FROM member_page_views
         WHERE viewed_at >= ?
         GROUP BY device_type
         ORDER BY views::int DESC`,
        [since],
      ),
    ]);

    return {
      windowDays: days,
      summary: {
        totalViews: parseInt(summary[0]?.total_views || '0', 10),
        distinctMembers: parseInt(summary[0]?.distinct_users || '0', 10),
        distinctSessions: parseInt(summary[0]?.distinct_sessions || '0', 10),
        avgDurationMs: Math.round(parseFloat(summary[0]?.avg_duration_ms || '0')),
      },
      topPages: topPages.map(r => ({
        pagePath: r.page_path,
        views: parseInt(r.views, 10),
        members: parseInt(r.users, 10),
      })),
      topMembers: topMembers.map(r => ({
        userId: r.user_id,
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email,
        email: r.email,
        mecaId: r.meca_id,
        views: parseInt(r.views, 10),
        sessions: parseInt(r.sessions, 10),
      })),
      browserBreakdown: browserBreakdown.map(r => ({
        browser: r.browser_family,
        views: parseInt(r.views, 10),
      })),
      osBreakdown: osBreakdown.map(r => ({
        os: r.os_family,
        views: parseInt(r.views, 10),
      })),
      deviceBreakdown: deviceBreakdown.map(r => ({
        device: r.device_type,
        views: parseInt(r.views, 10),
      })),
    };
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  /**
   * Strip query strings and fragments from page paths so /events?page=2 and
   * /events?page=3 collapse into the same row in aggregates. Query data isn't
   * useful for "where did this member go" reporting and would explode the
   * cardinality of top-pages reports.
   */
  private normalizePath(path: string): string {
    if (!path) return '/';
    const noQuery = path.split('?')[0];
    const noFragment = noQuery.split('#')[0];
    return noFragment || '/';
  }

  /**
   * Parse a User-Agent header into named fields. Defensive against malformed
   * UAs — parser failures fall through to undefined rather than throwing.
   */
  private parseUserAgent(ua?: string) {
    if (!ua) return {};
    try {
      const result = new UAParser(ua).getResult();
      // device.type is undefined for desktops by convention; normalize.
      const deviceType = result.device.type
        || (result.os.name === 'iOS' || result.os.name === 'Android' ? 'mobile' : 'desktop');
      return {
        osFamily: result.os.name,
        osVersion: result.os.version,
        browserFamily: result.browser.name,
        browserVersion: result.browser.version,
        deviceType,
      };
    } catch (err) {
      this.logger.warn(`UA parse failed: ${err}`);
      return {};
    }
  }
}
