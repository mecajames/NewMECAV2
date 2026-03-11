import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { LoginAuditLog } from './login-audit-log.entity';
import { UserActivityService } from './user-activity.service';
import { UserActivityController } from './user-activity.controller';
import { LastSeenMiddleware } from './last-seen.middleware';

@Module({
  imports: [MikroOrmModule.forFeature([LoginAuditLog])],
  controllers: [UserActivityController],
  providers: [UserActivityService],
  exports: [UserActivityService],
})
export class UserActivityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply LastSeen middleware to all API routes
    consumer.apply(LastSeenMiddleware).forRoutes({ path: 'api/(.*)', method: RequestMethod.ALL });
  }
}
