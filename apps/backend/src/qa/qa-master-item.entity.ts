import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * Canonical master checklist. The first time the table is queried it is
 * lazy-seeded from the CHECKLIST_SECTIONS constant in qa-checklist-data.ts.
 * After that, this table is the source of truth and admins can extend it
 * via the "promote to master" action on round-level custom items.
 */
@Entity({ tableName: 'qa_master_items', schema: 'public' })
export class QaMasterItem {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

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
  steps: string[] = [];

  @Property({ fieldName: 'expected_result', type: 'text' })
  expectedResult!: string;

  @Property({ fieldName: 'page_url', type: 'text', nullable: true })
  pageUrl?: string;

  // Soft-delete-style flag — set false to retire an item from future rounds
  // without destroying historical references from old qa_checklist_items.
  @Property({ fieldName: 'is_active', type: 'boolean', default: true })
  isActive: boolean = true;

  @Property({ fieldName: 'created_at', type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ fieldName: 'updated_at', type: 'timestamptz', defaultRaw: 'now()', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
