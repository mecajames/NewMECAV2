import { Module, forwardRef } from '@nestjs/common';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { MecaIdService } from './meca-id.service';
import { MasterSecondaryService } from './master-secondary.service';
import { TeamsModule } from '../teams/teams.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => TeamsModule), AuthModule],
  controllers: [MembershipsController],
  providers: [MembershipsService, MecaIdService, MasterSecondaryService],
  exports: [MembershipsService, MecaIdService, MasterSecondaryService],
})
export class MembershipsModule {}
