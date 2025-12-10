import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { MembershipCategory, ManufacturerTier } from '@newmeca/shared';

@Entity({ tableName: 'membership_type_configs', schema: 'public' })
export class MembershipTypeConfig {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Enum(() => MembershipCategory)
  @Property({ fieldName: 'category' })
  category!: MembershipCategory;

  // Tier for manufacturer memberships (bronze, silver, gold)
  @Enum({ items: () => ManufacturerTier, nullable: true })
  @Property({ fieldName: 'tier', nullable: true })
  tier?: ManufacturerTier;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Property({ type: 'varchar', length: 3, nullable: true })
  currency?: string;

  @Property({ type: 'jsonb', nullable: true })
  benefits?: string[];

  @Property({ type: 'jsonb', nullable: true, fieldName: 'required_fields' })
  requiredFields?: string[];

  @Property({ type: 'jsonb', nullable: true, fieldName: 'optional_fields' })
  optionalFields?: string[];

  @Property({ type: 'boolean', fieldName: 'is_active', default: true })
  isActive: boolean = true;

  @Property({ type: 'boolean', fieldName: 'is_featured', default: false })
  isFeatured: boolean = false;

  // Whether this membership type should be shown on the public website
  // Manufacturer memberships are admin-only
  @Property({ type: 'boolean', fieldName: 'show_on_public_site', default: true })
  showOnPublicSite: boolean = true;

  // Whether this membership type is only available as an upgrade (not shown on main membership page)
  // Used for team add-ons that require an existing competitor membership
  @Property({ type: 'boolean', fieldName: 'is_upgrade_only', default: false })
  isUpgradeOnly: boolean = false;

  @Property({ type: 'integer', fieldName: 'display_order', default: 0 })
  displayOrder: number = 0;

  @Property({ type: 'text', nullable: true, fieldName: 'stripe_price_id' })
  stripePriceId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'stripe_product_id' })
  stripeProductId?: string;

  // QuickBooks integration fields for reporting
  @Property({ type: 'text', nullable: true, fieldName: 'quickbooks_item_id' })
  quickbooksItemId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'quickbooks_account_id' })
  quickbooksAccountId?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
