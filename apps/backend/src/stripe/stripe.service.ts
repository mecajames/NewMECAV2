import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { CreatePaymentIntentDto, PaymentIntentResult } from '@newmeca/shared';

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.warn('STRIPE_SECRET_KEY not configured - Stripe payments will not work');
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
      console.error('Stripe createPaymentIntent error:', error);
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
      console.error('Stripe getPaymentIntent error:', error);
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
      console.error('Stripe webhook verification error:', error);
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
      console.error('Stripe findOrCreateCustomer error:', error);
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
      console.error('Stripe createRefund error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to create refund');
    }
  }
}
