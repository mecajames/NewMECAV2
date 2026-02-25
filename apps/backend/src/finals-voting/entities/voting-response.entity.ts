import { Entity, PrimaryKey, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { VotingSession } from './voting-session.entity';
import { VotingQuestion } from './voting-question.entity';
import { Profile } from '../../profiles/profiles.entity';
import { Team } from '../../teams/team.entity';

@Entity({ tableName: 'voting_responses', schema: 'public' })
@Unique({ properties: ['session', 'question', 'voter'] })
export class VotingResponse {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => VotingSession, { fieldName: 'session_id' })
  session!: VotingSession;

  @ManyToOne(() => VotingQuestion, { fieldName: 'question_id' })
  question!: VotingQuestion;

  @ManyToOne(() => Profile, { fieldName: 'voter_id' })
  voter!: Profile;

  @ManyToOne(() => Profile, { fieldName: 'selected_member_id', nullable: true })
  selectedMember?: Profile;

  @ManyToOne(() => Team, { fieldName: 'selected_team_id', nullable: true })
  selectedTeam?: Team;

  @Property({ type: 'text', nullable: true, fieldName: 'text_answer' })
  textAnswer?: string;

  @Property({ type: 'timestamptz', fieldName: 'created_at', onCreate: () => new Date() })
  createdAt: Date = new Date();
}
