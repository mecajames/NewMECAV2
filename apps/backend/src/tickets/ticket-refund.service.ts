import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PaymentStatus, RegistrationStatus, ShopOrderStatus } from '@newmeca/shared';
import { StripeService } from '../stripe/stripe.service';
import { PayPalService } from '../paypal/paypal.service';
import { ShopOrder } from '../shop/entities/shop-order.entity';
import { EventRegistration } from '../event-registrations/event-registrations.entity';
import { FinalsRegistration } from '../world-finals/finals-registration.entity';

export type RefundablePurchaseType = 'shop' | 'event_registration' | 'world_finals';

/**
 * Issues real gateway refunds (full or partial) for shop orders, event
 * registrations and World Finals pre-registrations directly from a support
 * ticket. Memberships keep their own canonical endpoint
 * (POST /api/memberships/:id/admin/refund), which this never touches.
 *
 * Stripe is the primary path (partial via amountCents). PayPal is refunded
 * when a capture id is resolvable from the Payment ledger; otherwise we fail
 * loudly so staff refund in the PayPal dashboard (these entities don't persist
 * a capture id at capture time — a noted follow-up).
 */
@Injectable()
export class TicketRefundService {
  private readonly logger = new Logger(TicketRefundService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly stripeService: StripeService,
    private readonly paypalService: PayPalService,
  ) {}

  async refundPurchase(opts: {
    type: RefundablePurchaseType;
    id: string;
    amountCents?: number;
    reason: string;
  }): Promise<{ success: boolean; message: string }> {
    const { type, id } = opts;
    const reason = (opts.reason || '').trim();
    if (reason.length < 5) throw new BadRequestException('A refund reason (5+ chars) is required.');
    if (opts.amountCents !== undefined && (!Number.isInteger(opts.amountCents) || opts.amountCents <= 0)) {
      throw new BadRequestException('Partial amount must be a positive number of cents.');
    }

    if (type === 'shop') return this.refundShop(id, reason, opts.amountCents);
    if (type === 'event_registration') return this.refundEventReg(id, reason, opts.amountCents);
    if (type === 'world_finals') return this.refundWorldFinals(id, reason, opts.amountCents);
    throw new BadRequestException(`Unsupported refund type: ${type}`);
  }

  /** Issue the gateway refund — Stripe when a PI exists, else PayPal via the capture id. */
  private async issueGatewayRefund(args: {
    stripePaymentIntentId?: string | null;
    paypalCaptureId?: string | null;
    amountCents?: number;
    reason: string;
  }): Promise<void> {
    if (args.stripePaymentIntentId) {
      await this.stripeService.createRefund(args.stripePaymentIntentId, args.reason, args.amountCents);
      return;
    }
    if (args.paypalCaptureId) {
      // PayPal refunds take a dollar amount; omit for a full refund.
      const amountDollars = args.amountCents !== undefined ? args.amountCents / 100 : undefined;
      await this.paypalService.refundCapture(args.paypalCaptureId, amountDollars);
      return;
    }
    throw new BadRequestException(
      'No Stripe payment intent or PayPal capture id is stored on this purchase, so it cannot be refunded ' +
        'automatically. Refund it directly in the Stripe or PayPal dashboard.',
    );
  }

  private assertCap(amountCents: number | undefined, totalDollars: number): void {
    if (amountCents !== undefined && amountCents > Math.round(totalDollars * 100)) {
      throw new BadRequestException(`Partial amount exceeds the purchase total of $${totalDollars.toFixed(2)}.`);
    }
  }

  private async refundShop(id: string, reason: string, amountCents?: number) {
    const em = this.em.fork();
    const order = await em.findOne(ShopOrder, { id }, { populate: ['items', 'items.product'] });
    if (!order) throw new NotFoundException(`Shop order ${id} not found`);
    if (order.status === ShopOrderStatus.REFUNDED) throw new BadRequestException('Order already refunded.');
    this.assertCap(amountCents, Number(order.totalAmount));

    await this.issueGatewayRefund({
      stripePaymentIntentId: order.stripePaymentIntentId,
      paypalCaptureId: (order as any).paypalCaptureId,
      amountCents,
      reason,
    });

    const isPartial = amountCents !== undefined && amountCents < Math.round(Number(order.totalAmount) * 100);
    if (isPartial) {
      order.adminNotes = `Partial refund $${(amountCents! / 100).toFixed(2)} via support ticket: ${reason}`;
    } else {
      order.status = ShopOrderStatus.REFUNDED;
      order.adminNotes = `Refunded via support ticket: ${reason}`;
      for (const item of order.items) {
        if (item.product && item.product.trackInventory && item.product.stockQuantity >= 0) {
          item.product.stockQuantity += item.quantity;
        }
      }
    }
    await em.flush();
    return { success: true, message: isPartial ? `Partial refund of $${(amountCents! / 100).toFixed(2)} issued.` : 'Full refund issued.' };
  }

  private async refundEventReg(id: string, reason: string, amountCents?: number) {
    const em = this.em.fork();
    const reg = await em.findOne(EventRegistration, { id });
    if (!reg) throw new NotFoundException(`Registration ${id} not found`);
    if (reg.paymentStatus === PaymentStatus.REFUNDED) throw new BadRequestException('Registration already refunded.');
    const total = Number((reg as any).amountPaid || 0);
    this.assertCap(amountCents, total);

    await this.issueGatewayRefund({
      stripePaymentIntentId: (reg as any).stripePaymentIntentId,
      paypalCaptureId: (reg as any).paypalCaptureId,
      amountCents,
      reason,
    });

    const isPartial = amountCents !== undefined && amountCents < Math.round(total * 100);
    if (!isPartial) {
      reg.paymentStatus = PaymentStatus.REFUNDED;
      reg.registrationStatus = RegistrationStatus.CANCELLED;
    }
    await em.flush();
    return { success: true, message: isPartial ? `Partial refund of $${(amountCents! / 100).toFixed(2)} issued.` : 'Full refund issued; registration cancelled.' };
  }

  private async refundWorldFinals(id: string, reason: string, amountCents?: number) {
    const em = this.em.fork();
    const reg = await em.findOne(FinalsRegistration, { id });
    if (!reg) throw new NotFoundException(`World Finals registration ${id} not found`);
    if ((reg as any).paymentStatus === 'refunded') throw new BadRequestException('Already refunded.');
    const total = Number((reg as any).totalAmount || 0);
    this.assertCap(amountCents, total);

    await this.issueGatewayRefund({
      stripePaymentIntentId: (reg as any).stripePaymentIntentId,
      paypalCaptureId: (reg as any).paypalCaptureId,
      amountCents,
      reason,
    });

    const isPartial = amountCents !== undefined && amountCents < Math.round(total * 100);
    if (!isPartial) {
      (reg as any).paymentStatus = 'refunded';
      (reg as any).registrationStatus = 'cancelled';
    }
    await em.flush();
    return { success: true, message: isPartial ? `Partial refund of $${(amountCents! / 100).toFixed(2)} issued.` : 'Full refund issued.' };
  }
}
