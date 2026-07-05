import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/core';
import { MembershipStatus } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { BirthdayEmailLog } from './birthday-email-log.entity';
import { EmailService } from '../email/email.service';
import { SiteSettingsService } from '../site-settings/site-settings.service';

export interface BirthdayEmailSettings {
  enabled: boolean;
  subject: string;
  /** HTML body. Supports the {{first_name}} placeholder. */
  bodyHtml: string;
  /** Optional image shown at the top of the email body. */
  imageUrl: string;
}

export interface UpcomingBirthdayRow {
  profileId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  mecaId: string | null;
  birthday: string;
  /** Next occurrence of the birthday (YYYY-MM-DD). */
  nextDate: string;
  daysUntil: number;
  /** Status of the send for the next occurrence's year (or this year's past send). */
  lastStatus: 'sent' | 'failed' | 'pending' | null;
  sentAt: string | null;
  error: string | null;
}

// Template + toggle live in site_settings so admins can edit them without a
// deploy (same store as the rest of the admin-editable configuration).
const KEY_ENABLED = 'birthday_email_enabled';
const KEY_SUBJECT = 'birthday_email_subject';
const KEY_BODY = 'birthday_email_body_html';
const KEY_IMAGE = 'birthday_email_image_url';

const DEFAULT_SUBJECT = 'Happy Birthday from MECA! 🎉';
const DEFAULT_BODY_HTML = [
  '<p style="font-size:18px;"><strong>Happy Birthday, {{first_name}}!</strong></p>',
  '<p>Everyone at MECA — the whole team and all of your fellow competitors — hopes your day is loud, proud, and full of bass.</p>',
  '<p>Thank you for being part of the MECA family. Here\'s to another year of great shows, great sound, and great company. Enjoy your day — you\'ve earned it!</p>',
  '<p style="margin-top:16px;">🎂🎉🔊<br/><strong>— The MECA Team</strong></p>',
].join('\n');

@Injectable()
export class BirthdaysService {
  private readonly logger = new Logger(BirthdaysService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
    private readonly siteSettingsService: SiteSettingsService,
  ) {}

  async getSettings(): Promise<BirthdayEmailSettings> {
    const [enabled, subject, body, image] = await Promise.all([
      this.siteSettingsService.findByKey(KEY_ENABLED),
      this.siteSettingsService.findByKey(KEY_SUBJECT),
      this.siteSettingsService.findByKey(KEY_BODY),
      this.siteSettingsService.findByKey(KEY_IMAGE),
    ]);
    return {
      // Enabled by default — an admin can switch it off from the admin page.
      enabled: enabled ? enabled.setting_value === 'true' : true,
      subject: subject?.setting_value || DEFAULT_SUBJECT,
      bodyHtml: body?.setting_value || DEFAULT_BODY_HTML,
      imageUrl: image?.setting_value || '',
    };
  }

  async updateSettings(data: Partial<BirthdayEmailSettings>, adminId: string | null): Promise<BirthdayEmailSettings> {
    if (data.enabled !== undefined) {
      await this.siteSettingsService.upsert(KEY_ENABLED, String(data.enabled), 'boolean', 'Send automated member birthday emails', adminId);
    }
    if (data.subject !== undefined) {
      await this.siteSettingsService.upsert(KEY_SUBJECT, data.subject, 'string', 'Birthday email subject', adminId);
    }
    if (data.bodyHtml !== undefined) {
      await this.siteSettingsService.upsert(KEY_BODY, data.bodyHtml, 'string', 'Birthday email HTML body ({{first_name}} placeholder supported)', adminId);
    }
    if (data.imageUrl !== undefined) {
      await this.siteSettingsService.upsert(KEY_IMAGE, data.imageUrl, 'string', 'Birthday email header image URL', adminId);
    }
    return this.getSettings();
  }

  /** Today's Y/M/D in the org's timezone (birthdays are calendar days, not UTC). */
  private todayInNY(): { year: number; month: number; day: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return { year: get('year'), month: get('month'), day: get('day') };
  }

