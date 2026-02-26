import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { EmailService } from '../email/email.service';
import { AnalyticsService, SummaryStats, TopPage, TrafficSource } from './analytics.service';
import { SearchConsoleService } from './search-console.service';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';

interface SearchQueryData {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

@Injectable()
export class AnalyticsEmailService {
  private readonly logger = new Logger(AnalyticsEmailService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
    private readonly analyticsService: AnalyticsService,
    private readonly searchConsoleService: SearchConsoleService,
  ) {}

  /**
   * Send weekly analytics digest email every Monday at 9 AM
   */
  @Cron(CronExpression.EVERY_WEEK)
  async sendWeeklyAnalyticsEmail() {
    this.logger.log('Running weekly analytics email job...');

    if (!this.analyticsService.isConfigured()) {
      this.logger.warn('GA4 not configured - skipping weekly analytics email');
      return;
    }

    try {
      // Get admin emails
      const adminEmails = await this.getAdminEmails();
      if (adminEmails.length === 0) {
        this.logger.warn('No admin emails found - skipping weekly analytics email');
        return;
      }

      // Calculate date range: previous 7 days
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // yesterday
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6); // 7 days back

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Fetch analytics data
      const [summary, topPages, searchQueries] = await Promise.all([
        this.analyticsService.getSummaryStats(startStr, endStr),
        this.analyticsService.getTopPages(startStr, endStr, 10),
        this.getSearchQueries(startStr, endStr),
      ]);

      // Generate HTML report
      const html = this.generateEmailHtml(summary, topPages, searchQueries, startStr, endStr);

      // Send to each admin
      const dateRange = `${this.formatDate(startStr)} - ${this.formatDate(endStr)}`;
      for (const email of adminEmails) {
        await this.emailService.sendEmail({
          to: email,
          subject: `MECA Weekly Analytics Report - ${dateRange}`,
          html,
        });
      }

      this.logger.log(`Weekly analytics email sent to ${adminEmails.length} admin(s)`);
    } catch (error) {
      this.logger.error('Failed to send weekly analytics email:', error);
    }
  }

  private async getAdminEmails(): Promise<string[]> {
    const em = this.em.fork();
    const admins = await em.find(Profile, { role: UserRole.ADMIN }, {
      fields: ['email'],
    });
    return admins
      .map(a => a.email)
      .filter((e): e is string => !!e);
  }

  private async getSearchQueries(startDate: string, endDate: string): Promise<SearchQueryData[]> {
    try {
      const data = await this.searchConsoleService.getTopQueries(startDate, endDate, 10);
      return data;
    } catch {
      return [];
    }
  }

  private formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private formatNumber(n: number): string {
    return n.toLocaleString('en-US');
  }

