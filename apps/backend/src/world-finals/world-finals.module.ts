import { Module, forwardRef } from '@nestjs/common';
import { WorldFinalsService } from './world-finals.service';
import { WorldFinalsController } from './world-finals.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  providers: [WorldFinalsService],
  controllers: [WorldFinalsController],
  exports: [WorldFinalsService],
})
export class WorldFinalsModule {}
