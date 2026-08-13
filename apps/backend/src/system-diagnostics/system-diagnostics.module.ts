import { Module } from '@nestjs/common';
import { SystemDiagnosticsController } from './system-diagnostics.controller';
import { SystemDiagnosticsService } from './system-diagnostics.service';

@Module({
  controllers: [SystemDiagnosticsController],
  providers: [SystemDiagnosticsService],
  exports: [SystemDiagnosticsService],
})
export class SystemDiagnosticsModule {}
