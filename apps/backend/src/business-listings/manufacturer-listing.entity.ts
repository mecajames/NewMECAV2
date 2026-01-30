import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

// Gallery image with optional product link
export interface GalleryImage {
  url: string;
  caption?: string;
  productLink?: string;
}

@Entity({ tableName: 'manufacturer_listings', schema: 'public' })
export class ManufacturerListing {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  // Owner of this listing (the user who created it)
  @ManyToOne(() => Profile, { nullable: true, fieldName: 'user_id' })
  user?: Profile;

  // Virtual getter for userId (for backward compatibility)
  get userId(): string | undefined {
    return this.user?.id;
  }

  @Property({ type: 'text', fieldName: 'business_name' })
  businessName!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'business_email' })
  businessEmail?: string;

  @Property({ type: 'varchar', length: 50, nullable: true, fieldName: 'business_phone' })
  businessPhone?: string;

  @Property({ type: 'text', nullable: true })
  website?: string;

  // Product categories/types they manufacture
  @Property({ type: 'json', nullable: true, fieldName: 'product_categories' })
  productCategories?: string[];

  // Address fields (for headquarters)
  @Property({ type: 'text', nullable: true, fieldName: 'street_address' })
  streetAddress?: string;

  @Property({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Property({ type: 'varchar', length: 50, nullable: true })
  state?: string;

  @Property({ type: 'varchar', length: 20, nullable: true, fieldName: 'postal_code' })
  postalCode?: string;

  @Property({ type: 'varchar', length: 100, nullable: true, default: 'USA' })
  country?: string = 'USA';

  // Profile/logo image
  @Property({ type: 'text', nullable: true, fieldName: 'profile_image_url' })
  profileImageUrl?: string;

  // Gallery images (up to 6 with optional product links)
  @Property({ type: 'json', fieldName: 'gallery_images', nullable: true })
  galleryImages?: GalleryImage[];

  // Cover image position for header display
  @Property({ type: 'json', nullable: true, fieldName: 'cover_image_position' })
  coverImagePosition?: { x: number; y: number };

  // Sponsor settings
  @Property({ type: 'boolean', default: false, fieldName: 'is_sponsor' })
  isSponsor: boolean = false;

  @Property({ type: 'integer', nullable: true, fieldName: 'sponsor_order' })
  sponsorOrder?: number;

  // Listing status
  @Property({ type: 'boolean', default: true, fieldName: 'is_active' })
  isActive: boolean = true;

  @Property({ type: 'boolean', default: false, fieldName: 'is_approved' })
  isApproved: boolean = false;

  // Listing validity dates (aligns with membership dates)
  @Property({ type: 'date', nullable: true, fieldName: 'start_date' })
  startDate?: Date;

  @Property({ type: 'date', nullable: true, fieldName: 'end_date' })
  endDate?: Date;

  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
