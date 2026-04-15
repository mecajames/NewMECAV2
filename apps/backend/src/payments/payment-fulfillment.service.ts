import { Injectable, Logger, Inject } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { MembershipsService } from '../memberships/memberships.service';
import { MasterSecondaryService } from '../memberships/master-secondary.service';
import { MecaIdService } from '../memberships/meca-id.service';
import { MembershipSyncService } from '../memberships/membership-sync.service';
import { EventRegistrationsService } from '../event-registrations/event-registrations.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { QuickBooksService } from '../quickbooks/quickbooks.service';
import { ShopService } from '../shop/shop.service';
import { WorldFinalsService } from '../world-finals/world-finals.service';
import {
  PaymentStatus,
  PaymentMethod,
  MembershipAccountType,
  OrderType,
  OrderItemType,
  OrderStatus,
} from '@newmeca/shared';
import { Membership } from '../memberships/memberships.entity';
import { Payment } from './payments.entity';
import { AdminNotificationsService } from '../admin-notifications/admin-notifications.service';

/**
 * Payment-method-agnostic params for fulfillment.
 * Both Stripe and PayPal webhook/capture handlers create this from their native objects.
 */
export interface PaymentFulfillmentParams {
  transactionId: string;       // Stripe paymentIntentId or PayPal captureId
  paymentMethod: PaymentMethod; // STRIPE or PAYPAL
  amountCents: number;         // total in cents
  metadata: Record<string, string>;
}

@Injectable()
export class PaymentFulfillmentService {
  private readonly logger = new Logger(PaymentFulfillmentService.name);

  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly masterSecondaryService: MasterSecondaryService,
    private readonly mecaIdService: MecaIdService,
    private readonly membershipSyncService: MembershipSyncService,
    private readonly eventRegistrationsService: EventRegistrationsService,
    private readonly ordersService: OrdersService,
    private readonly invoicesService: InvoicesService,
    private readonly quickBooksService: QuickBooksService,
    private readonly shopService: ShopService,
    private readonly worldFinalsService: WorldFinalsService,
    private readonly adminNotificationsService: AdminNotificationsService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Fulfill a membership payment. Creates membership, clears invalidation flags,
   * creates order/invoice, and QuickBooks receipt.
   */
  async fulfillMembershipPayment(params: PaymentFulfillmentParams): Promise<void> {
    const { transactionId, amountCents, metadata } = params;
    const email = metadata.email;
    const membershipTypeConfigId = metadata.membershipTypeConfigId;
    const userId = metadata.userId;

    if (!email || !membershipTypeConfigId || !userId) {
      this.logger.error(`Missing required metadata for membership payment: ${transactionId} — email: ${email}, configId: ${membershipTypeConfigId}, userId: ${userId}`);
      if (!userId) {
        this.logger.error('userId is required for membership fulfillment. Ensure account is created before payment.');
      }
      return;
    }

    try {
      const amountPaid = amountCents / 100;

      const membership = await this.membershipsService.createMembership({
        userId,
        membershipTypeConfigId,
        amountPaid,
        stripePaymentIntentId: params.paymentMethod === PaymentMethod.STRIPE ? transactionId : undefined,
        transactionId,
        competitorName: metadata.competitorName,
        vehicleLicensePlate: metadata.vehicleLicensePlate,
        vehicleColor: metadata.vehicleColor,
        vehicleMake: metadata.vehicleMake,
        vehicleModel: metadata.vehicleModel,
        hasTeamAddon: metadata.hasTeamAddon === 'true',
        teamName: metadata.teamName,
        teamDescription: metadata.teamDescription,
        businessName: metadata.businessName,
        businessWebsite: metadata.businessWebsite,
        billingFirstName: metadata.billingFirstName,
        billingLastName: metadata.billingLastName,
        billingPhone: metadata.billingPhone,
        billingAddress: metadata.billingAddress,
        billingCity: metadata.billingCity,
        billingState: metadata.billingState,
        billingPostalCode: metadata.billingPostalCode,
        billingCountry: metadata.billingCountry || 'USA',
      });

      this.logger.log(`Membership created successfully for: ${email}`);

      // Notify admins of new membership (async, non-blocking)
      this.adminNotificationsService.notifyNewMembership(membership, amountPaid).catch((err) => {
        this.logger.error(`Admin notification failed (non-critical): ${err}`);
      });

      // Clear MECA ID invalidation flag on profile if it was set
      if (membership.mecaId) {
        const profileEm = this.em.fork();
        try {
          await profileEm.getConnection().execute(
            `UPDATE profiles SET meca_id_invalidated_at = NULL, meca_id = ?, updated_at = NOW() WHERE id = ?`,
            [String(membership.mecaId), userId]
          );
        } catch (err) {
          this.logger.error(`Failed to clear MECA ID invalidation: ${err}`);
        }

        // Release any held competition results for this MECA ID
        try {
          const releaseResult = await profileEm.getConnection().execute(
            `UPDATE competition_results SET points_held_for_renewal = false, released_at = NOW(), notes = COALESCE(notes, '') || ' | Released: membership renewed' WHERE meca_id = ? AND points_held_for_renewal = true`,
            [String(membership.mecaId)]
          );
          const released = (releaseResult as any).affectedRows || 0;
          if (released > 0) {
            this.logger.log(`Released ${released} held competition results for MECA ID ${membership.mecaId}`);
          }
        } catch (err) {
          this.logger.error(`Failed to release held results: ${err}`);
        }
      }

      // Create Order and Invoice (async, non-blocking)
      const membershipTaxAmount = metadata.taxAmount || '0.00';
      this.createOrderAndInvoice(params, amountPaid, 'membership', membershipTaxAmount).catch((error) => {
        this.logger.error(`Order/Invoice creation failed (non-critical): ${error}`);
      });

      // Create QuickBooks sales receipt (async, non-blocking)
      this.createQuickBooksSalesReceipt(params, metadata, amountPaid).catch((qbError) => {
        this.logger.error(`QuickBooks sales receipt creation failed (non-critical): ${qbError}`);
      });
    } catch (error) {
      this.logger.error(`Error creating membership after payment: ${error}`);
    }
  }

