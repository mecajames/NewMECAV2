import { Injectable, BadRequestException, Logger, Inject, Optional } from '@nestjs/common';
import Stripe from 'stripe';
import { CreatePaymentIntentDto, PaymentIntentResult } from '@newmeca/shared';
import { SiteSettingsService } from '../site-settings/site-settings.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;

  // Staging mode cache to avoid DB queries for every payment
  private stagingModeCache: Map<string, { value: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(
    @Optional() @Inject(SiteSettingsService)
    private readonly siteSettingsService?: SiteSettingsService,
  ) {
    // Stripe client is lazily initialized when needed
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
  async createRefund(paymentIntentId: string, reason?: string): Promise<Stripe.Refund> {
    const stripe = this.getStripeClient();

    try {
      return await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
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
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    const stripe = this.getStripeClient();

    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata,
      };

      // Use existing customer or create new one from email
      if (params.customerId) {
        sessionParams.customer = params.customerId;
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
