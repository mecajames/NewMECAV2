import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Headers,
  UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { SavedTicketFiltersService } from './saved-ticket-filters.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

/**
 * REST endpoints for server-backed ticket saved filters.
 *
 *   GET    /api/tickets/saved-filters       - list filters visible to caller
 *   POST   /api/tickets/saved-filters       - create a new filter
 *   PATCH  /api/tickets/saved-filters/:id   - rename / re-criteria / toggle default/share
 *   DELETE /api/tickets/saved-filters/:id   - delete
 *
 * Authorization:
 *   - All routes require staff / admin role.
 *   - List returns the caller's own filters + any shared by other
 *     staff (read access). Write ops verify ownership (or admin) in
 *     the service.
 */
@Controller('api/tickets/saved-filters')
export class SavedTicketFiltersController {
  constructor(
    private readonly service: SavedTicketFiltersService,
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

  @Get()
  async list(@Headers('authorization') authHeader: string): Promise<any[]> {
    const { userId } = await this.requireStaff(authHeader);
    const rows = await this.service.listVisibleTo(userId);
    return rows.map(r => ({
      ...r.toJSON(),
      owner: r.user
        ? {
            id: r.user.id,
            first_name: r.user.first_name ?? null,
            last_name: r.user.last_name ?? null,
            email: r.user.email ?? null,
          }
        : null,
      is_owner: r.user?.id === userId,
    }));
  }

  @Post()
  async create(
    @Headers('authorization') authHeader: string,
    @Body() body: {
      name: string;
      criteria: Record<string, unknown>;
      is_default?: boolean;
      is_shared_with_team?: boolean;
    },
  ): Promise<any> {
    const { userId } = await this.requireStaff(authHeader);
    const row = await this.service.create(userId, body);
    return row.toJSON();
  }

  @Patch(':id')
  async update(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      criteria?: Record<string, unknown>;
      is_default?: boolean;
      is_shared_with_team?: boolean;
      sort_order?: number;
    },
  ): Promise<any> {
    const { userId, profile } = await this.requireStaff(authHeader);
    const row = await this.service.update(id, { id: userId, profile }, body);
    return row.toJSON();
  }

  @Delete(':id')
  async delete(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    const { userId, profile } = await this.requireStaff(authHeader);
    await this.service.delete(id, { id: userId, profile });
    return { success: true };
  }
}