  /**
   * Fulfill an event registration payment.
   */
  async fulfillEventRegistrationPayment(params: PaymentFulfillmentParams): Promise<void> {
    const { transactionId, amountCents, metadata } = params;
    const registrationId = metadata.registrationId;
    const email = metadata.email;

    if (!registrationId) {
      this.logger.error(`Missing registrationId in event registration payment: ${transactionId}`);
      return;
    }

    try {
      const amountPaid = amountCents / 100;
      let membershipId: string | undefined;

      // If membership was included in the purchase, create it first
      if (metadata.includeMembership === 'true' && metadata.membershipTypeConfigId && metadata.userId) {
        const membershipPrice = parseFloat(metadata.membershipPrice || '0');

        const membership = await this.membershipsService.createMembership({
          userId: metadata.userId,
          membershipTypeConfigId: metadata.membershipTypeConfigId,
          amountPaid: membershipPrice,
          stripePaymentIntentId: params.paymentMethod === PaymentMethod.STRIPE ? transactionId : undefined,
          transactionId,
          competitorName: metadata.competitorName,
          vehicleLicensePlate: metadata.vehicleLicensePlate,
          vehicleColor: metadata.vehicleColor,
          vehicleMake: metadata.vehicleMake,
          vehicleModel: metadata.vehicleModel,
        });
        membershipId = membership.id;

        this.logger.log(`Membership created as part of event registration for: ${email}`);
      } else if (metadata.includeMembership === 'true' && !metadata.userId) {
        this.logger.error('Cannot create membership without userId - user must be logged in');
      }

      // Complete the event registration
      await this.eventRegistrationsService.completeRegistration(
        registrationId,
        transactionId,
        amountPaid,
        membershipId,
      );

      this.logger.log(`Event registration completed successfully for: ${email}`);

      // Create Order and Invoice (async, non-blocking)
      const eventTaxAmount = metadata.taxAmount || '0.00';
      this.createOrderAndInvoice(params, amountPaid, 'event_registration', eventTaxAmount).catch((error) => {
        this.logger.error(`Order/Invoice creation failed (non-critical): ${error}`);
      });
    } catch (error) {
      this.logger.error(`Error completing event registration after payment: ${error}`);
    }
  }

