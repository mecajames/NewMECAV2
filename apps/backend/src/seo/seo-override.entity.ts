import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'seo_overrides', schema: 'public' })
export class SeoOverride {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', unique: true, fieldName: 'url_path' })
  url_path!: string;

  @Property({ type: 'text', nullable: true })
  title?: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'canonical_url' })
  canonical_url?: string;

  @Property({ type: 'boolean', default: false })
  noindex: boolean = false;

  @Property({ type: 'text', nullable: true, fieldName: 'og_image' })
  og_image?: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'updated_by' })
  updated_by?: string;

  @Property({ type: 'timestamptz', fieldName: 'created_at', onCreate: () => new Date() })
  created_at: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onCreate: () => new Date(), onUpdate: () => new Date() })
  updated_at: Date = new Date();
}
