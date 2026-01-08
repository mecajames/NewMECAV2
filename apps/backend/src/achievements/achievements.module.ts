import { Module, forwardRef } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { AchievementImageService } from './image-generator/achievement-image.service';
import { AchievementDefinition } from './achievement-definition.entity';
import { AchievementRecipient } from './achievement-recipient.entity';
import { AchievementTemplate } from './achievement-template.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      AchievementDefinition,
      AchievementRecipient,
      AchievementTemplate,
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService, AchievementImageService],
  exports: [AchievementsService, AchievementImageService],
})
export class AchievementsModule {}
