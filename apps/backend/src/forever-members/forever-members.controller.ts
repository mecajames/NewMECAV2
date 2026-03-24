import { Controller, Get, Post, Put, Delete, Param, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ForeverMembersService } from './forever-members.service';
import { ForeverMember } from './forever-members.entity';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { UserRole } from '@newmeca/shared';

@Controller('api/forever-members')
export class ForeverMembersController {
  constructor(
    private readonly foreverMembersService: ForeverMembersService,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  private async requireAdmin(authHeader?: string) {
    if (!authHeader) throw new Error('Unauthorized');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (!user) throw new Error('Unauthorized');
    const profile = await this.foreverMembersService['em'].fork().findOne('Profile', { id: user.id });
    if (!profile || (profile as any).role !== UserRole.ADMIN) throw new Error('Forbidden');
    return user;
  }

  @Get('admin/all')
  async getAllForAdmin(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.foreverMembersService.findAll();
  }

  @Public()
  @Get()
  async getPublished(): Promise<ForeverMember[]> {
    return this.foreverMembersService.findAllPublished();
  }

  @Public()
  @Get(':id')
  async getById(@Param('id') id: string) {
    const member = await this.foreverMembersService.findById(id);
    const stats = await this.foreverMembersService.getStats(member.mecaId);
    const serialized = JSON.parse(JSON.stringify(member));
    return { ...serialized, stats };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Headers('authorization') authHeader: string,
    @Body() data: Partial<ForeverMember>,
  ) {
    const user = await this.requireAdmin(authHeader);
    return this.foreverMembersService.create({ ...data, createdBy: user.id });
  }

  @Put(':id')
  async update(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: Partial<ForeverMember>,
  ) {
    await this.requireAdmin(authHeader);
    return this.foreverMembersService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.foreverMembersService.delete(id);
  }
}
