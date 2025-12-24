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
import { InvoiceStatus } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { Order } from '../orders/orders.entity';
import { InvoiceItem } from './invoice-items.entity';

@Entity({ tableName: 'invoices', schema: 'public' })
export class Invoice {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'varchar', length: 50, unique: true, fieldName: 'invoice_number' })
  invoiceNumber!: string;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'user_id' })
  user?: Profile;

  @OneToOne(() => Order, { nullable: true, fieldName: 'order_id', owner: true })
  order?: Order;

  @Enum(() => InvoiceStatus)
  @Property({ fieldName: 'status' })
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

  @Property({ type: 'date', nullable: true, fieldName: 'due_date' })
  dueDate?: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'paid_at' })
  paidAt?: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'sent_at' })
  sentAt?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'pdf_url' })
  pdfUrl?: string;

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

  @Property({ type: 'jsonb', nullable: true, fieldName: 'company_info' })
  companyInfo?: {
    name: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    phone?: string;
    email?: string;
    website?: string;
    taxId?: string;
  };

  @Property({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @OneToMany(() => InvoiceItem, (item) => item.invoice)
  items = new Collection<InvoiceItem>(this);

  @Property({ type: 'timestamptz', onCreate: () => new Date(), fieldName: 'created_at', defaultRaw: 'now()' })
  createdAt?: Date;

  @Property({ type: 'timestamptz', onUpdate: () => new Date(), fieldName: 'updated_at', defaultRaw: 'now()' })
  updatedAt?: Date;
}
