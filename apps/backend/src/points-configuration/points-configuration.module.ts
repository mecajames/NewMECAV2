import { Module } from '@nestjs/common';
import { PointsConfigurationService } from './points-configuration.service';
import { PointsConfigurationController } from './points-configuration.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PointsConfigurationController],
  providers: [PointsConfigurationService],
  exports: [PointsConfigurationService],
})
export class PointsConfigurationModule {}
