/**
 * Single source of truth for the Stripe event types this backend handles.
 *
 * Every entry must have a `case` in StripeController.handleWebhook's switch
 * statement, and every case there (other than `default`) should appear here.
 * StripeService.onApplicationBootstrap calls verifyWebhookSubscription() at
 * startup to compare this list against what the Stripe webhook endpoint(s)
 * are actually subscribed to, and logs a loud warning if anything is missing.
 *
 * Background: on 2026-05-26 the live webhook subscription on prod had drifted
 * away from the handler list — invoice.* and customer.subscription.* were
 * missing despite handlers existing — silently dropping subscription renewals
 * for months. The startup check exists to surface that kind of drift the
 * moment a deploy boots.
 */
export const REQUIRED_STRIPE_WEBHOOK_EVENTS = [
  // Payment intent lifecycle
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.processing',
  'payment_intent.requires_action',
  'payment_intent.amount_capturable_updated',

  // Charge lifecycle
  'charge.succeeded',
  'charge.failed',
  'charge.captured',
  'charge.refunded',
  'charge.refund.updated',

  // Disputes
  'charge.dispute.created',
  'charge.dispute.closed',

  // Subscriptions + invoices (the ones that were dropped pre-2026-05-26)
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
  'checkout.session.completed',

  // Account / radar / setup / source (mostly logged)
  'account.updated',
  'review.opened',
  'review.closed',
  'setup_intent.succeeded',
  'setup_intent.setup_failed',
  'source.canceled',
  'source.chargeable',
] as const;

export type RequiredStripeWebhookEvent = (typeof REQUIRED_STRIPE_WEBHOOK_EVENTS)[number];
