import { Module, Global } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';

/**
 * AuthModule - Provides authentication and authorization services
 *
 * Made global so guards can be used anywhere without importing
 */
@Global()
@Module({
  providers: [AuthGuard, PermissionGuard],
  exports: [AuthGuard, PermissionGuard],
})
export class AuthModule {}
