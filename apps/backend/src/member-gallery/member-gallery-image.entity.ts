import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'member_gallery_images', schema: 'public' })
export class MemberGalleryImage {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'member_id' })
  member!: Profile;

  @Property({ type: 'text', fieldName: 'image_url', serializedName: 'image_url' })
  imageUrl!: string;

  @Property({ type: 'text', nullable: true })
  caption?: string;

  @Property({ type: 'integer', default: 0, fieldName: 'sort_order', serializedName: 'sort_order' })
  sortOrder: number = 0;

  @Property({ type: 'boolean', default: true, fieldName: 'is_public', serializedName: 'is_public' })
  isPublic: boolean = true;

  @Property({ type: 'timestamptz', fieldName: 'uploaded_at', serializedName: 'uploaded_at', onCreate: () => new Date() })
  uploadedAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'created_at', serializedName: 'created_at', onCreate: () => new Date() })
  createdAt: Date = new Date();
}