  /**
   * Fulfill an invoice payment.
   */
  async fulfillInvoicePayment(params: PaymentFulfillmentParams): Promise<void> {
    const { transactionId, metadata } = params;
    const invoiceId = metadata.invoiceId;

    if (!invoiceId) {
      this.logger.error(`Missing invoiceId in invoice payment: ${transactionId}`);
      return;
    }

    try {
      const invoice = await this.invoicesService.markAsPaid(invoiceId);
      this.logger.log(`Invoice ${invoice.invoiceNumber} marked as paid via ${params.paymentMethod} payment ${transactionId}`);

      // Check if there's an associated order that needs to be marked complete
      if (invoice.order?.id) {
        try {
          await this.ordersService.updateStatus(invoice.order.id, {
            status: OrderStatus.COMPLETED,
            notes: `Paid via ${params.paymentMethod}: ${transactionId}`,
          });
          this.logger.log(`Order ${invoice.order.id} marked as completed`);
        } catch (orderError) {
          this.logger.error(`Error updating order status: ${orderError}`);
        }
      }

      // Try to activate any pending membership associated with this invoice
      await this.activatePendingMembershipForInvoice(invoiceId, metadata.userId, invoice.total);

      this.logger.log(`Invoice payment processed successfully for ${invoiceId}`);
    } catch (error) {
      this.logger.error(`Error handling invoice payment: ${error}`);
      throw error;
    }
  }

  /**
   * Fulfill a shop payment.
   */
  async fulfillShopPayment(params: PaymentFulfillmentParams): Promise<void> {
    const { transactionId, metadata } = params;
    const orderId = metadata.orderId;

    if (!orderId) {
      this.logger.error(`Missing orderId in shop payment: ${transactionId}`);
      return;
    }

    try {
      // For Stripe, use the chargeId; for PayPal, pass transactionId as both
      const chargeId = metadata.chargeId || transactionId;

      const order = await this.shopService.processPaymentSuccess(
        transactionId,
        chargeId,
      );

      this.logger.log(`Shop order ${order.orderNumber} marked as paid via ${params.paymentMethod} payment ${transactionId}`);

      // Notify admins of new shop order (async, non-blocking)
      this.adminNotificationsService.notifyNewShopOrder(order).catch((err) => {
        this.logger.error(`Admin notification failed (non-critical): ${err}`);
      });

      // Create billing Order and Invoice for the shop purchase
      try {
        await this.shopService.createBillingOrderAndInvoice(orderId, metadata.email);
      } catch (invoiceError) {
        this.logger.error(`CRITICAL: Order/Invoice creation failed for shop order ${orderId}. ` +
          `Admin can recover via POST /api/shop/admin/orders/${orderId}/create-invoice: ${invoiceError}`);
      }
    } catch (error) {
      this.logger.error(`Error handling shop payment: ${error}`);
      throw error;
    }
  }

