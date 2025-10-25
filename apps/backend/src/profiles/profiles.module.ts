import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

/**
 * ProfilesModule
 *
 * Encapsulates all profile-related functionality.
 * NestJS automatically:
 * - Discovers routes from @Controller decorators
 * - Injects ProfilesService into ProfilesController
 * - Registers routes as /api/profiles/*
 *
 * Exports:
 * - ProfilesService for use in other modules if needed
 */
@Module({
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService], // Export if other modules need access
})
export class ProfilesModule {}
