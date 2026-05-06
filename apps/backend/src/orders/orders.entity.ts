import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  OneToOne,
  Collection,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { OrderStatus, OrderType } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { Payment } from '../payments/payments.entity';
import { OrderItem } from './order-items.entity';

@Entity({ tableName: 'orders', schema: 'public' })
export class Order {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'varchar', length: 50, unique: true, fieldName: 'order_number' })
  orderNumber!: string;

  // User who placed the order (maps to member_id in database).
  // Note: this is exposed in JSON as `member` (matches the property name).
  // The frontend reads both `order.member` and falls back to `order.user`
  // for backwards compatibility with older code paths.
  @ManyToOne(() => Profile, { nullable: true, fieldName: 'member_id' })
  member?: Profile;

  @Enum(() => OrderStatus)
  @Property({ fieldName: 'status' })
  status: OrderStatus = OrderStatus.PENDING;

  @Enum(() => OrderType)
  @Property({ fieldName: 'order_type' })
  orderType!: OrderType;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  tax: string = '0.00';

  @Property({ type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  discount: string = '0.00';

  @Property({ type: 'varchar', length: 50, nullable: true, fieldName: 'coupon_code', serializedName: 'coupon_code' })
  couponCode?: string;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  total!: string;

  @Property({ type: 'varchar', length: 3, default: 'USD' })
  currency: string = 'USD';

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'jsonb', nullable: true, fieldName: 'billing_address' })
  billingAddress?: {
    name?: string;
    email?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  @Property({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // Guest checkout support (for orders without a user account)
  @Property({ type: 'varchar', length: 255, nullable: true, fieldName: 'guest_email' })
  guestEmail?: string;

  @Property({ type: 'varchar', length: 255, nullable: true, fieldName: 'guest_name' })
  guestName?: string;

  // Cross-reference to shop order (for SHOP type orders)
  @Property({ type: 'jsonb', nullable: true, fieldName: 'shop_order_reference' })
  shopOrderReference?: {
    shopOrderId: string;
    shopOrderNumber: string;
  };

  @OneToMany(() => OrderItem, (item) => item.order)
  items = new Collection<OrderItem>(this);

  @ManyToOne(() => Payment, { nullable: true, fieldName: 'payment_id' })
  payment?: Payment;

  // Forward reference to Invoice - will be set when invoice is created
  @Property({ type: 'uuid', nullable: true, fieldName: 'invoice_id' })
  invoiceId?: string;

  @Property({ type: 'timestamptz', onCreate: () => new Date(), fieldName: 'created_at', defaultRaw: 'now()' })
  createdAt?: Date;

  @Property({ type: 'timestamptz', onUpdate: () => new Date(), fieldName: 'updated_at', defaultRaw: 'now()' })
  updatedAt?: Date;

  /**
   * Computed at query time — true when this is a *membership* order whose
   * owner already had a prior completed membership order. Lets the UI
   * distinguish "New Membership" from "Membership Renewal" without relying
   * on order-number string parsing (which doesn't work for legacy PMPRO-*
   * orders imported from the old WordPress system).
   *
   * `persist: false` keeps it out of INSERT/UPDATE — the value is filled
   * in by OrdersService.findAll / findById after the rows are loaded.
   */
  @Property({ persist: false })
  is_renewal?: boolean;
}
