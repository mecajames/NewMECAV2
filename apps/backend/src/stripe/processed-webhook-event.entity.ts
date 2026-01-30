import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

/**
 * Entity to track processed Stripe webhook events for idempotency.
 * Stripe may send the same webhook multiple times during retries,
 * so we need to track which events have been processed to avoid
 * duplicate operations (memberships, orders, invoices, etc.)
 */
@Entity({ tableName: 'processed_webhook_events', schema: 'public' })
export class ProcessedWebhookEvent {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', fieldName: 'stripe_event_id' })
  @Index()
  stripeEventId!: string;

  @Property({ type: 'text', fieldName: 'event_type' })
  eventType!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'payment_intent_id' })
  paymentIntentId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'payment_type' })
  paymentType?: string;

  @Property({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Property({ type: 'text', nullable: true, fieldName: 'processing_result' })
  processingResult?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'error_message' })
  errorMessage?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'processed_at' })
  processedAt: Date = new Date();
}
