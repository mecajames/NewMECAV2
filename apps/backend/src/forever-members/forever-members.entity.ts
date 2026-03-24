import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'forever_members', schema: 'public' })
export class ForeverMember {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', unique: true, fieldName: 'meca_id', serializedName: 'meca_id' })
  mecaId!: string;

  @Property({ type: 'text', fieldName: 'full_name', serializedName: 'full_name' })
  fullName!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'photo_url', serializedName: 'photo_url' })
  photoUrl?: string;

  @Property({ type: 'text', nullable: true })
  bio?: string;

  @Property({ type: 'text', nullable: true })
  quote?: string;

  @Property({ type: 'date', nullable: true, fieldName: 'date_of_birth', serializedName: 'date_of_birth' })
  dateOfBirth?: Date;

  @Property({ type: 'date', nullable: true, fieldName: 'date_of_passing', serializedName: 'date_of_passing' })
  dateOfPassing?: Date;

  @Property({ type: 'date', nullable: true, fieldName: 'member_since', serializedName: 'member_since' })
  memberSince?: Date;

  @Property({ type: 'integer', default: 0, fieldName: 'display_order', serializedName: 'display_order' })
  displayOrder: number = 0;

  @Property({ type: 'boolean', default: false, fieldName: 'is_published', serializedName: 'is_published' })
  isPublished: boolean = false;

  @Property({ type: 'uuid', nullable: true, fieldName: 'created_by', serializedName: 'created_by' })
  createdBy?: string;

  @Property({ type: 'timestamptz', fieldName: 'created_at', serializedName: 'created_at', onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', serializedName: 'updated_at', onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
