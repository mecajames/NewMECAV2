import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { ResultsEntrySession } from './results-entry-session.entity';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'results_audit_log', schema: 'public' })
export class ResultsAuditLog {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', nullable: true, fieldName: 'session_id', serializedName: 'session_id', persist: false })
  sessionId?: string;

  @ManyToOne(() => ResultsEntrySession, { fieldName: 'session_id', nullable: true, hidden: true })
  session?: ResultsEntrySession;

  @Property({ type: 'uuid', nullable: true, fieldName: 'result_id', serializedName: 'result_id', persist: false })
  resultId?: string;

  @ManyToOne(() => CompetitionResult, { fieldName: 'result_id', nullable: true, hidden: true, deleteRule: 'set null' })
  result?: CompetitionResult;

  @Property({ type: 'text' })
  action!: 'create' | 'update' | 'delete';

  @Property({ type: 'jsonb', nullable: true, fieldName: 'old_data', serializedName: 'old_data' })
  oldData?: any;

  @Property({ type: 'jsonb', nullable: true, fieldName: 'new_data', serializedName: 'new_data' })
  newData?: any;

  @Property({ onCreate: () => new Date(), type: 'timestamptz' })
  timestamp: Date = new Date();

  @Property({ type: 'uuid', fieldName: 'user_id', serializedName: 'userId', persist: false })
  userId!: string;

  @ManyToOne(() => Profile, { fieldName: 'user_id', nullable: true })
  user?: Profile;
}