  /**
   * Fulfill a team upgrade payment.
   */
  async fulfillTeamUpgradePayment(params: PaymentFulfillmentParams): Promise<void> {
    const { transactionId, amountCents, metadata } = params;
    const membershipId = metadata.membershipId;
    const teamName = metadata.teamName;
    const teamDescription = metadata.teamDescription;

    if (!membershipId || !teamName) {
      this.logger.error(`Missing required metadata for team upgrade: ${transactionId}`);
      return;
    }

    try {
      const membership = await this.membershipsService.applyTeamUpgrade(
        membershipId,
        teamName,
        teamDescription,
      );

      this.logger.log(`Team upgrade applied to membership ${membershipId}: teamName=${teamName}, amount=${amountCents / 100}`);

      // Create order for the upgrade
      const taxAmount = metadata.taxAmount || '0.00';
      const subtotalCents = amountCents - Math.round(parseFloat(taxAmount) * 100);
      const subtotalPaid = (subtotalCents / 100).toFixed(2);
      const order = await this.ordersService.createFromPayment({
        userId: metadata.userId,
        orderType: OrderType.MEMBERSHIP,
        tax: taxAmount,
        items: [{
          itemType: OrderItemType.TEAM_ADDON,
          description: `Team Add-on Upgrade: ${teamName}`,
          quantity: 1,
          unitPrice: subtotalPaid,
          metadata: {
            membershipId,
            teamName,
            originalPrice: metadata.originalPrice,
            proRatedPrice: metadata.proRatedPrice,
            daysRemaining: metadata.daysRemaining,
          },
        }],
        notes: `${params.paymentMethod} Payment: ${transactionId}`,
      });

      this.logger.log(`Created order ${order.id} for team upgrade`);
    } catch (error) {
      this.logger.error(`Error applying team upgrade: ${error}`);
      throw error;
    }
  }

  /**
   * Fulfill a World Finals registration payment.
   */
  async fulfillWorldFinalsPayment(params: PaymentFulfillmentParams): Promise<void> {
    const { transactionId, amountCents, metadata } = params;
    const registrationId = metadata.registrationId;

    if (!registrationId) {
      this.logger.error(`Missing registrationId in World Finals payment: ${transactionId}`);
      return;
    }

    try {
      const registration = await this.worldFinalsService.markPreRegistrationPaid(
        registrationId,
        transactionId,
      );

      this.logger.log(`World Finals registration ${registrationId} marked as paid via ${params.paymentMethod} payment ${transactionId}`);
    } catch (error) {
      this.logger.error(`Error handling World Finals registration payment: ${error}`);
      throw error;
    }
  }

  /**
   * Create an order for a secondary membership after invoice payment.
   */
  async createOrderForSecondaryMembership(
    secondary: any,
    invoice: any,
    amount: number,
  ): Promise<void> {
    try {
      const billingAddress = invoice.billingAddress || {};

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

      this.logger.log(`Order ${order.orderNumber} created for secondary membership ${secondary.id}`);
    } catch (error) {
      this.logger.error(`Error creating order for secondary membership: ${error}`);
      throw error;
    }
  }

