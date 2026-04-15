import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { Role, Permission, RolePermission, UserPermissionOverride } from './permission.entity';

@Module({
  imports: [MikroOrmModule.forFeature([Role, Permission, RolePermission, UserPermissionOverride])],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
