# Billing Database Schema

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BILLING ENTITIES                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│     profiles     │         │      orders      │         │   order_items    │
│    (existing)    │         │      (new)       │         │      (new)       │
├──────────────────┤         ├──────────────────┤         ├──────────────────┤
│ id               │◄───┐    │ id               │◄───┐    │ id               │
│ email            │    │    │ user_id          │────┘    │ order_id         │────┐
│ first_name       │    │    │ order_number     │         │ description      │    │
│ last_name        │    │    │ status           │         │ quantity         │    │
│ role             │    │    │ subtotal         │         │ unit_price       │    │
│ ...              │    │    │ tax              │         │ total            │    │
└──────────────────┘    │    │ discount         │         │ item_type        │    │
         ▲              │    │ total            │         │ reference_id     │    │
         │              │    │ currency         │         │ metadata         │    │
         │              │    │ notes            │         └──────────────────┘    │
         │              │    │ metadata         │                                 │
         │              │    │ created_at       │◄────────────────────────────────┘
         │              │    │ updated_at       │
         │              │    └──────────────────┘
         │              │              │
         │              │              │ 1:1
         │              │              ▼
         │              │    ┌──────────────────┐         ┌──────────────────┐
         │              │    │     invoices     │         │  invoice_items   │
         │              │    │      (new)       │         │      (new)       │
         │              │    ├──────────────────┤         ├──────────────────┤
         │              └───►│ id               │◄───┐    │ id               │
         │                   │ user_id          │    │    │ invoice_id       │────┐
         │                   │ order_id         │────┘    │ description      │    │
         └───────────────────│ invoice_number   │         │ quantity         │    │
                             │ status           │         │ unit_price       │    │
┌──────────────────┐         │ subtotal         │         │ total            │    │
│     payments     │         │ tax              │         │ item_type        │    │
│    (existing)    │         │ discount         │         │ reference_id     │    │
├──────────────────┤         │ total            │         └──────────────────┘    │
│ id               │◄────────│ currency         │                                 │
│ user_id          │         │ due_date         │◄────────────────────────────────┘
│ membership_id    │         │ paid_at          │
│ payment_type     │         │ sent_at          │
│ payment_method   │         │ pdf_url          │
│ payment_status   │         │ notes            │
│ amount           │         │ billing_address  │
│ ...              │         │ created_at       │
└──────────────────┘         │ updated_at       │
                             └──────────────────┘
```

## New Entities

### Order Entity

```typescript
// apps/backend/src/orders/orders.entity.ts
import { Entity, Property, ManyToOne, OneToMany, Enum, PrimaryKey } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Profile } from '../profiles/profiles.entity';
import { OrderItem } from './order-items.entity';
import { Invoice } from '../invoices/invoices.entity';
import { Payment } from '../payments/payments.entity';
import { OrderStatus, OrderType } from '@newmeca/shared';

@Entity({ tableName: 'orders' })
export class Order {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property({ type: 'varchar', length: 50, unique: true })
  orderNumber!: string; // ORD-2024-00001

  @ManyToOne(() => Profile, { nullable: true })
  user?: Profile;

  @Enum(() => OrderStatus)
  status: OrderStatus = OrderStatus.PENDING;

  @Enum(() => OrderType)
  orderType!: OrderType;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  tax: string = '0.00';

