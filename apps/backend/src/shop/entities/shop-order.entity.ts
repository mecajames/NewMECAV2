import { Entity, PrimaryKey, Property, Enum, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { ShopOrderStatus, ShopAddress } from '@newmeca/shared';
import { Profile } from '../../profiles/profiles.entity';
import { ShopOrderItem } from './shop-order-item.entity';

@Entity({ tableName: 'shop_orders', schema: 'public' })
export class ShopOrder {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', unique: true, fieldName: 'order_number' })
  orderNumber!: string;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'user_id' })
  user?: Profile;

  @Property({ type: 'text', nullable: true, fieldName: 'guest_email' })
  guestEmail?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'guest_name' })
  guestName?: string;

  @Enum(() => ShopOrderStatus)
  @Property({ fieldName: 'status' })
  status: ShopOrderStatus = ShopOrderStatus.PENDING;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'shipping_amount', default: 0 })
  shippingAmount: number = 0;

  @Property({ type: 'text', nullable: true, fieldName: 'shipping_method' })
  shippingMethod?: string; // 'standard' or 'priority'

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'tax_amount', default: 0 })
  taxAmount: number = 0;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'total_amount' })
  totalAmount!: number;

  @Property({ type: 'text', nullable: true, fieldName: 'stripe_payment_intent_id' })
  stripePaymentIntentId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'stripe_charge_id' })
  stripeChargeId?: string;

  // Cross-reference to billing Order (created after payment for financial records)
  @Property({ type: 'uuid', nullable: true, fieldName: 'billing_order_id' })
  billingOrderId?: string;

  @OneToMany(() => ShopOrderItem, (item) => item.order)
  items = new Collection<ShopOrderItem>(this);

  @Property({ type: 'jsonb', nullable: true, fieldName: 'shipping_address' })
  shippingAddress?: ShopAddress;

  @Property({ type: 'jsonb', nullable: true, fieldName: 'billing_address' })
  billingAddress?: ShopAddress;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'admin_notes' })
  adminNotes?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'tracking_number' })
  trackingNumber?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'shipped_at' })
  shippedAt?: Date;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