  /**
   * Create a QuickBooks sales receipt for the payment.
   * This is done asynchronously to not block the webhook response.
   */
  async createQuickBooksSalesReceipt(
    params: PaymentFulfillmentParams,
    metadata: Record<string, string>,
    amountPaid: number,
  ): Promise<void> {
    try {
      const connectionStatus = await this.quickBooksService.getConnectionStatus();
      if (!connectionStatus) {
        this.logger.log('QuickBooks not connected, skipping sales receipt creation');
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
        stripePaymentIntentId: params.transactionId,
        billingAddress: metadata.billingAddress ? {
          line1: metadata.billingAddress,
          city: metadata.billingCity || '',
          state: metadata.billingState || '',
          postalCode: metadata.billingPostalCode || '',
          country: metadata.billingCountry || 'USA',
        } : undefined,
      });

      this.logger.log(`QuickBooks sales receipt created for: ${metadata.email}`);
    } catch (error) {
      this.logger.error(`Failed to create QuickBooks sales receipt: ${error}`);
    }
  }

  /**
   * Create an Order and Invoice from a successful payment.
   * Payment-method-agnostic.
   */
  async createOrderAndInvoice(
    params: PaymentFulfillmentParams,
    amountPaid: number,
    type: 'membership' | 'event_registration',
    taxAmount: string = '0.00',
  ): Promise<void> {
    try {
      const { transactionId, metadata } = params;
      const em = this.em.fork();

      // Look up the payment record
      let payment: Payment | null = null;
      if (params.paymentMethod === PaymentMethod.STRIPE) {
        payment = await em.findOne(Payment, { stripePaymentIntentId: transactionId });
      } else if (params.paymentMethod === PaymentMethod.PAYPAL) {
        payment = await em.findOne(Payment, { paypalOrderId: metadata.paypalOrderId || transactionId });
      }

      const orderType = type === 'membership'
        ? OrderType.MEMBERSHIP
        : OrderType.EVENT_REGISTRATION;

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

      const { order, invoice } = await em.transactional(async () => {
        const createdOrder = await this.ordersService.createFromPayment({
          paymentId: payment?.id,
          userId: metadata.userId,
          orderType,
          items,
          billingAddress: billingAddress.name ? billingAddress : undefined,
          tax: taxAmount,
          discount: metadata.discountAmount || '0.00',
          couponCode: metadata.couponCode || undefined,
          notes: `${params.paymentMethod} Payment: ${transactionId}`,
        });

        this.logger.log(`Order ${createdOrder.orderNumber} created for payment ${transactionId}`);

        const createdInvoice = await this.invoicesService.createFromOrder(createdOrder.id);
        this.logger.log(`Invoice ${createdInvoice.invoiceNumber} created for order ${createdOrder.orderNumber}`);

        return { order: createdOrder, invoice: createdInvoice };
      });

      // Send invoice email (async, non-blocking, outside transaction)
      if (invoice) {
        this.invoicesService.sendInvoice(invoice.id).catch((error) => {
          this.logger.error(`Failed to send invoice email: ${error}`);
        });
      }
    } catch (error) {
      this.logger.error(`Failed to create order/invoice: ${error}`);
      throw error;
    }
  }

  /**
   * Activate pending memberships after invoice payment.
   */
  private async activatePendingMembershipForInvoice(
    invoiceId: string,
    userId: string,
    amountPaid: string,
  ): Promise<void> {
    try {
      const { Invoice } = await import('../invoices/invoices.entity');
      const em = this.em.fork();

      const invoice = await em.findOne(Invoice, { id: invoiceId }, {
        populate: ['items', 'items.secondaryMembership', 'items.secondaryMembership.user', 'items.secondaryMembership.membershipTypeConfig', 'user'],
      });

      if (!invoice) {
        this.logger.log(`Invoice ${invoiceId} not found for membership activation`);
        return;
      }

      // Check for secondary memberships in invoice items
      for (const item of invoice.items.getItems()) {
        if (item.secondaryMembership) {
          const secondary = item.secondaryMembership;

          if (secondary.paymentStatus === PaymentStatus.PAID) {
            this.logger.log(`Secondary membership ${secondary.id} already paid, skipping`);
            continue;
          }

          try {
            const amount = parseFloat(item.total || amountPaid);
            await this.masterSecondaryService.markSecondaryPaid(
              secondary.id,
              amount,
              `Invoice-${invoice.invoiceNumber}`,
            );
            this.logger.log(`Secondary membership ${secondary.id} activated with MECA ID via invoice payment`);

            this.createOrderForSecondaryMembership(secondary, invoice, amount).catch((orderError) => {
              this.logger.error(`Error creating order for secondary membership ${secondary.id}: ${orderError}`);
            });
          } catch (secondaryError) {
            this.logger.error(`Error activating secondary membership ${secondary.id}: ${secondaryError}`);
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
          pendingMembership.paymentStatus = PaymentStatus.PAID;
          pendingMembership.amountPaid = parseFloat(amountPaid);
          await em.flush();
          this.logger.log(`Membership ${pendingMembership.id} activated after invoice payment`);
        } else {
          this.logger.log(`No pending non-secondary membership found for user ${userId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error activating pending membership: ${error}`);
    }
  }
}
