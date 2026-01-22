import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { Team } from '../teams/team.entity';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'result_teams', schema: 'public' })
export class ResultTeam {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => CompetitionResult, { fieldName: 'result_id', nullable: true })
  result?: CompetitionResult;

  @ManyToOne(() => Team, { fieldName: 'team_id', nullable: true })
  team?: Team;

  @ManyToOne(() => Profile, { fieldName: 'member_id', nullable: true })
  member?: Profile;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'created_at', serializedName: 'created_at', onCreate: () => new Date() })
  createdAt?: Date = new Date();
}
