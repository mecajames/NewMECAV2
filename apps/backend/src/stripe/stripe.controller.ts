import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { EntityManager } from '@mikro-orm/core';
import { StripeService } from './stripe.service';
import { MembershipsService } from '../memberships/memberships.service';
import { MasterSecondaryService } from '../memberships/master-secondary.service';
import { MecaIdService } from '../memberships/meca-id.service';
import { MembershipSyncService } from '../memberships/membership-sync.service';
import { Membership } from '../memberships/memberships.entity';
import { PaymentStatus } from '@newmeca/shared';
import { QuickBooksService } from '../quickbooks/quickbooks.service';
import { EventRegistrationsService, CreateRegistrationDto } from '../event-registrations/event-registrations.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { MembershipTypeConfig } from '../membership-type-configs/membership-type-configs.entity';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import { Payment } from '../payments/payments.entity';
import { MembershipType, PaymentIntentResult, OrderType, OrderItemType, OrderStatus, UserRole, ShopAddress, StripePaymentType } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { ShopService } from '../shop/shop.service';
import { ProcessedWebhookEvent } from './processed-webhook-event.entity';
import Stripe from 'stripe';

interface CreateMembershipPaymentIntentDto {
  membershipTypeConfigId: string;
  email: string;
  // Guest checkout billing info
  billingFirstName?: string;
  billingLastName?: string;
  billingPhone?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  // Team info
  teamName?: string;
  teamDescription?: string;
  // Business info
  businessName?: string;
  businessWebsite?: string;
  // User info (if logged in)
  userId?: string;
}

interface CreateEventRegistrationPaymentIntentDto {
  eventId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleInfo?: string;
  notes?: string;
  classes: Array<{
    competitionClassId: string;
    format: string;
    className: string;
  }>;
  // Membership upsell
  includeMembership?: boolean;
  membershipTypeConfigId?: string;
  // User info (if logged in)
  userId?: string;
  // MECA ID (for users with active memberships)
  mecaId?: number;
  // Test mode - skip Stripe and mark as paid
  testMode?: boolean;
}

interface CreateTeamUpgradePaymentIntentDto {
  membershipId: string;
  userId: string;
  teamName: string;
  teamDescription?: string;
}

interface CreateInvoicePaymentIntentDto {
  invoiceId: string;
}

interface CreateShopPaymentIntentDto {
  items: Array<{ productId: string; quantity: number }>;
  email: string;
  shippingAddress?: ShopAddress;
  billingAddress?: ShopAddress;
  userId?: string;
}

