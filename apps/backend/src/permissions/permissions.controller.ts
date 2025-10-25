import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { Permission } from './permission.entity';
import { AuthGuard, PermissionGuard, RequirePermissions } from '../auth';

@Controller('api/permissions')
@UseGuards(AuthGuard, PermissionGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('manage_permissions')
  async list() {
    return this.permissionsService.findAll();
  }

  @Get('category/:category')
  @RequirePermissions('manage_permissions')
  async listByCategory(@Param('category') category: string) {
    return this.permissionsService.findByCategory(category);
  }

  @Get(':id')
  @RequirePermissions('manage_permissions')
  async get(@Param('id') id: string) {
    return this.permissionsService.findById(id);
  }

  @Post()
  @RequirePermissions('manage_permissions')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: Partial<Permission>) {
    return this.permissionsService.create(data);
  }

  @Put(':id')
  @RequirePermissions('manage_permissions')
  async update(@Param('id') id: string, @Body() data: Partial<Permission>) {
    return this.permissionsService.update(id, data);
  }

  @Delete(':id')
  @RequirePermissions('manage_permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.permissionsService.delete(id);
  }

  // Role permissions
  @Get('role/:role')
  @RequirePermissions('manage_permissions')
  async getRolePermissions(@Param('role') role: string) {
    return this.permissionsService.getRolePermissions(role);
  }

  @Post('role/:role/assign')
  @RequirePermissions('manage_permissions')
  async assignToRole(@Param('role') role: string, @Body() { permissionId }: any) {
    return this.permissionsService.assignPermissionToRole(role, permissionId);
  }

  @Delete('role/:role/remove/:permissionId')
  @RequirePermissions('manage_permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromRole(@Param('role') role: string, @Param('permissionId') permissionId: string) {
    await this.permissionsService.removePermissionFromRole(role, permissionId);
  }

  // User overrides
  @Get('user/:userId')
  @RequirePermissions('manage_permissions')
  async getUserOverrides(@Param('userId') userId: string) {
    return this.permissionsService.getUserOverrides(userId);
  }

  @Get('user/:userId/effective/:role')
  @RequirePermissions('manage_permissions')
  async getEffectivePermissions(@Param('userId') userId: string, @Param('role') role: string) {
    return this.permissionsService.getUserEffectivePermissions(userId, role);
  }

  @Post('user/:userId/grant')
  @RequirePermissions('manage_permissions')
  async grantToUser(@Param('userId') userId: string, @Body() { permissionId }: any) {
    return this.permissionsService.grantPermissionToUser(userId, permissionId);
  }

  @Post('user/:userId/revoke')
  @RequirePermissions('manage_permissions')
  async revokeFromUser(@Param('userId') userId: string, @Body() { permissionId }: any) {
    return this.permissionsService.revokePermissionFromUser(userId, permissionId);
  }

  @Delete('user/:userId/override/:permissionId')
  @RequirePermissions('manage_permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOverride(@Param('userId') userId: string, @Param('permissionId') permissionId: string) {
    await this.permissionsService.removeUserOverride(userId, permissionId);
  }
}
