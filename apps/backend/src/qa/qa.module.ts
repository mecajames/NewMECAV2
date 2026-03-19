import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QaController } from './qa.controller';
import { QaService } from './qa.service';

@Module({
  imports: [AuthModule],
  controllers: [QaController],
  providers: [QaService],
  exports: [QaService],
})
export class QaModule {}
