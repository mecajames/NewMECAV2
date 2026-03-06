import { Module } from '@nestjs/common';
import { SplWorldRecordsController } from './spl-world-records.controller';
import { SplWorldRecordsService } from './spl-world-records.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SplWorldRecordsController],
  providers: [SplWorldRecordsService],
  exports: [SplWorldRecordsService],
})
export class SplWorldRecordsModule {}