  private renderBody(settings: BirthdayEmailSettings, firstName?: string | null): string {
    const name = (firstName || '').trim() || 'MECA Member';
    let body = settings.bodyHtml.replace(/\{\{\s*first_name\s*\}\}/gi, name);
    // Images inserted through the admin WYSIWYG land as bare <img src> tags.
    // Email clients need explicit sizing or a large image blows out the
    // layout — constrain any image that doesn't already carry a style.
    body = body.replace(
      /<img(?![^>]*style=)/gi,
      '<img style="max-width:100%;height:auto;border-radius:8px;"',
    );
    // Legacy header-image setting (pre-WYSIWYG) — kept for back-compat; the
    // admin UI now inserts images inline in the body instead.
    if (settings.imageUrl) {
      body = `<div style="text-align:center;margin-bottom:16px;"><img src="${settings.imageUrl}" alt="Happy Birthday" style="max-width:100%;border-radius:8px;" /></div>` + body;
    }
    return body;
  }

  /**
   * Daily 9:00 AM Eastern: email every ACTIVE member whose birthday is
   * today. The (profile_id, year) unique claim in birthday_email_log makes
   * this idempotent — reruns and concurrent instances can never double-send.
   */
  @Cron('0 9 * * *', { name: 'birthday-emails', timeZone: 'America/New_York' })
  async sendTodaysBirthdayEmails(): Promise<{ sent: number; failed: number; skipped: number }> {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      this.logger.log('Birthday emails are disabled — skipping daily run.');
      return { sent: 0, failed: 0, skipped: 0 };
    }

    const { year, month, day } = this.todayInNY();
    const em = this.em.fork();

    // Feb-29 birthdays are celebrated on Feb 28 in non-leap years.
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const includeLeapDay = month === 2 && day === 28 && !isLeapYear;

    const rows: Array<{ id: string }> = await em.getConnection().execute(
      `SELECT id FROM public.profiles
        WHERE birthday IS NOT NULL
          AND membership_status = 'active'
          AND (
            (EXTRACT(MONTH FROM birthday) = ? AND EXTRACT(DAY FROM birthday) = ?)
            ${includeLeapDay ? 'OR (EXTRACT(MONTH FROM birthday) = 2 AND EXTRACT(DAY FROM birthday) = 29)' : ''}
          )`,
      [month, day],
    );
    if (rows.length === 0) {
      this.logger.log('Birthday run: no active members with a birthday today.');
      return { sent: 0, failed: 0, skipped: 0 };
    }

