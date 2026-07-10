import {
  Controller,
  Get,
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
import { ConsentService, RecordConsentDto } from './consent.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import { Public } from '../auth/public.decorator';

const VALID_CHOICES = ['accepted_all', 'necessary_only', 'custom'] as const;

@Controller('api/consent-log')
export class ConsentController {
  constructor(
    private readonly consentService: ConsentService,
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

  /**
   * Record a cookie-consent choice from the site's consent banner.
   * Public — anonymous visitors consent before they could ever have a token.
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async record(
    @Headers('user-agent') userAgent: string,
    @Body() body: { visitorId?: string; choice?: string; analytics?: boolean; functional?: boolean },
  ) {
    const visitorId = (body.visitorId || '').trim();
    if (!visitorId || visitorId.length > 100) {
      throw new BadRequestException('visitorId is required');
    }
    if (!VALID_CHOICES.includes(body.choice as any)) {
      throw new BadRequestException(`choice must be one of: ${VALID_CHOICES.join(', ')}`);
    }
    const dto: RecordConsentDto = {
      visitorId,
      choice: body.choice as RecordConsentDto['choice'],
      analytics: !!body.analytics,
      functional: !!body.functional,
      userAgent,
    };
    return this.consentService.record(dto);
  }

  /** Admin: consent stats for the Privacy & Consent settings panel. */
  @Get('stats')
  async stats(
    @Headers('authorization') authHeader: string,
    @Query('days') days?: string,
  ) {
    await this.requireAdmin(authHeader);
    const parsed = Number(days);
    const window = Number.isFinite(parsed) && parsed > 0 && parsed <= 365 ? Math.floor(parsed) : 30;
    return this.consentService.getStats(window);
  }
}
