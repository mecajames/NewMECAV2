import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import {
  PaymentStatus,
  OrderStatus,
  InvoiceStatus,
  RefundGateway,
  RefundSourceType,
  RefundStatus,
} from '@newmeca/shared';
import { StripeService } from '../stripe/stripe.service';
import { PayPalService } from '../paypal/paypal.service';
import { QuickBooksService } from '../quickbooks/quickbooks.service';
import { Payment } from './payments.entity';
import { Refund } from './refund.entity';
import { Order } from '../orders/orders.entity';
import { Invoice } from '../invoices/invoices.entity';

export interface IssueRefundParams {
  sourceType: RefundSourceType;
  sourceId?: string;
  /** Full purchase total in dollars — for partial detection + over-refund cap. */
  totalAmountDollars: number;
  /** Refund amount in cents; omit/undefined = full refund. */
  amountCents?: number;
  reason: string;
  actorId?: string;
  /** Gateway identifiers from the source purchase (one is required to refund the card). */
  stripePaymentIntentId?: string | null;
  paypalCaptureId?: string | null;
  /** Already-resolved Payment to update; otherwise we resolve by gateway ids. */
  payment?: Payment | null;
  /** Set false to record a refund that ALREADY happened (gateway webhook reconcile
   *  or a manual cash/check/comp reversal) with NO gateway call. */
  callGateway?: boolean;
  /** For callGateway=false: the gateway + its refund id (idempotency key). */
  gateway?: RefundGateway;
  gatewayRefundId?: string;
}

export interface IssueRefundResult {
  success: boolean;
  refundId: string;
  gateway: RefundGateway;
  gatewayRefundId?: string;
  amount: number;
  isPartial: boolean;
  paymentId?: string;
}

/**
 * THE single path for issuing a refund. Every refund entry point (membership,
 * ticket-driven shop/event/world-finals, gateway webhooks) routes through here so
 * the money side stays consistent:
 *   1. issue the real gateway refund (Stripe PI or PayPal capture),
 *   2. write a first-class `refunds` ledger row,
 *   3. update the Payment (amount_refunded + status when fully refunded),
 *   4. cascade the linked Order + Invoice to REFUNDED on a full refund.
 * Callers still flip their own source entity (membership/shop/etc.) — this owns
 * the gateway + the shared billing ledger.
 */
