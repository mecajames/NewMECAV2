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
import { Public } from '../auth/public.decorator';

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
    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  @Public()
  @Get()
  async listSettings() {
    return this.siteSettingsService.findAll();
  }

  @Public()
  @Get(':key')
  async getSetting(@Param('key') key: string) {
    return this.siteSettingsService.findByKey(key);
  }

  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  async upsertSetting(
    @Headers('authorization') authHeader: string,
    @Body() dto: UpsertSettingDto,
  ) {
    await this.requireAdmin(authHeader);
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
    await this.requireAdmin(authHeader);
    return this.siteSettingsService.bulkUpsert(dto.settings);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSetting(
    @Headers('authorization') authHeader: string,
    @Param('key') key: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.siteSettingsService.delete(key);
  }
}
