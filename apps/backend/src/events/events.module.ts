import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

/**
 * EventsModule
 *
 * Encapsulates all event-related functionality.
 * NestJS automatically:
 * - Discovers routes from @Controller decorators
 * - Injects EventsService into EventsController
 * - Registers routes as /api/events/*
 *
 * Exports:
 * - EventsService for use in other modules if needed
 */
@Module({
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
