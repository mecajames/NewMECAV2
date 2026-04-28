import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../auth/public.decorator';
import { EntityManager } from '@mikro-orm/core';
import { PayPalService } from './paypal.service';
import { PaymentFulfillmentService, PaymentFulfillmentParams } from '../payments/payment-fulfillment.service';
import { MembershipsService } from '../memberships/memberships.service';
import { EventRegistrationsService } from '../event-registrations/event-registrations.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ShopService } from '../shop/shop.service';
import { TaxService } from '../tax/tax.service';
import { CouponsService } from '../coupons/coupons.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { MembershipTypeConfig } from '../membership-type-configs/membership-type-configs.entity';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import { ProcessedPaypalWebhook } from './processed-paypal-webhook.entity';
import { Membership } from '../memberships/memberships.entity';
import {
  PaymentMethod,
  PayPalPaymentType,
  StripePaymentType,
  ShopAddress,
  PaymentStatus,
} from '@newmeca/shared';

// DTO interfaces matching Stripe controller pattern
interface CreateMembershipOrderDto {
  membershipTypeConfigId: string;
  email: string;
  billingFirstName?: string;
  billingLastName?: string;
  billingPhone?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  teamName?: string;
  teamDescription?: string;
  businessName?: string;
  businessWebsite?: string;
  userId?: string;
}

interface CreateEventRegistrationOrderDto {
  eventId: string;
  registrationId: string;
  email: string;
  userId?: string;
  mecaId?: number;
  includeMembership?: boolean;
  membershipTypeConfigId?: string;
}

interface CreateInvoiceOrderDto {
  invoiceId: string;
}

interface CreateShopOrderDto {
  items: Array<{ productId: string; quantity: number }>;
  email: string;
  shippingAddress?: ShopAddress;
  billingAddress?: ShopAddress;
  userId?: string;
  shippingMethod?: 'standard' | 'priority';
  shippingAmount?: number;
  couponCode?: string;
}

interface CaptureOrderDto {
  paypalOrderId: string;
  paymentType: string;
  metadata?: Record<string, string>;
}

@Controller('api/paypal')
export class PayPalController {
  private readonly logger = new Logger(PayPalController.name);

