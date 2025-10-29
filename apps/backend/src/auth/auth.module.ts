import { Module, Global } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * AuthModule - Provides authentication and authorization services
 *
 * Made global so guards can be used anywhere without importing
 */
@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthGuard, PermissionGuard, AuthService],
  exports: [AuthGuard, PermissionGuard, AuthService],
})
export class AuthModule {}
