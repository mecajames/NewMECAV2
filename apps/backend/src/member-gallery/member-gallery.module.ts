import { Module } from '@nestjs/common';
import { MemberGalleryService } from './member-gallery.service';
import { MemberGalleryController } from './member-gallery.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MemberGalleryController],
  providers: [MemberGalleryService],
  exports: [MemberGalleryService],
})
export class MemberGalleryModule {}