    const profiles = await em.find(Profile, { id: { $in: rows.map((r) => r.id) } });
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const profile of profiles) {
      // No-login secondaries carry placeholder addresses — never email them.
      if (!profile.email || profile.email.toLowerCase().includes('placeholder')) {
        skipped++;
        continue;
      }

      // Once-per-year claim: only the instance that wins the insert sends.
      const claim: Array<{ id: string }> = await em.getConnection().execute(
        `INSERT INTO public.birthday_email_log (profile_id, year, status, email)
         VALUES (?, ?, 'pending', ?)
         ON CONFLICT (profile_id, year) DO NOTHING
         RETURNING id`,
        [profile.id, year, profile.email],
      );
      if (claim.length === 0) {
        skipped++; // already handled this year
        continue;
      }
      const logId = claim[0].id;

      try {
        const html = this.emailService.buildBrandedHtml(
          'Happy Birthday! 🎉',
          this.renderBody(settings, profile.first_name),
          { preheader: `Happy Birthday from the MECA team, ${profile.first_name || 'friend'}!` },
        );
        const result = await this.emailService.sendEmail({
          to: profile.email,
          subject: settings.subject,
          html,
          text: `Happy Birthday, ${profile.first_name || 'MECA Member'}! Everyone at MECA hopes you have a fantastic day. — The MECA Team`,
        });
        if (result.success) {
          sent++;
          await em.getConnection().execute(
            `UPDATE public.birthday_email_log SET status = 'sent', sent_at = now() WHERE id = ?`,
            [logId],
          );
        } else {
          failed++;
          await em.getConnection().execute(
            `UPDATE public.birthday_email_log SET status = 'failed', error = ? WHERE id = ?`,
            [String(result.error || 'unknown error').slice(0, 500), logId],
          );
        }
      } catch (err) {
        failed++;
        await em.getConnection().execute(
          `UPDATE public.birthday_email_log SET status = 'failed', error = ? WHERE id = ?`,
          [(err instanceof Error ? err.message : 'unknown error').slice(0, 500), logId],
        );
      }
    }

    this.logger.log(`Birthday run complete: ${sent} sent, ${failed} failed, ${skipped} skipped.`);
    return { sent, failed, skipped };
  }

  /**
   * Admin list: every active member with a birthday in the next `days` days
   * (including today), soonest first, with this occurrence's send status.
   */
  async getUpcomingBirthdays(days = 60): Promise<UpcomingBirthdayRow[]> {
    const em = this.em.fork();
    const profiles = await em.find(Profile, {
      birthday: { $ne: null },
      membership_status: MembershipStatus.ACTIVE,
    } as any);

    const { year, month, day } = this.todayInNY();
    const todayUtc = Date.UTC(year, month - 1, day);

    const candidates = profiles
      .map((p) => {
        const [, bMonth, bDay] = String(p.birthday).split('-').map(Number);
        if (!bMonth || !bDay) return null;
        // Next occurrence (this year if not yet passed, else next year).
        // Feb 29 resolves to Feb 28 in non-leap years.
        const resolve = (y: number) => {
          const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
          const dayResolved = bMonth === 2 && bDay === 29 && !leap ? 28 : bDay;
          return Date.UTC(y, bMonth - 1, dayResolved);
        };
        let occurrenceYear = year;
        let occurrence = resolve(year);
        if (occurrence < todayUtc) {
          occurrenceYear = year + 1;
          occurrence = resolve(year + 1);
        }
        const daysUntil = Math.round((occurrence - todayUtc) / 86400000);
        return { profile: p, occurrence, occurrenceYear, daysUntil };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null && c.daysUntil <= days)
      .sort((a, b) => a.daysUntil - b.daysUntil ||
        (a.profile.last_name || '').localeCompare(b.profile.last_name || ''));

    // Send status for each candidate's occurrence year.
    const logs = candidates.length > 0
      ? await em.find(BirthdayEmailLog, {
          profile: { $in: candidates.map((c) => c.profile.id) },
          year: { $in: [...new Set(candidates.map((c) => c.occurrenceYear))] },
        })
      : [];
    const logByKey = new Map(logs.map((l) => [`${(l.profile as any)?.id ?? l.profile}:${l.year}`, l]));

    return candidates.map(({ profile, occurrence, occurrenceYear, daysUntil }) => {
      const log = logByKey.get(`${profile.id}:${occurrenceYear}`);
      const d = new Date(occurrence);
      return {
        profileId: profile.id,
        firstName: profile.first_name ?? null,
        lastName: profile.last_name ?? null,
        email: profile.email ?? null,
        mecaId: profile.meca_id != null ? String(profile.meca_id) : null,
        birthday: String(profile.birthday),
        nextDate: d.toISOString().slice(0, 10),
        daysUntil,
        lastStatus: (log?.status as UpcomingBirthdayRow['lastStatus']) ?? null,
        sentAt: log?.sentAt ? log.sentAt.toISOString() : null,
        error: log?.error ?? null,
      };
    });
  }

  /** Send the current template to an arbitrary address for preview/testing. */
  async sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    const settings = await this.getSettings();
    const html = this.emailService.buildBrandedHtml(
      'Happy Birthday! 🎉',
      this.renderBody(settings, 'Test'),
      { preheader: 'Preview of the MECA birthday email' },
    );
    return this.emailService.sendEmail({
      to,
      subject: `[TEST] ${settings.subject}`,
      html,
      text: 'Preview of the MECA birthday email.',
    });
  }
}