@Controller('api/stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly membershipsService: MembershipsService,
    private readonly masterSecondaryService: MasterSecondaryService,
    private readonly quickBooksService: QuickBooksService,
    private readonly eventRegistrationsService: EventRegistrationsService,
    private readonly ordersService: OrdersService,
    private readonly invoicesService: InvoicesService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly shopService: ShopService,
    private readonly mecaIdService: MecaIdService,
    private readonly membershipSyncService: MembershipSyncService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // Helper to validate admin for test mode
  private async validateTestModeAccess(authHeader?: string): Promise<void> {
    // Must be in development environment
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('Test mode is only available in development environment');
    }

    // Must have valid admin auth
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Admin authentication required for test mode');
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }

    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required for test mode');
    }
  }

  @Post('create-payment-intent')
  @HttpCode(HttpStatus.OK)
  async createPaymentIntent(
    @Body() data: CreateMembershipPaymentIntentDto,
  ): Promise<PaymentIntentResult> {
    // Validate required fields
    if (!data.membershipTypeConfigId) {
      throw new BadRequestException('Membership type is required');
    }
    if (!data.email) {
      throw new BadRequestException('Email is required');
    }

    // Fetch the membership type config to get the price
    const em = this.em.fork();
    const membershipConfig = await em.findOne(MembershipTypeConfig, {
      id: data.membershipTypeConfigId,
    });

    if (!membershipConfig) {
      throw new BadRequestException('Membership type not found');
    }

    if (!membershipConfig.isActive) {
      throw new BadRequestException('This membership type is not available');
    }

    // Convert price to cents for Stripe
    const amountInCents = Math.round(Number(membershipConfig.price) * 100);

    // Create metadata to store with the payment intent
    const metadata: Record<string, string> = {
      email: data.email.toLowerCase(),
      membershipCategory: membershipConfig.category,
    };

    // Add optional fields to metadata if provided
    if (data.userId) metadata.userId = data.userId;
    if (data.billingFirstName) metadata.billingFirstName = data.billingFirstName;
    if (data.billingLastName) metadata.billingLastName = data.billingLastName;
    if (data.billingPhone) metadata.billingPhone = data.billingPhone;
    if (data.billingAddress) metadata.billingAddress = data.billingAddress;
    if (data.billingCity) metadata.billingCity = data.billingCity;
    if (data.billingState) metadata.billingState = data.billingState;
    if (data.billingPostalCode) metadata.billingPostalCode = data.billingPostalCode;
    if (data.billingCountry) metadata.billingCountry = data.billingCountry;
    if (data.teamName) metadata.teamName = data.teamName;
    if (data.teamDescription) metadata.teamDescription = data.teamDescription;
    if (data.businessName) metadata.businessName = data.businessName;
    if (data.businessWebsite) metadata.businessWebsite = data.businessWebsite;

    // Create the payment intent
    return this.stripeService.createPaymentIntent({
      amount: amountInCents,
      currency: membershipConfig.currency || 'usd',
      membershipTypeConfigId: membershipConfig.id,
      membershipTypeName: membershipConfig.name,
      email: data.email,
      metadata,
    });
  }

  @Post('create-event-registration-payment-intent')
  @HttpCode(HttpStatus.OK)
  async createEventRegistrationPaymentIntent(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateEventRegistrationPaymentIntentDto,
  ): Promise<PaymentIntentResult & { registrationId: string }> {
    // Validate required fields
    if (!data.eventId) {
      throw new BadRequestException('Event ID is required');
    }
    if (!data.email) {
      throw new BadRequestException('Email is required');
    }
    if (!data.firstName || !data.lastName) {
      throw new BadRequestException('First name and last name are required');
    }
    if (!data.classes || data.classes.length === 0) {
      throw new BadRequestException('At least one class must be selected');
    }

    const em = this.em.fork();

    // Fetch the event to get pricing
    const event = await em.findOne(Event, { id: data.eventId });
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Check if user is a member (for pricing)
    let isMember = false;
    if (data.userId) {
      const user = await em.findOne(Profile, { id: data.userId });
      if (user) {
        isMember = user.membership_status === 'active';
      }
    }

    // Calculate pricing
    const useMemberPricing = isMember || data.includeMembership;
    const perClassFee = useMemberPricing
      ? (event.memberEntryFee ?? 0)
      : (event.nonMemberEntryFee ?? 0);

    let totalAmount = data.classes.length * perClassFee;
    let membershipPrice = 0;

    // Add membership price if upselling
    if (data.includeMembership && data.membershipTypeConfigId) {
      const membershipConfig = await em.findOne(MembershipTypeConfig, {
        id: data.membershipTypeConfigId,
      });
      if (membershipConfig) {
        membershipPrice = Number(membershipConfig.price);
        totalAmount += membershipPrice;
      }
    }

    // Create the registration in pending state
    const registration = await this.eventRegistrationsService.createRegistration({
      eventId: data.eventId,
      userId: data.userId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
      vehicleYear: data.vehicleYear,
      vehicleMake: data.vehicleMake,
      vehicleModel: data.vehicleModel,
      vehicleInfo: data.vehicleInfo,
      notes: data.notes,
      classes: data.classes,
      includeMembership: data.includeMembership,
      membershipTypeConfigId: data.membershipTypeConfigId,
      mecaId: data.mecaId,
    }, isMember);

    // Convert price to cents for Stripe
    const amountInCents = Math.round(totalAmount * 100);

    // Create metadata
    const metadata: Record<string, string> = {
      paymentType: StripePaymentType.EVENT_REGISTRATION,
      registrationId: registration.id,
      eventId: data.eventId,
      eventTitle: event.title,
      email: data.email.toLowerCase(),
      classCount: String(data.classes.length),
      perClassFee: String(perClassFee),
      isMemberPricing: String(useMemberPricing),
    };

    if (data.userId) metadata.userId = data.userId;
    if (data.mecaId) metadata.mecaId = String(data.mecaId);
    if (data.includeMembership) {
      metadata.includeMembership = 'true';
      metadata.membershipTypeConfigId = data.membershipTypeConfigId || '';
      metadata.membershipPrice = String(membershipPrice);
    }

    // Test mode - skip Stripe and mark as paid (requires admin + development environment)
    if (data.testMode) {
      await this.validateTestModeAccess(authHeader);
      const testPaymentId = 'test-payment-' + Date.now();
      await this.eventRegistrationsService.markAsPaid(registration.id, testPaymentId, totalAmount);

      // Create order and invoice for test mode (async, non-blocking)
      this.createOrderAndInvoiceFromRegistration(registration.id).catch((error) => {
        console.error('Order/Invoice creation failed for test mode registration (non-critical):', error);
      });

      return {
        clientSecret: 'test-mode-no-stripe',
        paymentIntentId: testPaymentId,
        registrationId: registration.id,
      };
    }

    // Create the payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: amountInCents,
      currency: 'usd',
      membershipTypeConfigId: 'event-registration',
      membershipTypeName: `Event Registration: ${event.title}`,
      email: data.email,
      metadata,
    });

    return {
      ...paymentIntent,
      registrationId: registration.id,
    };
  }

  @Post('create-team-upgrade-payment-intent')
  @HttpCode(HttpStatus.OK)
  async createTeamUpgradePaymentIntent(
    @Body() data: CreateTeamUpgradePaymentIntentDto,
  ): Promise<PaymentIntentResult> {
    // Validate required fields
    if (!data.membershipId) {
      throw new BadRequestException('Membership ID is required');
    }
    if (!data.userId) {
      throw new BadRequestException('User ID is required');
    }
    if (!data.teamName) {
      throw new BadRequestException('Team name is required');
    }

    // Get upgrade details (validates eligibility and calculates pro-rated price)
    const upgradeDetails = await this.membershipsService.getTeamUpgradeDetails(data.membershipId);

    if (!upgradeDetails) {
      throw new BadRequestException('Membership not found');
    }

    if (!upgradeDetails.eligible) {
      throw new BadRequestException(upgradeDetails.reason || 'Not eligible for team upgrade');
    }

    // Get user email
    const em = this.em.fork();
    const user = await em.findOne(Profile, { id: data.userId });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (!user.email) {
      throw new BadRequestException('User does not have an email address');
    }

    // Convert pro-rated price to cents for Stripe
    const amountInCents = Math.round(upgradeDetails.proRatedPrice * 100);

    // Create metadata
    const metadata: Record<string, string> = {
      paymentType: StripePaymentType.TEAM_UPGRADE,
      membershipId: data.membershipId,
      userId: data.userId,
      email: user.email,
      teamName: data.teamName,
      originalPrice: upgradeDetails.originalPrice.toString(),
      proRatedPrice: upgradeDetails.proRatedPrice.toString(),
      daysRemaining: upgradeDetails.daysRemaining.toString(),
    };

    if (data.teamDescription) {
      metadata.teamDescription = data.teamDescription;
    }

    // Create the payment intent
    return this.stripeService.createPaymentIntent({
      amount: amountInCents,
      currency: 'usd',
      membershipTypeConfigId: 'team-upgrade',
      membershipTypeName: 'Team Add-on Upgrade',
      email: user.email,
      metadata,
    });
  }

  @Post('create-invoice-payment-intent')
  @HttpCode(HttpStatus.OK)
  async createInvoicePaymentIntent(
    @Body() data: CreateInvoicePaymentIntentDto,
  ): Promise<PaymentIntentResult> {
    // Validate required fields
    if (!data.invoiceId) {
      throw new BadRequestException('Invoice ID is required');
    }

    // Get the invoice
    const invoice = await this.invoicesService.findById(data.invoiceId);

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    // Check invoice status
    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice has already been paid');
    }
    if (invoice.status === 'cancelled') {
      throw new BadRequestException('Invoice has been cancelled');
    }
    if (invoice.status === 'refunded') {
      throw new BadRequestException('Invoice has been refunded');
    }

    // Get user email
    const user = invoice.user;
    if (!user?.email) {
      throw new BadRequestException('Invoice has no associated user email');
    }

    // Convert price to cents for Stripe
    const amountInCents = Math.round(parseFloat(invoice.total) * 100);

    // Create metadata
    const metadata: Record<string, string> = {
      paymentType: StripePaymentType.INVOICE_PAYMENT,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      userId: user.id,
      email: user.email,
    };

    // Create the payment intent
    return this.stripeService.createPaymentIntent({
      amount: amountInCents,
      currency: invoice.currency || 'usd',
      membershipTypeConfigId: 'invoice-payment',
      membershipTypeName: `Invoice ${invoice.invoiceNumber}`,
      email: user.email,
      metadata,
    });
  }

  @Post('create-shop-payment-intent')
  @HttpCode(HttpStatus.OK)
  async createShopPaymentIntent(
    @Body() data: CreateShopPaymentIntentDto,
  ): Promise<PaymentIntentResult & { orderId: string }> {
    // Validate required fields
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }
    if (!data.email) {
      throw new BadRequestException('Email is required');
    }

    // Check stock availability
    const stockCheck = await this.shopService.checkStockAvailability(data.items);
    if (!stockCheck.available) {
      const unavailableNames = stockCheck.unavailableItems.map(i => i.productName).join(', ');
      throw new BadRequestException(`Some items are out of stock: ${unavailableNames}`);
    }

    // Create order in pending state with shipping
    const order = await this.shopService.createOrder({
      userId: data.userId,
      guestEmail: data.email,
      guestName: data.shippingAddress?.name,
      items: data.items,
      shippingAddress: data.shippingAddress,
      billingAddress: data.billingAddress,
      shippingMethod: (data as any).shippingMethod || 'standard',
      shippingAmount: (data as any).shippingAmount || 0,
    });

    // Convert price to cents for Stripe
    const amountInCents = Math.round(Number(order.totalAmount) * 100);

    // Create metadata
    const metadata: Record<string, string> = {
      paymentType: StripePaymentType.SHOP,
      orderId: order.id,
      orderNumber: order.orderNumber,
      email: data.email.toLowerCase(),
      itemCount: String(data.items.length),
    };

    if (data.userId) metadata.userId = data.userId;

    // Update order with payment intent ID (will be updated after creation)
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: amountInCents,
      currency: 'usd',
      membershipTypeConfigId: 'shop-order',
      membershipTypeName: `Shop Order: ${order.orderNumber}`,
      email: data.email,
      metadata,
    });

    // Update order with payment intent ID
    const em = this.em.fork();
    const orderToUpdate = await em.findOne('ShopOrder', { id: order.id });
    if (orderToUpdate) {
      (orderToUpdate as any).stripePaymentIntentId = paymentIntent.paymentIntentId;
      await em.flush();
    }

    return {
      ...paymentIntent,
      orderId: order.id,
    };
  }

  /**
   * Create a Stripe Checkout Session for subscription-based membership purchase.
   * This redirects the user to Stripe Checkout for recurring billing setup.
   */
  @Post('create-subscription-checkout')
  @HttpCode(HttpStatus.OK)
  async createSubscriptionCheckout(
    @Body() data: {
      membershipTypeConfigId: string;
      email: string;
      userId?: string;
      successUrl: string;
      cancelUrl: string;
      billingFirstName?: string;
      billingLastName?: string;
    },
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
    // Validate required fields
    if (!data.membershipTypeConfigId) {
      throw new BadRequestException('Membership type is required');
    }
    if (!data.email) {
      throw new BadRequestException('Email is required');
    }
    if (!data.successUrl || !data.cancelUrl) {
      throw new BadRequestException('Success and cancel URLs are required');
    }

    const em = this.em.fork();

    // Get membership type config
    const membershipConfig = await em.findOne(MembershipTypeConfig, { id: data.membershipTypeConfigId });
    if (!membershipConfig) {
      throw new BadRequestException('Membership type not found');
    }

    if (!membershipConfig.stripeProductId) {
      throw new BadRequestException('This membership type is not configured for recurring billing. Please contact support.');
    }

    // Get or create a recurring price for this product
    const priceInCents = Math.round(membershipConfig.price * 100);
    const price = await this.stripeService.getOrCreateRecurringPrice({
      productId: membershipConfig.stripeProductId,
      unitAmount: priceInCents,
      interval: 'year', // Memberships are annual
      currency: membershipConfig.currency || 'usd',
    });

    // Find or create Stripe customer
    const customerName = [data.billingFirstName, data.billingLastName].filter(Boolean).join(' ') || undefined;
    const customer = await this.stripeService.findOrCreateCustomer(data.email, customerName);

    // Build metadata
    const metadata: Record<string, string> = {
      paymentType: 'MEMBERSHIP_SUBSCRIPTION',
      membershipTypeConfigId: membershipConfig.id,
      membershipTypeName: membershipConfig.name,
      email: data.email,
    };
    if (data.userId) metadata.userId = data.userId;
    if (data.billingFirstName) metadata.billingFirstName = data.billingFirstName;
    if (data.billingLastName) metadata.billingLastName = data.billingLastName;

    // Create checkout session
    const session = await this.stripeService.createSubscriptionCheckoutSession({
      customerId: customer.id,
      priceId: price.id,
      successUrl: data.successUrl,
      cancelUrl: data.cancelUrl,
      metadata,
    });

    if (!session.url) {
      throw new BadRequestException('Failed to create checkout session');
    }

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean; message?: string }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    // Verify and construct the event
    const event = this.stripeService.constructWebhookEvent(rawBody, signature);

    // Idempotency check: Skip if already processed
    const em = this.em.fork();
    const existingEvent = await em.findOne(ProcessedWebhookEvent, { stripeEventId: event.id });
    if (existingEvent) {
      console.log(`Webhook event ${event.id} already processed, skipping`);
      return { received: true, message: 'Already processed' };
    }

    // Create record to track this event (before processing to prevent race conditions)
    const webhookEvent = new ProcessedWebhookEvent();
    webhookEvent.stripeEventId = event.id;
    webhookEvent.eventType = event.type;

    // Extract payment intent info if available
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    if (paymentIntent?.id) {
      webhookEvent.paymentIntentId = paymentIntent.id;
      webhookEvent.paymentType = paymentIntent.metadata?.paymentType;
      webhookEvent.metadata = paymentIntent.metadata;
    }

    try {
      // Handle specific event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(paymentIntent);
          webhookEvent.processingResult = 'success';
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(paymentIntent);
          webhookEvent.processingResult = 'success';
          break;
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          webhookEvent.processingResult = 'success';
          break;
        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
          webhookEvent.processingResult = 'success';
          break;
        // Subscription events
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionCreatedOrUpdated(event.data.object as Stripe.Subscription);
          webhookEvent.processingResult = 'success';
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          webhookEvent.processingResult = 'success';
          break;
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          webhookEvent.processingResult = 'success';
          break;
        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
          webhookEvent.processingResult = 'unhandled';
      }
    } catch (error) {
      webhookEvent.processingResult = 'error';
      webhookEvent.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Still persist the event to avoid reprocessing, but log the error
      console.error(`Error processing webhook ${event.id}:`, error);
    }

    // Persist the processed event record
    await em.persistAndFlush(webhookEvent);

    return { received: true };
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log('Payment succeeded:', paymentIntent.id);

    const metadata = paymentIntent.metadata;
    const paymentType = metadata.paymentType as StripePaymentType | undefined;

    // Route to appropriate handler based on payment type
    switch (paymentType) {
      case StripePaymentType.EVENT_REGISTRATION:
        await this.handleEventRegistrationPayment(paymentIntent);
        break;
      case StripePaymentType.TEAM_UPGRADE:
        await this.handleTeamUpgradePayment(paymentIntent);
        break;
      case StripePaymentType.INVOICE_PAYMENT:
        await this.handleInvoicePayment(paymentIntent);
        break;
      case StripePaymentType.SHOP:
        await this.handleShopPayment(paymentIntent);
        break;
      case StripePaymentType.MEMBERSHIP:
      default:
        // Default to membership payment (for backwards compatibility)
        await this.handleMembershipPayment(paymentIntent);
        break;
    }
  }

  private async handleTeamUpgradePayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const metadata = paymentIntent.metadata;
    const membershipId = metadata.membershipId;
    const teamName = metadata.teamName;
    const teamDescription = metadata.teamDescription;

    if (!membershipId || !teamName) {
      console.error('Missing required metadata for team upgrade:', paymentIntent.id);
      return;
    }

    try {
      // Apply the team upgrade
      const membership = await this.membershipsService.applyTeamUpgrade(
        membershipId,
        teamName,
        teamDescription,
      );

      console.log(`Team upgrade applied to membership ${membershipId}:`, {
        teamName,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
      });

      // Create order for the upgrade
      const amountPaid = (paymentIntent.amount / 100).toFixed(2);
      const order = await this.ordersService.createFromPayment({
        userId: metadata.userId,
        orderType: OrderType.MEMBERSHIP,
        items: [{
          itemType: OrderItemType.TEAM_ADDON,
          description: `Team Add-on Upgrade: ${teamName}`,
          quantity: 1,
          unitPrice: amountPaid,
          metadata: {
            membershipId,
            teamName,
            originalPrice: metadata.originalPrice,
            proRatedPrice: metadata.proRatedPrice,
            daysRemaining: metadata.daysRemaining,
          },
        }],
        notes: `Stripe Payment Intent: ${paymentIntent.id}`,
      });

      console.log(`Created order ${order.id} for team upgrade`);

    } catch (error) {
      console.error('Error applying team upgrade:', error);
      throw error;
    }
  }

  private async handleMembershipPayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const metadata = paymentIntent.metadata;
    const email = metadata.email;
    const membershipTypeConfigId = metadata.membershipTypeConfigId;
    const userId = metadata.userId;

    if (!email || !membershipTypeConfigId || !userId) {
      console.error('Missing required metadata in payment intent:', paymentIntent.id);
      if (!userId) {
        console.error('Guest memberships are no longer supported - userId is required');
      }
      return;
    }

    try {
      // Amount is in cents, convert to dollars
      const amountPaid = paymentIntent.amount / 100;

      // Create membership for logged-in user using the new MECA ID-based system
      await this.membershipsService.createMembership({
        userId,
        membershipTypeConfigId,
        amountPaid,
        stripePaymentIntentId: paymentIntent.id,
        transactionId: paymentIntent.id,
        // Competitor info
        competitorName: metadata.competitorName,
        vehicleLicensePlate: metadata.vehicleLicensePlate,
        vehicleColor: metadata.vehicleColor,
        vehicleMake: metadata.vehicleMake,
        vehicleModel: metadata.vehicleModel,
        // Team info
        hasTeamAddon: metadata.hasTeamAddon === 'true',
        teamName: metadata.teamName,
        teamDescription: metadata.teamDescription,
        // Business info
        businessName: metadata.businessName,
        businessWebsite: metadata.businessWebsite,
        // Billing info
        billingFirstName: metadata.billingFirstName,
        billingLastName: metadata.billingLastName,
        billingPhone: metadata.billingPhone,
        billingAddress: metadata.billingAddress,
        billingCity: metadata.billingCity,
        billingState: metadata.billingState,
        billingPostalCode: metadata.billingPostalCode,
        billingCountry: metadata.billingCountry || 'USA',
      });

      console.log('Membership created successfully for:', email);

      // Create Order and Invoice (async, non-blocking)
      this.createOrderAndInvoice(paymentIntent, metadata, amountPaid, 'membership').catch((error) => {
        console.error('Order/Invoice creation failed (non-critical):', error);
      });

      // Create QuickBooks sales receipt (async, non-blocking)
      this.createQuickBooksSalesReceipt(paymentIntent, metadata, amountPaid).catch((qbError) => {
        console.error('QuickBooks sales receipt creation failed (non-critical):', qbError);
      });
    } catch (error) {
      console.error('Error creating membership after payment:', error);
      // In production, you might want to alert admin or queue for retry
    }
  }

  private async handleEventRegistrationPayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const metadata = paymentIntent.metadata;
    const registrationId = metadata.registrationId;
    const email = metadata.email;

    if (!registrationId) {
      console.error('Missing registrationId in event registration payment:', paymentIntent.id);
      return;
    }

    try {
      // Amount is in cents, convert to dollars
      const amountPaid = paymentIntent.amount / 100;

      let membershipId: string | undefined;

      // If membership was included in the purchase, create it first
      // Note: Membership purchase during event registration now requires a logged-in user
      if (metadata.includeMembership === 'true' && metadata.membershipTypeConfigId && metadata.userId) {
        const membershipPrice = parseFloat(metadata.membershipPrice || '0');

        // Create membership for logged-in user using the new MECA ID-based system
        const membership = await this.membershipsService.createMembership({
          userId: metadata.userId,
          membershipTypeConfigId: metadata.membershipTypeConfigId,
          amountPaid: membershipPrice,
          stripePaymentIntentId: paymentIntent.id,
          transactionId: paymentIntent.id,
          // Use provided competitor info or defaults
          competitorName: metadata.competitorName,
          vehicleLicensePlate: metadata.vehicleLicensePlate,
          vehicleColor: metadata.vehicleColor,
          vehicleMake: metadata.vehicleMake,
          vehicleModel: metadata.vehicleModel,
        });
        membershipId = membership.id;

        console.log('Membership created as part of event registration for:', email);
      } else if (metadata.includeMembership === 'true' && !metadata.userId) {
        console.error('Cannot create membership without userId - user must be logged in');
      }

      // Complete the event registration
      await this.eventRegistrationsService.completeRegistration(
        registrationId,
        paymentIntent.id,
        amountPaid,
        membershipId,
      );

      console.log('Event registration completed successfully for:', email);

      // Create Order and Invoice (async, non-blocking)
      this.createOrderAndInvoice(paymentIntent, metadata, amountPaid, 'event_registration').catch((error) => {
        console.error('Order/Invoice creation failed (non-critical):', error);
      });
    } catch (error) {
      console.error('Error completing event registration after payment:', error);
      // In production, you might want to alert admin or queue for retry
    }
  }

  private async handleInvoicePayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const metadata = paymentIntent.metadata;
    const invoiceId = metadata.invoiceId;

    if (!invoiceId) {
      console.error('Missing invoiceId in invoice payment:', paymentIntent.id);
      return;
    }

    try {
      // Mark the invoice as paid
      const invoice = await this.invoicesService.markAsPaid(invoiceId);
      console.log(`Invoice ${invoice.invoiceNumber} marked as paid via Stripe payment ${paymentIntent.id}`);

      // Check if there's an associated order that needs to be marked complete
      if (invoice.order?.id) {
        try {
          await this.ordersService.updateStatus(invoice.order.id, {
            status: OrderStatus.COMPLETED,
            notes: `Paid via Stripe: ${paymentIntent.id}`,
          });
          console.log(`Order ${invoice.order.id} marked as completed`);
        } catch (orderError) {
          console.error('Error updating order status:', orderError);
        }
      }

      // Try to activate any pending membership associated with this invoice
      // The membership would be linked through the order that was created during admin assignment
      await this.activatePendingMembershipForInvoice(invoiceId, metadata.userId, invoice.total);

      console.log(`Invoice payment processed successfully for ${invoiceId}`);
    } catch (error) {
      console.error('Error handling invoice payment:', error);
      throw error;
    }
  }

  private async handleShopPayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const metadata = paymentIntent.metadata;
    const orderId = metadata.orderId;

    if (!orderId) {
      console.error('Missing orderId in shop payment:', paymentIntent.id);
      return;
    }

    try {
      // Get the charge ID for the successful payment
      const chargeId = paymentIntent.latest_charge as string;

      // Process the payment success - marks order as paid and decrements stock
      const order = await this.shopService.processPaymentSuccess(
        paymentIntent.id,
        chargeId,
      );

      console.log(`Shop order ${order.orderNumber} marked as paid via Stripe payment ${paymentIntent.id}`);

      // Create Order and Invoice for the shop purchase (async, non-blocking)
      this.createShopOrderAndInvoice(paymentIntent, metadata).catch((error) => {
        console.error('Order/Invoice creation failed for shop order (non-critical):', error);
      });
    } catch (error) {
      console.error('Error handling shop payment:', error);
      throw error;
    }
  }

  /**
   * Create a billing Order and Invoice from a shop payment
   * Handles both authenticated and guest checkout
   */
  private async createShopOrderAndInvoice(
    paymentIntent: Stripe.PaymentIntent,
    metadata: Stripe.Metadata,
  ): Promise<void> {
    try {
      // Get the shop order with items
      const shopOrder = await this.shopService.findOrderById(metadata.orderId);

      // Build order items from shop order items
      const items = shopOrder.items.getItems().map((item) => ({
        description: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice).toFixed(2),
        itemType: OrderItemType.SHOP_PRODUCT,
        referenceId: item.product?.id,
        metadata: {
          shopOrderId: shopOrder.id,
          productSku: item.productSku,
        },
      }));

      // Build billing address from shop order
      const billingAddress = shopOrder.billingAddress
        ? {
            name: shopOrder.billingAddress.name,
            email: shopOrder.guestEmail || metadata.email,
            phone: shopOrder.billingAddress.phone,
            address1: shopOrder.billingAddress.line1,
            address2: shopOrder.billingAddress.line2,
            city: shopOrder.billingAddress.city,
            state: shopOrder.billingAddress.state,
            postalCode: shopOrder.billingAddress.postalCode,
            country: shopOrder.billingAddress.country || 'US',
          }
        : undefined;

      // Determine user ID and guest info
      const userId = metadata.userId || shopOrder.user?.id;
      const guestEmail = !userId ? (shopOrder.guestEmail || metadata.email) : undefined;
      const guestName = !userId ? (shopOrder.guestName || shopOrder.billingAddress?.name) : undefined;

      // Create the billing order with cross-reference
      const order = await this.ordersService.createFromPayment({
        userId,
        guestEmail,
        guestName,
        orderType: OrderType.SHOP,
        items,
        billingAddress,
        notes: `Shop Order: ${shopOrder.orderNumber} | Stripe: ${paymentIntent.id}`,
        shopOrderReference: {
          shopOrderId: shopOrder.id,
          shopOrderNumber: shopOrder.orderNumber,
        },
      });

      console.log(`Billing order ${order.orderNumber} created for shop order ${shopOrder.orderNumber}`);

      // Update shop order with billing order reference
      const em = this.em.fork();
      const shopOrderToUpdate = await em.findOne('ShopOrder', { id: shopOrder.id });
      if (shopOrderToUpdate) {
        (shopOrderToUpdate as any).billingOrderId = order.id;
        await em.flush();
      }

      // Create invoice from order
      const invoice = await this.invoicesService.createFromOrder(order.id);
      console.log(`Invoice ${invoice.invoiceNumber} created for billing order ${order.orderNumber}`);

      // Send invoice email (async, non-blocking)
      if (invoice) {
        this.invoicesService.sendInvoice(invoice.id).catch((error) => {
          console.error('Failed to send shop invoice email:', error);
        });
      }
    } catch (error) {
      console.error('Failed to create order/invoice for shop order:', error);
      throw error;
    }
  }

  private async activatePendingMembershipForInvoice(
    invoiceId: string,
    userId: string,
    amountPaid: string,
  ): Promise<void> {
    try {
      const { Invoice } = await import('../invoices/invoices.entity');
      const { Membership } = await import('../memberships/memberships.entity');
      const { PaymentStatus, MembershipAccountType, OrderType, OrderItemType } = await import('@newmeca/shared');
      const em = this.em.fork();

      // Load the invoice with its items and any linked secondary memberships
      const invoice = await em.findOne(Invoice, { id: invoiceId }, {
        populate: ['items', 'items.secondaryMembership', 'items.secondaryMembership.user', 'items.secondaryMembership.membershipTypeConfig', 'user'],
      });

      if (!invoice) {
        console.log(`Invoice ${invoiceId} not found for membership activation`);
        return;
      }

      // Check for secondary memberships in invoice items
      for (const item of invoice.items.getItems()) {
        if (item.secondaryMembership) {
          const secondary = item.secondaryMembership;

          // Skip if already paid
          if (secondary.paymentStatus === PaymentStatus.PAID) {
            console.log(`Secondary membership ${secondary.id} already paid, skipping`);
            continue;
          }

          // Use markSecondaryPaid to properly assign MECA ID
          try {
            const amount = parseFloat(item.total || amountPaid);
            await this.masterSecondaryService.markSecondaryPaid(
              secondary.id,
              amount,
              `Invoice-${invoice.invoiceNumber}`,
            );
            console.log(`Secondary membership ${secondary.id} activated with MECA ID via invoice payment`);

            // Create an Order for the secondary membership (async, non-blocking)
            this.createOrderForSecondaryMembership(secondary, invoice, amount).catch((orderError) => {
              console.error(`Error creating order for secondary membership ${secondary.id}:`, orderError);
            });
          } catch (secondaryError) {
            console.error(`Error activating secondary membership ${secondary.id}:`, secondaryError);
          }
        }
      }

      // Also check for regular (non-secondary) pending memberships for this user
      if (userId) {
        const pendingMembership = await em.findOne(Membership, {
          user: userId,
          paymentStatus: PaymentStatus.PENDING,
          accountType: { $ne: MembershipAccountType.SECONDARY },
        });

        if (pendingMembership) {
          // For non-secondary memberships, update payment status
          // MECA ID should already be assigned during creation for admin-assigned memberships
          pendingMembership.paymentStatus = PaymentStatus.PAID;
          pendingMembership.amountPaid = parseFloat(amountPaid);
          await em.flush();
          console.log(`Membership ${pendingMembership.id} activated after invoice payment`);
        } else {
          console.log(`No pending non-secondary membership found for user ${userId}`);
        }
      }
    } catch (error) {
      console.error('Error activating pending membership:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Create an order for a secondary membership after invoice payment
   */
  private async createOrderForSecondaryMembership(
    secondary: any,
    invoice: any,
    amount: number,
  ): Promise<void> {
    try {
      const { OrderType, OrderItemType } = await import('@newmeca/shared');

      // Get the master's billing info from the invoice
      const billingAddress = invoice.billingAddress || {};

      // Create order for the secondary membership
      // Bill to the master account (invoice.user is the master)
      const order = await this.ordersService.createFromPayment({
        userId: invoice.user?.id,
        orderType: OrderType.MEMBERSHIP,
        items: [{
          description: `${secondary.membershipTypeConfig?.name || 'Membership'} - Secondary (${secondary.competitorName})`,
          quantity: 1,
          unitPrice: amount.toFixed(2),
          itemType: OrderItemType.MEMBERSHIP,
          referenceId: secondary.id,
          metadata: {
            membershipId: secondary.id,
            isSecondary: true,
            competitorName: secondary.competitorName,
            mecaId: secondary.mecaId,
            invoiceNumber: invoice.invoiceNumber,
          },
        }],
        billingAddress: {
          name: billingAddress.name || '',
          address1: billingAddress.address1 || '',
          city: billingAddress.city || '',
          state: billingAddress.state || '',
          postalCode: billingAddress.postalCode || '',
          country: billingAddress.country || 'USA',
        },
        notes: `Secondary membership for ${secondary.competitorName} - Invoice ${invoice.invoiceNumber}`,
      });

      console.log(`Order ${order.orderNumber} created for secondary membership ${secondary.id}`);
    } catch (error) {
      console.error('Error creating order for secondary membership:', error);
      throw error;
    }
  }

  /**
   * Create a QuickBooks sales receipt for the payment
   * This is done asynchronously to not block the webhook response
   */
  private async createQuickBooksSalesReceipt(
    paymentIntent: Stripe.PaymentIntent,
    metadata: Stripe.Metadata,
    amountPaid: number,
  ): Promise<void> {
    try {
      // Check if QuickBooks is connected
      const connectionStatus = await this.quickBooksService.getConnectionStatus();
      if (!connectionStatus) {
        console.log('QuickBooks not connected, skipping sales receipt creation');
        return;
      }

      const customerName = metadata.billingFirstName && metadata.billingLastName
        ? `${metadata.billingFirstName} ${metadata.billingLastName}`
        : metadata.email;

      await this.quickBooksService.createSalesReceipt({
        customerEmail: metadata.email,
        customerName,
        membershipTypeConfigId: metadata.membershipTypeConfigId,
        amount: amountPaid,
        paymentDate: new Date(),
        stripePaymentIntentId: paymentIntent.id,
        billingAddress: metadata.billingAddress ? {
          line1: metadata.billingAddress,
          city: metadata.billingCity || '',
          state: metadata.billingState || '',
          postalCode: metadata.billingPostalCode || '',
          country: metadata.billingCountry || 'USA',
        } : undefined,
      });

      console.log('QuickBooks sales receipt created for:', metadata.email);
    } catch (error) {
      // Log but don't throw - QuickBooks errors shouldn't affect the main payment flow
      console.error('Failed to create QuickBooks sales receipt:', error);
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log('Payment failed:', paymentIntent.id);
    // Log the failure for monitoring
    // In production, you might want to send an email notification
  }

  /**
   * Handle charge.refunded webhook event
   * Updates payment status and membership/registration status as needed
   */
  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    console.log('Charge refunded:', charge.id, 'Payment Intent:', charge.payment_intent);

    if (!charge.payment_intent) {
      console.error('Charge refund missing payment_intent:', charge.id);
      return;
    }

    const paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent.id;

    const em = this.em.fork();

    // Find the payment record by stripe payment intent ID
    const payment = await em.findOne(Payment, {
      stripePaymentIntentId: paymentIntentId,
    });

    if (!payment) {
      console.log(`No payment record found for refunded charge, payment intent: ${paymentIntentId}`);
      return;
    }

    // Update payment status
    const { PaymentStatus } = await import('@newmeca/shared');
    payment.paymentStatus = PaymentStatus.REFUNDED;
    payment.refundedAt = new Date();
    payment.refundReason = charge.refunds?.data[0]?.reason || 'Refunded via Stripe';

    // If this payment is associated with a membership, update membership status
    if (payment.membership) {
      const membership = await em.findOne('Membership', { id: payment.membership.id });
      if (membership) {
        (membership as any).paymentStatus = PaymentStatus.REFUNDED;
        console.log(`Membership ${payment.membership.id} marked as refunded`);
      }
    }

    await em.flush();
    console.log(`Payment ${payment.id} marked as refunded`);

    // TODO: Send refund confirmation email to user
    // TODO: Create QuickBooks credit memo if QB is connected
  }

  /**
   * Handle charge.dispute.created webhook event
   * Alerts admin and freezes related membership if applicable
   */
  private async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    console.log('Dispute created:', dispute.id, 'Charge:', dispute.charge);

    const chargeId = typeof dispute.charge === 'string'
      ? dispute.charge
      : dispute.charge?.id;

    if (!chargeId) {
      console.error('Dispute missing charge ID:', dispute.id);
      return;
    }

    // Get the payment intent from the charge
    const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    });

    const charge = await stripe.charges.retrieve(chargeId);
    const paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

    if (!paymentIntentId) {
      console.error('Dispute charge missing payment_intent:', chargeId);
      return;
    }

    const em = this.em.fork();

    // Find the payment record
    const payment = await em.findOne(Payment, {
      stripePaymentIntentId: paymentIntentId,
    });

    if (payment) {
      // Store dispute info in payment metadata
      payment.paymentMetadata = {
        ...payment.paymentMetadata,
        dispute: {
          id: dispute.id,
          amount: dispute.amount,
          reason: dispute.reason,
          status: dispute.status,
          created: new Date(dispute.created * 1000).toISOString(),
        },
      };
      await em.flush();
      console.log(`Payment ${payment.id} flagged with dispute ${dispute.id}`);
    }

    // Log critical alert for admin attention
    console.error(`[CRITICAL] Payment dispute created:`, {
      disputeId: dispute.id,
      amount: dispute.amount / 100,
      reason: dispute.reason,
      paymentIntentId,
      evidence_due_by: new Date(dispute.evidence_details?.due_by || 0 * 1000).toISOString(),
    });

    // TODO: Send email notification to admin
    // TODO: Consider freezing associated membership until dispute is resolved
  }

  /**
   * Handle subscription created or updated events.
   * Links the subscription to the membership if not already linked.
   */
  private async handleSubscriptionCreatedOrUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription created/updated:', subscription.id, 'Status:', subscription.status);

    const metadata = subscription.metadata;
    const membershipId = metadata?.membershipId;

    if (!membershipId) {
      console.log('Subscription has no membershipId in metadata, skipping');
      return;
    }

    const em = this.em.fork();
    const membership = await em.findOne(Membership, { id: membershipId });

    if (membership) {
      // Update the membership with subscription ID if not already set
      if (!membership.stripeSubscriptionId) {
        membership.stripeSubscriptionId = subscription.id;
        await em.flush();
        console.log(`Membership ${membershipId} linked to subscription ${subscription.id}`);
      }
    } else {
      console.error(`Membership ${membershipId} not found for subscription ${subscription.id}`);
    }
  }

  /**
   * Handle subscription deleted event.
   * Clears the subscription ID from the membership.
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription deleted:', subscription.id);

    const em = this.em.fork();

    // Find membership with this subscription ID
    const membership = await em.findOne(Membership, { stripeSubscriptionId: subscription.id });

    if (membership) {
      membership.stripeSubscriptionId = undefined;
      await em.flush();
      console.log(`Cleared subscription from membership ${membership.id}`);
    }
  }

  /**
   * Handle checkout.session.completed event for subscription checkouts.
   * Creates the membership when a subscription checkout completes.
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log('Checkout session completed:', session.id, 'Mode:', session.mode);

    // Only handle subscription checkouts
    if (session.mode !== 'subscription') {
      console.log('Non-subscription checkout, skipping');
      return;
    }

    const metadata = session.metadata;
    if (!metadata || metadata.paymentType !== 'MEMBERSHIP_SUBSCRIPTION') {
      console.log('Not a membership subscription checkout, skipping');
      return;
    }

    const membershipTypeConfigId = metadata.membershipTypeConfigId;
    const email = metadata.email;
    const userId = metadata.userId;
    const subscriptionId = session.subscription as string;

    if (!membershipTypeConfigId || !email) {
      console.error('Missing required metadata for subscription checkout:', session.id);
      return;
    }

    const em = this.em.fork();

    // Get membership type config
    const membershipConfig = await em.findOne(MembershipTypeConfig, { id: membershipTypeConfigId });
    if (!membershipConfig) {
      console.error('Membership type config not found:', membershipTypeConfigId);
      return;
    }

    // Find or create user
    let profile = userId ? await em.findOne(Profile, { id: userId }) : null;
    if (!profile) {
      profile = await em.findOne(Profile, { email: email.toLowerCase() });
    }

    if (!profile) {
      console.error('No user found for subscription checkout. Email:', email);
      // TODO: Create a pending membership or send invitation email
      return;
    }

    try {
      // Create the membership via the memberships service
      const membership = new Membership();
      membership.user = profile;
      membership.membershipTypeConfig = membershipConfig;
      membership.amountPaid = membershipConfig.price;
      membership.paymentStatus = PaymentStatus.PAID;
      membership.stripeSubscriptionId = subscriptionId;
      membership.startDate = new Date();

      // Set end date to 1 year from now
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      membership.endDate = endDate;

      // Set competitor name from metadata if available
      const billingFirstName = metadata.billingFirstName || profile.first_name || '';
      const billingLastName = metadata.billingLastName || profile.last_name || '';
      membership.competitorName = [billingFirstName, billingLastName].filter(Boolean).join(' ');

      // Assign MECA ID
      const mecaId = await this.mecaIdService.assignMecaIdToMembership(membership);
      membership.mecaId = mecaId;

      await em.persistAndFlush(membership);

      // Update profile membership status
      await this.membershipSyncService.setProfileActive(profile.id);

      console.log(`Created subscription membership ${membership.id} with MECA ID ${mecaId} for user ${profile.id}`);

      // Create order and invoice
      // Get Stripe subscription for amount details
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-02-24.acacia',
      });
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      const invoice = stripeSubscription.latest_invoice as Stripe.Invoice | null;
      const paymentIntentId = typeof invoice?.payment_intent === 'string' ? invoice.payment_intent : invoice?.payment_intent?.id;

      if (paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        // Build metadata for order/invoice creation
        const orderMetadata: Stripe.Metadata = {
          ...metadata,
          membershipId: membership.id,
          mecaId: String(mecaId),
        };
        await this.createOrderAndInvoice(paymentIntent, orderMetadata, membershipConfig.price, 'membership');
      }

    } catch (error) {
      console.error('Error creating membership from subscription checkout:', error);
    }
  }

  private getMembershipTypeFromCategory(category: string): MembershipType {
    switch (category) {
      case 'competitor':
        return MembershipType.DOMESTIC;
      case 'team':
        return MembershipType.TEAM;
      case 'retail':
        return MembershipType.RETAILER;
      default:
        return MembershipType.ANNUAL;
    }
  }

  /**
   * Create an Order and Invoice from a successful payment
   * This is done asynchronously to not block the webhook response
   * Uses a transaction to ensure order + invoice are created atomically
   */
  private async createOrderAndInvoice(
    paymentIntent: Stripe.PaymentIntent,
    metadata: Stripe.Metadata,
    amountPaid: number,
    type: 'membership' | 'event_registration',
  ): Promise<void> {
    try {
      const em = this.em.fork();

      // Look up the payment record (before transaction)
      const payment = await em.findOne(Payment, {
        stripePaymentIntentId: paymentIntent.id
      });

      // Determine order type
      const orderType = type === 'membership'
        ? OrderType.MEMBERSHIP
        : OrderType.EVENT_REGISTRATION;

      // Build order items based on payment type
      const items: Array<{
        description: string;
        quantity: number;
        unitPrice: string;
        itemType: OrderItemType;
        referenceId?: string;
        metadata?: Record<string, unknown>;
      }> = [];

      if (type === 'membership') {
        items.push({
          description: `MECA Membership: ${metadata.membershipTypeName || metadata.membershipCategory || 'Annual'}`,
          quantity: 1,
          unitPrice: amountPaid.toFixed(2),
          itemType: OrderItemType.MEMBERSHIP,
          referenceId: metadata.membershipTypeConfigId,
          metadata: {
            membershipCategory: metadata.membershipCategory,
          },
        });
      } else if (type === 'event_registration') {
        // Main event registration item
        const classCount = parseInt(metadata.classCount || '1', 10);
        const perClassFee = parseFloat(metadata.perClassFee || '0');

        items.push({
          description: `Event Registration: ${metadata.eventTitle || 'Event'} (${classCount} class${classCount > 1 ? 'es' : ''})`,
          quantity: classCount,
          unitPrice: perClassFee.toFixed(2),
          itemType: OrderItemType.EVENT_CLASS,
          referenceId: metadata.eventId,
          metadata: {
            registrationId: metadata.registrationId,
            classCount,
          },
        });

        // Add membership item if included
        if (metadata.includeMembership === 'true' && metadata.membershipPrice) {
          const membershipPrice = parseFloat(metadata.membershipPrice);
          if (membershipPrice > 0) {
            items.push({
              description: 'MECA Membership (with registration)',
              quantity: 1,
              unitPrice: membershipPrice.toFixed(2),
              itemType: OrderItemType.MEMBERSHIP,
              referenceId: metadata.membershipTypeConfigId,
            });
          }
        }
      }

      // Build billing address from metadata
      const billingAddress = {
        name: metadata.billingFirstName && metadata.billingLastName
          ? `${metadata.billingFirstName} ${metadata.billingLastName}`
          : undefined,
        address1: metadata.billingAddress,
        city: metadata.billingCity,
        state: metadata.billingState,
        postalCode: metadata.billingPostalCode,
        country: metadata.billingCountry || 'US',
      };

      // Use transaction for order + invoice creation (atomic operation)
      const { order, invoice } = await em.transactional(async () => {
        // Create the order
        const createdOrder = await this.ordersService.createFromPayment({
          paymentId: payment?.id,
          userId: metadata.userId,
          orderType,
          items,
          billingAddress: billingAddress.name ? billingAddress : undefined,
          notes: `Stripe Payment: ${paymentIntent.id}`,
        });

        console.log(`Order ${createdOrder.orderNumber} created for payment ${paymentIntent.id}`);

        // Create invoice from order
        const createdInvoice = await this.invoicesService.createFromOrder(createdOrder.id);
        console.log(`Invoice ${createdInvoice.invoiceNumber} created for order ${createdOrder.orderNumber}`);

        return { order: createdOrder, invoice: createdInvoice };
      });

      // Send invoice email (async, non-blocking, outside transaction)
      if (invoice) {
        this.invoicesService.sendInvoice(invoice.id).catch((error) => {
          console.error('Failed to send invoice email:', error);
        });
      }

    } catch (error) {
      console.error('Failed to create order/invoice:', error);
      throw error;
    }
  }

  /**
   * Create an Order and Invoice directly from a registration ID
   * This is simpler than the payment-based approach and used for test mode
   * and for syncing existing registrations
   * Uses a transaction to ensure order + invoice are created atomically
   */
  private async createOrderAndInvoiceFromRegistration(registrationId: string): Promise<void> {
    try {
      const em = this.em.fork();

      // Use transaction for order + invoice creation (atomic operation)
      await em.transactional(async () => {
        // Create order from registration
        const order = await this.ordersService.createFromEventRegistration(registrationId);
        console.log(`Order ${order.orderNumber} created for registration ${registrationId}`);

        // Create invoice from order
        const invoice = await this.invoicesService.createFromOrder(order.id);
        console.log(`Invoice ${invoice.invoiceNumber} created for order ${order.orderNumber}`);
      });
    } catch (error) {
      console.error('Failed to create order/invoice from registration:', error);
      throw error;
    }
  }
}
