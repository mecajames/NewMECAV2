import { Entity, PrimaryKey, Property, Index, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

/**
 * Entity to track processed PayPal webhook events for idempotency.
 * PayPal may send the same webhook multiple times during retries,
 * so we need to track which events have been processed to avoid
 * duplicate operations (memberships, orders, invoices, etc.)
 */
@Entity({ tableName: 'processed_paypal_webhooks', schema: 'public' })
export class ProcessedPaypalWebhook {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', fieldName: 'paypal_event_id' })
  @Index()
  @Unique()
  paypalEventId!: string;

  @Property({ type: 'text', fieldName: 'event_type' })
  eventType!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'paypal_order_id' })
  paypalOrderId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'processing_result' })
  processingResult?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'error_message' })
  errorMessage?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'processed_at' })
  processedAt: Date = new Date();
}