@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly stripeService: StripeService,
    private readonly paypalService: PayPalService,
    private readonly quickBooksService: QuickBooksService,
  ) {}

  async issueRefund(params: IssueRefundParams): Promise<IssueRefundResult> {
    const reason = (params.reason || '').trim();
    if (reason.length < 5) throw new BadRequestException('A refund reason (5+ characters) is required.');

    const totalCents = Math.round(params.totalAmountDollars * 100);
    if (params.amountCents !== undefined) {
      if (!Number.isInteger(params.amountCents) || params.amountCents <= 0) {
        throw new BadRequestException('Partial refund amount must be a positive number of cents.');
      }
      if (params.amountCents > totalCents) {
        throw new BadRequestException(`Refund exceeds the purchase total of $${params.totalAmountDollars.toFixed(2)}.`);
      }
    }
    const refundCents = params.amountCents ?? totalCents;
    const isPartial = refundCents < totalCents;
    const callGateway = params.callGateway !== false;

    // Idempotency for gateway-webhook reconciliation: if we've already recorded
    // this gateway refund id, do nothing (the admin endpoint that issued it, or a
    // duplicate webhook delivery, already wrote the ledger + cascade).
    if (!callGateway && params.gatewayRefundId) {
      const existing = await this.em.fork().findOne(Refund, { gatewayRefundId: params.gatewayRefundId });
      if (existing) {
        return {
          success: true,
          refundId: existing.id,
          gateway: existing.gateway ?? RefundGateway.MANUAL,
          gatewayRefundId: existing.gatewayRefundId,
          amount: Number(existing.amount),
          isPartial: existing.isPartial,
          paymentId: (existing.payment as any)?.id,
        };
      }
    }

    // 1. Issue the gateway refund (unless this records one that already happened).
    let gateway: RefundGateway = params.gateway ?? RefundGateway.MANUAL;
    let gatewayRefundId: string | undefined = params.gatewayRefundId;
    if (callGateway) {
      if (params.stripePaymentIntentId) {
        const r = await this.stripeService.createRefund(params.stripePaymentIntentId, reason, params.amountCents);
        gateway = RefundGateway.STRIPE;
        gatewayRefundId = r?.id;
      } else if (params.paypalCaptureId) {
        const r = await this.paypalService.refundCapture(
          params.paypalCaptureId,
          params.amountCents !== undefined ? params.amountCents / 100 : undefined,
        );
        gateway = RefundGateway.PAYPAL;
        gatewayRefundId = r?.id || r?.data?.id;
      } else {
        throw new BadRequestException(
          'No Stripe payment intent or PayPal capture id is stored on this purchase, so it cannot be refunded ' +
            'automatically. Refund it in the Stripe or PayPal dashboard.',
        );
      }
    }

    const em = this.em.fork();

    // 2. Resolve the Payment row (so we can update the ledger + reach the Order).
    let payment = params.payment ?? null;
    if (!payment) {
      const where: any = { $or: [] as any[] };
      if (params.stripePaymentIntentId) where.$or.push({ stripePaymentIntentId: params.stripePaymentIntentId });
      if (params.paypalCaptureId) {
        where.$or.push({ paypalCaptureId: params.paypalCaptureId });
        where.$or.push({ paypalOrderId: params.paypalCaptureId });
      }
      if (where.$or.length) payment = await em.findOne(Payment, where, { populate: ['order', 'user'] });
    } else {
      payment = await em.findOne(Payment, { id: payment.id }, { populate: ['order', 'user'] });
    }

    // 3. Write the refund ledger row.
    const refund = em.create(Refund, {
      payment: payment ?? undefined,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      gateway,
      gatewayRefundId,
      amount: (refundCents / 100).toFixed(2),
      currency: 'USD',
      reason,
      isPartial,
      status: RefundStatus.SUCCEEDED,
      createdBy: params.actorId,
    } as any);
    em.persist(refund);

    // 4. Update the Payment ledger (+ cascade Order/Invoice on full refund).
    if (payment) {
      const already = Math.round(Number(payment.amountRefunded || 0) * 100);
      const newRefunded = already + refundCents;
      payment.amountRefunded = (newRefunded / 100).toFixed(2);
      payment.refundedAt = new Date();
      payment.refundReason = reason;
      const paymentTotalCents = Math.round(Number(payment.amount) * 100);
      const fullyRefunded = newRefunded >= paymentTotalCents;
      if (fullyRefunded) {
        payment.paymentStatus = PaymentStatus.REFUNDED;
        const order: Order | undefined = (payment as any).order;
        if (order) {
          order.status = OrderStatus.REFUNDED;
          if (order.invoiceId) {
            const invoice = await em.findOne(Invoice, { id: order.invoiceId });
            if (invoice) invoice.status = InvoiceStatus.REFUNDED;
          }
        }
      }
    } else {
      this.logger.warn(
        `Refund ${refund.id} (${params.sourceType}:${params.sourceId}) has no matching Payment row — ` +
          `ledger row written but Payment/Order/Invoice not updated.`,
      );
    }

    await em.flush();

    this.logger.log(
      `Refund issued: ${gateway} $${(refundCents / 100).toFixed(2)}${isPartial ? ' (partial)' : ''} for ` +
        `${params.sourceType}:${params.sourceId} (gatewayRefundId=${gatewayRefundId ?? 'n/a'})`,
    );

    // Post a QuickBooks refund receipt so accounting income is reduced (QB was
    // overstating revenue — refunds never synced). Fire-and-forget + best-effort:
    // a down/unconfigured QB or an API error must never fail or delay the refund.
    {
      const email = (payment?.user as any)?.email || (payment?.paymentMetadata as any)?.email;
      const name = payment?.user
        ? `${(payment.user as any).first_name || ''} ${(payment.user as any).last_name || ''}`.trim()
        : (payment?.paymentMetadata as any)?.name;
      if (email) {
        this.quickBooksService
          .createRefundReceipt({
            customerEmail: email,
            customerName: name || email,
            amount: refundCents / 100,
            description: payment?.description || `Refund (${params.sourceType})`,
            refundDate: new Date(),
            reference: gatewayRefundId || params.sourceId,
          })
          .catch((err) => this.logger.error(`QuickBooks refund receipt sync failed (non-fatal): ${err}`));
      }
    }

    return {
      success: true,
      refundId: refund.id,
      gateway,
      gatewayRefundId,
      amount: refundCents / 100,
      isPartial,
      paymentId: payment?.id,
    };
  }
}
