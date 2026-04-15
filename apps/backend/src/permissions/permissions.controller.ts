import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { PermissionsService } from './permissions.service';
import { Permission } from './permission.entity';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

@Controller('api/permissions')
export class PermissionsController {
  private readonly logger = new Logger(PermissionsController.name);

  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly em: EntityManager,
  ) {}

  /**
   * Loads and verifies the user is admin/staff. Throws 403 otherwise.
   */
  private async requireAdmin(req: any): Promise<Profile> {
    const user = req.user;
    if (!user?.id) throw new ForbiddenException('Not authenticated');

    const profile = await this.em.fork().findOne(Profile, { id: user.id }, {
      fields: ['id', 'role', 'is_staff', 'meca_id'] as any,
    });

    if (!profile || !isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required to manage permissions');
    }
    return profile;
  }

  // ── Roles CRUD ─────────────────────────────────────────────────

  @Get('roles')
  async listRoles(@Req() req: any) {
    await this.requireAdmin(req);
    return this.permissionsService.findAllRoles();
  }

  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  async createRole(@Req() req: any, @Body() body: { name: string; displayName: string; description?: string }) {
    await this.requireAdmin(req);
    return this.permissionsService.createRole(body);
  }

  @Put('roles/:id')
  async updateRole(@Req() req: any, @Param('id') id: string, @Body() body: { displayName?: string; description?: string }) {
    await this.requireAdmin(req);
    return this.permissionsService.updateRole(id, body);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Req() req: any, @Param('id') id: string) {
    await this.requireAdmin(req);
    await this.permissionsService.deleteRole(id);
  }

  // ── Permissions CRUD ──────────────────────────────────────────

  @Get()
  async list(@Req() req: any) {
    await this.requireAdmin(req);
    return this.permissionsService.findAll();
  }

  @Get('category/:category')
  async listByCategory(@Req() req: any, @Param('category') category: string) {
    await this.requireAdmin(req);
    return this.permissionsService.findByCategory(category);
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    await this.requireAdmin(req);
    return this.permissionsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() data: Partial<Permission>) {
    await this.requireAdmin(req);
    return this.permissionsService.create(data);
  }

  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() data: Partial<Permission>) {
    await this.requireAdmin(req);
    return this.permissionsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Req() req: any, @Param('id') id: string) {
    await this.requireAdmin(req);
    await this.permissionsService.delete(id);
  }

  // ── Role Permissions ──────────────────────────────────────────

  @Get('roles/all')
  async getAllRolePermissions(@Req() req: any) {
    await this.requireAdmin(req);
    return this.permissionsService.getAllRolePermissions();
  }

  @Get('role/:role')
  async getRolePermissions(@Req() req: any, @Param('role') role: string) {
    await this.requireAdmin(req);
    return this.permissionsService.getRolePermissions(role);
  }

  @Post('role/:role/assign')
  async assignToRole(@Req() req: any, @Param('role') role: string, @Body('permissionId') permissionId: string) {
    await this.requireAdmin(req);
    return this.permissionsService.assignPermissionToRole(role, permissionId);
  }

  @Delete('role/:role/remove/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromRole(@Req() req: any, @Param('role') role: string, @Param('permissionId') permissionId: string) {
    await this.requireAdmin(req);
    await this.permissionsService.removePermissionFromRole(role, permissionId);
  }

  // ── User Overrides ────────────────────────────────────────────

  @Get('user/:userId')
  async getUserOverrides(@Req() req: any, @Param('userId') userId: string) {
    await this.requireAdmin(req);
    return this.permissionsService.getUserOverrides(userId);
  }

  @Get('user/:userId/effective')
  async getEffectivePermissions(@Req() req: any, @Param('userId') userId: string) {
    await this.requireAdmin(req);
    const em = this.em.fork();
    const targetProfile = await em.findOneOrFail(Profile, { id: userId }, {
      fields: ['id', 'role', 'is_staff', 'meca_id'] as any,
    });
    return this.permissionsService.getUserEffectivePermissions(
      userId,
      targetProfile.role || 'user',
      targetProfile.is_staff,
      targetProfile.meca_id,
    );
  }

  @Post('user/:userId/grant')
  async grantToUser(@Req() req: any, @Param('userId') userId: string, @Body('permissionId') permissionId: string) {
    await this.requireAdmin(req);
    return this.permissionsService.grantPermissionToUser(userId, permissionId);
  }

  @Post('user/:userId/revoke')
  async revokeFromUser(@Req() req: any, @Param('userId') userId: string, @Body('permissionId') permissionId: string) {
    await this.requireAdmin(req);
    return this.permissionsService.revokePermissionFromUser(userId, permissionId);
  }

  @Delete('user/:userId/override/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOverride(@Req() req: any, @Param('userId') userId: string, @Param('permissionId') permissionId: string) {
    await this.requireAdmin(req);
    await this.permissionsService.removeUserOverride(userId, permissionId);
  }

  // ── Current User Permissions ──────────────────────────────────

  @Get('me/effective')
  async getMyPermissions(@Req() req: any) {
    const user = req.user;
    if (!user?.id) throw new ForbiddenException('Not authenticated');

    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id }, {
      fields: ['id', 'role', 'is_staff', 'meca_id'] as any,
    });

    if (!profile) throw new ForbiddenException('Profile not found');

    return this.permissionsService.getUserEffectivePermissions(
      profile.id,
      profile.role || 'user',
      profile.is_staff,
      profile.meca_id,
    );
  }
}