  private generateEmailHtml(
    summary: SummaryStats,
    topPages: TopPage[],
    searchQueries: SearchQueryData[],
    startDate: string,
    endDate: string,
  ): string {
    const dateRange = `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#0f172a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px; margin:0 auto; padding:20px;">
    <!-- Header -->
    <div style="text-align:center; padding:24px 0; border-bottom:2px solid #f97316;">
      <h1 style="color:#f97316; font-size:24px; margin:0;">MECA Car Audio</h1>
      <p style="color:#94a3b8; font-size:14px; margin:8px 0 0;">Weekly Analytics Report</p>
      <p style="color:#64748b; font-size:12px; margin:4px 0 0;">${dateRange}</p>
    </div>

    <!-- Summary Cards -->
    <div style="padding:24px 0;">
      <h2 style="color:#e2e8f0; font-size:18px; margin:0 0 16px;">Traffic Overview</h2>
      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="padding:8px; width:50%;">
            <div style="background-color:#1e293b; border-radius:8px; padding:16px; text-align:center;">
              <p style="color:#94a3b8; font-size:12px; margin:0; text-transform:uppercase;">Page Views</p>
              <p style="color:#f97316; font-size:28px; font-weight:bold; margin:8px 0 0;">${this.formatNumber(summary.pageViews)}</p>
            </div>
          </td>
          <td style="padding:8px; width:50%;">
            <div style="background-color:#1e293b; border-radius:8px; padding:16px; text-align:center;">
              <p style="color:#94a3b8; font-size:12px; margin:0; text-transform:uppercase;">Active Users</p>
              <p style="color:#3b82f6; font-size:28px; font-weight:bold; margin:8px 0 0;">${this.formatNumber(summary.activeUsers)}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px; width:50%;">
            <div style="background-color:#1e293b; border-radius:8px; padding:16px; text-align:center;">
              <p style="color:#94a3b8; font-size:12px; margin:0; text-transform:uppercase;">Sessions</p>
              <p style="color:#22c55e; font-size:28px; font-weight:bold; margin:8px 0 0;">${this.formatNumber(summary.sessions)}</p>
            </div>
          </td>
          <td style="padding:8px; width:50%;">
            <div style="background-color:#1e293b; border-radius:8px; padding:16px; text-align:center;">
              <p style="color:#94a3b8; font-size:12px; margin:0; text-transform:uppercase;">Bounce Rate</p>
              <p style="color:#eab308; font-size:28px; font-weight:bold; margin:8px 0 0;">${summary.bounceRate.toFixed(1)}%</p>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Top Pages -->
    ${topPages.length > 0 ? `
    <div style="padding:0 0 24px;">
      <h2 style="color:#e2e8f0; font-size:18px; margin:0 0 16px;">Top Pages</h2>
      <table style="width:100%; border-collapse:collapse; background-color:#1e293b; border-radius:8px; overflow:hidden;">
        <thead>
          <tr style="border-bottom:1px solid #334155;">
            <th style="text-align:left; padding:10px 12px; color:#94a3b8; font-size:12px; font-weight:600;">Page</th>
            <th style="text-align:right; padding:10px 12px; color:#94a3b8; font-size:12px; font-weight:600;">Views</th>
            <th style="text-align:right; padding:10px 12px; color:#94a3b8; font-size:12px; font-weight:600;">Users</th>
          </tr>
        </thead>
        <tbody>
          ${topPages.map(page => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px; color:#e2e8f0; font-size:13px; max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${this.escapeHtml(page.pagePath)}</td>
            <td style="padding:8px 12px; color:#f97316; font-size:13px; text-align:right; font-weight:600;">${this.formatNumber(page.pageViews)}</td>
            <td style="padding:8px 12px; color:#94a3b8; font-size:13px; text-align:right;">${this.formatNumber(page.activeUsers)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Top Search Queries -->
    ${searchQueries.length > 0 ? `
    <div style="padding:0 0 24px;">
      <h2 style="color:#e2e8f0; font-size:18px; margin:0 0 16px;">Top Search Queries</h2>
      <table style="width:100%; border-collapse:collapse; background-color:#1e293b; border-radius:8px; overflow:hidden;">
        <thead>
          <tr style="border-bottom:1px solid #334155;">
            <th style="text-align:left; padding:10px 12px; color:#94a3b8; font-size:12px; font-weight:600;">Query</th>
            <th style="text-align:right; padding:10px 12px; color:#94a3b8; font-size:12px; font-weight:600;">Clicks</th>
            <th style="text-align:right; padding:10px 12px; color:#94a3b8; font-size:12px; font-weight:600;">Position</th>
          </tr>
        </thead>
        <tbody>
          ${searchQueries.map(q => `
          <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px; color:#e2e8f0; font-size:13px;">${this.escapeHtml(q.query)}</td>
            <td style="padding:8px 12px; color:#22c55e; font-size:13px; text-align:right; font-weight:600;">${this.formatNumber(q.clicks)}</td>
            <td style="padding:8px 12px; color:${q.position <= 3 ? '#22c55e' : q.position <= 10 ? '#eab308' : '#94a3b8'}; font-size:13px; text-align:right;">${q.position.toFixed(1)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Footer -->
    <div style="text-align:center; padding:24px 0; border-top:1px solid #334155;">
      <p style="color:#64748b; font-size:12px; margin:0;">
        This is an automated weekly report from MECA Car Audio.
      </p>
      <p style="color:#64748b; font-size:12px; margin:4px 0 0;">
        <a href="https://mecacaraudio.com/admin/analytics" style="color:#f97316; text-decoration:none;">View Full Dashboard</a>
        &nbsp;&bull;&nbsp;
        <a href="https://mecacaraudio.com/admin/search-console" style="color:#f97316; text-decoration:none;">Search Console</a>
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
