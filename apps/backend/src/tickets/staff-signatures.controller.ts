import {
  Controller, Get, Put, Delete,
  Body, Param, Headers,
  UnauthorizedException, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { StaffSignaturesService } from './staff-signatures.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

/**
 * REST endpoints for per-agent ticket reply signatures.
 *
 *   GET    /api/tickets/signatures/me      - fetch the caller's signature
 *   PUT    /api/tickets/signatures/me      - upsert the caller's signature
 *   DELETE /api/tickets/signatures/me      - delete the caller's signature
 *   GET    /api/tickets/signatures/:userId - fetch another agent's signature (admin only)
 *
 * All routes require auth and staff/admin role. The "me" routes are
 * authoritative for self edits; the per-userId route exists so admins
 * can preview / audit other agents' signatures before they go out.
 */
@Controller('api/tickets/signatures')
export class StaffSignaturesController {
  constructor(
    private readonly service: StaffSignaturesService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  private async requireStaff(authHeader?: string): Promise<{ userId: string; profile: Profile }> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid authorization token');
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (!profile) throw new ForbiddenException('Profile not found');
    if (!isAdminUser(profile)) throw new ForbiddenException('Staff or admin access required');
    return { userId: user.id, profile };
  }

  @Get('me')
  async getMine(@Headers('authorization') authHeader: string): Promise<any> {
    const { userId } = await this.requireStaff(authHeader);
    const row = await this.service.findByUserId(userId);
    return row ? row.toJSON() : {
      user_id: userId, html: '', plain_text: '', is_active: true,
      created_at: null, updated_at: null,
    };
  }

  @Put('me')
  async upsertMine(
    @Headers('authorization') authHeader: string,
    @Body() body: { html?: string; plain_text?: string; is_active?: boolean },
  ): Promise<any> {
    const { userId } = await this.requireStaff(authHeader);
    const row = await this.service.upsert(userId, body);
    return row.toJSON();
  }

  @Delete('me')
  async deleteMine(@Headers('authorization') authHeader: string): Promise<{ success: true }> {
    const { userId } = await this.requireStaff(authHeader);
    await this.service.deleteByUserId(userId);
    return { success: true };
  }

  @Get(':userId')
  async getForUser(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
  ): Promise<any> {
    const { userId: callerId, profile } = await this.requireStaff(authHeader);
    if (callerId !== userId && !isAdminUser(profile)) {
      throw new ForbiddenException('Only admins can view another agent signature');
    }
    const row = await this.service.findByUserId(userId);
    if (!row) throw new NotFoundException('Signature not found');
    return row.toJSON();
  }
}
