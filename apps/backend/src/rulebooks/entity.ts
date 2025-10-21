import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Profile } from '../profiles/entity';

@Entity({ tableName: 'rulebooks', schema: 'public' })
export class Rulebook {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

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

  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
