import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { ShopProductCategory } from '@newmeca/shared';

@Entity({ tableName: 'shop_products', schema: 'public' })
export class ShopProduct {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'short_description' })
  shortDescription?: string;

  @Enum(() => ShopProductCategory)
  @Property({ fieldName: 'category' })
  category!: ShopProductCategory;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'compare_at_price' })
  compareAtPrice?: number;

  @Property({ type: 'boolean', fieldName: 'is_active', default: true })
  isActive: boolean = true;

  @Property({ type: 'boolean', fieldName: 'is_featured', default: false })
  isFeatured: boolean = false;

  @Property({ type: 'integer', fieldName: 'display_order', default: 0 })
  displayOrder: number = 0;

  @Property({ type: 'text', nullable: true, fieldName: 'image_url' })
  imageUrl?: string;

  @Property({ type: 'jsonb', nullable: true, fieldName: 'additional_images' })
  additionalImages?: string[];

  @Property({ type: 'text', nullable: true })
  sku?: string;

  @Property({ type: 'integer', fieldName: 'stock_quantity', default: -1 })
  stockQuantity: number = -1; // -1 = unlimited

  @Property({ type: 'boolean', fieldName: 'track_inventory', default: false })
  trackInventory: boolean = false;

  @Property({ type: 'text', nullable: true, fieldName: 'stripe_product_id' })
  stripeProductId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'stripe_price_id' })
  stripePriceId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'quickbooks_item_id' })
  quickbooksItemId?: string;

  @Property({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
