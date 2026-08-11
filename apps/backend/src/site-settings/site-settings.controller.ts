import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { UserRole } from '@newmeca/shared';
import { SiteSettingsService } from './site-settings.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser, isSuperAdmin } from '../auth/is-admin.helper';
import { GRACE_SETTING_KEYS } from '../memberships/grace-config';
import { Public } from '../auth/public.decorator';

// Keys that only super-admins (James/Mick) may write or delete through the
// generic endpoints. The grace/amnesty keys have their own super-admin
// endpoints (memberships/admin/grace-config); the override password was
// already super-admin-scoped in spirit. Without this guard any admin could
// bypass the dedicated endpoints by posting the raw key here.
const SUPER_ADMIN_ONLY_KEYS: ReadonlySet<string> = new Set([
  GRACE_SETTING_KEYS.selfServeDays,
  GRACE_SETTING_KEYS.adminDays,
  GRACE_SETTING_KEYS.amnestyEndDate,
  'super_admin_password',
]);

interface UpsertSettingDto {
  key: string;
  value: string;
  type: string;
  description?: string;
  updatedBy: string;
}

@Controller('api/site-settings')
export class SiteSettingsController {
  constructor(
    private readonly siteSettingsService: SiteSettingsService,
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

  // The list/get endpoints are public because the frontend reads non-secret
  // settings (maintenance flags, hero content, social links) without auth.
  // Secret-typed rows (e.g. auto-managed OAuth tokens) must NEVER be returned
  // in cleartext over these unauthenticated endpoints — redact their values.
  private redactSecret<T extends { setting_type?: string; setting_value?: string } | null>(setting: T): T {
    if (setting && setting.setting_type === 'secret') {
      return { ...setting, setting_value: '' };
    }
    return setting;
  }

  @Public()
  @Get()
  async listSettings() {
    const settings = await this.siteSettingsService.findAll();
    return settings.map(s => this.redactSecret(s));
  }

  @Public()
  @Get(':key')
  async getSetting(@Param('key') key: string) {
    const setting = await this.siteSettingsService.findByKey(key);
    return this.redactSecret(setting);
  }

  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  async upsertSetting(
    @Headers('authorization') authHeader: string,
    @Body() dto: UpsertSettingDto,
  ) {
    const { profile } = await this.requireAdmin(authHeader);
    if (SUPER_ADMIN_ONLY_KEYS.has(dto.key) && !isSuperAdmin(profile)) {
      throw new ForbiddenException('This setting can only be changed by a super-admin.');
    }
    return this.siteSettingsService.upsert(
      dto.key,
      dto.value,
      dto.type,
      dto.description,
      dto.updatedBy
    );
  }

  @Post('bulk-upsert')
  @HttpCode(HttpStatus.OK)
  async bulkUpsertSettings(
    @Headers('authorization') authHeader: string,
    @Body() dto: { settings: UpsertSettingDto[] },
  ) {
    const { profile } = await this.requireAdmin(authHeader);
    if (!isSuperAdmin(profile) && dto.settings?.some(s => SUPER_ADMIN_ONLY_KEYS.has(s.key))) {
      throw new ForbiddenException('One or more of these settings can only be changed by a super-admin.');
    }
    return this.siteSettingsService.bulkUpsert(dto.settings);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSetting(
    @Headers('authorization') authHeader: string,
    @Param('key') key: string,
  ) {
    const { profile } = await this.requireAdmin(authHeader);
    if (SUPER_ADMIN_ONLY_KEYS.has(key) && !isSuperAdmin(profile)) {
      throw new ForbiddenException('This setting can only be deleted by a super-admin.');
    }
    await this.siteSettingsService.delete(key);
  }
}
