import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { InvoiceItemType } from '@newmeca/shared';
import { Invoice } from './invoices.entity';
import { Membership } from '../memberships/memberships.entity';

@Entity({ tableName: 'invoice_items', schema: 'public' })
export class InvoiceItem {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Invoice, { fieldName: 'invoice_id' })
  invoice!: Invoice;

  @Property({ type: 'text' })
  description!: string;

  @Property({ type: 'int', default: 1 })
  quantity: number = 1;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'unit_price' })
  unitPrice!: string;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  total!: string;

  @Enum(() => InvoiceItemType)
  @Property({ fieldName: 'item_type' })
  itemType!: InvoiceItemType;

  @Property({ type: 'uuid', nullable: true, fieldName: 'reference_id' })
  referenceId?: string;

  @Property({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // For consolidated invoices: the secondary membership this line item is for
  // Null for master membership line items or non-consolidated invoices
  @ManyToOne(() => Membership, { nullable: true, fieldName: 'secondary_membership_id' })
  secondaryMembership?: Membership;

  @Property({ type: 'timestamptz', onCreate: () => new Date(), fieldName: 'created_at', defaultRaw: 'now()' })
  createdAt?: Date;
}
