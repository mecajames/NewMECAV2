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
import { Public } from '../auth/public.decorator';
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
import { isAdminUser } from '../auth/is-admin.helper';
import { Payment } from '../payments/payments.entity';
import { Order } from '../orders/orders.entity';
import { Invoice } from '../invoices/invoices.entity';
import { EventRegistration } from '../event-registrations/event-registrations.entity';
import { MembershipType, PaymentIntentResult, OrderType, OrderItemType, OrderStatus, InvoiceStatus, PaymentType, UserRole, ShopAddress, StripePaymentType } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { ShopService } from '../shop/shop.service';
import { TaxService } from '../tax/tax.service';
import { CouponsService } from '../coupons/coupons.service';
import { AdminNotificationsService } from '../admin-notifications/admin-notifications.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProcessedWebhookEvent } from './processed-webhook-event.entity';
import { WorldFinalsService } from '../world-finals/world-finals.service';
import { PaymentFulfillmentService } from '../payments/payment-fulfillment.service';
import { PaymentMethod } from '@newmeca/shared';
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
  // Coupon
  couponCode?: string;
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
  couponCode?: string;
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
    private readonly taxService: TaxService,
    private readonly mecaIdService: MecaIdService,
    private readonly membershipSyncService: MembershipSyncService,
    private readonly worldFinalsService: WorldFinalsService,
    private readonly paymentFulfillmentService: PaymentFulfillmentService,
    private readonly couponsService: CouponsService,
    private readonly adminNotificationsService: AdminNotificationsService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // Helper to extract userId from JWT token (returns null for guests)
  private async extractUserId(authHeader?: string): Promise<string | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user.id;
  }

  // Helper to validate test mode access
  private async validateTestModeAccess(authHeader?: string): Promise<void> {
    // Allow test mode when explicitly enabled via environment variable
    if (process.env.ENABLE_TEST_MODE === 'true') {
      return;
    }

    // Block otherwise
    throw new ForbiddenException('Test mode is not enabled. Set ENABLE_TEST_MODE=true to allow mock payments.');
  }

  @Public()
  @Post('create-payment-intent')
  @HttpCode(HttpStatus.OK)
  async createPaymentIntent(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateMembershipPaymentIntentDto,
  ): Promise<PaymentIntentResult> {
    // Validate required fields
    if (!data.membershipTypeConfigId) {
      throw new BadRequestException('Membership type is required');
    }
    if (!data.email) {
      throw new BadRequestException('Email is required');
    }

    // Override client-sent userId with JWT-verified userId to prevent spoofing
    const verifiedUserId = await this.extractUserId(authHeader);
    if (verifiedUserId) {
      data.userId = verifiedUserId;
    } else {
      // Guest checkout - clear any client-sent userId
      delete data.userId;
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

    // Verify user is allowed to purchase this membership type
    if (data.userId) {
      const eligibility = await this.membershipsService.canPurchaseMembership(data.userId, data.membershipTypeConfigId);
      if (!eligibility.allowed) {
        throw new BadRequestException(eligibility.reason || 'You are not eligible to purchase this membership type');
      }
    }

    // Calculate price with optional coupon discount
    const membershipPrice = Number(membershipConfig.price);
    let discountAmount = 0;
    let couponId: string | undefined;

    if (data.couponCode) {
      const validation = await this.couponsService.validateCoupon(data.couponCode, {
        scope: 'membership',
        subtotal: membershipPrice,
        membershipTypeConfigId: data.membershipTypeConfigId,
        userId: data.userId,
        email: data.email,
      });
      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }
      discountAmount = validation.discountAmount!;
      couponId = validation.couponId;
    }

    const discountedPrice = Math.max(0, membershipPrice - discountAmount);
    const tax = await this.taxService.calculateTax(discountedPrice);

    // Convert price + tax to cents for Stripe
    const amountInCents = Math.round((discountedPrice + tax.taxAmount) * 100);

    // Create metadata to store with the payment intent
    const metadata: Record<string, string> = {
      email: data.email.toLowerCase(),
      membershipCategory: membershipConfig.category,
      membershipPrice: membershipPrice.toFixed(2),
      taxAmount: tax.taxAmount.toFixed(2),
      taxRate: tax.taxRate.toString(),
    };

    if (data.couponCode && couponId) {
      metadata.couponCode = data.couponCode.toUpperCase();
      metadata.couponId = couponId;
      metadata.discountAmount = discountAmount.toFixed(2);
    }

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

  @Public()
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

    // Override client-sent userId with JWT-verified userId to prevent spoofing
    const verifiedUserId = await this.extractUserId(authHeader);
    if (verifiedUserId) {
      data.userId = verifiedUserId;
    } else {
      // Guest checkout - clear any client-sent userId
      delete data.userId;
      // Guests cannot bundle membership purchases (no account to attach to)
      if (data.includeMembership) {
        throw new BadRequestException('You must be logged in to add a membership to your registration');
      }
    }

    const em = this.em.fork();

    // Fetch the event to get pricing
    const event = await em.findOne(Event, { id: data.eventId });
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    // Check if user is a member (for pricing) and validate MECA ID
    let isMember = false;
    if (data.userId) {
      const user = await em.findOne(Profile, { id: data.userId });
      if (user) {
        isMember = user.membership_status === 'active';

        // Block registration if MECA ID has been permanently invalidated
        if (user.meca_id_invalidated_at && data.mecaId) {
          throw new BadRequestException(
            'Your MECA ID has been invalidated due to expired membership. Please renew your membership first — a new MECA ID will be issued upon renewal.'
          );
        }
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

    // Calculate tax on total amount
    const tax = await this.taxService.calculateTax(totalAmount);
    totalAmount += tax.taxAmount;

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
    metadata.taxAmount = tax.taxAmount.toFixed(2);
    metadata.taxRate = tax.taxRate.toString();
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
    @Headers('authorization') authHeader: string,
    @Body() data: CreateTeamUpgradePaymentIntentDto,
  ): Promise<PaymentIntentResult> {
    // Team upgrade requires authentication - override userId from JWT
    const verifiedUserId = await this.extractUserId(authHeader);
    if (!verifiedUserId) {
      throw new UnauthorizedException('Authentication required for team upgrade');
    }
    data.userId = verifiedUserId;

    // Validate required fields
    if (!data.membershipId) {
      throw new BadRequestException('Membership ID is required');
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

    // Calculate tax on pro-rated price
    const teamTax = await this.taxService.calculateTax(upgradeDetails.proRatedPrice);

    // Convert pro-rated price + tax to cents for Stripe
    const amountInCents = Math.round((upgradeDetails.proRatedPrice + teamTax.taxAmount) * 100);

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
      taxAmount: teamTax.taxAmount.toFixed(2),
      taxRate: teamTax.taxRate.toString(),
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

  @Public()
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

  @Public()
  @Post('create-shop-payment-intent')
  @HttpCode(HttpStatus.OK)
  async createShopPaymentIntent(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateShopPaymentIntentDto,
  ): Promise<PaymentIntentResult & { orderId: string }> {
    // Override client-sent userId with JWT-verified userId to prevent spoofing
    const verifiedUserId = await this.extractUserId(authHeader);
    if (verifiedUserId) {
      data.userId = verifiedUserId;
    } else {
      delete data.userId;
    }

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

    // Validate coupon if provided
    let shopDiscountAmount = 0;
    let shopCouponId: string | undefined;

    if (data.couponCode) {
      // Calculate subtotal for validation
      const productsForValidation = await this.shopService.getProductsByIds(data.items.map(i => i.productId));
      let subtotal = 0;
      for (const item of data.items) {
        const product = productsForValidation.find(p => p.id === item.productId);
        if (product) subtotal += Number(product.price) * item.quantity;
      }

      const validation = await this.couponsService.validateCoupon(data.couponCode, {
        scope: 'shop',
        subtotal,
        productIds: data.items.map(i => i.productId),
        userId: data.userId,
        email: data.email,
      });
      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }
      shopDiscountAmount = validation.discountAmount!;
      shopCouponId = validation.couponId;
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
      discountAmount: shopDiscountAmount,
      couponCode: data.couponCode?.toUpperCase(),
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
    if (data.couponCode && shopCouponId) {
      metadata.couponCode = data.couponCode.toUpperCase();
      metadata.couponId = shopCouponId;
      metadata.discountAmount = shopDiscountAmount.toFixed(2);
    }

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
  @Public()
  @Post('create-subscription-checkout')
  @HttpCode(HttpStatus.OK)
  async createSubscriptionCheckout(
    @Headers('authorization') authHeader: string,
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
    // Override client-sent userId with JWT-verified userId to prevent spoofing
    const verifiedUserId = await this.extractUserId(authHeader);
    if (verifiedUserId) {
      data.userId = verifiedUserId;
    } else {
      delete data.userId;
    }

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

  @Public()
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

    // Idempotency: Insert record first using unique constraint to prevent race conditions
    const em = this.em.fork();
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

    // Attempt to insert - unique constraint on stripe_event_id prevents duplicates
    try {
      await em.persistAndFlush(webhookEvent);
    } catch (error: any) {
      // Unique constraint violation (Postgres error code 23505) means already processed
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        console.log(`Webhook event ${event.id} already processed, skipping`);
        return { received: true, message: 'Already processed' };
      }
      throw error;
    }

    try {
      // Handle specific event types
      switch (event.type) {
        // Payment Intent events
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(paymentIntent);
          webhookEvent.processingResult = 'success';
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(paymentIntent);
          webhookEvent.processingResult = 'success';
          break;
        case 'payment_intent.processing':
          await this.handlePaymentIntentProcessing(paymentIntent);
          webhookEvent.processingResult = 'success';
          break;
        case 'payment_intent.requires_action':
          await this.handlePaymentIntentRequiresAction(paymentIntent);
          webhookEvent.processingResult = 'success';
          break;
        case 'payment_intent.amount_capturable_updated':
          console.log('Payment intent amount capturable updated:', paymentIntent.id, 'Amount:', paymentIntent.amount_capturable);
          webhookEvent.processingResult = 'success';
          break;

        // Charge events
        case 'charge.succeeded':
          console.log('Charge succeeded:', (event.data.object as Stripe.Charge).id);
          webhookEvent.processingResult = 'success';
          break;
        case 'charge.failed':
          await this.handleChargeFailed(event.data.object as Stripe.Charge);
          webhookEvent.processingResult = 'success';
          break;
        case 'charge.captured':
          console.log('Charge captured:', (event.data.object as Stripe.Charge).id, 'Amount:', (event.data.object as Stripe.Charge).amount_captured);
          webhookEvent.processingResult = 'success';
          break;
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          webhookEvent.processingResult = 'success';
          break;
        case 'charge.refund.updated':
          console.log('Charge refund updated:', (event.data.object as any).id);
          webhookEvent.processingResult = 'success';
          break;

        // Dispute events
        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
          webhookEvent.processingResult = 'success';
          break;
        case 'charge.dispute.closed':
          await this.handleDisputeClosed(event.data.object as Stripe.Dispute);
          webhookEvent.processingResult = 'success';
          break;

        // Account events
        case 'account.updated':
          console.log('Stripe account updated');
          webhookEvent.processingResult = 'success';
          break;

        // Review events (Stripe Radar)
        case 'review.opened':
          console.log('Stripe review opened:', (event.data.object as any).id, 'Reason:', (event.data.object as any).reason);
          webhookEvent.processingResult = 'success';
          break;
        case 'review.closed':
          console.log('Stripe review closed:', (event.data.object as any).id, 'Reason:', (event.data.object as any).reason);
          webhookEvent.processingResult = 'success';
          break;

        // Setup Intent events
        case 'setup_intent.succeeded':
          console.log('Setup intent succeeded:', (event.data.object as Stripe.SetupIntent).id, 'Payment method:', (event.data.object as Stripe.SetupIntent).payment_method);
          webhookEvent.processingResult = 'success';
          break;
        case 'setup_intent.setup_failed':
          console.log('Setup intent failed:', (event.data.object as Stripe.SetupIntent).id, 'Error:', (event.data.object as Stripe.SetupIntent).last_setup_error?.message);
          webhookEvent.processingResult = 'success';
          break;

        // Source events (legacy)
        case 'source.canceled':
          console.log('Source canceled:', (event.data.object as any).id);
          webhookEvent.processingResult = 'success';
          break;
        case 'source.chargeable':
          console.log('Source chargeable:', (event.data.object as any).id);
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
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          webhookEvent.processingResult = 'success';
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          webhookEvent.processingResult = 'success';
          break;
        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
          webhookEvent.processingResult = 'unhandled';
      }
    } catch (error) {
      webhookEvent.processingResult = 'error';
      webhookEvent.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Still persist the result to track the error, but log it
      console.error(`Error processing webhook ${event.id}:`, error);
    }

    // Update the record with processing result
    await em.flush();

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
      case StripePaymentType.WORLD_FINALS_REGISTRATION:
        await this.handleWorldFinalsRegistrationPayment(paymentIntent);
        break;
      case StripePaymentType.MEMBERSHIP:
      default:
        // Default to membership payment (for backwards compatibility)
        await this.handleMembershipPayment(paymentIntent);
        break;
    }
  }

  private async handleTeamUpgradePayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await this.paymentFulfillmentService.fulfillTeamUpgradePayment({
      transactionId: paymentIntent.id,
      paymentMethod: PaymentMethod.STRIPE,
      amountCents: paymentIntent.amount,
      metadata: paymentIntent.metadata as Record<string, string>,
    });
  }

  private async handleMembershipPayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await this.paymentFulfillmentService.fulfillMembershipPayment({
      transactionId: paymentIntent.id,
      paymentMethod: PaymentMethod.STRIPE,
      amountCents: paymentIntent.amount,
      metadata: paymentIntent.metadata as Record<string, string>,
    });
  }

  private async handleEventRegistrationPayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await this.paymentFulfillmentService.fulfillEventRegistrationPayment({
      transactionId: paymentIntent.id,
      paymentMethod: PaymentMethod.STRIPE,
      amountCents: paymentIntent.amount,
      metadata: paymentIntent.metadata as Record<string, string>,
    });
  }

  private async handleInvoicePayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await this.paymentFulfillmentService.fulfillInvoicePayment({
      transactionId: paymentIntent.id,
      paymentMethod: PaymentMethod.STRIPE,
      amountCents: paymentIntent.amount,
      metadata: paymentIntent.metadata as Record<string, string>,
    });
  }

  private async handleShopPayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const metadata = paymentIntent.metadata as Record<string, string>;
    // Pass chargeId in metadata for shop service
    metadata.chargeId = paymentIntent.latest_charge as string;
    await this.paymentFulfillmentService.fulfillShopPayment({
      transactionId: paymentIntent.id,
      paymentMethod: PaymentMethod.STRIPE,
      amountCents: paymentIntent.amount,
      metadata,
    });
  }

  private async handleWorldFinalsRegistrationPayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await this.paymentFulfillmentService.fulfillWorldFinalsPayment({
      transactionId: paymentIntent.id,
      paymentMethod: PaymentMethod.STRIPE,
      amountCents: paymentIntent.amount,
      metadata: paymentIntent.metadata as Record<string, string>,
    });
  }

  // NOTE: createShopOrderAndInvoice() logic has been moved to ShopService.createBillingOrderAndInvoice()

  // NOTE: activatePendingMembershipForInvoice, createOrderForSecondaryMembership,
  // createQuickBooksSalesReceipt, handleMembershipPayment, handleEventRegistrationPayment,
  // handleInvoicePayment, handleShopPayment, handleWorldFinalsRegistrationPayment,
  // and handleTeamUpgradePayment have been moved to PaymentFulfillmentService.

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log('Payment failed:', paymentIntent.id);
    const metadata = paymentIntent.metadata;
    console.log('Payment failure details:', {
      paymentType: metadata?.paymentType,
      email: metadata?.email,
      error: paymentIntent.last_payment_error?.message,
      code: paymentIntent.last_payment_error?.code,
    });

    // Subscription renewal failures are surfaced via invoice.payment_failed already - skip here to avoid duplicates.
    const paymentType = metadata?.paymentType;
    const isSubscriptionRenewal = paymentType === 'membership_renewal' || paymentType === 'subscription_renewal';
    if (isSubscriptionRenewal) {
      return;
    }

    // Record the failure: write a Payment row + flip the source-of-truth entity
    // (Invoice, Order, EventRegistration) so the admin Failed Payments view has
    // something to query. Without this, one-time failures left no auditable
    // trail beyond the transient admin email. Returns the local order/invoice
    // ids it touched so the admin notification can deep-link to them.
    const touched = await this.recordOneTimeFailure(paymentIntent).catch((err) => {
      console.error(`Failed to record payment failure for ${paymentIntent.id}:`, err);
      return { orderId: null as string | null, invoiceId: null as string | null };
    });

    this.adminNotificationsService.notifyOneTimePaymentFailed({
      transactionId: paymentIntent.id,
      amountCents: paymentIntent.amount,
      paymentMethod: 'stripe',
      paymentType: paymentType || null,
      customerEmail: metadata?.email || null,
      customerName: metadata?.competitorName || metadata?.firstName || null,
      failureCode: paymentIntent.last_payment_error?.code || null,
      failureMessage: paymentIntent.last_payment_error?.message || null,
      orderId: touched.orderId,
      invoiceId: touched.invoiceId,
    }).catch((err) => {
      console.error(`Failed to notify admins of payment failure: ${err}`);
    });
  }

  /**
   * Persist a failed Stripe one-time payment so admins can see it in the
   * Failed Payments view. Writes a Payment row keyed by paymentIntentId
   * (idempotent via stripe_payment_intent_id) and flips any directly-
   * associated invoice / billing-order / event-registration to FAILED.
   *
   * Skips if a Payment row already exists for this intent — Stripe sends
   * payment_intent.payment_failed once per attempt, but the webhook may be
   * retried, and we want a single row per intent.
   */
  private async recordOneTimeFailure(paymentIntent: Stripe.PaymentIntent): Promise<{
    orderId: string | null;
    invoiceId: string | null;
  }> {
    const em = this.em.fork();
    let touchedOrderId: string | null = null;
    let touchedInvoiceId: string | null = null;
    const metadata = paymentIntent.metadata || {};
    const failureMessage = paymentIntent.last_payment_error?.message
      || paymentIntent.last_payment_error?.code
      || 'Payment failed';

    // Resolve the user, if any. The metadata.userId is set whenever a logged-in
    // member starts the checkout; guest checkouts only have an email.
    let user: Profile | null = null;
    if (metadata.userId) {
      user = await em.findOne(Profile, { id: metadata.userId });
    }
    if (!user && metadata.email) {
      user = await em.findOne(Profile, { email: String(metadata.email).toLowerCase() });
    }

    // Idempotency: if a payment row already exists for this intent, just
    // refresh failure_reason / status (Stripe can replay the webhook).
    const existing = await em.findOne(Payment, { stripePaymentIntentId: paymentIntent.id });
    if (existing) {
      existing.paymentStatus = PaymentStatus.FAILED;
      existing.failureReason = failureMessage;
    } else if (user) {
      // Payment.user is non-null in the schema, so we only persist a row when
      // we can resolve a profile. Guest failures fall back to invoice/order
      // status updates below.
      const payment = new Payment();
      payment.user = user;
      payment.amount = paymentIntent.amount / 100;
      payment.currency = (paymentIntent.currency || 'usd').toUpperCase();
      payment.stripePaymentIntentId = paymentIntent.id;
      payment.paymentMethod = PaymentMethod.STRIPE;
      payment.paymentStatus = PaymentStatus.FAILED;
      payment.failureReason = failureMessage;
      payment.description = metadata.paymentType
        ? `Failed ${metadata.paymentType.replace(/_/g, ' ')}`
        : 'Failed Stripe payment';
      // Map StripePaymentType → PaymentType for the Payment row. We keep this
      // narrow: anything not membership/registration falls back to OTHER.
      const stripeType = metadata.paymentType as string | undefined;
      payment.paymentType =
        stripeType === StripePaymentType.MEMBERSHIP ? PaymentType.MEMBERSHIP
        : stripeType === StripePaymentType.EVENT_REGISTRATION ? PaymentType.EVENT_REGISTRATION
        : PaymentType.OTHER;
      payment.paymentMetadata = {
        stripeMetadata: metadata,
        failureCode: paymentIntent.last_payment_error?.code || null,
        amountCents: paymentIntent.amount,
      };
      em.persist(payment);
    }

    // Flip the local Invoice when a member tried (and failed) to pay one.
    if (metadata.invoiceId) {
      const invoice = await em.findOne(Invoice, { id: metadata.invoiceId });
      if (invoice && invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELLED) {
        invoice.status = InvoiceStatus.FAILED;
        invoice.metadata = {
          ...(invoice.metadata as Record<string, unknown> | undefined),
          lastFailureReason: failureMessage,
          lastFailedAt: new Date().toISOString(),
          lastFailedPaymentIntentId: paymentIntent.id,
        };
        touchedInvoiceId = invoice.id;
      }
    }

    // Flip the billing Order if metadata carries an orderId AND we can find a
    // matching Order row (SHOP intents use metadata.orderId for the ShopOrder,
    // not the billing Order — we only update what we actually find).
    if (metadata.orderId) {
      const order = await em.findOne(Order, { id: metadata.orderId });
      if (order && order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED) {
        order.status = OrderStatus.FAILED;
        order.metadata = {
          ...(order.metadata as Record<string, unknown> | undefined),
          lastFailureReason: failureMessage,
          lastFailedAt: new Date().toISOString(),
          lastFailedPaymentIntentId: paymentIntent.id,
        };
        touchedOrderId = order.id;
      }
    }

    // Event registrations are created in PENDING state before the payment
    // intent (see createEventRegistrationPaymentIntent) — flip them so they
    // don't sit pending forever.
    if (metadata.registrationId) {
      const reg = await em.findOne(EventRegistration, { id: metadata.registrationId });
      if (reg && reg.paymentStatus !== PaymentStatus.PAID && reg.paymentStatus !== PaymentStatus.REFUNDED) {
        reg.paymentStatus = PaymentStatus.FAILED;
      }
    }

    await em.flush();

    return { orderId: touchedOrderId, invoiceId: touchedInvoiceId };
  }

  private async handlePaymentIntentProcessing(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log('Payment processing:', paymentIntent.id, 'Type:', paymentIntent.metadata?.paymentType);
    // This occurs for async payment methods like ACH/bank transfers
    // Payment is not yet complete — do not fulfill
  }

  private async handlePaymentIntentRequiresAction(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log('Payment requires action:', paymentIntent.id, 'Type:', paymentIntent.metadata?.paymentType);
    // This occurs when 3D Secure or other authentication is needed
    // The frontend handles this via Stripe.js — this is just for logging
  }

  private async handleChargeFailed(charge: Stripe.Charge): Promise<void> {
    console.log('Charge failed:', charge.id, 'Failure code:', charge.failure_code, 'Message:', charge.failure_message);

    const paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

    if (paymentIntentId) {
      console.log('Failed charge associated with payment intent:', paymentIntentId);
    }
  }

  private async handleDisputeClosed(dispute: Stripe.Dispute): Promise<void> {
    console.log('Dispute closed:', dispute.id, 'Status:', dispute.status);

    const chargeId = typeof dispute.charge === 'string'
      ? dispute.charge
      : dispute.charge?.id;

    if (!chargeId) {
      console.error('Closed dispute missing charge ID:', dispute.id);
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
      console.error('Closed dispute charge missing payment_intent:', chargeId);
      return;
    }

    const em = this.em.fork();
    const payment = await em.findOne(Payment, {
      stripePaymentIntentId: paymentIntentId,
    });

    if (payment) {
      // Update dispute info in payment metadata
      payment.paymentMetadata = {
        ...payment.paymentMetadata,
        dispute: {
          ...((payment.paymentMetadata as any)?.dispute || {}),
          id: dispute.id,
          status: dispute.status,
          closedAt: new Date().toISOString(),
        },
      };
      await em.flush();
      console.log(`Payment ${payment.id} dispute ${dispute.id} closed with status: ${dispute.status}`);
    }

    if (dispute.status === 'lost') {
      console.error(`[CRITICAL] Dispute LOST: ${dispute.id}, Amount: $${dispute.amount / 100}`);

      this.adminNotificationsService.notifyDisputeLost({
        disputeId: dispute.id,
        amountCents: dispute.amount,
        reason: dispute.reason || 'Not specified',
        paymentIntentId,
        customerEmail: (payment?.paymentMetadata as any)?.email || null,
        customerName: (payment?.paymentMetadata as any)?.customerName || null,
        paymentType: payment?.paymentType || null,
      }).catch((err) => {
        console.error(`Failed to notify admins of lost dispute: ${err}`);
      });
    } else if (dispute.status === 'won') {
      console.log(`Dispute WON: ${dispute.id}, Amount: $${dispute.amount / 100}`);
    }
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

    // Find the payment record by stripe payment intent ID, populate user + membership for downstream email/in-app logic
    const payment = await em.findOne(Payment, {
      stripePaymentIntentId: paymentIntentId,
    }, { populate: ['user', 'membership'] });

    if (!payment) {
      console.log(`No payment record found for refunded charge, payment intent: ${paymentIntentId}`);
      return;
    }

    // Update payment status
    const { PaymentStatus } = await import('@newmeca/shared');
    payment.paymentStatus = PaymentStatus.REFUNDED;
    payment.refundedAt = new Date();
    payment.refundReason = charge.refunds?.data[0]?.reason || 'Refunded via Stripe';

    // If this payment is associated with a membership, update membership status. Determine if this is a master/independent (a.k.a. "main") refund — those skip user in-app per requirements.
    let isMainMembershipRefund = false;
    if (payment.membership) {
      const Membership = (await import('../memberships/memberships.entity')).Membership;
      const membership = await em.findOne(Membership, { id: payment.membership.id });
      if (membership) {
        membership.paymentStatus = PaymentStatus.REFUNDED;
        isMainMembershipRefund = membership.isMaster() || membership.isIndependent();
        console.log(`Membership ${payment.membership.id} marked as refunded (main=${isMainMembershipRefund})`);
      }
    }

    await em.flush();
    console.log(`Payment ${payment.id} marked as refunded`);

    // Send refund confirmation email to user
    const refundAmountCents = charge.refunds?.data[0]?.amount ?? charge.amount_refunded ?? 0;
    const refundAmount = refundAmountCents / 100;
    const isPartial = charge.amount_refunded > 0 && charge.amount_refunded < charge.amount;
    const recipientEmail = payment.user?.email || (payment.paymentMetadata as any)?.email;
    const recipientFirstName = payment.user?.first_name || (payment.paymentMetadata as any)?.firstName;

    if (recipientEmail && refundAmount > 0) {
      this.emailService.sendRefundConfirmationEmail({
        to: recipientEmail,
        firstName: recipientFirstName,
        refundAmount,
        paymentDescription: payment.description || payment.paymentType || 'MECA purchase',
        refundDate: new Date(),
        paymentMethod: 'stripe',
        transactionId: charge.id,
        isPartialRefund: isPartial,
      }).catch((err) => {
        console.error(`Failed to send refund confirmation email: ${err}`);
      });

      // In-app notification for the user (skip for main membership refunds — user account is being cancelled)
      if (payment.user?.id && !isMainMembershipRefund && refundAmount > 0) {
        const refundType = isPartial ? 'Partial refund' : 'Refund';
        this.notificationsService.createForUser({
          userId: payment.user.id,
          title: `${refundType} processed`,
          message: `${refundType} of $${refundAmount.toFixed(2)} for ${payment.description || payment.paymentType || 'your purchase'}`,
          type: 'info',
          link: '/billing',
        }).catch((err) => {
          console.error(`Failed to create user refund in-app notification: ${err}`);
        });
      }
    } else {
      console.warn(`Skipping refund email - missing recipient email or zero amount (paymentId=${payment.id})`);
    }

    // Notify admins of the refund (email + in-app via the helper)
    if (refundAmount > 0) {
      this.adminNotificationsService.notifyRefundIssued({
        amountCents: refundAmountCents,
        paymentMethod: 'stripe',
        paymentType: payment.paymentType || null,
        transactionId: charge.id,
        customerEmail: recipientEmail || null,
        customerName: payment.user
          ? `${payment.user.first_name || ''} ${payment.user.last_name || ''}`.trim() || null
          : null,
        isPartialRefund: isPartial,
      }).catch((err) => {
        console.error(`Failed to notify admins of refund: ${err}`);
      });
    }

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
    const evidenceDueBy = dispute.evidence_details?.due_by
      ? new Date(dispute.evidence_details.due_by * 1000)
      : null;
    console.error(`[CRITICAL] Payment dispute created:`, {
      disputeId: dispute.id,
      amount: dispute.amount / 100,
      reason: dispute.reason,
      paymentIntentId,
      evidence_due_by: evidenceDueBy?.toISOString() || 'unknown',
    });

    this.adminNotificationsService.notifyDisputeCreated({
      disputeId: dispute.id,
      amountCents: dispute.amount,
      reason: dispute.reason || 'Not specified',
      paymentIntentId,
      evidenceDueBy,
      customerEmail: (payment?.paymentMetadata as any)?.email || null,
      customerName: (payment?.paymentMetadata as any)?.customerName || null,
      paymentType: payment?.paymentType || null,
    }).catch((err) => {
      console.error(`Failed to notify admins of new dispute: ${err}`);
    });

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

      // Notify admins of subscription cancellation
      await em.populate(membership, ['user', 'membershipTypeConfig']);
      this.adminNotificationsService.notifySubscriptionCancelled(membership).catch((err) => {
        console.error('Admin notification failed (non-critical):', err);
      });

      // Notify the user that their subscription ended
      const userEmail = membership.user?.email;
      if (userEmail) {
        const baseUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';
        this.emailService.sendSubscriptionCancelledEmail({
          to: userEmail,
          firstName: membership.user?.first_name,
          membershipType: membership.membershipTypeConfig?.name || 'Membership',
          mecaId: membership.mecaId ?? undefined,
          cancellationDate: membership.cancelledAt || new Date(),
          cancellationReason: membership.cancellationReason || undefined,
          endDate: membership.endDate || null,
          renewalUrl: `${baseUrl}/membership`,
          paymentMethod: 'stripe',
        }).catch((err) => {
          console.error(`Failed to send Stripe subscription cancel email to user: ${err}`);
        });
      }
    }
  }

  /**
   * Handle invoice.paid event for subscription renewals.
   * Extends the membership end_date by 1 year when a subscription invoice is paid.
   * Only processes subscription_cycle invoices (not initial purchases).
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (!subscriptionId) {
      console.log('Invoice has no subscription, skipping (one-time payment)');
      return;
    }

    // Only process renewal invoices, not the initial subscription purchase
    if (invoice.billing_reason === 'subscription_create') {
      console.log('Invoice is for initial subscription creation, skipping (handled by checkout.session.completed)');
      return;
    }

    console.log('Invoice paid for subscription renewal:', subscriptionId, 'Reason:', invoice.billing_reason);

    const em = this.em.fork();
    const membership = await em.findOne(Membership, { stripeSubscriptionId: subscriptionId });

    if (!membership) {
      console.warn('No membership found for subscription ' + subscriptionId + ', skipping invoice.paid');
      return;
    }

    // Extend end_date by 1 year from current end_date (not from today, to prevent drift)
    const currentEndDate = membership.endDate;
    let newEndDate: Date;

    if (currentEndDate && currentEndDate > new Date()) {
      // End date is still in the future - extend from it
      newEndDate = new Date(currentEndDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    } else {
      // End date is in the past or null - recovery case, extend from now
      newEndDate = new Date();
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }

    const oldEndStr = currentEndDate ? currentEndDate.toISOString().split('T')[0] : 'NULL';
    const newEndStr = newEndDate.toISOString().split('T')[0];

    membership.endDate = newEndDate;
    membership.paymentStatus = PaymentStatus.PAID;
    await em.flush();

    console.log('Extended membership ' + membership.id + ' end_date: ' + oldEndStr + ' -> ' + newEndStr + ' (subscription: ' + subscriptionId + ')');

    // Notify admins of subscription renewal
    await em.populate(membership, ['user', 'membershipTypeConfig']);
    this.adminNotificationsService.notifySubscriptionRenewal(membership, newEndDate).catch((err) => {
      console.error('Admin notification failed (non-critical):', err);
    });

    // Send renewal confirmation to the member
    const memberEmail = membership.user?.email;
    if (memberEmail && membership.mecaId != null) {
      this.emailService.sendMembershipRenewalEmail({
        to: memberEmail,
        firstName: membership.user?.first_name || undefined,
        mecaId: membership.mecaId,
        membershipType: membership.membershipTypeConfig?.name || 'Membership',
        expiryDate: newEndDate,
      }).catch((err) => {
        console.error('Member renewal email failed (non-critical):', err);
      });
    }
  }

  /**
   * Handle invoice.payment_failed: Stripe couldn't collect the renewal charge.
   * Marks the membership FAILED, fires an admin alert, and lets dunning (TODO)
   * own escalation. Without this handler, failed renewals were silent —
   * memberships would remain "paid" until the next failed retry, with no
   * visibility for admins or members.
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (!subscriptionId) {
      console.log('Invoice.payment_failed has no subscription, skipping (one-time payment)');
      return;
    }

    console.log('Invoice payment failed for subscription:', subscriptionId, 'attempt:', invoice.attempt_count, 'amount_due:', invoice.amount_due);

    const em = this.em.fork();
    const membership = await em.findOne(Membership, { stripeSubscriptionId: subscriptionId });

    if (!membership) {
      console.warn('No membership found for subscription ' + subscriptionId + ', skipping invoice.payment_failed');
      return;
    }

    membership.paymentStatus = PaymentStatus.FAILED;
    await em.populate(membership, ['user', 'membershipTypeConfig']);

    // Record the failed renewal as a Payment row keyed by Stripe invoice id
    // (subscription renewals don't have a unique payment_intent we can key on
    // across retries, but each invoice attempt has a distinct id).
    if (membership.user && invoice.id) {
      const existingPayment = await em.findOne(Payment, {
        externalPaymentId: invoice.id,
        paymentStatus: PaymentStatus.FAILED,
      });
      if (!existingPayment) {
        const payment = new Payment();
        payment.user = membership.user;
        payment.membership = membership;
        payment.amount = (invoice.amount_due ?? 0) / 100;
        payment.currency = (invoice.currency || 'usd').toUpperCase();
        payment.externalPaymentId = invoice.id;
        payment.paymentMethod = PaymentMethod.STRIPE;
        payment.paymentStatus = PaymentStatus.FAILED;
        payment.paymentType = PaymentType.MEMBERSHIP;
        payment.failureReason = invoice.last_finalization_error?.message
          || `Subscription renewal failed (attempt ${invoice.attempt_count ?? 1})`;
        payment.description = `Failed membership renewal (attempt ${invoice.attempt_count ?? 1})`;
        payment.paymentMetadata = {
          stripeInvoiceId: invoice.id,
          stripeSubscriptionId: subscriptionId,
          attemptCount: invoice.attempt_count ?? 1,
          hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
          amountDueCents: invoice.amount_due ?? 0,
        };
        em.persist(payment);
      }
    }

    await em.flush();

    this.adminNotificationsService.notifyInvoicePaymentFailed(membership, {
      attemptCount: invoice.attempt_count ?? 1,
      amountDueCents: invoice.amount_due ?? 0,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    }).catch((err) => {
      console.error('Admin notification failed (non-critical):', err);
    });
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
        // Build metadata for order/invoice creation
        const orderMetadata: Record<string, string> = {
          ...metadata,
          membershipId: membership.id,
          mecaId: String(mecaId),
        };
        const subTax = await this.taxService.calculateTax(membershipConfig.price);
        await this.paymentFulfillmentService.createOrderAndInvoice(
          {
            transactionId: paymentIntentId,
            paymentMethod: PaymentMethod.STRIPE,
            amountCents: Math.round(membershipConfig.price * 100),
            metadata: orderMetadata,
          },
          membershipConfig.price,
          'membership',
          subTax.taxAmount.toFixed(2),
        );
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

  // NOTE: createOrderAndInvoice has been moved to PaymentFulfillmentService

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
