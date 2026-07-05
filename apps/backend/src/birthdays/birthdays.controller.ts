import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { BirthdaysService, BirthdayEmailSettings } from './birthdays.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

/**
 * Admin endpoints for the birthday-email system: template settings, the
 * upcoming-birthdays list (with send indicators), test sends, and a manual
 * trigger of today's run. Members set their birthday via the normal
 * profile update — no member-facing endpoints here.
 */
@Controller('api/birthdays')
export class BirthdaysController {
  constructor(
    private readonly birthdaysService: BirthdaysService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  private async requireAdmin(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (!isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  @Get('admin/settings')
  async getSettings(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.birthdaysService.getSettings();
  }

  @Put('admin/settings')
  async updateSettings(
    @Headers('authorization') authHeader: string,
    @Body() body: Partial<BirthdayEmailSettings>,
  ) {
    const { user } = await this.requireAdmin(authHeader);
    return this.birthdaysService.updateSettings(body, user.id);
  }

  @Get('admin/upcoming')
  async getUpcoming(
    @Headers('authorization') authHeader: string,
    @Query('days') days?: string,
  ) {
    await this.requireAdmin(authHeader);
    const parsed = days ? parseInt(days, 10) : 60;
    return this.birthdaysService.getUpcomingBirthdays(
      Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 366) : 60,
    );
  }

  @Post('admin/test-email')
  @HttpCode(HttpStatus.OK)
  async sendTest(
    @Headers('authorization') authHeader: string,
    @Body() body: { to?: string },
  ) {
    await this.requireAdmin(authHeader);
    const to = (body?.to || '').trim();
    if (!to || !to.includes('@')) {
      throw new BadRequestException('A valid email address is required');
    }
    return this.birthdaysService.sendTestEmail(to);
  }

  /** Manually run today's send (same idempotent path as the daily cron). */
  @Post('admin/run-now')
  @HttpCode(HttpStatus.OK)
  async runNow(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.birthdaysService.sendTodaysBirthdayEmails();
  }
}
