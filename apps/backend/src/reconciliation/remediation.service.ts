import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import {
  PaymentStatus,
  PaymentType,
  PaymentMethod,
  OrderStatus,
  OrderType,
  InvoiceStatus,
  RefundGateway,
  RefundSourceType,
} from '@newmeca/shared';
import { RefundService } from '../payments/refund.service';
import { AdminAuditService } from '../user-activity/admin-audit.service';
import { Payment } from '../payments/payments.entity';
import { Refund } from '../payments/refund.entity';
import { Order } from '../orders/orders.entity';
import { Invoice } from '../invoices/invoices.entity';
import { Membership } from '../memberships/memberships.entity';
import { Profile } from '../profiles/profiles.entity';

export interface RemediationResult {
  success: boolean;
  message: string;
}

/**
 * One-click reconciliation remediation (Phase 4). DELIBERATELY DB-SIDE ONLY:
 * every action records the gateway/ledger-confirmed truth into the local
 * database — it NEVER moves money (no gateway charge/refund). That keeps it
 * inside the report-only safety boundary James chose. Every handler:
 *   1. re-verifies the discrepancy still exists (never acts on a stale row),
 *   2. applies a single bounded fix in a transaction,
 *   3. writes an admin_audit_log entry.
 * Risky/ambiguous discrepancies (local "paid" the gateway denies, amount
 * mismatches) are intentionally NOT remediable here — they need a human.
 */
@Injectable()
export class RemediationService {
  private readonly logger = new Logger(RemediationService.name);

  /** check keys this service can fix → human label (also the allow-list). */
  static readonly REMEDIABLE: Record<string, string> = {
    refund_total_mismatch: 'Recompute the payment’s refunded total from the refund ledger',
    completed_orders_without_payment: 'Back-fill a payment ledger row from the completed order',
    paid_membership_without_payment: 'Back-fill a payment ledger row from the paid membership',
    order_refund_status_drift: 'Mark the order + invoice refunded to match the refunded payment',
    live_stripe_unrecorded_refunds: 'Record the gateway refund locally (no money moves)',
  };

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly refundService: RefundService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async remediate(
    checkKey: string,
    payload: Record<string, any>,
    actorId: string,
    ip?: string,
  ): Promise<RemediationResult> {
    if (!RemediationService.REMEDIABLE[checkKey]) {
      throw new BadRequestException(`Discrepancy "${checkKey}" is not auto-remediable; resolve it manually.`);
    }
    let result: RemediationResult;
    switch (checkKey) {
      case 'refund_total_mismatch':
        result = await this.recomputeRefundTotal(payload, actorId);
        break;
      case 'completed_orders_without_payment':
        result = await this.backfillOrderPayment(payload, actorId);
        break;
      case 'paid_membership_without_payment':
        result = await this.backfillMembershipPayment(payload, actorId);
        break;
      case 'order_refund_status_drift':
        result = await this.syncOrderRefundStatus(payload, actorId);
        break;
      case 'live_stripe_unrecorded_refunds':
        result = await this.recordStripeRefund(payload, actorId);
        break;
      default:
        throw new BadRequestException(`Unhandled remediation "${checkKey}".`);
    }

    if (result.success) {
      await this.audit(actorId, checkKey, payload, result.message, ip);
    }
    return result;
  }

  private async audit(
    actorId: string,
    checkKey: string,
    payload: Record<string, any>,
    message: string,
    ip?: string,
  ): Promise<void> {
    try {
      await this.adminAuditService.logAction({
        adminUserId: actorId,
        action: 'reconciliation_remediate',
        resourceType: 'billing_reconciliation',
        resourceId: payload?.id || payload?.refundId || payload?.paymentIntentId,
        description: `${checkKey}: ${message}`,
        newValues: payload,
        ip,
      });
    } catch (err) {
      this.logger.warn(`Failed to write remediation audit entry: ${err}`);
    }
  }

  private cents(v: any): number {
    return Math.round(parseFloat(String(v ?? '0')) * 100);
  }

  // --- Handlers --------------------------------------------------------------

