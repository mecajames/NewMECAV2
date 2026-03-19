import { Entity, PrimaryKey, Property, Enum, ManyToOne, Unique } from '@mikro-orm/core';
import { QaResponseStatus } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { QaChecklistItem } from './qa-checklist-item.entity';
import { QaRoundAssignment } from './qa-round-assignment.entity';

@Entity({ tableName: 'qa_item_responses', schema: 'public' })
@Unique({ properties: ['item', 'assignment'] })
export class QaItemResponse {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => QaChecklistItem, { nullable: false, fieldName: 'item_id' })
  item!: QaChecklistItem;

  @ManyToOne(() => QaRoundAssignment, { nullable: false, fieldName: 'assignment_id' })
  assignment!: QaRoundAssignment;

  @ManyToOne(() => Profile, { nullable: false, fieldName: 'reviewer_id' })
  reviewer!: Profile;

  @Enum({ items: () => QaResponseStatus, default: QaResponseStatus.NOT_STARTED })
  status: QaResponseStatus = QaResponseStatus.NOT_STARTED;

  @Property({ type: 'text', nullable: true })
  comment?: string;

  @Property({ fieldName: 'page_url', type: 'text', nullable: true })
  pageUrl?: string;

  @Property({ fieldName: 'screenshot_url', type: 'text', nullable: true })
  screenshotUrl?: string;

  @Property({ fieldName: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt?: Date;
}
