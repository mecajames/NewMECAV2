import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

export type RulebookCategory = 'SPL Rulebook' | 'SQL Rulebook' | 'MECA Kids' | 'Dueling Demos' | 'Show and Shine' | 'Ride the Light';

@Entity({ tableName: 'rulebooks', schema: 'public' })
export class Rulebook {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text' })
  category!: RulebookCategory;

@Property({ type: 'integer', fieldName: 'year' })
  season!: number;

  @Property({ type: 'text', fieldName: 'pdf_url' })
  pdfUrl!: string;

@Property({ type: 'boolean', fieldName: 'is_active' })
  isActive: boolean = true;

  @Property({ type: 'text', default: 'active' })
  status: string = 'active';

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'integer', fieldName: 'display_order', nullable: true })
  displayOrder?: number;

  @Property({ type: 'jsonb', nullable: true, fieldName: 'summary_points' })
  summaryPoints?: any;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
