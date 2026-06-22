import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PaymentStatus, RegistrationStatus, ShopOrderStatus, RefundSourceType } from '@newmeca/shared';
import { RefundService } from '../payments/refund.service';
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
 * Routes the gateway refund + refund-ledger + Payment/Order/Invoice cascade
 * through the shared RefundService; this service only flips its own source
 * entity (shop order / registration / finals) afterwards.
 */
@Injectable()
export class TicketRefundService {
  private readonly logger = new Logger(TicketRefundService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly refundService: RefundService,
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

  private async refundShop(id: string, reason: string, amountCents?: number) {
    const em = this.em.fork();
    const order = await em.findOne(ShopOrder, { id }, { populate: ['items', 'items.product'] });
    if (!order) throw new NotFoundException(`Shop order ${id} not found`);
    if (order.status === ShopOrderStatus.REFUNDED) throw new BadRequestException('Order already refunded.');

    const result = await this.refundService.issueRefund({
      sourceType: RefundSourceType.SHOP_ORDER,
      sourceId: id,
      totalAmountDollars: Number(order.totalAmount),
      amountCents,
      reason,
      stripePaymentIntentId: order.stripePaymentIntentId,
      paypalCaptureId: (order as any).paypalCaptureId,
    });

    if (result.isPartial) {
      order.adminNotes = `Partial refund $${result.amount.toFixed(2)} via support ticket: ${reason}`;
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
    return { success: true, message: result.isPartial ? `Partial refund of $${result.amount.toFixed(2)} issued.` : 'Full refund issued.' };
  }

  private async refundEventReg(id: string, reason: string, amountCents?: number) {
    const em = this.em.fork();
    const reg = await em.findOne(EventRegistration, { id });
    if (!reg) throw new NotFoundException(`Registration ${id} not found`);
    if (reg.paymentStatus === PaymentStatus.REFUNDED) throw new BadRequestException('Registration already refunded.');

    const result = await this.refundService.issueRefund({
      sourceType: RefundSourceType.EVENT_REGISTRATION,
      sourceId: id,
      totalAmountDollars: Number((reg as any).amountPaid || 0),
      amountCents,
      reason,
      stripePaymentIntentId: (reg as any).stripePaymentIntentId,
      paypalCaptureId: (reg as any).paypalCaptureId,
    });

    if (!result.isPartial) {
      reg.paymentStatus = PaymentStatus.REFUNDED;
      reg.registrationStatus = RegistrationStatus.CANCELLED;
    }
    await em.flush();
    return { success: true, message: result.isPartial ? `Partial refund of $${result.amount.toFixed(2)} issued.` : 'Full refund issued; registration cancelled.' };
  }

  private async refundWorldFinals(id: string, reason: string, amountCents?: number) {
    const em = this.em.fork();
    const reg = await em.findOne(FinalsRegistration, { id });
    if (!reg) throw new NotFoundException(`World Finals registration ${id} not found`);
    if ((reg as any).paymentStatus === 'refunded') throw new BadRequestException('Already refunded.');

    const result = await this.refundService.issueRefund({
      sourceType: RefundSourceType.WORLD_FINALS,
      sourceId: id,
      totalAmountDollars: Number((reg as any).totalAmount || 0),
      amountCents,
      reason,
      stripePaymentIntentId: (reg as any).stripePaymentIntentId,
      paypalCaptureId: (reg as any).paypalCaptureId,
    });

    if (!result.isPartial) {
      (reg as any).paymentStatus = 'refunded';
      (reg as any).registrationStatus = 'cancelled';
    }
    await em.flush();
    return { success: true, message: result.isPartial ? `Partial refund of $${result.amount.toFixed(2)} issued.` : 'Full refund issued.' };
  }
}
