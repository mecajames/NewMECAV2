import { Entity, PrimaryKey, Property, Enum, ManyToOne, Unique } from '@mikro-orm/core';
import { QaAssignmentStatus } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { QaRound } from './qa-round.entity';

@Entity({ tableName: 'qa_round_assignments', schema: 'public' })
@Unique({ properties: ['round', 'assignee'] })
export class QaRoundAssignment {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => QaRound, { nullable: false, fieldName: 'round_id' })
  round!: QaRound;

  @ManyToOne(() => Profile, { nullable: false, fieldName: 'assigned_to' })
  assignee!: Profile;

  @ManyToOne(() => Profile, { nullable: false, fieldName: 'assigned_by' })
  assignedBy!: Profile;

  @Enum({ items: () => QaAssignmentStatus, default: QaAssignmentStatus.ASSIGNED })
  status: QaAssignmentStatus = QaAssignmentStatus.ASSIGNED;

  @Property({ fieldName: 'assigned_at', type: 'timestamptz', defaultRaw: 'now()' })
  assignedAt: Date = new Date();

  @Property({ fieldName: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Property({ fieldName: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;
}
