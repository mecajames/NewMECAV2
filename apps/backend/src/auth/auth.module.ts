import { Module, Global } from '@nestjs/common';
import { SupabaseAdminService } from './supabase-admin.service';
import { AuthController } from './auth.controller';

@Global()
@Module({
  controllers: [AuthController],
  providers: [SupabaseAdminService],
  exports: [SupabaseAdminService],
})
export class AuthModule {}
