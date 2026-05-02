import { Entity, PrimaryKey, Property, Enum, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { QaRoundStatus } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'qa_rounds', schema: 'public' })
export class QaRound {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ fieldName: 'version_number', type: 'integer' })
  versionNumber!: number;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Enum({ items: () => QaRoundStatus, default: QaRoundStatus.DRAFT })
  status: QaRoundStatus = QaRoundStatus.DRAFT;

  // Pause flag — independent of status. While true, reviewers can view the
  // round but cannot submit responses, and developers cannot submit fixes.
  // Used to freeze a round mid-test while the dev team ships repairs.
  @Property({ type: 'boolean', default: false })
  suspended: boolean = false;

  @ManyToOne(() => QaRound, { nullable: true, fieldName: 'parent_round_id' })
  parentRound?: QaRound;

  @ManyToOne(() => Profile, { nullable: false, fieldName: 'created_by' })
  createdBy!: Profile;

  @Property({ fieldName: 'created_at', type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ fieldName: 'updated_at', type: 'timestamptz', defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