  /** payment.amount_refunded ← SUM(refunds.amount); fix status accordingly. */
  private async recomputeRefundTotal(payload: Record<string, any>, _actorId: string): Promise<RemediationResult> {
    const id = payload?.id;
    if (!id) throw new BadRequestException('Missing payment id.');
    const em = this.em.fork();
    return em.transactional(async (tem) => {
      const payment = await tem.findOne(Payment, { id });
      if (!payment) return { success: false, message: 'Payment not found.' };
      const refunds = await tem.find(Refund, { payment: payment.id });
      const sumCents = refunds.reduce((n, r) => n + this.cents(r.amount), 0);
      const currentCents = this.cents(payment.amountRefunded);
      if (sumCents === currentCents) {
        return { success: false, message: 'Already consistent — no change needed.' };
      }
      const amountCents = this.cents(payment.amount);
      payment.amountRefunded = (sumCents / 100).toFixed(2);
      if (sumCents >= amountCents && amountCents > 0) {
        payment.paymentStatus = PaymentStatus.REFUNDED;
        payment.refundedAt = payment.refundedAt ?? new Date();
      } else if (payment.paymentStatus === PaymentStatus.REFUNDED) {
        // Was marked fully refunded but the ledger says it isn't — revert to paid.
        payment.paymentStatus = PaymentStatus.PAID;
      }
      await tem.flush();
      return {
        success: true,
        message: `amount_refunded set to $${(sumCents / 100).toFixed(2)} (was $${(currentCents / 100).toFixed(2)}).`,
      };
    });
  }

  /** Create a Payment ledger row for a completed order that has none. */
  private async backfillOrderPayment(payload: Record<string, any>, _actorId: string): Promise<RemediationResult> {
    const id = payload?.id;
    if (!id) throw new BadRequestException('Missing order id.');
    const em = this.em.fork();
    return em.transactional(async (tem) => {
      const order = await tem.findOne(Order, { id }, { populate: ['member', 'payment'] });
      if (!order) return { success: false, message: 'Order not found.' };
      if (order.status !== OrderStatus.COMPLETED) {
        return { success: false, message: `Order is ${order.status}, not completed — no longer applicable.` };
      }
      const existing = await tem.findOne(Payment, { order: order.id });
      if (order.payment || existing) {
        return { success: false, message: 'A payment already exists for this order — no longer applicable.' };
      }

      // Best-effort method/txn from the order note ("<method> Payment: <txn>").
      let method = PaymentMethod.MANUAL;
      let txnId: string | undefined;
      const m = /(\w+)\s+Payment:\s+(\S+)/i.exec(order.notes || '');
      if (m) {
        const parsed = m[1].toLowerCase();
        if ((Object.values(PaymentMethod) as string[]).includes(parsed)) method = parsed as PaymentMethod;
        txnId = m[2];
      }
      const isStripe = method === PaymentMethod.STRIPE && txnId?.startsWith('pi_');

      const payment = tem.create(Payment, {
        user: order.member ? tem.getReference(Profile, (order.member as any).id) : undefined,
        paymentType:
          order.orderType === OrderType.MEMBERSHIP ? PaymentType.MEMBERSHIP
          : order.orderType === OrderType.EVENT_REGISTRATION ? PaymentType.EVENT_REGISTRATION
          : PaymentType.OTHER,
        paymentMethod: method,
        paymentStatus: PaymentStatus.PAID,
        amount: Number(order.total).toFixed(2),
        currency: order.currency || 'USD',
        transactionId: txnId,
        stripePaymentIntentId: isStripe ? txnId : undefined,
        order: tem.getReference(Order, order.id) as any,
        paidAt: order.createdAt ?? new Date(),
        description: `Reconciliation back-fill for order ${order.orderNumber}`,
      } as any);
      await tem.persistAndFlush(payment);
      order.payment = tem.getReference(Payment, payment.id) as any;
      await tem.flush();
      return { success: true, message: `Created payment ${payment.id} ($${Number(order.total).toFixed(2)}) for order ${order.orderNumber}.` };
    });
  }

