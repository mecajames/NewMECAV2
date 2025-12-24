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
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { EntityManager } from '@mikro-orm/core';
import { StripeService } from './stripe.service';
import { MembershipsService } from '../memberships/memberships.service';
import { QuickBooksService } from '../quickbooks/quickbooks.service';
import { EventRegistrationsService, CreateRegistrationDto } from '../event-registrations/event-registrations.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { MembershipTypeConfig } from '../membership-type-configs/membership-type-configs.entity';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import { Payment } from '../payments/payments.entity';
import { MembershipType, PaymentIntentResult, OrderType, OrderItemType } from '@newmeca/shared';
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
  // Test mode - skip Stripe and mark as paid
  testMode?: boolean;
}

@Controller('api/stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly membershipsService: MembershipsService,
    private readonly quickBooksService: QuickBooksService,
    private readonly eventRegistrationsService: EventRegistrationsService,
    private readonly ordersService: OrdersService,
    private readonly invoicesService: InvoicesService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

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
    }, isMember);

    // Convert price to cents for Stripe
    const amountInCents = Math.round(totalAmount * 100);

    // Create metadata
    const metadata: Record<string, string> = {
      paymentType: 'event_registration',
      registrationId: registration.id,
      eventId: data.eventId,
      eventTitle: event.title,
      email: data.email.toLowerCase(),
      classCount: String(data.classes.length),
      perClassFee: String(perClassFee),
      isMemberPricing: String(useMemberPricing),
    };

    if (data.userId) metadata.userId = data.userId;
    if (data.includeMembership) {
      metadata.includeMembership = 'true';
      metadata.membershipTypeConfigId = data.membershipTypeConfigId || '';
      metadata.membershipPrice = String(membershipPrice);
    }

    // Test mode - skip Stripe and mark as paid
    if (data.testMode) {
      const testPaymentId = 'test-payment-' + Date.now();
      await this.eventRegistrationsService.markAsPaid(registration.id, testPaymentId, totalAmount);
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

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    // Verify and construct the event
    const event = this.stripeService.constructWebhookEvent(rawBody, signature);

    // Handle specific event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log('Payment succeeded:', paymentIntent.id);

    const metadata = paymentIntent.metadata;
    const paymentType = metadata.paymentType;

    // Route to appropriate handler based on payment type
    if (paymentType === 'event_registration') {
      await this.handleEventRegistrationPayment(paymentIntent);
    } else {
      await this.handleMembershipPayment(paymentIntent);
    }
  }

  private async handleMembershipPayment(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const metadata = paymentIntent.metadata;
    const email = metadata.email;
    const membershipTypeConfigId = metadata.membershipTypeConfigId;
    const userId = metadata.userId;

    if (!email || !membershipTypeConfigId) {
      console.error('Missing required metadata in payment intent:', paymentIntent.id);
      return;
    }

    try {
      // Determine the membership type based on category
      const membershipType = this.getMembershipTypeFromCategory(metadata.membershipCategory);

      // Amount is in cents, convert to dollars
      const amountPaid = paymentIntent.amount / 100;

      if (userId) {
        // Create membership for logged-in user
        await this.membershipsService.createUserMembership({
          userId,
          membershipTypeConfigId,
          membershipType,
          amountPaid,
          stripePaymentIntentId: paymentIntent.id,
          transactionId: paymentIntent.id,
        });
      } else {
        // Create guest membership
        await this.membershipsService.createGuestMembership({
          email,
          membershipTypeConfigId,
          membershipType,
          amountPaid,
          stripePaymentIntentId: paymentIntent.id,
          transactionId: paymentIntent.id,
          billingFirstName: metadata.billingFirstName || '',
          billingLastName: metadata.billingLastName || '',
          billingPhone: metadata.billingPhone,
          billingAddress: metadata.billingAddress || '',
          billingCity: metadata.billingCity || '',
          billingState: metadata.billingState || '',
          billingPostalCode: metadata.billingPostalCode || '',
          billingCountry: metadata.billingCountry || 'USA',
          teamName: metadata.teamName,
          teamDescription: metadata.teamDescription,
          businessName: metadata.businessName,
          businessWebsite: metadata.businessWebsite,
        });
      }

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
      if (metadata.includeMembership === 'true' && metadata.membershipTypeConfigId) {
        const membershipType = MembershipType.DOMESTIC; // Default to domestic for competition registrations
        const membershipPrice = parseFloat(metadata.membershipPrice || '0');

        if (metadata.userId) {
          // Create membership for logged-in user
          const membership = await this.membershipsService.createUserMembership({
            userId: metadata.userId,
            membershipTypeConfigId: metadata.membershipTypeConfigId,
            membershipType,
            amountPaid: membershipPrice,
            stripePaymentIntentId: paymentIntent.id,
            transactionId: paymentIntent.id,
          });
          membershipId = membership.id;
        } else {
          // Create guest membership (will be linked to account later)
          const membership = await this.membershipsService.createGuestMembership({
            email,
            membershipTypeConfigId: metadata.membershipTypeConfigId,
            membershipType,
            amountPaid: membershipPrice,
            stripePaymentIntentId: paymentIntent.id,
            transactionId: paymentIntent.id,
            billingFirstName: '',
            billingLastName: '',
            billingAddress: '',
            billingCity: '',
            billingState: '',
            billingPostalCode: '',
            billingCountry: 'USA',
          });
          membershipId = membership.id;
        }

        console.log('Membership created as part of event registration for:', email);
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
   */
  private async createOrderAndInvoice(
    paymentIntent: Stripe.PaymentIntent,
    metadata: Stripe.Metadata,
    amountPaid: number,
    type: 'membership' | 'event_registration',
  ): Promise<void> {
    try {
      const em = this.em.fork();

      // Look up the payment record
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
        const registrationTotal = classCount * perClassFee;

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

      // Create the order
      const order = await this.ordersService.createFromPayment({
        paymentId: payment?.id,
        userId: metadata.userId,
        orderType,
        items,
        billingAddress: billingAddress.name ? billingAddress : undefined,
        notes: `Stripe Payment: ${paymentIntent.id}`,
      });

      console.log(`Order ${order.orderNumber} created for payment ${paymentIntent.id}`);

      // Create invoice from order
      const invoice = await this.invoicesService.createFromOrder(order.id);
      console.log(`Invoice ${invoice.invoiceNumber} created for order ${order.orderNumber}`);

      // TODO: Send invoice email if configured
      // await this.emailService.sendInvoice(invoice);

    } catch (error) {
      console.error('Failed to create order/invoice:', error);
      throw error;
    }
  }
}
