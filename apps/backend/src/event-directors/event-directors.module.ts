import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EventDirectorsController } from './event-directors.controller';
import { EventDirectorsService } from './event-directors.service';
import { EventDirectorApplication } from './event-director-application.entity';
import { EventDirectorApplicationReference } from './event-director-application-reference.entity';
import { EventDirector } from './event-director.entity';
import { EventDirectorSeasonQualification } from './event-director-season-qualification.entity';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      EventDirectorApplication,
      EventDirectorApplicationReference,
      EventDirector,
      EventDirectorSeasonQualification,
    ]),
    AuthModule,
    EmailModule,
  ],
  controllers: [EventDirectorsController],
  providers: [EventDirectorsService],
  exports: [EventDirectorsService],
})
export class EventDirectorsModule {}
