import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';
import { Invoice } from '../invoices/invoices.entity';

export type RecurringFrequency = 'monthly' | 'quarterly' | 'annual';

export interface RecurringLineItem {
  description: string;
  quantity: number;
  unitPrice: string;
  itemType: string;
  referenceId?: string;
}

export interface RecurringBillingAddress {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

@Entity({ tableName: 'recurring_invoice_templates', schema: 'public' })
export class RecurringInvoiceTemplate {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'user_id' })
  user?: Profile;

  @Property({ type: 'varchar', length: 255 })
  name!: string;

  @Property({ type: 'jsonb', fieldName: 'line_items' })
  lineItems!: RecurringLineItem[];

  @Property({ type: 'jsonb', nullable: true, fieldName: 'billing_address' })
  billingAddress?: RecurringBillingAddress;

  @Property({ type: 'decimal', precision: 10, scale: 2, default: '0' })
  tax: string = '0';

  @Property({ type: 'decimal', precision: 10, scale: 2, default: '0' })
  discount: string = '0';

  @Property({ type: 'varchar', length: 50, nullable: true, fieldName: 'coupon_code' })
  couponCode?: string;

  @Property({ type: 'varchar', length: 3, default: 'USD' })
  currency: string = 'USD';

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'varchar', length: 20 })
  frequency!: RecurringFrequency;

  @Property({ type: 'date', fieldName: 'next_run_date' })
  nextRunDate!: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'last_run_at' })
  lastRunAt?: Date;

  @ManyToOne(() => Invoice, { nullable: true, fieldName: 'last_invoice_id' })
  lastInvoice?: Invoice;

  @Property({ type: 'int', default: 0, fieldName: 'run_count' })
  runCount: number = 0;

  @Property({ type: 'boolean', default: true })
  active: boolean = true;

  @Property({ type: 'timestamptz', onCreate: () => new Date(), fieldName: 'created_at', defaultRaw: 'now()' })
  createdAt?: Date;

  @Property({ type: 'timestamptz', onUpdate: () => new Date(), fieldName: 'updated_at', defaultRaw: 'now()' })
  updatedAt?: Date;
}
