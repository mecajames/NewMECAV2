import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { MediaType } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'media_files', schema: 'public' })
export class MediaFile {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', fieldName: 'file_url' })
  fileUrl!: string;

  @Property({ type: 'text', fieldName: 'file_type' })
  fileType!: MediaType;

  @Property({ type: 'bigint', fieldName: 'file_size' })
  fileSize: number = 0;

  @Property({ type: 'text', fieldName: 'mime_type' })
  mimeType!: string;

  @Property({ type: 'text', nullable: true })
  dimensions?: string;

  @Property({ type: 'boolean', fieldName: 'is_external' })
  isExternal: boolean = false;

  @Property({ type: 'array', nullable: true })
  tags?: string[];

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'created_by' })
  createdBy?: Profile;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