  constructor(
    private readonly paypalService: PayPalService,
    private readonly paymentFulfillmentService: PaymentFulfillmentService,
    private readonly membershipsService: MembershipsService,
    private readonly eventRegistrationsService: EventRegistrationsService,
    private readonly invoicesService: InvoicesService,
    private readonly shopService: ShopService,
    private readonly taxService: TaxService,
    private readonly couponsService: CouponsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // Helper to extract userId from JWT token
  private async extractUserId(authHeader?: string): Promise<string | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) return null;
    return user.id;
  }

  /**
   * Get PayPal client configuration (public - returns clientId + sandbox flag).
   */
  @Public()
  @Get('client-config')
  async getClientConfig(): Promise<{ clientId: string; sandbox: boolean } | { enabled: false }> {
    const config = await this.paypalService.getClientConfig();
    if (!config) return { enabled: false } as any;
    return config;
  }

  /**
   * Create a PayPal order for membership purchase.
   */
  @Public()
  @Post('create-order')
  @HttpCode(HttpStatus.OK)
  async createMembershipOrder(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateMembershipOrderDto,
  ): Promise<{ paypalOrderId: string }> {
    if (!data.membershipTypeConfigId) throw new BadRequestException('Membership type is required');
    if (!data.email) throw new BadRequestException('Email is required');

    // Verify user
    const verifiedUserId = await this.extractUserId(authHeader);
    if (verifiedUserId) {
      data.userId = verifiedUserId;
    } else {
      delete data.userId;
    }

    const em = this.em.fork();
    const membershipConfig = await em.findOne(MembershipTypeConfig, { id: data.membershipTypeConfigId });
    if (!membershipConfig) throw new BadRequestException('Membership type not found');
    if (!membershipConfig.isActive) throw new BadRequestException('This membership type is not available');

    // Verify eligibility
    if (data.userId) {
      const eligibility = await this.membershipsService.canPurchaseMembership(data.userId, data.membershipTypeConfigId);
      if (!eligibility.allowed) {
        throw new BadRequestException(eligibility.reason || 'You are not eligible to purchase this membership type');
      }
    }

    // Calculate tax
    const membershipPrice = Number(membershipConfig.price);
    const tax = await this.taxService.calculateTax(membershipPrice);
    const totalAmount = membershipPrice + tax.taxAmount;

    // Build metadata
    const metadata: Record<string, string> = {
      paymentType: PayPalPaymentType.MEMBERSHIP,
      membershipTypeConfigId: membershipConfig.id,
      membershipCategory: membershipConfig.category,
      email: data.email.toLowerCase(),
      taxAmount: tax.taxAmount.toFixed(2),
      taxRate: tax.taxRate.toString(),
    };
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

    const order = await this.paypalService.createOrder({
      amount: totalAmount,
      currency: membershipConfig.currency || 'usd',
      description: `MECA Membership: ${membershipConfig.name}`,
      metadata,
    });

    return { paypalOrderId: order.id };
  }

  /**
   * Create a PayPal order for event registration.
   */
  @Public()
  @Post('create-event-registration-order')
  @HttpCode(HttpStatus.OK)
  async createEventRegistrationOrder(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateEventRegistrationOrderDto,
  ): Promise<{ paypalOrderId: string }> {
    if (!data.eventId) throw new BadRequestException('Event ID is required');
    if (!data.registrationId) throw new BadRequestException('Registration ID is required');
    if (!data.email) throw new BadRequestException('Email is required');

    const verifiedUserId = await this.extractUserId(authHeader);
    if (verifiedUserId) data.userId = verifiedUserId;
    else delete data.userId;

    const em = this.em.fork();
    const event = await em.findOne(Event, { id: data.eventId });
    if (!event) throw new BadRequestException('Event not found');

    // Get the registration to determine amount
    const registration = await this.eventRegistrationsService.findById(data.registrationId);
    if (!registration) throw new BadRequestException('Registration not found');

    const totalAmount = Number(registration.amountPaid || 0);

    const metadata: Record<string, string> = {
      paymentType: PayPalPaymentType.EVENT_REGISTRATION,
      registrationId: data.registrationId,
      eventId: data.eventId,
      eventTitle: event.title,
      email: data.email.toLowerCase(),
    };
    if (data.userId) metadata.userId = data.userId;
    if (data.mecaId) metadata.mecaId = String(data.mecaId);
    if (data.includeMembership) {
      metadata.includeMembership = 'true';
      metadata.membershipTypeConfigId = data.membershipTypeConfigId || '';
    }

    const order = await this.paypalService.createOrder({
      amount: totalAmount,
      description: `Event Registration: ${event.title}`,
      metadata,
    });

    return { paypalOrderId: order.id };
  }

  /**
   * Create a PayPal order for invoice payment.
   */
  @Public()
  @Post('create-invoice-order')
  @HttpCode(HttpStatus.OK)
  async createInvoiceOrder(
    @Body() data: CreateInvoiceOrderDto,
  ): Promise<{ paypalOrderId: string }> {
    if (!data.invoiceId) throw new BadRequestException('Invoice ID is required');

    const invoice = await this.invoicesService.findById(data.invoiceId);
    if (!invoice) throw new BadRequestException('Invoice not found');
    if (invoice.status === 'paid') throw new BadRequestException('Invoice has already been paid');
    if (invoice.status === 'cancelled') throw new BadRequestException('Invoice has been cancelled');

    const user = invoice.user;
    if (!user?.email) throw new BadRequestException('Invoice has no associated user email');

    const metadata: Record<string, string> = {
      paymentType: PayPalPaymentType.INVOICE_PAYMENT,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      userId: user.id,
      email: user.email,
    };

    const order = await this.paypalService.createOrder({
      amount: parseFloat(invoice.total),
      currency: invoice.currency || 'usd',
      description: `Invoice ${invoice.invoiceNumber}`,
      metadata,
    });

    return { paypalOrderId: order.id };
  }

  /**
   * Create a PayPal order for shop purchase.
   */
  @Public()
  @Post('create-shop-order')
  @HttpCode(HttpStatus.OK)
  async createShopOrder(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateShopOrderDto,
  ): Promise<{ paypalOrderId: string; orderId: string }> {
    const verifiedUserId = await this.extractUserId(authHeader);
    if (verifiedUserId) data.userId = verifiedUserId;
    else delete data.userId;

    if (!data.items || data.items.length === 0) throw new BadRequestException('At least one item is required');
    if (!data.email) throw new BadRequestException('Email is required');

    // Check stock
    const stockCheck = await this.shopService.checkStockAvailability(data.items);
    if (!stockCheck.available) {
      const unavailableNames = stockCheck.unavailableItems.map((i: any) => i.productName).join(', ');
      throw new BadRequestException(`Some items are out of stock: ${unavailableNames}`);
    }

    // Validate coupon if provided
    let shopDiscountAmount = 0;
    let shopCouponId: string | undefined;
    if (data.couponCode) {
      const products = await this.shopService.getProductsByIds(data.items.map((i) => i.productId));
      let subtotal = 0;
      for (const item of data.items) {
        const product = products.find((p) => p.id === item.productId);
        if (product) subtotal += Number(product.price) * item.quantity;
      }
      const validation = await this.couponsService.validateCoupon(data.couponCode, {
        scope: 'shop',
        subtotal,
        productIds: data.items.map((i) => i.productId),
        userId: data.userId,
        email: data.email,
      });
      if (!validation.valid) {
        throw new BadRequestException(validation.message);
      }
      shopDiscountAmount = validation.discountAmount!;
      shopCouponId = validation.couponId;
    }

    // Create order in pending state
    const shopOrder = await this.shopService.createOrder({
      userId: data.userId,
      guestEmail: data.email,
      guestName: data.shippingAddress?.name,
      items: data.items,
      shippingAddress: data.shippingAddress,
      billingAddress: data.billingAddress,
      shippingMethod: data.shippingMethod || 'standard',
      shippingAmount: data.shippingAmount || 0,
      discountAmount: shopDiscountAmount,
      couponCode: data.couponCode?.toUpperCase(),
    });

    const metadata: Record<string, string> = {
      paymentType: PayPalPaymentType.SHOP,
      orderId: shopOrder.id,
      orderNumber: shopOrder.orderNumber,
      email: data.email.toLowerCase(),
      itemCount: String(data.items.length),
    };
    if (data.userId) metadata.userId = data.userId;
    if (data.couponCode && shopCouponId) {
      metadata.couponCode = data.couponCode.toUpperCase();
      metadata.couponId = shopCouponId;
      metadata.discountAmount = shopDiscountAmount.toFixed(2);
    }

    const order = await this.paypalService.createOrder({
      amount: Number(shopOrder.totalAmount),
      description: `Shop Order: ${shopOrder.orderNumber}`,
      metadata,
    });

    return { paypalOrderId: order.id, orderId: shopOrder.id };
  }

  /**
   * Capture a PayPal order after buyer approval.
   * This is the main fulfillment endpoint - called by the frontend after PayPal popup approval.
   */
  @Public()
  @Post('capture-order')
  @HttpCode(HttpStatus.OK)
  async captureOrder(
    @Body() data: CaptureOrderDto,
  ): Promise<{ success: boolean; captureId?: string }> {
    if (!data.paypalOrderId) throw new BadRequestException('PayPal order ID is required');
    if (!data.paymentType) throw new BadRequestException('Payment type is required');

    // Capture the payment via PayPal API
    const captureResult = await this.paypalService.captureOrder(data.paypalOrderId);

    if (captureResult.status !== 'COMPLETED') {
      this.logger.error(`PayPal capture not completed: ${captureResult.status} for order ${data.paypalOrderId}`);
      throw new BadRequestException(`PayPal payment was not completed. Status: ${captureResult.status}`);
    }

    // Extract capture details
    const capture = captureResult.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture) {
      throw new BadRequestException('No capture found in PayPal response');
    }

    const amountCents = Math.round(parseFloat(capture.amount.value) * 100);
    const captureId = capture.id;

    // Merge incoming metadata with what we have
    const metadata = data.metadata || {};
    metadata.paypalOrderId = data.paypalOrderId;
    metadata.paypalCaptureId = captureId;

    // Build fulfillment params
    const fulfillmentParams: PaymentFulfillmentParams = {
      transactionId: captureId,
      paymentMethod: PaymentMethod.PAYPAL,
      amountCents,
      metadata,
    };

    // Route to appropriate handler based on payment type
    const paymentType = data.paymentType as PayPalPaymentType;
    switch (paymentType) {
      case PayPalPaymentType.MEMBERSHIP:
        await this.paymentFulfillmentService.fulfillMembershipPayment(fulfillmentParams);
        break;
      case PayPalPaymentType.EVENT_REGISTRATION:
        await this.paymentFulfillmentService.fulfillEventRegistrationPayment(fulfillmentParams);
        break;
      case PayPalPaymentType.INVOICE_PAYMENT:
        await this.paymentFulfillmentService.fulfillInvoicePayment(fulfillmentParams);
        break;
      case PayPalPaymentType.SHOP:
        await this.paymentFulfillmentService.fulfillShopPayment(fulfillmentParams);
        break;
      case PayPalPaymentType.WORLD_FINALS_REGISTRATION:
        await this.paymentFulfillmentService.fulfillWorldFinalsPayment(fulfillmentParams);
        break;
      default:
        this.logger.warn(`Unknown PayPal payment type: ${data.paymentType}`);
        await this.paymentFulfillmentService.fulfillMembershipPayment(fulfillmentParams);
    }

    return { success: true, captureId };
  }

  /**
   * PayPal webhook handler. Used as a safety net - primary fulfillment happens in capture-order.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ): Promise<{ received: boolean; message?: string }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    const body = rawBody.toString();
    let event: any;

    try {
      event = JSON.parse(body);
    } catch {
      throw new BadRequestException('Invalid JSON body');
    }

    const eventId = event.id;
    const eventType = event.event_type;

    if (!eventId) {
      throw new BadRequestException('Missing event ID');
    }

    // Idempotency check - insert record, unique constraint prevents duplicates
    const em = this.em.fork();
    const webhookRecord = new ProcessedPaypalWebhook();
    webhookRecord.paypalEventId = eventId;
    webhookRecord.eventType = eventType;

    // Extract order ID if available
    const resource = event.resource;
    if (resource?.supplementary_data?.related_ids?.order_id) {
      webhookRecord.paypalOrderId = resource.supplementary_data.related_ids.order_id;
    }

    try {
      await em.persistAndFlush(webhookRecord);
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        this.logger.log(`PayPal webhook event ${eventId} already processed, skipping`);
        return { received: true, message: 'Already processed' };
      }
      throw error;
    }

    try {
      // PayPal webhooks are a safety net. The capture-order endpoint does primary fulfillment.
      // We only log here; add fulfillment logic if needed for edge cases.
      switch (eventType) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          this.logger.log(`PayPal capture completed webhook: ${eventId}`);
          webhookRecord.processingResult = 'success';
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          this.logger.warn(`PayPal capture denied webhook: ${eventId}`);
          webhookRecord.processingResult = 'success';
          break;
        case 'PAYMENT.CAPTURE.REFUNDED':
          this.logger.log(`PayPal capture refunded webhook: ${eventId}`);
          webhookRecord.processingResult = 'success';
          break;
        case 'BILLING.SUBSCRIPTION.CANCELLED':
        case 'BILLING.SUBSCRIPTION.EXPIRED':
        case 'BILLING.SUBSCRIPTION.SUSPENDED': {
          const paypalSubId = event.resource?.id;
          if (paypalSubId) {
            const m = await em.findOne(Membership, { paypalSubscriptionId: paypalSubId });
            if (m && !m.cancelledAt) {
              m.paymentStatus = PaymentStatus.CANCELLED;
              m.cancelledAt = new Date();
              m.cancellationReason = `PayPal ${eventType.split('.').pop()?.toLowerCase() || 'cancelled'} via webhook`;
              m.cancelledBy = 'paypal_webhook';
              await em.flush();
              this.logger.warn(`Marked membership ${m.id} cancelled (PayPal ${eventType})`);
            }
          }
          webhookRecord.processingResult = 'success';
          break;
        }
        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
          const paypalSubId = event.resource?.id;
          if (paypalSubId) {
            const m = await em.findOne(Membership, { paypalSubscriptionId: paypalSubId });
            if (m && m.paymentStatus !== PaymentStatus.FAILED) {
              m.paymentStatus = PaymentStatus.FAILED;
              await em.flush();
              this.logger.warn(`Marked membership ${m.id} FAILED (PayPal subscription payment failed)`);
            }
          }
          webhookRecord.processingResult = 'success';
          break;
        }
        case 'BILLING.SUBSCRIPTION.RENEWED':
        case 'BILLING.SUBSCRIPTION.ACTIVATED': {
          const paypalSubId = event.resource?.id;
          if (paypalSubId) {
            const m = await em.findOne(Membership, { paypalSubscriptionId: paypalSubId });
            if (m) {
              // Extend by one year from current end_date (matches Stripe renewal logic)
              if (m.endDate && m.endDate > new Date()) {
                const next = new Date(m.endDate);
                next.setFullYear(next.getFullYear() + 1);
                m.endDate = next;
              } else {
                const next = new Date();
                next.setFullYear(next.getFullYear() + 1);
                m.endDate = next;
              }
              m.paymentStatus = PaymentStatus.PAID;
              await em.flush();
              this.logger.log(`Extended membership ${m.id} via PayPal ${eventType}`);
            }
          }
          webhookRecord.processingResult = 'success';
          break;
        }
        default:
          this.logger.log(`Unhandled PayPal event type: ${eventType}`);
          webhookRecord.processingResult = 'unhandled';
      }
    } catch (error) {
      webhookRecord.processingResult = 'error';
      webhookRecord.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing PayPal webhook ${eventId}: ${error}`);
    }

    await em.flush();
    return { received: true };
  }
}
