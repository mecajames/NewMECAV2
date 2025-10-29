import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { Profile } from '../profiles/profiles.entity';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  PDF = 'pdf',
  DOCUMENT = 'document',
  OTHER = 'other',
}

@Entity({ tableName: 'media_files', schema: 'public' })
export class MediaFile {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', fieldName: 'file_url' })
  fileUrl!: string;

  @Enum(() => MediaType)
  @Property({ type: 'text', fieldName: 'file_type' })
  fileType!: MediaType;

  @Property({ type: 'bigint', fieldName: 'file_size' })
  fileSize!: number;

  @Property({ type: 'text', fieldName: 'mime_type' })
  mimeType!: string;

  @Property({ type: 'text', nullable: true })
  dimensions?: string;

  @Property({ type: 'boolean', fieldName: 'is_external' })
  isExternal: boolean = false;

  @Property({ type: 'text[]', nullable: true })
  tags?: string[];

  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'created_by' })
  createdBy?: Profile;
}
