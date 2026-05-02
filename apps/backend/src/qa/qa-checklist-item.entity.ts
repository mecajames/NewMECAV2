import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { QaRound } from './qa-round.entity';

@Entity({ tableName: 'qa_checklist_items', schema: 'public' })
export class QaChecklistItem {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => QaRound, { nullable: false, fieldName: 'round_id' })
  round!: QaRound;

  @Property({ fieldName: 'section_id', type: 'text' })
  sectionId!: string;

  @Property({ fieldName: 'section_title', type: 'text' })
  sectionTitle!: string;

  @Property({ fieldName: 'section_description', type: 'text', nullable: true })
  sectionDescription?: string;

  @Property({ fieldName: 'section_order', type: 'integer' })
  sectionOrder!: number;

  @Property({ fieldName: 'item_key', type: 'text' })
  itemKey!: string;

  @Property({ fieldName: 'item_title', type: 'text' })
  itemTitle!: string;

  @Property({ fieldName: 'item_order', type: 'integer' })
  itemOrder!: number;

  @Property({ type: 'jsonb' })
  steps!: string[];

  @Property({ fieldName: 'expected_result', type: 'text' })
  expectedResult!: string;

  @Property({ fieldName: 'page_url', type: 'text', nullable: true })
  pageUrl?: string;

  @ManyToOne(() => QaChecklistItem, { nullable: true, fieldName: 'source_item_id' })
  sourceItem?: QaChecklistItem;

  // True for items added by the admin (round-scoped or promoted) rather than
  // copied from the master checklist. Lets the UI flag and group them.
  @Property({ fieldName: 'is_custom', type: 'boolean', default: false })
  isCustom: boolean = false;

  // For master-copied items: id of the source master row. Lets us avoid
  // duplicate-add when an admin re-runs the picker, and supports "edits to
  // master propagate to in-progress rounds" if we ever want it.
  @Property({ fieldName: 'source_master_id', type: 'uuid', nullable: true })
  sourceMasterId?: string;
}
