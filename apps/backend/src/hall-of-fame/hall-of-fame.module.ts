import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HallOfFameController } from './hall-of-fame.controller';
import { HallOfFameService } from './hall-of-fame.service';

@Module({
  imports: [AuthModule],
  controllers: [HallOfFameController],
  providers: [HallOfFameService],
  exports: [HallOfFameService],
})
export class HallOfFameModule {}
