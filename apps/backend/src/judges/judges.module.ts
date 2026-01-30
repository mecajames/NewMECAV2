import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { JudgesController } from './judges.controller';
import { JudgesService } from './judges.service';
import { JudgeApplication } from './judge-application.entity';
import { JudgeApplicationReference } from './judge-application-reference.entity';
import { Judge } from './judge.entity';
import { JudgeLevelHistory } from './judge-level-history.entity';
import { JudgeSeasonQualification } from './judge-season-qualification.entity';
import { EventJudgeAssignment } from './event-judge-assignment.entity';
import { EmailVerificationToken } from '../auth/email-verification-token.entity';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      JudgeApplication,
      JudgeApplicationReference,
      Judge,
      JudgeLevelHistory,
      JudgeSeasonQualification,
      EventJudgeAssignment,
      EmailVerificationToken,
    ]),
    EmailModule,
    AuthModule,
  ],
  controllers: [JudgesController],
  providers: [JudgesService],
  exports: [JudgesService],
})
export class JudgesModule {}