  @Property({ type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  discount: string = '0.00';

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  total!: string;

  @Property({ type: 'varchar', length: 3, default: 'USD' })
  currency: string = 'USD';

  @Property({ type: 'text', nullable: true })
  notes?: string;

  // Billing address for guest orders
  @Property({ type: 'jsonb', nullable: true })
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

  // Relationships
  @OneToMany(() => OrderItem, (item) => item.order)
  items!: OrderItem[];

  @ManyToOne(() => Payment, { nullable: true })
  payment?: Payment;

  @ManyToOne(() => Invoice, { nullable: true })
  invoice?: Invoice;

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
```

### OrderItem Entity

```typescript
// apps/backend/src/orders/order-items.entity.ts
import { Entity, Property, ManyToOne, Enum, PrimaryKey } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Order } from './orders.entity';
import { OrderItemType } from '@newmeca/shared';

@Entity({ tableName: 'order_items' })
export class OrderItem {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @ManyToOne(() => Order)
  order!: Order;

  @Property({ type: 'text' })
  description!: string;

  @Property({ type: 'int', default: 1 })
  quantity: number = 1;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: string;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  total!: string;

  @Enum(() => OrderItemType)
  itemType!: OrderItemType;

  // Reference to the source entity (membership ID, event registration ID, etc.)
  @Property({ type: 'uuid', nullable: true })
  referenceId?: string;

  @Property({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();
}
```

### Invoice Entity

```typescript
// apps/backend/src/invoices/invoices.entity.ts
import { Entity, Property, ManyToOne, OneToMany, OneToOne, Enum, PrimaryKey } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Profile } from '../profiles/profiles.entity';
import { Order } from '../orders/orders.entity';
import { InvoiceItem } from './invoice-items.entity';
import { InvoiceStatus } from '@newmeca/shared';

@Entity({ tableName: 'invoices' })
export class Invoice {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property({ type: 'varchar', length: 50, unique: true })
  invoiceNumber!: string; // INV-2024-00001

  @ManyToOne(() => Profile, { nullable: true })
  user?: Profile;

  @OneToOne(() => Order, { nullable: true })
  order?: Order;

  @Enum(() => InvoiceStatus)
  status: InvoiceStatus = InvoiceStatus.DRAFT;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  tax: string = '0.00';

  @Property({ type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  discount: string = '0.00';

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  total!: string;

  @Property({ type: 'varchar', length: 3, default: 'USD' })
  currency: string = 'USD';

  @Property({ type: 'date', nullable: true })
  dueDate?: Date;

  @Property({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @Property({ type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @Property({ type: 'text', nullable: true })
  pdfUrl?: string;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  // Billing information
  @Property({ type: 'jsonb', nullable: true })
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
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    taxId?: string;
  };

  @Property({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // Relationships
  @OneToMany(() => InvoiceItem, (item) => item.invoice)
  items!: InvoiceItem[];

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
```

### InvoiceItem Entity

```typescript
// apps/backend/src/invoices/invoice-items.entity.ts
import { Entity, Property, ManyToOne, Enum, PrimaryKey } from '@mikro-orm/core';
import { v4 } from 'uuid';
import { Invoice } from './invoices.entity';
import { InvoiceItemType } from '@newmeca/shared';

@Entity({ tableName: 'invoice_items' })
export class InvoiceItem {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @ManyToOne(() => Invoice)
  invoice!: Invoice;

  @Property({ type: 'text' })
  description!: string;

  @Property({ type: 'int', default: 1 })
  quantity: number = 1;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: string;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  total!: string;

  @Enum(() => InvoiceItemType)
  itemType!: InvoiceItemType;

  // Reference to source (membership, event registration, etc.)
  @Property({ type: 'uuid', nullable: true })
  referenceId?: string;

  @Property({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();
}
```

## New Enums (Shared Package)

```typescript
// packages/shared/src/schemas/enums.schema.ts

// Order Status
export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}
export const OrderStatusSchema = z.nativeEnum(OrderStatus);

// Order Type
export enum OrderType {
  MEMBERSHIP = 'membership',
  EVENT_REGISTRATION = 'event_registration',
  MANUAL = 'manual',
}
export const OrderTypeSchema = z.nativeEnum(OrderType);

// Order Item Type
export enum OrderItemType {
  MEMBERSHIP = 'membership',
  EVENT_CLASS = 'event_class',
  PROCESSING_FEE = 'processing_fee',
  DISCOUNT = 'discount',
  OTHER = 'other',
}
export const OrderItemTypeSchema = z.nativeEnum(OrderItemType);

// Invoice Status
export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}
export const InvoiceStatusSchema = z.nativeEnum(InvoiceStatus);

// Invoice Item Type
export enum InvoiceItemType {
  MEMBERSHIP = 'membership',
  EVENT_CLASS = 'event_class',
  PROCESSING_FEE = 'processing_fee',
  DISCOUNT = 'discount',
  TAX = 'tax',
  OTHER = 'other',
}
export const InvoiceItemTypeSchema = z.nativeEnum(InvoiceItemType);
```

## Database Migration

```typescript
// apps/backend/src/migrations/Migration202XXXXX_create_billing_tables.ts
import { Migration } from '@mikro-orm/migrations';

export class Migration202XXXXX_create_billing_tables extends Migration {
  async up(): Promise<void> {
    // Create orders table
    this.addSql(`
      CREATE TABLE orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        order_type VARCHAR(30) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        total DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        notes TEXT,
        billing_address JSONB,
        metadata JSONB,
        payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_orders_user ON orders(user_id);
      CREATE INDEX idx_orders_status ON orders(status);
      CREATE INDEX idx_orders_order_number ON orders(order_number);
      CREATE INDEX idx_orders_created_at ON orders(created_at);
    `);

    // Create order_items table
    this.addSql(`
      CREATE TABLE order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        item_type VARCHAR(30) NOT NULL,
        reference_id UUID,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_order_items_order ON order_items(order_id);
      CREATE INDEX idx_order_items_reference ON order_items(reference_id);
    `);

    // Create invoices table
    this.addSql(`
      CREATE TABLE invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        order_id UUID UNIQUE REFERENCES orders(id) ON DELETE SET NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        subtotal DECIMAL(10, 2) NOT NULL,
        tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        total DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        due_date DATE,
        paid_at TIMESTAMPTZ,
        sent_at TIMESTAMPTZ,
        pdf_url TEXT,
        notes TEXT,
        billing_address JSONB,
        company_info JSONB,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_invoices_user ON invoices(user_id);
      CREATE INDEX idx_invoices_order ON invoices(order_id);
      CREATE INDEX idx_invoices_status ON invoices(status);
      CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
      CREATE INDEX idx_invoices_created_at ON invoices(created_at);
    `);

    // Create invoice_items table
    this.addSql(`
      CREATE TABLE invoice_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        item_type VARCHAR(30) NOT NULL,
        reference_id UUID,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
      CREATE INDEX idx_invoice_items_reference ON invoice_items(reference_id);
    `);

    // Add invoice_id to orders (for back-reference)
    this.addSql(`
      ALTER TABLE orders
      ADD COLUMN invoice_id UUID UNIQUE REFERENCES invoices(id) ON DELETE SET NULL;
    `);

    // Sequence for order and invoice numbers
    this.addSql(`
      CREATE SEQUENCE order_number_seq START 1;
      CREATE SEQUENCE invoice_number_seq START 1;
    `);
  }

  async down(): Promise<void> {
    this.addSql('DROP SEQUENCE IF EXISTS invoice_number_seq;');
    this.addSql('DROP SEQUENCE IF EXISTS order_number_seq;');
    this.addSql('DROP TABLE IF EXISTS invoice_items;');
    this.addSql('DROP TABLE IF EXISTS invoices;');
    this.addSql('DROP TABLE IF EXISTS order_items;');
    this.addSql('DROP TABLE IF EXISTS orders;');
  }
}
```

## Number Generation Functions

```sql
-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
  seq_val INT;
  year_str VARCHAR;
BEGIN
  SELECT nextval('order_number_seq') INTO seq_val;
  SELECT TO_CHAR(NOW(), 'YYYY') INTO year_str;
  RETURN 'ORD-' || year_str || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR AS $$
DECLARE
  seq_val INT;
  year_str VARCHAR;
BEGIN
  SELECT nextval('invoice_number_seq') INTO seq_val;
  SELECT TO_CHAR(NOW(), 'YYYY') INTO year_str;
  RETURN 'INV-' || year_str || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
```

## Relationships Summary

| Table | Relationship | Related Table | Type |
|-------|--------------|---------------|------|
| `orders` | belongs_to | `profiles` | Many-to-One |
| `orders` | has_many | `order_items` | One-to-Many |
| `orders` | belongs_to | `payments` | Many-to-One |
| `orders` | has_one | `invoices` | One-to-One |
| `order_items` | belongs_to | `orders` | Many-to-One |
| `invoices` | belongs_to | `profiles` | Many-to-One |
| `invoices` | belongs_to | `orders` | One-to-One |
| `invoices` | has_many | `invoice_items` | One-to-Many |
| `invoice_items` | belongs_to | `invoices` | Many-to-One |
