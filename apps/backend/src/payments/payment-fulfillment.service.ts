import { Injectable, Logger, Inject } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { MembershipsService } from '../memberships/memberships.service';
import { MasterSecondaryService } from '../memberships/master-secondary.service';
import { MecaIdService } from '../memberships/meca-id.service';
import { MembershipSyncService } from '../memberships/membership-sync.service';
import { MembershipRenewalTokenService } from '../memberships/membership-renewal-token.service';
import { EventRegistrationsService } from '../event-registrations/event-registrations.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { QuickBooksService } from '../quickbooks/quickbooks.service';
import { ShopService } from '../shop/shop.service';
import { WorldFinalsService } from '../world-finals/world-finals.service';
import {
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  MembershipAccountType,
  OrderType,
  OrderItemType,
  OrderStatus,
} from '@newmeca/shared';
import { Membership } from '../memberships/memberships.entity';
import { Payment } from './payments.entity';
import { Order } from '../orders/orders.entity';
import { Profile } from '../profiles/profiles.entity';
import { ShopOrder } from '../shop/entities/shop-order.entity';
import { EventRegistration } from '../event-registrations/event-registrations.entity';
import { FinalsRegistration } from '../world-finals/finals-registration.entity';
import { AdminNotificationsService } from '../admin-notifications/admin-notifications.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { EmailService } from '../email/email.service';
import { generateSecurePassword, MIN_PASSWORD_STRENGTH } from '../utils/password-generator';

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
    private readonly renewalTokenService: MembershipRenewalTokenService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly emailService: EmailService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Email a brand-new, server-provisioned member a branded one-click link to set
   * their password. Used only when WE created the auth account during webhook
   * fulfillment (so the buyer has no known password). Best-effort / non-fatal.
   */
  private async emailNewMemberSetPasswordLink(email: string, firstName?: string): Promise<void> {
    try {
      const base = (process.env.FRONTEND_URL || 'https://www.mecacaraudio.com').replace(/\/+$/, '');
      const result = await this.supabaseAdmin.generatePasswordRecoveryLink(email, `${base}/reset-password`);
      if (result.success && result.link) {
        await this.emailService.sendNewMemberSetPasswordEmail({ to: email, setPasswordUrl: result.link, firstName });
        this.logger.log(`Set-password welcome email sent to new member ${email}`);
      } else {
        this.logger.warn(`Could not generate set-password link for ${email}: ${result.error || 'no link'}`);
      }
    } catch (err) {
      this.logger.error(`Failed to email set-password link to ${email}: ${err}`);
    }
  }

  /**
   * Fulfill a membership payment. Creates membership, clears invalidation flags,
   * creates order/invoice, and QuickBooks receipt.
   */
  async fulfillMembershipPayment(params: PaymentFulfillmentParams): Promise<void> {
    const { transactionId, amountCents, metadata } = params;
    const email = metadata.email;
    const membershipTypeConfigId = metadata.membershipTypeConfigId;
    let userId = metadata.userId;

    // membershipTypeConfigId is non-negotiable — without it we cannot create anything.
    if (!membershipTypeConfigId) {
      throw new Error(`Cannot fulfill membership payment ${transactionId}: missing membershipTypeConfigId in metadata`);
    }

    try {
      const amountPaid = amountCents / 100;

      // Resolve the buyer. Guest checkout (not logged in) arrives with NO userId
      // in the payment-intent metadata. The historical bug silently dropped these
      // *paid* memberships (no membership, no account, money kept). Instead we now
      // provision (or relink) an account from the checkout email so a paid member
      // ALWAYS gets what they paid for. If there is no email either, we cannot
      // provision — throw so the webhook records an error and admins are alerted
      // (never a silent success).
      if (!userId) {
        if (!email) {
          throw new Error(`Cannot fulfill membership payment ${transactionId}: no userId and no email in metadata`);
        }
        userId = await this.resolveOrProvisionUserId(email, metadata);
        this.logger.log(`Provisioned/linked account ${userId} for guest membership payment ${transactionId} (${email})`);
      }

      // Idempotency guard: if a membership already exists for this transaction,
      // do NOT recreate it. This covers three cases:
      //   1. Late/retry Stripe webhook arriving after the first fulfillment
      //   2. A different Stripe event (charge.succeeded vs payment_intent.succeeded)
      //      for the same payment intent
      //   3. A REFUNDED membership we already deleted via admin refund — the
      //      matching payment row is marked REFUNDED, so re-creation would
      //      silently undo the refund. Abort in that case.
      const idempotencyEm = this.em.fork();
      const existingMembership = await idempotencyEm.findOne(Membership, {
        transactionId,
      });
      if (existingMembership) {
        this.logger.log(
          `Membership ${existingMembership.id} already exists for transaction ${transactionId}; skipping duplicate fulfillment`,
        );
        return;
      }
      const existingPayment = await idempotencyEm.findOne(Payment, {
        $or: [
          { stripePaymentIntentId: transactionId },
          { transactionId },
        ],
      });
      if (existingPayment?.paymentStatus === PaymentStatus.REFUNDED) {
        this.logger.warn(
          `Payment ${existingPayment.id} for transaction ${transactionId} is REFUNDED; refusing to re-create the membership this payment originally produced`,
        );
        return;
      }

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
        // Vehicle info is never collected at the membership checkout (see the
        // payment-intent DTO) — don't let the interactive-only validation block
        // a paid fulfillment.
        skipVehicleValidation: true,
      });

      this.logger.log(`Membership created successfully for: ${email}`);

      // Consume the renewal token if this fulfillment came from the public
      // /renew/:token flow. Done after success so a payment failure (which
      // doesn't reach this method) doesn't burn the token.
      const renewalTokenId = metadata.renewalTokenId;
      if (renewalTokenId) {
        try {
          await this.renewalTokenService.markUsed(renewalTokenId);
          this.logger.log(`Renewal token ${renewalTokenId} marked used`);
        } catch (err) {
          this.logger.error(`Failed to mark renewal token used: ${err}`);
        }
      }

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

      // Create Payment + Order + Invoice (idempotent; safe if client also calls it)
      this.fulfillBillingForMembership(membership, params, amountPaid).catch((error) => {
        this.logger.error(`Billing fulfillment failed (non-critical): ${error}`);
      });

      // Create QuickBooks sales receipt (async, non-blocking)
      this.createQuickBooksSalesReceipt(params, metadata, amountPaid).catch((qbError) => {
        this.logger.error(`QuickBooks sales receipt creation failed (non-critical): ${qbError}`);
      });
    } catch (error) {
      // CRITICAL: a *paid* membership that cannot be fulfilled must never fail
      // silently (that is the exact bug that lost 15 paid signups). Alert admins
      // and rethrow so the Stripe/PayPal webhook records processingResult='error'
      // with the message instead of marking the event 'success'.
      this.logger.error(`Error fulfilling membership payment ${transactionId}: ${error}`);
      try {
        await this.adminNotificationsService.notifyOneTimePaymentFailed({
          transactionId,
          amountCents,
          paymentMethod: params.paymentMethod === PaymentMethod.STRIPE ? 'stripe' : 'paypal',
          paymentType: 'membership_fulfillment_failed',
          customerUserId: userId || metadata.userId || null,
          customerEmail: email || null,
          failureMessage: error instanceof Error ? error.message : String(error),
        });
      } catch (alertErr) {
        this.logger.error(`Failed to alert admins of membership fulfillment failure: ${alertErr}`);
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Resolve the buyer's profile id from a checkout email, provisioning the
   * account when needed. Used by membership fulfillment for guest checkouts
   * (no userId in the payment metadata). Cascade:
   *   1. existing profile with this email  → use it
   *   2. existing auth user, no profile     → create the profile (relink)
   *   3. brand new                          → create auth user (random password,
   *      member sets it via "Forgot Password") + profile
   */
  private async resolveOrProvisionUserId(
    email: string,
    metadata: Record<string, string>,
  ): Promise<string> {
    const normEmail = email.trim().toLowerCase();
    const lookupEm = this.em.fork();

    // Case-insensitive — profile emails are stored as entered, so an exact
    // match on the lowercased checkout email misses mixed-case rows.
    const existingProfile = await lookupEm.findOne(Profile, { email: { $ilike: normEmail } });
    if (existingProfile) return existingProfile.id;

    const firstName =
      metadata.billingFirstName || metadata.competitorName?.split(' ')[0] || undefined;
    const lastName =
      metadata.billingLastName ||
      (metadata.competitorName ? metadata.competitorName.split(' ').slice(1).join(' ') : undefined) ||
      undefined;

    let userId: string;
    const found = await this.supabaseAdmin.findUserByEmail(normEmail);
    if (found.userId) {
      userId = found.userId;
    } else {
      const created = await this.supabaseAdmin.createUserWithPassword({
        email: normEmail,
        password: generateSecurePassword(20, MIN_PASSWORD_STRENGTH),
        firstName,
        lastName,
        forcePasswordChange: true,
      });
      if (created.success && created.userId) {
        userId = created.userId;
        // WE just created this account server-side, so the buyer has no password
        // (their checkout password, if any, never reached us). Email a branded
        // set-password link so they can sign in even if the client-side
        // provisioning never ran. Fire-and-forget — never blocks fulfillment.
        void this.emailNewMemberSetPasswordLink(normEmail, firstName);
      } else {
        // TOCTOU race: a concurrent creator (the frontend's client-side signUp
        // on the checkout success screen, or a duplicate webhook delivery) can
        // create this auth user in the window between our findUserByEmail check
        // above and createUser here. GoTrue then rejects our insert with
        // "already been registered" (or a generic "Database error creating new
        // user" on the unique-constraint hit). Before, we threw — abandoning the
        // payment with no profile/membership while Stripe kept the money. Now we
        // re-resolve and LINK to the row that already exists, so the buyer is
        // provisioned regardless of who won the race.
        const retry = await this.supabaseAdmin.findUserByEmail(normEmail);
        if (retry.userId) {
          this.logger.warn(
            `createUser collided for ${normEmail} (${created.error}); linking existing auth user ${retry.userId} instead of failing`,
          );
          userId = retry.userId;
        } else {
          throw new Error(`Failed to provision account for ${normEmail}: ${created.error || 'unknown error'}`);
        }
      }
    }

    // Ensure a profile row exists for this auth user.
    const writeEm = this.em.fork();
    const prof = await writeEm.findOne(Profile, { id: userId });
    if (!prof) {
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || normEmail;
      const profile = writeEm.create(Profile, {
        id: userId,
        email: normEmail,
        first_name: firstName || 'Member',
        last_name: lastName || '',
        full_name: fullName,
        phone: metadata.billingPhone,
        role: 'competitor',
        address: metadata.billingAddress,
        city: metadata.billingCity,
        state: metadata.billingState,
        postal_code: metadata.billingPostalCode,
        country: metadata.billingCountry || 'US',
      } as any);
      await writeEm.persistAndFlush(profile);
    }
    return userId;
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

      // PayPal: persist the capture id so the registration can be refunded in-app.
      if (params.paymentMethod === PaymentMethod.PAYPAL) {
        await this.em.fork().nativeUpdate(EventRegistration, { id: registrationId }, { paypalCaptureId: transactionId });
      }

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

      // PayPal: persist the capture id so the order can be refunded in-app.
      if (params.paymentMethod === PaymentMethod.PAYPAL) {
        await this.em.fork().nativeUpdate(ShopOrder, { id: order.id }, { paypalCaptureId: transactionId });
      }

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

      // Sync shop revenue to QuickBooks so it captures ALL income, not just
      // memberships. Best-effort, non-blocking.
      const shopEmail = metadata.email || (order as any).guestEmail || (order as any).user?.email;
      if (shopEmail) {
        const shopName = (order as any).guestName
          || `${metadata.billingFirstName || ''} ${metadata.billingLastName || ''}`.trim()
          || shopEmail;
        this.quickBooksService
          .createGenericSalesReceipt({
            customerEmail: shopEmail,
            customerName: shopName,
            amount: Number((order as any).totalAmount ?? 0),
            description: `Shop Order ${order.orderNumber}`,
            paymentDate: new Date(),
            reference: transactionId,
          })
          .catch((qbError) => this.logger.error(`QuickBooks shop sync failed (non-critical): ${qbError}`));
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

      // PayPal: persist the capture id so the pre-registration can be refunded in-app.
      if (params.paymentMethod === PaymentMethod.PAYPAL) {
        await this.em.fork().nativeUpdate(FinalsRegistration, { id: registrationId }, { paypalCaptureId: transactionId });
      }

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
  /**
   * Create the financial trail (Payment row, Order, Invoice) for a successfully
   * paid membership. Safe for both the Stripe webhook AND the client-side
   * POST /api/memberships path to call — the Payment row is keyed off
   * stripePaymentIntentId / transactionId so concurrent calls converge on one
   * row, and Order creation is skipped if one already exists for this Payment.
   *
   * Without this, a missed webhook (network blip, signing-key rotation, no
   * `stripe listen` locally) leaves the buyer with a Membership but no
   * Payment / Order / Invoice rows — silent data loss.
   */
  async fulfillBillingForMembership(
    membership: Membership,
    params: PaymentFulfillmentParams,
    amountPaid: number,
  ): Promise<void> {
    const em = this.em.fork();
    const txnId = params.transactionId;

    let payment = await em.findOne(Payment, {
      $or: [
        { stripePaymentIntentId: txnId },
        { transactionId: txnId },
      ],
    });
    const isStripe = params.paymentMethod === PaymentMethod.STRIPE;
    if (!payment) {
      payment = em.create(Payment, {
        user: em.getReference(Profile, membership.user.id),
        membership: em.getReference(Membership, membership.id),
        paymentType: PaymentType.MEMBERSHIP,
        paymentMethod: params.paymentMethod,
        amount: amountPaid.toFixed(2),
        currency: 'USD',
        transactionId: txnId,
        stripePaymentIntentId: isStripe ? txnId : undefined,
        // Populate PayPal ids so refunds match + reconcile against the ledger.
        paypalOrderId: !isStripe ? (params.metadata?.paypalOrderId || undefined) : undefined,
        paypalCaptureId: !isStripe ? txnId : undefined,
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date(),
      } as any);
      await em.persistAndFlush(payment);
    }

    // Persist the PayPal capture id on the MEMBERSHIP too, so a later refund can
    // be issued through PayPal (refundMembership previously had only a Stripe path
    // and silently returned no money for PayPal-paid memberships).
    if (!isStripe) {
      const m = await em.findOne(Membership, { id: membership.id });
      if (m && !m.paypalCaptureId) {
        m.paypalCaptureId = txnId;
        await em.flush();
      }
    }

    const existingOrder = await em.findOne(Order, { payment: payment.id });
    if (!existingOrder) {
      await this.createOrderAndInvoice(
        params,
        amountPaid,
        'membership',
        params.metadata.taxAmount || '0.00',
      );
    }
  }

  /**
   * Idempotently write a billing-ledger Payment row for a subscription
   * invoice, populated with the real Stripe identifiers (payment_intent,
   * charge, customer, invoice, subscription). Shared by the invoice.paid
   * webhook and the admin assign-subscription flow so a subscription
   * renewal/link always leaves a complete billing record — closing the
   * historical gap where successful renewals extended the membership but
   * never produced a Payment row.
   *
   * Keyed on the Stripe invoice id (falling back to the payment_intent) so
   * repeated webhook deliveries / retries converge on a single row. Returns
   * the existing or newly-created row, or null when there's nothing billable
   * to record (e.g. a $0 trial with no invoice/charge yet).
   */
  async recordSubscriptionPayment(opts: {
    membershipId: string;
    userId?: string | null;
    invoiceId?: string | null;
    paymentIntentId?: string | null;
    chargeId?: string | null;
    customerId?: string | null;
    subscriptionId?: string | null;
    amount: number;
    currency?: string | null;
    status?: PaymentStatus;
    billingReason?: string | null;
    productName?: string | null;
    paidAt?: Date | null;
    source: string;
    // Defaults to STRIPE for backwards-compat. PayPal subscription renewals
    // pass PAYPAL so the ledger row is attributed correctly (and the Stripe
    // PI/charge/customer fields are left empty — PayPal keys on externalPaymentId).
    paymentMethod?: PaymentMethod;
  }): Promise<Payment | null> {
    const { membershipId, invoiceId, chargeId, paymentIntentId } = opts;
    if (!invoiceId && !chargeId && !paymentIntentId) {
      this.logger.log(
        `recordSubscriptionPayment: no invoice/charge/PI for membership ${membershipId}; skipping ledger row`,
      );
      return null;
    }

    const status = opts.status ?? PaymentStatus.PAID;
    const em = this.em.fork();

    const membership = await em.findOne(Membership, { id: membershipId }, { populate: ['user'] });
    if (!membership) {
      this.logger.warn(`recordSubscriptionPayment: membership ${membershipId} not found; skipping`);
      return null;
    }
    const userId = opts.userId ?? membership.user?.id ?? null;

    // Idempotency: a row of this status already recorded for this invoice (or PI).
    const key: Record<string, unknown> = invoiceId
      ? { externalPaymentId: invoiceId }
      : { stripePaymentIntentId: paymentIntentId };
    const existing = await em.findOne(Payment, { ...key, paymentStatus: status } as any);
    if (existing) {
      this.logger.log(
        `recordSubscriptionPayment: ${status} payment already exists (${existing.id}) for ${invoiceId ?? paymentIntentId}; skipping`,
      );
      return existing;
    }

    const payment = em.create(Payment, {
      user: userId ? em.getReference(Profile, userId) : undefined,
      membership: em.getReference(Membership, membershipId),
      paymentType: PaymentType.MEMBERSHIP,
      paymentMethod: opts.paymentMethod ?? PaymentMethod.STRIPE,
      paymentStatus: status,
      amount: opts.amount.toFixed(2),
      currency: (opts.currency || 'USD').toUpperCase(),
      externalPaymentId: invoiceId ?? undefined,
      stripePaymentIntentId: paymentIntentId ?? undefined,
      transactionId: chargeId ?? paymentIntentId ?? undefined,
      stripeCustomerId: opts.customerId ?? undefined,
      paidAt: status === PaymentStatus.PAID ? (opts.paidAt ?? new Date()) : undefined,
      description:
        opts.billingReason === 'subscription_create'
          ? 'Membership subscription payment'
          : 'Membership renewal (subscription)',
      paymentMetadata: {
        source: opts.source,
        stripeSubscriptionId: opts.subscriptionId ?? null,
        stripeInvoiceId: invoiceId ?? null,
        billingReason: opts.billingReason ?? null,
        productName: opts.productName ?? null,
      },
    } as any);
    await em.persistAndFlush(payment);
    this.logger.log(
      `recordSubscriptionPayment: wrote ${status} payment ${payment.id} for membership ${membershipId} (invoice ${invoiceId ?? 'n/a'})`,
    );
    return payment;
  }

  /**
   * Create the Order + Invoice for an EXISTING membership Payment row, so a
   * subscription payment ends up as the full Order+Invoice+Payment triple
   * (not just a Payment). Operates on a KNOWN payment id — no payment-intent
   * lookup — so it can never mint a duplicate Payment. Idempotent: if an Order
   * already exists for the payment it no-ops. Used by the subscription
   * renewal + initial webhook paths and the backfill tool.
   */
  async ensureOrderInvoiceForMembershipPayment(
    paymentId: string,
    taxAmount: string = '0.00',
    opts: { sendEmail?: boolean } = {},
  ): Promise<{ created: boolean; orderNumber?: string; invoiceNumber?: string }> {
    const sendEmail = opts.sendEmail !== false; // default true (webhook paths)
    try {
      const em = this.em.fork();
      const payment = await em.findOne(Payment, { id: paymentId }, { populate: ['membership', 'user'] });
      if (!payment) {
        this.logger.warn(`ensureOrderInvoiceForMembershipPayment: payment ${paymentId} not found`);
        return { created: false };
      }

      // Idempotency — one Order per payment.
      const existingOrder = await em.findOne(Order, { payment: payment.id });
      if (existingOrder) {
        this.logger.log(`Order ${existingOrder.orderNumber} already exists for payment ${paymentId}; skipping`);
        return { created: false, orderNumber: existingOrder.orderNumber };
      }

      const membershipId = (payment.membership as any)?.id;
      const membership = membershipId
        ? await em.findOne(Membership, { id: membershipId }, { populate: ['membershipTypeConfig', 'user'] })
        : null;
      const userId = (payment.user as any)?.id ?? membership?.user?.id;
      const amount = Number(payment.amount);
      const cfg: any = membership?.membershipTypeConfig;

      const items = [{
        description: `MECA Membership: ${cfg?.name || cfg?.category || 'Annual'}`,
        quantity: 1,
        unitPrice: amount.toFixed(2),
        itemType: OrderItemType.MEMBERSHIP,
        referenceId: cfg?.id,
        metadata: { membershipCategory: cfg?.category },
      }];

      const hasBilling = !!(membership && (membership.billingFirstName || membership.billingAddress));
      const billingAddress = hasBilling ? {
        name: [membership!.billingFirstName, membership!.billingLastName].filter(Boolean).join(' ') || undefined,
        address1: membership!.billingAddress || undefined,
        city: membership!.billingCity || undefined,
        state: membership!.billingState || undefined,
        postalCode: membership!.billingPostalCode || undefined,
        country: membership!.billingCountry || 'US',
      } : undefined;

      const reference = payment.externalPaymentId || payment.stripePaymentIntentId || payment.transactionId || payment.id;

      const { order, invoice } = await em.transactional(async () => {
        const createdOrder = await this.ordersService.createFromPayment({
          paymentId: payment.id,
          userId,
          orderType: OrderType.MEMBERSHIP,
          items,
          billingAddress: billingAddress?.name ? billingAddress : undefined,
          tax: taxAmount,
          discount: '0.00',
          notes: `Subscription payment: ${reference}`,
        });
        const createdInvoice = await this.invoicesService.createFromOrder(createdOrder.id);
        const p = await em.findOne(Payment, { id: payment.id });
        if (p) p.order = em.getReference(Order, createdOrder.id) as any;
        this.logger.log(
          `Order ${createdOrder.orderNumber} + Invoice ${createdInvoice.invoiceNumber} created for subscription payment ${payment.id}`,
        );
        return { order: createdOrder, invoice: createdInvoice };
      });

      // Suppressed for the backfill tool so historical members aren't emailed
      // old invoices; webhook paths leave it on.
      if (sendEmail && invoice) {
        this.invoicesService.sendInvoice(invoice.id).catch((e) => this.logger.error(`Failed to send invoice email: ${e}`));
      }
      return { created: true, orderNumber: order?.orderNumber, invoiceNumber: invoice?.invoiceNumber };
    } catch (error) {
      this.logger.error(`ensureOrderInvoiceForMembershipPayment failed for ${paymentId}: ${error}`);
      return { created: false };
    }
  }

  /**
   * Reconstruct missing billing records for ONE member. For each PAID
   * membership with no Payment row, create a Payment (from the membership's
   * stored amount + gateway ids) plus its Order+Invoice; and for any existing
   * membership Payment with no Order, create the Order+Invoice. Invoice emails
   * are suppressed (we don't re-email historical members). `dryRun` reports
   * what WOULD be created without writing anything. Owner-gated at the
   * controller. Idempotent — safe to re-run.
   */
  async backfillMemberBilling(
    memberId: string,
    opts: { dryRun: boolean },
  ): Promise<{
    dry_run: boolean;
    member_id: string;
    memberships_missing_payment: Array<{ membership_id: string; meca_id: string | null; type: string | null; amount: number }>;
    payments_missing_order: Array<{ payment_id: string; amount: number; reference: string | null }>;
    created: { payments: number; orders: number };
  }> {
    const { dryRun } = opts;
    const em = this.em.fork();
    const report = {
      dry_run: dryRun,
      member_id: memberId,
      memberships_missing_payment: [] as Array<{ membership_id: string; meca_id: string | null; type: string | null; amount: number }>,
      payments_missing_order: [] as Array<{ payment_id: string; amount: number; reference: string | null }>,
      created: { payments: 0, orders: 0 },
    };

    // Pass 1: PAID memberships with no Payment row at all.
    const memberships = await em.find(
      Membership,
      { user: memberId, paymentStatus: PaymentStatus.PAID },
      { populate: ['membershipTypeConfig'] },
    );
    for (const m of memberships) {
      const hasPayment = (await em.count(Payment, { membership: m.id })) > 0;
      if (hasPayment) continue;
      const amount = Number((m as any).amountPaid ?? 0);
      report.memberships_missing_payment.push({
        membership_id: m.id,
        meca_id: m.mecaId != null ? String(m.mecaId) : null,
        type: (m.membershipTypeConfig as any)?.name ?? null,
        amount,
      });
      if (dryRun) continue;

      const isPaypal = !!(m as any).paypalCaptureId;
      const pi = (m as any).stripePaymentIntentId || undefined;
      const payment = em.create(Payment, {
        user: em.getReference(Profile, memberId),
        membership: em.getReference(Membership, m.id),
        paymentType: PaymentType.MEMBERSHIP,
        paymentMethod: isPaypal ? PaymentMethod.PAYPAL : PaymentMethod.STRIPE,
        paymentStatus: PaymentStatus.PAID,
        amount: amount.toFixed(2),
        currency: 'USD',
        stripePaymentIntentId: pi,
        externalPaymentId: (m as any).stripeSubscriptionId || undefined,
        paypalCaptureId: isPaypal ? (m as any).paypalCaptureId : undefined,
        transactionId: pi || (m as any).paypalCaptureId || (m as any).stripeSubscriptionId || undefined,
        paidAt: m.startDate || (m as any).createdAt || new Date(),
        description: 'Backfilled membership payment',
        paymentMetadata: { source: 'billing_backfill' },
      } as any);
      await em.persistAndFlush(payment);
      report.created.payments++;
      const r = await this.ensureOrderInvoiceForMembershipPayment(payment.id, '0.00', { sendEmail: false });
      if (r.created) report.created.orders++;
    }

    // Pass 2: existing membership Payments with no Order (e.g. historical
    // renewals). Fresh fork so it sees pass-1's committed order links.
    const em2 = this.em.fork();
    const orderlessPayments = await em2.find(Payment, {
      user: memberId,
      paymentType: PaymentType.MEMBERSHIP,
      order: null,
    } as any);
    for (const p of orderlessPayments) {
      report.payments_missing_order.push({
        payment_id: p.id,
        amount: Number(p.amount),
        reference: p.externalPaymentId || p.stripePaymentIntentId || p.transactionId || null,
      });
      if (dryRun) continue;
      const r = await this.ensureOrderInvoiceForMembershipPayment(p.id, '0.00', { sendEmail: false });
      if (r.created) report.created.orders++;
    }

    return report;
  }

  /**
   * GLOBAL billing backfill across ALL members. Finds the distinct set of
   * members that have either a paid membership with no Payment, or a membership
   * Payment with no Order, then runs the per-member backfill for each and
   * aggregates the totals. Scoped by a single query so it only touches affected
   * members. dryRun reports counts without writing. Owner-gated at controller.
   */
  async backfillAllBilling(opts: { dryRun: boolean }): Promise<{
    dry_run: boolean;
    members_affected: number;
    memberships_missing_payment: number;
    payments_missing_order: number;
    created: { payments: number; orders: number };
  }> {
    const { dryRun } = opts;
    const em = this.em.fork();
    const conn = em.getConnection();
    // Members needing a backfill: a paid membership with no Payment, OR a
    // membership Payment with no Order. (membership_id IS NOT NULL identifies
    // membership payments without depending on the payment_type enum string.)
    const rows = await conn.execute<Array<{ user_id: string }>>(`
      SELECT DISTINCT user_id FROM (
        SELECT m.user_id
          FROM public.memberships m
         WHERE m.payment_status = 'paid'
           AND m.user_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.membership_id = m.id)
        UNION
        SELECT p.user_id
          FROM public.payments p
         WHERE p.membership_id IS NOT NULL
           AND p.order_id IS NULL
           AND p.user_id IS NOT NULL
      ) q
    `);
    const memberIds = (rows as Array<{ user_id: string }>).map((r) => r.user_id).filter(Boolean);

    const agg = {
      dry_run: dryRun,
      members_affected: memberIds.length,
      memberships_missing_payment: 0,
      payments_missing_order: 0,
      created: { payments: 0, orders: 0 },
    };

    for (const memberId of memberIds) {
      try {
        const r = await this.backfillMemberBilling(memberId, { dryRun });
        agg.memberships_missing_payment += r.memberships_missing_payment.length;
        agg.payments_missing_order += r.payments_missing_order.length;
        agg.created.payments += r.created.payments;
        agg.created.orders += r.created.orders;
      } catch (e) {
        this.logger.error(`backfillAllBilling: member ${memberId} failed: ${e}`);
      }
    }
    this.logger.log(
      `backfillAllBilling (${dryRun ? 'DRY-RUN' : 'APPLIED'}): ${memberIds.length} members, ` +
      `${agg.created.payments} payments + ${agg.created.orders} orders created`,
    );
    return agg;
  }

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
        payment = await em.findOne(Payment, {
          $or: [
            { paypalOrderId: metadata.paypalOrderId || transactionId },
            { paypalCaptureId: transactionId },
            { transactionId },
          ],
        });
      }

      // No Payment ledger row yet (the event-registration / non-membership paths
      // never created one) → create it now so EVERY order has a payment in the
      // ledger, with the right gateway ids for refund matching + reconciliation.
      if (!payment) {
        const isStripe = params.paymentMethod === PaymentMethod.STRIPE;
        payment = em.create(Payment, {
          user: metadata.userId ? em.getReference(Profile, metadata.userId) : undefined,
          paymentType: type === 'membership' ? PaymentType.MEMBERSHIP : PaymentType.EVENT_REGISTRATION,
          paymentMethod: params.paymentMethod,
          paymentStatus: PaymentStatus.PAID,
          amount: amountPaid.toFixed(2),
          currency: 'USD',
          transactionId,
          stripePaymentIntentId: isStripe ? transactionId : undefined,
          paypalOrderId: !isStripe ? (metadata.paypalOrderId || undefined) : undefined,
          paypalCaptureId: !isStripe ? transactionId : undefined,
          paidAt: new Date(),
          description: type === 'event_registration' ? `Event Registration: ${metadata.eventTitle || 'Event'}` : undefined,
        } as any);
        await em.persistAndFlush(payment);
      }

      // Idempotency guard: if an Order already exists for this payment (a retried
      // checkout.session.completed / capture webhook re-enters here), don't mint a
      // second Order+Invoice for the same money. The Payment row above is already
      // deduped; the Order was the unguarded gap (audit: subscription-initial dup).
      if (payment) {
        const existingOrder = await em.findOne(Order, { payment: payment.id });
        if (existingOrder) {
          this.logger.log(
            `Order ${existingOrder.orderNumber} already exists for payment ${transactionId}; skipping duplicate order/invoice creation`,
          );
          return;
        }
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

        // Link the payment to the order (order.payments OneToMany) so the admin
        // order view shows the full payment history.
        if (payment) {
          const p = await em.findOne(Payment, { id: payment.id });
          if (p) p.order = em.getReference(Order, createdOrder.id) as any;
        }

        return { order: createdOrder, invoice: createdInvoice };
      });

      // Send invoice email (async, non-blocking, outside transaction)
      if (invoice) {
        this.invoicesService.sendInvoice(invoice.id).catch((error) => {
          this.logger.error(`Failed to send invoice email: ${error}`);
        });
      }

      // Sync event-registration revenue to QuickBooks (memberships sync via their
      // own membership-config-aware path). Best-effort, non-blocking.
      if (type === 'event_registration') {
        const customerName = metadata.billingFirstName && metadata.billingLastName
          ? `${metadata.billingFirstName} ${metadata.billingLastName}`
          : metadata.email;
        if (metadata.email) {
          this.quickBooksService
            .createGenericSalesReceipt({
              customerEmail: metadata.email,
              customerName: customerName || metadata.email,
              amount: amountPaid,
              description: `Event Registration: ${metadata.eventTitle || 'Event'}`,
              paymentDate: new Date(),
              reference: transactionId,
            })
            .catch((qbError) => this.logger.error(`QuickBooks event-reg sync failed (non-critical): ${qbError}`));
        }
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
