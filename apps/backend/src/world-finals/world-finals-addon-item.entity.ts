import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'world_finals_addon_items', schema: 'public' })
export class WorldFinalsAddonItem {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', fieldName: 'season_id', serializedName: 'season_id' })
  seasonId!: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'wf_event_id', serializedName: 'wf_event_id' })
  wfEventId?: string;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Property({ type: 'integer', default: 1, fieldName: 'max_quantity', serializedName: 'max_quantity' })
  maxQuantity: number = 1;

  // Optional format scoping (e.g. ['SPL']): null/empty = offered to every
  // registrant; otherwise only shown when the chosen package includes classes
  // in one of these formats.
  @Property({ type: 'json', nullable: true })
  formats?: string[] | null;

  // Optional class scoping (e.g. ['Radical X']): null/empty = every class in
  // the allowed formats; otherwise only shown when the registrant selected one
  // of these classes.
  @Property({ type: 'json', nullable: true, fieldName: 'class_names', serializedName: 'class_names' })
  classNames?: string[] | null;

  @Property({ type: 'integer', default: 0, fieldName: 'display_order', serializedName: 'display_order' })
  displayOrder: number = 0;

  @Property({ type: 'boolean', default: true, fieldName: 'is_active', serializedName: 'is_active' })
  isActive: boolean = true;

  @Property({ type: 'timestamptz', fieldName: 'created_at', serializedName: 'created_at', onCreate: () => new Date() })
  createdAt: Date = new Date();
}
