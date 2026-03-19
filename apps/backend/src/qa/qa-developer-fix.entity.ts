import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { QaFixStatus } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { QaItemResponse } from './qa-item-response.entity';

@Entity({ tableName: 'qa_developer_fixes', schema: 'public' })
export class QaDeveloperFix {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => QaItemResponse, { nullable: false, fieldName: 'response_id' })
  response!: QaItemResponse;

  @ManyToOne(() => Profile, { nullable: false, fieldName: 'developer_id' })
  developer!: Profile;

  @Property({ fieldName: 'fix_notes', type: 'text' })
  fixNotes!: string;

  @Enum({ items: () => QaFixStatus, default: QaFixStatus.IN_PROGRESS })
  status: QaFixStatus = QaFixStatus.IN_PROGRESS;

  @Property({ fieldName: 'fixed_at', type: 'timestamptz', nullable: true })
  fixedAt?: Date;

  @Property({ fieldName: 'created_at', type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