  /** Create a Payment ledger row for a paid membership that has none. */
  private async backfillMembershipPayment(payload: Record<string, any>, _actorId: string): Promise<RemediationResult> {
    const id = payload?.id;
    if (!id) throw new BadRequestException('Missing membership id.');
    const em = this.em.fork();
    return em.transactional(async (tem) => {
      const membership = await tem.findOne(Membership, { id }, { populate: ['user', 'membershipTypeConfig'] });
      if (!membership) return { success: false, message: 'Membership not found.' };
      if (membership.paymentStatus !== PaymentStatus.PAID || !(Number(membership.amountPaid) > 0)) {
        return { success: false, message: 'Membership is not a paid, non-zero membership — no longer applicable.' };
      }
      const existing = await tem.findOne(Payment, { membership: membership.id });
      if (existing) {
        return { success: false, message: 'A payment already exists for this membership — no longer applicable.' };
      }
      // This check only fires for memberships with NO gateway ids, so the money
      // was manual/cash/comp; record it as MANUAL.
      const payment = tem.create(Payment, {
        user: membership.user ? tem.getReference(Profile, (membership.user as any).id) : undefined,
        membership: tem.getReference(Membership, membership.id),
        paymentType: PaymentType.MEMBERSHIP,
        paymentMethod: PaymentMethod.MANUAL,
        paymentStatus: PaymentStatus.PAID,
        amount: Number(membership.amountPaid).toFixed(2),
        currency: 'USD',
        paidAt: (membership as any).startDate ?? (membership as any).createdAt ?? new Date(),
        description: `Reconciliation back-fill for membership ${membership.mecaId || membership.id.slice(0, 8)}`,
      } as any);
      await tem.persistAndFlush(payment);
      return { success: true, message: `Created payment ${payment.id} ($${Number(membership.amountPaid).toFixed(2)}) for membership ${membership.mecaId || membership.id.slice(0, 8)}.` };
    });
  }

  /** Forward a refunded payment's status onto its order + invoice (safe direction only). */
  private async syncOrderRefundStatus(payload: Record<string, any>, _actorId: string): Promise<RemediationResult> {
    const id = payload?.id;
    if (!id) throw new BadRequestException('Missing order id.');
    const em = this.em.fork();
    return em.transactional(async (tem) => {
      const order = await tem.findOne(Order, { id }, { populate: ['payment'] });
      if (!order) return { success: false, message: 'Order not found.' };
      const payment = (order.payment as Payment | undefined) ?? (await tem.findOne(Payment, { order: order.id }));
      if (!payment) return { success: false, message: 'No payment linked to this order.' };

      const fullyRefunded = this.cents(payment.amountRefunded) >= this.cents(payment.amount) && this.cents(payment.amount) > 0;
      // Only the SAFE direction: payment refunded but order still completed → mark refunded.
      if (payment.paymentStatus === PaymentStatus.REFUNDED && fullyRefunded && order.status === OrderStatus.COMPLETED) {
        order.status = OrderStatus.REFUNDED;
        if (order.invoiceId) {
          const invoice = await tem.findOne(Invoice, { id: order.invoiceId });
          if (invoice) invoice.status = InvoiceStatus.REFUNDED;
        }
        await tem.flush();
        return { success: true, message: `Order ${order.orderNumber} + its invoice marked refunded to match the payment.` };
      }
      return {
        success: false,
        message: 'Ambiguous (order refunded but payment is not) — resolve manually so a real charge isn’t hidden.',
      };
    });
  }

  /** Record a gateway-confirmed Stripe refund locally (no gateway call). */
  private async recordStripeRefund(payload: Record<string, any>, actorId: string): Promise<RemediationResult> {
    const { refundId, paymentIntentId, amount } = payload || {};
    if (!refundId || !paymentIntentId) throw new BadRequestException('Missing refundId / paymentIntentId.');
    const em = this.em.fork();
    const payment = await em.findOne(Payment, { stripePaymentIntentId: paymentIntentId }, { populate: ['membership', 'order'] });
    if (!payment) {
      return { success: false, message: 'No local payment for this PaymentIntent — back-fill the payment first.' };
    }
    const existing = await em.findOne(Refund, { gatewayRefundId: refundId });
    if (existing) return { success: false, message: 'This refund is already recorded — no longer applicable.' };

    const sourceType = (payment as any).membership ? RefundSourceType.MEMBERSHIP : RefundSourceType.ORDER;
    const sourceId = (payment as any).membership?.id || (payment as any).order?.id;
    await this.refundService.issueRefund({
      callGateway: false,
      gateway: RefundGateway.STRIPE,
      gatewayRefundId: refundId,
      stripePaymentIntentId: paymentIntentId,
      amountCents: this.cents(amount),
      totalAmountDollars: Number(payment.amount),
      reason: 'Reconciliation: record gateway-confirmed refund',
      actorId,
      sourceType,
      sourceId,
      payment,
    });
    return { success: true, message: `Recorded Stripe refund ${refundId} ($${Number(amount).toFixed(2)}) against ${paymentIntentId}.` };
  }
}
