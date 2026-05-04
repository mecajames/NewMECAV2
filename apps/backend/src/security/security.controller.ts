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
  Inject,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { SecurityService, ProvisionMode, StaffRoleAssignment } from './security.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

@Controller('api/admin/security')
export class SecurityController {
  constructor(
    private readonly securityService: SecurityService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  private async requireAdmin(authHeader?: string): Promise<{ profile: Profile; userId: string }> {
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
    return { profile: profile!, userId: user.id };
  }

  @Get('summary')
  async getSummary(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.securityService.getSummary();
  }

  @Get('profiles-audit')
  async getProfilesAudit(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.securityService.getProfilesAudit();
  }

  @Get('auth-orphans')
  async getAuthOrphans(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.securityService.getAuthOrphans();
  }

  @Post('profiles/:id/provision-membership')
  @HttpCode(HttpStatus.CREATED)
  async provisionMembership(
    @Headers('authorization') authHeader: string,
    @Param('id') profileId: string,
    @Body() body: {
      mode: ProvisionMode;
      membershipTypeConfigId: string;
      durationMonths?: number;
      forcePasswordChange?: boolean;
      staffRole?: StaffRoleAssignment;
      note?: string;
    },
  ) {
    const { userId } = await this.requireAdmin(authHeader);
    return this.securityService.provisionMembership(profileId, body, userId);
  }

  @Post('profiles/:id/login')
  @HttpCode(HttpStatus.OK)
  async setLogin(
    @Headers('authorization') authHeader: string,
    @Param('id') profileId: string,
    @Body() body: { canLogin: boolean },
  ) {
    await this.requireAdmin(authHeader);
    await this.securityService.setCanLogin(profileId, !!body.canLogin);
    return { success: true, canLogin: !!body.canLogin };
  }

  @Post('profiles/:id/ban')
  @HttpCode(HttpStatus.OK)
  async banProfile(
    @Headers('authorization') authHeader: string,
    @Param('id') profileId: string,
    @Body() body: { reason?: string },
  ) {
    const { userId } = await this.requireAdmin(authHeader);
    await this.securityService.banProfile(profileId, userId, body.reason);
    return { success: true };
  }

  @Post('profiles/:id/unban')
  @HttpCode(HttpStatus.OK)
  async unbanProfile(
    @Headers('authorization') authHeader: string,
    @Param('id') profileId: string,
  ) {
    const { userId } = await this.requireAdmin(authHeader);
    await this.securityService.unbanProfile(profileId, userId);
    return { success: true };
  }

  @Delete('profiles/:id')
  async deleteProfile(
    @Headers('authorization') authHeader: string,
    @Param('id') profileId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.securityService.deleteProfile(profileId);
  }

  @Get('enforcement')
  async getEnforcement(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    const enabled = await this.securityService.isEnforcementEnabled();
    return { enabled };
  }

  @Post('enforcement')
  async setEnforcement(
    @Headers('authorization') authHeader: string,
    @Body() body: { enabled: boolean },
  ) {
    const { userId } = await this.requireAdmin(authHeader);
    return this.securityService.setEnforcement(!!body.enabled, userId);
  }
}
