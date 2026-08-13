import { Controller, Get, Headers, Inject, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { SystemDiagnosticsService } from './system-diagnostics.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

/**
 * Admin-only, read-only system health checks (Site Settings → System →
 * System Health Check). See SystemDiagnosticsService for what each covers.
 */
@Controller('api/system-diagnostics')
export class SystemDiagnosticsController {
  constructor(
    private readonly diagnostics: SystemDiagnosticsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  private async requireAdmin(authHeader?: string): Promise<void> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid authorization token');
    const profile = await this.em.fork().findOne(Profile, { id: user.id });
    if (!isAdminUser(profile)) throw new ForbiddenException('Admin access required');
  }

  /** Entity-vs-database schema drift across every mapped table. */
  @Get('schema-drift')
  async schemaDrift(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.diagnostics.schemaDrift();
  }

  /** Points pipeline: live eligibility query, season config, migration trail. */
  @Get('points-pipeline')
  async pointsPipeline(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.diagnostics.pointsPipeline();
  }
}
