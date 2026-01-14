import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { TrainingRecord } from './training-record.entity';
import { TrainingRecordsService } from './training-records.service';
import { TrainingRecordsController } from './training-records.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // Only register TrainingRecord - Profile is globally available via DatabaseModule
    MikroOrmModule.forFeature([TrainingRecord]),
    AuthModule,
  ],
  controllers: [TrainingRecordsController],
  providers: [TrainingRecordsService],
  exports: [TrainingRecordsService],
})
export class TrainingRecordsModule {}
