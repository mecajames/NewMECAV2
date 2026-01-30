import { Module } from '@nestjs/common';
import { MediaFilesController } from './media-files.controller';
import { MediaFilesService } from './media-files.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MediaFilesController],
  providers: [MediaFilesService],
  exports: [MediaFilesService],
})
export class MediaFilesModule {}
