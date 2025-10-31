import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

export type RulebookCategory = 'SPL Rulebook' | 'SQL Rulebook' | 'MECA Kids' | 'Dueling Demos' | 'Show and Shine' | 'Ride the Light';
export type RulebookStatus = 'active' | 'inactive' | 'archive';

@Entity({ tableName: 'rulebooks', schema: 'public' })
export class Rulebook {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text' })
  category!: RulebookCategory;

  @Property({ type: 'text' })
  season!: string;

  @Property({ type: 'text', fieldName: 'pdf_url' })
  pdfUrl!: string;

  @Property({ type: 'text' })
  status: RulebookStatus = 'active';

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'integer', fieldName: 'display_order', nullable: true })
  displayOrder?: number;

  @Property({ type: 'jsonb', nullable: true, fieldName: 'summary_points' })
  summaryPoints?: any;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'created_by' })
  createdBy?: Profile;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
