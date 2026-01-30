import { Module } from '@nestjs/common';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { ScheduledTasksController } from './scheduled-tasks.controller';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [EmailModule, AuthModule],
  providers: [ScheduledTasksService],
  controllers: [ScheduledTasksController],
  exports: [ScheduledTasksService],
})
export class ScheduledTasksModule {}
