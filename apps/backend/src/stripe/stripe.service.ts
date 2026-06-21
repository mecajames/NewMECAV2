import { Injectable, BadRequestException, Logger, Inject, Optional, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { CreatePaymentIntentDto, PaymentIntentResult, SubscriptionBundle } from '@newmeca/shared';
import { SiteSettingsService } from '../site-settings/site-settings.service';
import { AdminNotificationsService } from '../admin-notifications/admin-notifications.service';
import { REQUIRED_STRIPE_WEBHOOK_EVENTS } from './required-webhook-events.constant';
import { ProcessedWebhookEvent } from './processed-webhook-event.entity';

/** Health-check state persisted between cron runs so we don't re-alert on every tick. */
interface StripeHealthState {
  /** Sorted, joined list of currently-missing event types — drives config-drift dedup. */
  configMissingKey?: string;
  /** Last N stripe_event_ids we've already alerted on for delivery drift. */
  deliveryAlertedEventIds?: string[];
  lastConfigAlertAt?: string;
  lastDeliveryAlertAt?: string;
}

type WebhookEndpointSummary = {
  id: string;
  url: string;
  status: string;
  subscribedCount: number;
};

const HEALTH_STATE_KEY = 'stripe_webhook_health_state';
const MAX_ALERTED_DELIVERY_IDS = 200;

@Injectable()
export class StripeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;

  // Staging mode cache to avoid DB queries for every payment
  private stagingModeCache: Map<string, { value: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(
    @Optional() @Inject(SiteSettingsService)
    private readonly siteSettingsService?: SiteSettingsService,
    @Optional() @Inject(AdminNotificationsService)
    private readonly adminNotificationsService?: AdminNotificationsService,
    @Optional() @Inject('EntityManager')
    private readonly em?: EntityManager,
  ) {
    // Stripe client is lazily initialized when needed
  }

  // ── Stripe webhook health checks ────────────────────────────────────────────
  //
  // Two flavors of drift surface here:
  //   1. CONFIG drift — Stripe webhook endpoint is subscribed to fewer events
  //      than REQUIRED_STRIPE_WEBHOOK_EVENTS. Detected by listing the live
  //      endpoint config and diffing against our constant.
  //   2. DELIVERY drift — endpoint is correctly subscribed but events still
  //      aren't reaching our DB (handler crash, endpoint 5xx, signature
  //      mismatch). Detected by listing recent Stripe events and verifying
  //      each has a matching processed_webhook_events row.
  //
  // Both run at boot AND hourly. Both dedup against state persisted in
  // site_settings so persistent drift doesn't re-spam admins every cycle.

  async onApplicationBootstrap(): Promise<void> {
    if (!this.shouldRunHealthCheck()) return;
    await this.runStripeHealthCheck('boot').catch((err) => {
      this.logger.error(`Stripe health check at boot threw (continuing startup): ${err}`);
    });
  }

  /**
   * Hourly Stripe webhook health check. Re-runs both config + delivery
   * verification so any drift introduced via the Stripe Dashboard (or a
   * silent handler outage) is surfaced within ~1 hour, not at the next deploy.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async hourlyStripeHealthCheck(): Promise<void> {
    if (!this.shouldRunHealthCheck()) return;
    await this.runStripeHealthCheck('hourly').catch((err) => {
      this.logger.error(`Stripe hourly health check threw: ${err}`);
    });
  }

  private shouldRunHealthCheck(): boolean {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) return false;
    if (!process.env.STRIPE_SECRET_KEY) {
      this.logger.log('Stripe health check skipped (STRIPE_SECRET_KEY not set)');
      return false;
    }
    if (process.env.SKIP_STRIPE_WEBHOOK_CHECK === 'true') {
      this.logger.log('Stripe health check skipped (SKIP_STRIPE_WEBHOOK_CHECK=true)');
      return false;
    }
    return true;
  }

  private async runStripeHealthCheck(trigger: 'boot' | 'hourly'): Promise<void> {
    const environment = process.env.APP_ENV || process.env.NODE_ENV || 'unknown';
    const state = await this.loadHealthState();
    const updatedState: StripeHealthState = { ...state };

    // 1. Config drift.
    try {
      const config = await this.checkWebhookConfig();
      const missingKey = [...config.missing].sort().join(',');

      if (config.missing.length === 0) {
        if (state.configMissingKey) {
          this.logger.log(
            `Stripe webhook config drift RESOLVED — all ${REQUIRED_STRIPE_WEBHOOK_EVENTS.length} required events are now subscribed (was missing: ${state.configMissingKey})`,
          );
        } else {
          this.logger.log(
            `Stripe webhook config check passed (${config.endpoints.length} enabled endpoint(s), ${REQUIRED_STRIPE_WEBHOOK_EVENTS.length} required events all covered) — trigger=${trigger}`,
          );
        }
        updatedState.configMissingKey = '';
      } else {
        this.logger.error(
          `[CRITICAL] Stripe webhook is missing ${config.missing.length} required event type(s) — ` +
          `${config.missing.join(', ')} (trigger=${trigger})`,
        );
        for (const ep of config.endpoints) {
          this.logger.warn(`  Endpoint ${ep.id} (${ep.url}) status=${ep.status} subscribedCount=${ep.subscribedCount}`);
        }

        const changed = missingKey !== state.configMissingKey;
        if (changed && this.adminNotificationsService) {
          await this.adminNotificationsService.notifyStripeWebhookDrift({
            missingEvents: [...config.missing],
            endpoints: config.endpoints,
            environment,
          }).catch((err) => {
            this.logger.error(`Failed to dispatch config-drift notification: ${err}`);
          });
          updatedState.lastConfigAlertAt = new Date().toISOString();
        } else if (!changed) {
          this.logger.log(`Config drift unchanged since ${state.lastConfigAlertAt ?? 'unknown'} — suppressing duplicate alert`);
        }
        updatedState.configMissingKey = missingKey;
      }
    } catch (err) {
      this.logger.error(`Stripe webhook config check failed: ${err}`);
    }

    // 2. Delivery drift. Skip when EM isn't wired (test contexts) since the
    //    comparison requires a query against processed_webhook_events.
    if (this.em) {
      try {
        const missing = await this.reconcileRecentWebhookDeliveries();
        const alreadyAlerted = new Set(state.deliveryAlertedEventIds ?? []);
        const newMissing = missing.filter((m) => !alreadyAlerted.has(m.eventId));

        if (missing.length === 0) {
          this.logger.log(`Stripe webhook delivery check passed — every recent event has a processed_webhook_events row (trigger=${trigger})`);
        } else if (newMissing.length === 0) {
          this.logger.log(`Stripe webhook delivery drift unchanged — ${missing.length} unprocessed events still pending admin attention (trigger=${trigger})`);
        } else {
          this.logger.error(
            `[CRITICAL] Stripe delivered ${newMissing.length} new event(s) that never reached our backend (trigger=${trigger}): ` +
            newMissing.map((m) => `${m.eventType}:${m.eventId}`).join(', '),
          );
          if (this.adminNotificationsService) {
            await this.adminNotificationsService.notifyStripeWebhookDelivery({
              missingEvents: newMissing,
              environment,
            }).catch((err) => {
              this.logger.error(`Failed to dispatch delivery-drift notification: ${err}`);
            });
            updatedState.lastDeliveryAlertAt = new Date().toISOString();
          }
        }

        // Bound the alerted-ids list so site_settings doesn't grow unbounded.
        const merged = [...alreadyAlerted, ...missing.map((m) => m.eventId)];
        const unique = Array.from(new Set(merged));
        updatedState.deliveryAlertedEventIds = unique.slice(-MAX_ALERTED_DELIVERY_IDS);
      } catch (err) {
        this.logger.error(`Stripe webhook delivery check failed: ${err}`);
      }
    } else {
      this.logger.log('Stripe webhook delivery check skipped (EntityManager not injected)');
    }

    await this.saveHealthState(updatedState).catch((err) => {
      this.logger.warn(`Failed to persist Stripe health state: ${err}`);
    });
  }

  /**
   * Compare REQUIRED_STRIPE_WEBHOOK_EVENTS against the union of enabled_events
   * across all `enabled` Stripe webhook endpoints. Multiple endpoints are
   * treated as additive — a required event is "covered" if any enabled
   * endpoint subscribes to it (or any endpoint uses the `*` wildcard).
   * Returns the missing events + a compact summary of endpoints.
   */
  private async checkWebhookConfig(): Promise<{
    missing: string[];
    endpoints: WebhookEndpointSummary[];
  }> {
    const stripe = this.getStripeClient();
    const result = await stripe.webhookEndpoints.list({ limit: 100 });
    const enabled = result.data.filter((e) => e.status === 'enabled');
    const summary: WebhookEndpointSummary[] = enabled.map((ep) => ({
      id: ep.id,
      url: ep.url,
      status: ep.status,
      subscribedCount: ep.enabled_events.length,
    }));

    if (enabled.length === 0) {
      // Every required event is "missing" if no endpoint exists at all.
      return { missing: [...REQUIRED_STRIPE_WEBHOOK_EVENTS], endpoints: summary };
    }

    const covered = new Set<string>();
    for (const ep of enabled) {
      for (const ev of ep.enabled_events) covered.add(ev);
    }
    const hasWildcard = covered.has('*');
    const missing = REQUIRED_STRIPE_WEBHOOK_EVENTS.filter((ev) => !hasWildcard && !covered.has(ev));
    return { missing, endpoints: summary };
  }

  /**
   * Pull Stripe events from the recent past and verify each one has a
   * matching row in processed_webhook_events. Anything in Stripe but not
   * in our DB is a delivery gap — the webhook hit Stripe's outbound queue
   * but never landed in our handler (endpoint 5xx, signature mismatch,
   * handler crash, app outage).
   *
   * Only events in REQUIRED_STRIPE_WEBHOOK_EVENTS are considered. Stripe's
   * events.list returns ALL account activity, including account-level events
   * we neither subscribe to nor handle (balance.available, payout.*,
   * application_fee.*, …). Those can never produce a processed_webhook_events
   * row, so without this filter every one of them would be flagged as a bogus
   * [CRITICAL] delivery gap. Intersecting with the handled-events list (the
   * same source of truth the config-drift check uses) keeps the gap check
   * focused on events that genuinely should have landed.
   *
   * Window: events created between 70 minutes ago and 5 minutes ago. The
   * trailing edge gives Stripe time to deliver + our handler time to write.
   * The leading edge overlaps the previous hourly run so a late-delivered
   * event isn't missed at the boundary.
   */
  private async reconcileRecentWebhookDeliveries(): Promise<Array<{
    eventId: string;
    eventType: string;
    createdAt: string;
    customerEmail?: string | null;
    objectId?: string | null;
  }>> {
    if (!this.em) return [];
    const stripe = this.getStripeClient();

    const nowSec = Math.floor(Date.now() / 1000);
    const window = {
      gte: nowSec - 70 * 60,
      lte: nowSec - 5 * 60,
    };

    // Pull all events in the window, paginating as needed. Stripe caps at
    // 100 per page — for a healthy hour we expect tens at most.
    const events: Stripe.Event[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const resp = await stripe.events.list({
        limit: 100,
        created: { gte: window.gte, lte: window.lte },
        ...(cursor ? { starting_after: cursor } : {}),
      });
      events.push(...resp.data);
      if (!resp.has_more) break;
      cursor = resp.data[resp.data.length - 1]?.id;
      if (!cursor) break;
    }

    // Restrict to the event types we actually subscribe to + handle. Anything
    // else (balance.available, payout.*, …) is account-level noise that never
    // lands in processed_webhook_events and would otherwise raise a false gap.
    const handled = new Set<string>(REQUIRED_STRIPE_WEBHOOK_EVENTS);
    const relevant = events.filter((e) => handled.has(e.type));
    if (relevant.length === 0) return [];

    // Find which event ids we have in our processed_webhook_events table.
    const eventIds = relevant.map((e) => e.id);
    const em = this.em.fork();
    const processed = await em.find(
      ProcessedWebhookEvent,
      { stripeEventId: { $in: eventIds } as any },
      { fields: ['stripeEventId'] as any },
    );
    const processedIds = new Set(processed.map((p) => p.stripeEventId));

    return relevant
      .filter((e) => !processedIds.has(e.id))
      .map((e) => {
        const obj = e.data?.object as any;
        return {
          eventId: e.id,
          eventType: e.type,
          createdAt: new Date(e.created * 1000).toISOString(),
          customerEmail: obj?.customer_email ?? obj?.receipt_email ?? obj?.metadata?.email ?? null,
          objectId: obj?.id ?? null,
        };
      });
  }

  // Health-state persistence helpers — JSON blob in site_settings keeps the
  // schema unchanged and avoids a dedicated migration for what's effectively
  // a small dedup cache.
  private async loadHealthState(): Promise<StripeHealthState> {
    if (!this.siteSettingsService) return {};
    try {
      const row = await this.siteSettingsService.findByKey(HEALTH_STATE_KEY);
      if (!row?.setting_value) return {};
      return JSON.parse(row.setting_value) as StripeHealthState;
    } catch (err) {
      this.logger.warn(`Failed to parse Stripe health state, treating as empty: ${err}`);
      return {};
    }
  }

  private async saveHealthState(state: StripeHealthState): Promise<void> {
    if (!this.siteSettingsService) return;
    // updated_by is a uuid FK; pass null for system-driven writes. The
    // upsert helper coerces non-uuid strings to null defensively.
    await this.siteSettingsService.upsert(
      HEALTH_STATE_KEY,
      JSON.stringify(state),
      'json',
      'Stripe webhook health-check dedup state (config drift + delivery drift). Updated automatically by StripeService.',
      null,
    );
  }

  /**
   * Get a staging mode setting with caching
   */
  private async getStagingModeSetting(key: string): Promise<any> {
    if (!this.siteSettingsService) {
      return null;
    }

    const cached = this.stagingModeCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.value;
    }

    try {
      const setting = await this.siteSettingsService.findByKey(key);
      let value: any = setting?.setting_value;

      // Parse based on type
      if (setting?.setting_type === 'boolean') {
        value = value === 'true';
      }

      this.stagingModeCache.set(key, { value, timestamp: Date.now() });
      return value;
    } catch (error) {
      this.logger.warn(`Failed to fetch staging mode setting ${key}: ${error}`);
      return null;
    }
  }

  /**
   * Check if staging mode is enabled
   */
  private async checkStagingMode(): Promise<boolean> {
    return await this.getStagingModeSetting('staging_mode_enabled') === true;
  }

  /**
   * Check if payments should be blocked in staging mode
   */
  private async checkBlockPayments(): Promise<boolean> {
    const enabled = await this.checkStagingMode();
    if (!enabled) return false;

    const blockPayments = await this.getStagingModeSetting('staging_mode_block_payments');
    return blockPayments !== false; // Default true when staging enabled
  }

  /**
   * Throws if Stripe is disabled via the stripe_enabled site setting.
   * Default is enabled — only blocks when explicitly set to false.
   */
  private async assertStripeEnabled(): Promise<void> {
    const value = await this.getStagingModeSetting('stripe_enabled');
    if (value === false) {
      throw new BadRequestException('Stripe payments are currently disabled');
    }
  }

  private getStripeClient(): Stripe {
    if (!this.stripe) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        throw new BadRequestException('Stripe is not configured');
      }
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-02-24.acacia',
      });
    }
    return this.stripe;
  }

  /**
   * Create a Payment Intent for a membership purchase
   */
  async createPaymentIntent(data: CreatePaymentIntentDto): Promise<PaymentIntentResult> {
    await this.assertStripeEnabled();
    // Check staging mode
    if (await this.checkBlockPayments()) {
      this.logger.warn('[STAGING MODE] Payment blocked - returning mock payment intent');
      return {
        clientSecret: 'staging_mode_blocked',
        paymentIntentId: `staging_${Date.now()}`,
        stagingMode: true,
        message: 'Payments are blocked in staging mode',
      } as PaymentIntentResult;
    }

    const stripe = this.getStripeClient();

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount), // Ensure integer cents
        currency: data.currency || 'usd',
        metadata: {
          membershipTypeConfigId: data.membershipTypeConfigId,
          membershipTypeName: data.membershipTypeName,
          email: data.email,
          ...data.metadata,
        },
        receipt_email: data.email,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error('Stripe createPaymentIntent error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  /**
   * Retrieve a Payment Intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const stripe = this.getStripeClient();

    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error('Stripe getPaymentIntent error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to retrieve payment intent');
    }
  }

  /**
   * Construct and verify a Stripe webhook event
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const stripe = this.getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret not configured');
    }

    try {
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      this.logger.error('Stripe webhook verification error:', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Fetch a Stripe Customer by id. Returns null if Stripe says the
   * customer was deleted or the id doesn't exist. Used by the webhook
   * failure handler to resolve an orphan PaymentIntent (no metadata) to
   * a local Profile via the customer's email.
   */
  async retrieveCustomer(customerId: string): Promise<Stripe.Customer | null> {
    if (!customerId) return null;
    const stripe = this.getStripeClient();
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) return null;
      return customer as Stripe.Customer;
    } catch (error) {
      this.logger.warn(`Stripe retrieveCustomer(${customerId}) failed: ${error}`);
      return null;
    }
  }

  /**
   * Create or retrieve a Stripe Customer
   */
  async findOrCreateCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    const stripe = this.getStripeClient();

    try {
      // Search for existing customer by email
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // Create new customer
      return await stripe.customers.create({
        email: email,
        name: name,
      });
    } catch (error) {
      this.logger.error('Stripe findOrCreateCustomer error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to find or create customer');
    }
  }

  /**
   * Create a refund for a Payment Intent
   */
  /**
   * Issue a Stripe refund. Pass `amountCents` for a partial refund — omit
   * for a full refund of the original PaymentIntent.
   */
  async createRefund(paymentIntentId: string, reason?: string, amountCents?: number): Promise<Stripe.Refund> {
    const stripe = this.getStripeClient();

    try {
      return await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
        amount: amountCents,
        metadata: reason ? { reason } : undefined,
      });
    } catch (error) {
      this.logger.error('Stripe createRefund error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to create refund');
    }
  }

  // =============================================================================
  // SUBSCRIPTION METHODS
  // =============================================================================

  /**
   * Create a Stripe Subscription for recurring membership billing
   */
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    await this.assertStripeEnabled();
    const stripe = this.getStripeClient();

    try {
      const subscription = await stripe.subscriptions.create({
        customer: params.customerId,
        items: [{ price: params.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: params.metadata,
      });

      return subscription;
    } catch (error) {
      this.logger.error('Stripe createSubscription error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to create subscription');
    }
  }

  /**
   * Get a Stripe Subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const stripe = this.getStripeClient();

    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      this.logger.error('Stripe getSubscription error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to retrieve subscription');
    }
  }

  /**
   * Retrieve a subscription plus the related objects needed to link it to a
   * membership and write a complete billing record — customer, price/product,
   * and the latest invoice's payment_intent/charge. Returns a normalized
   * bundle (the "real data from Stripe") rather than the raw Stripe object so
   * callers (admin assign flow, dedicated subscriptions page) don't each have
   * to dig through expanded fields.
   */
  async getSubscriptionDetails(subscriptionId: string): Promise<SubscriptionBundle> {
    const stripe = this.getStripeClient();
    let sub: Stripe.Subscription;
    try {
      sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['customer', 'latest_invoice.payment_intent', 'items.data.price.product'],
      });
    } catch (error) {
      this.logger.error(`Stripe getSubscriptionDetails(${subscriptionId}) error:`, error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to retrieve subscription');
    }

    const item = sub.items?.data?.[0];
    const price = item?.price;
    const product = price?.product as Stripe.Product | undefined;
    const customer = sub.customer as Stripe.Customer | string | null;
    const customerObj = customer && typeof customer !== 'string' && !(customer as any).deleted
      ? (customer as Stripe.Customer)
      : null;
    const invoice = sub.latest_invoice as Stripe.Invoice | string | null;
    const invoiceObj = invoice && typeof invoice !== 'string' ? (invoice as Stripe.Invoice) : null;
    const pi = invoiceObj ? (invoiceObj as any).payment_intent : null;

    return {
      id: sub.id,
      status: sub.status,
      customerId: typeof customer === 'string' ? customer : (customerObj?.id ?? null),
      customerEmail: customerObj?.email ?? null,
      productName: product && typeof product !== 'string' ? (product.name ?? null) : null,
      amount: typeof price?.unit_amount === 'number' ? price.unit_amount / 100 : null,
      currency: price?.currency ? price.currency.toUpperCase() : null,
      interval: price?.recurring?.interval ?? null,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      latestInvoiceId: invoiceObj?.id ?? (typeof invoice === 'string' ? invoice : null),
      paymentIntentId: pi ? (typeof pi === 'string' ? pi : pi.id) : null,
      chargeId: invoiceObj ? ((invoiceObj as any).charge ?? null) : null,
    };
  }

  /**
   * Find a live (active/trialing/past_due/unpaid) subscription for a customer
   * resolved by email. Used by the legacy-conversion job to link members who
   * have a real Stripe subscription but whose membership was only flagged
   * `hadLegacySubscription`. Returns the first matching subscription id, or null.
   */
  async findLiveSubscriptionForEmail(email: string): Promise<string | null> {
    if (!email) return null;
    const stripe = this.getStripeClient();
    const live = new Set(['active', 'trialing', 'past_due', 'unpaid']);
    try {
      const customers = await stripe.customers.list({ email, limit: 10 });
      for (const c of customers.data) {
        const subs = await stripe.subscriptions.list({ customer: c.id, status: 'all', limit: 100 });
        const match = subs.data.find((s) => live.has(s.status));
        if (match) return match.id;
      }
      return null;
    } catch (error) {
      this.logger.warn(`findLiveSubscriptionForEmail(${email}) failed: ${error}`);
      return null;
    }
  }

  /**
   * Cancel a Stripe Subscription
   * @param subscriptionId The Stripe subscription ID
   * @param cancelImmediately If true, cancels immediately. If false, cancels at period end.
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelImmediately: boolean = false,
  ): Promise<Stripe.Subscription> {
    const stripe = this.getStripeClient();

    try {
      if (cancelImmediately) {
        // Cancel immediately - subscription ends now
        return await stripe.subscriptions.cancel(subscriptionId);
      } else {
        // Cancel at period end - subscription continues until current period ends
        return await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error) {
      this.logger.error('Stripe cancelSubscription error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  /**
   * Reactivate a subscription that was set to cancel at period end
   */
  /**
   * Look up the customer's default card on file for display ("Visa ending in 4242, exp 8/26").
   * Returns null if the customer has no card payment method attached. Tries
   * the customer's invoice_settings.default_payment_method first, then falls
   * back to the first attached card.
   */
  async getDefaultPaymentMethod(customerId: string): Promise<{
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null> {
    const stripe = this.getStripeClient();
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) return null;

      const defaultPmId = (customer as Stripe.Customer).invoice_settings?.default_payment_method;
      let pmId: string | undefined;
      if (typeof defaultPmId === 'string') pmId = defaultPmId;
      else if (defaultPmId?.id) pmId = defaultPmId.id;

      if (!pmId) {
        const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
        pmId = list.data[0]?.id;
      }
      if (!pmId) return null;

      const pm = await stripe.paymentMethods.retrieve(pmId);
      if (pm.type !== 'card' || !pm.card) return null;
      return {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      };
    } catch (error) {
      this.logger.error('Stripe getDefaultPaymentMethod error:', error);
      return null;
    }
  }

  /**
   * Pause an active subscription via Stripe's pause_collection. Stripe stops
   * collecting payments at the next cycle until resumeSubscription is called.
   * `behavior` defaults to 'mark_uncollectible' so any in-flight invoice is
   * voided rather than retried — the safer choice for admin-initiated pauses.
   */
  async pauseSubscription(
    subscriptionId: string,
    behavior: 'mark_uncollectible' | 'keep_as_draft' | 'void' = 'mark_uncollectible',
  ): Promise<Stripe.Subscription> {
    const stripe = this.getStripeClient();
    try {
      return await stripe.subscriptions.update(subscriptionId, {
        pause_collection: { behavior },
      });
    } catch (error) {
      this.logger.error('Stripe pauseSubscription error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to pause subscription');
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const stripe = this.getStripeClient();
    try {
      return await stripe.subscriptions.update(subscriptionId, {
        pause_collection: null as any,
      });
    } catch (error) {
      this.logger.error('Stripe resumeSubscription error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to resume subscription');
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const stripe = this.getStripeClient();

    try {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (error) {
      this.logger.error('Stripe reactivateSubscription error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to reactivate subscription');
    }
  }

  /**
   * Create a Stripe Billing Portal session for customer self-service
   */
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    const stripe = this.getStripeClient();

    try {
      return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
    } catch (error) {
      this.logger.error('Stripe createBillingPortalSession error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to create billing portal session');
    }
  }

  /**
   * Create a Checkout Session for subscription signup
   */
  async createSubscriptionCheckoutSession(params: {
    customerId?: string;
    customerEmail?: string;
    /** A pre-existing Stripe Price id (used when the membership type has a configured Stripe product). */
    priceId?: string;
    /**
     * Inline recurring price for membership types with NO pre-created Stripe
     * product/price. Stripe creates an ad-hoc product+recurring price from this,
     * so auto-renewal works without any manual Stripe product setup. Exactly one
     * of priceId / priceData must be provided.
     */
    priceData?: {
      unitAmount: number; // cents
      currency?: string;
      interval: 'month' | 'year';
      productName: string;
    };
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    await this.assertStripeEnabled();
    const stripe = this.getStripeClient();

    if (!params.priceId && !params.priceData) {
      throw new BadRequestException('A price or price data is required to create a subscription checkout.');
    }

    try {
      const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = params.priceId
        ? { price: params.priceId, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: params.priceData!.currency || 'usd',
              unit_amount: params.priceData!.unitAmount,
              recurring: { interval: params.priceData!.interval },
              product_data: { name: params.priceData!.productName },
            },
          };
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        line_items: [lineItem],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata,
        // Collect the full billing address + phone on the hosted Checkout page so
        // auto-renew members end up with complete profile/billing data — same as
        // the one-time card/PayPal flows (which collect it on our own form). Read
        // back from session.customer_details in the checkout webhook.
        billing_address_collection: 'required',
        phone_number_collection: { enabled: true },
      };

      // Use existing customer or create new one from email
      if (params.customerId) {
        sessionParams.customer = params.customerId;
        // Persist the collected address/phone/name back onto the Customer too.
        sessionParams.customer_update = { address: 'auto', name: 'auto' };
      } else if (params.customerEmail) {
        sessionParams.customer_email = params.customerEmail;
      }

      return await stripe.checkout.sessions.create(sessionParams);
    } catch (error) {
      this.logger.error('Stripe createSubscriptionCheckoutSession error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to create checkout session');
    }
  }

  /**
   * Get or create a Stripe Price for a membership type (for subscriptions)
   * This is useful for dynamic pricing or when prices aren't pre-configured in Stripe
   */
  async getOrCreateRecurringPrice(params: {
    productId: string;
    unitAmount: number; // in cents
    interval: 'month' | 'year';
    currency?: string;
  }): Promise<Stripe.Price> {
    const stripe = this.getStripeClient();
    const currency = params.currency || 'usd';

    try {
      // Search for existing price with matching params
      const prices = await stripe.prices.list({
        product: params.productId,
        type: 'recurring',
        active: true,
        limit: 100,
      });

      const existingPrice = prices.data.find(
        (p) =>
          p.unit_amount === params.unitAmount &&
          p.recurring?.interval === params.interval &&
          p.currency === currency,
      );

      if (existingPrice) {
        return existingPrice;
      }

      // Create new price
      return await stripe.prices.create({
        product: params.productId,
        unit_amount: params.unitAmount,
        currency: currency,
        recurring: {
          interval: params.interval,
        },
      });
    } catch (error) {
      this.logger.error('Stripe getOrCreateRecurringPrice error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to get or create price');
    }
  }
}
