import { Module } from '@nestjs/common';
import { FeatureRequestsController } from './feature-requests.controller';
import { FeatureRequestsService } from './feature-requests.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserActivityModule } from '../user-activity/user-activity.module';

@Module({
  imports: [NotificationsModule, UserActivityModule],
  controllers: [FeatureRequestsController],
  providers: [FeatureRequestsService],
  exports: [FeatureRequestsService],
})
export class FeatureRequestsModule {}
