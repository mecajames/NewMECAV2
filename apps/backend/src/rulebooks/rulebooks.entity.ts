import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'rulebooks', schema: 'public' })
export class Rulebook {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'integer' })
  year!: number;

  @Property({ type: 'text', nullable: true })
  category?: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', fieldName: 'file_url' })
  fileUrl!: string;

  @Property({ type: 'boolean', fieldName: 'is_active' })
  isActive: boolean = true;

  @Property({ type: 'integer', fieldName: 'display_order', nullable: true })
  displayOrder?: number;

  @Property({ type: 'jsonb', nullable: true, fieldName: 'summary_points' })
  summaryPoints?: any;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'uploaded_by' })
  uploadedBy?: Profile;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
