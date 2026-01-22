import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { TrainingRecord } from './training-record.entity';
import { Profile } from '../profiles/profiles.entity';
import { TrainingRecordsService } from './training-records.service';
import { TrainingRecordsController } from './training-records.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // Register entities needed for queries in this module
    MikroOrmModule.forFeature([TrainingRecord, Profile]),
    AuthModule,
  ],
  controllers: [TrainingRecordsController],
  providers: [TrainingRecordsService],
  exports: [TrainingRecordsService],
})
export class TrainingRecordsModule {}
