import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { RefundGateway, RefundSourceType, RefundStatus } from '@newmeca/shared';
import { Payment } from './payments.entity';

/**
 * First-class refund ledger. Every refund — full or partial, Stripe or PayPal or
 * a manual reversal — writes one row here, linked to the originating Payment and
 * to the source purchase (membership / shop order / event reg / world finals /
 * invoice / order). This is the single auditable record of money returned.
 */
@Entity({ tableName: 'refunds', schema: 'public' })
export class Refund {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Payment, { nullable: true, fieldName: 'payment_id' })
  payment?: Payment;

  @Enum(() => RefundSourceType)
  @Property({ fieldName: 'source_type' })
  sourceType!: RefundSourceType;

  @Property({ type: 'uuid', nullable: true, fieldName: 'source_id' })
  sourceId?: string;

  @Enum(() => RefundGateway)
  @Property({ nullable: true })
  gateway?: RefundGateway;

  @Property({ type: 'text', nullable: true, fieldName: 'gateway_refund_id' })
  gatewayRefundId?: string;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  amount!: string;

  @Property({ type: 'varchar', length: 3, default: 'USD' })
  currency: string = 'USD';

  @Property({ type: 'text', nullable: true })
  reason?: string;

  @Property({ type: 'boolean', default: false, fieldName: 'is_partial' })
  isPartial: boolean = false;

  @Enum(() => RefundStatus)
  status: RefundStatus = RefundStatus.SUCCEEDED;

  @Property({ type: 'uuid', nullable: true, fieldName: 'created_by' })
  createdBy?: string;

  @Property({ type: 'timestamptz', onCreate: () => new Date(), fieldName: 'created_at', defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date(), fieldName: 'updated_at', defaultRaw: 'now()' })
  updatedAt: Date = new Date();
}
