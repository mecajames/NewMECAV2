import { Injectable, Inject, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PaymentStatus, ShopOrderStatus, TicketPurchase } from '@newmeca/shared';
import { Membership } from '../memberships/memberships.entity';
import { ShopOrder } from '../shop/entities/shop-order.entity';
import { EventRegistration } from '../event-registrations/event-registrations.entity';
import { FinalsRegistration } from '../world-finals/finals-registration.entity';

const REFUND_WINDOW_DAYS = 30;

/**
 * Builds a member's purchase history across the four purchase types (there is
 * no unified ledger). Used by the purchase_reference support-ticket field so a
 * member can attach the exact item their request is about, with 30-day refund
 * eligibility surfaced.
 */
@Injectable()
export class TicketPurchasesService {
  private readonly logger = new Logger(TicketPurchasesService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  private daysSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  private item(
    type: TicketPurchase['type'],
    id: string,
    label: string,
    amount: unknown,
    date: Date,
    method: TicketPurchase['method'],
    transactionId: string | null,
  ): TicketPurchase {
    const days = this.daysSince(date);
    return {
      type,
      id,
      label,
      amount: Number(amount) || 0,
      purchased_at: date.toISOString(),
      method,
      transaction_id: transactionId,
      days_since_purchase: days,
      refund_eligible: days <= REFUND_WINDOW_DAYS,
    };
  }

  async getForUser(userId: string): Promise<TicketPurchase[]> {
    const em = this.em.fork();
    const out: TicketPurchase[] = [];

    try {
      const memberships = await em.find(
        Membership,
        { user: userId, paymentStatus: PaymentStatus.PAID },
        { populate: ['membershipTypeConfig'], orderBy: { createdAt: 'DESC' }, limit: 25 },
      );
      for (const m of memberships) {
        const method = m.stripeSubscriptionId || m.stripePaymentIntentId ? 'stripe' : m.paypalSubscriptionId ? 'paypal' : 'unknown';
        out.push(
          this.item(
            'membership',
            m.id,
            `${(m as any).membershipTypeConfig?.name || 'Membership'}`,
            m.amountPaid,
            m.createdAt,
            method,
            m.transactionId || m.stripePaymentIntentId || m.stripeSubscriptionId || m.paypalSubscriptionId || null,
          ),
        );
      }
    } catch (err) {
      this.logger.warn(`purchases: membership query failed: ${(err as Error).message}`);
    }

    try {
      const orders = await em.find(
        ShopOrder,
        {
          user: userId,
          status: { $in: [ShopOrderStatus.PAID, ShopOrderStatus.PROCESSING, ShopOrderStatus.SHIPPED, ShopOrderStatus.DELIVERED] },
        },
        { orderBy: { createdAt: 'DESC' }, limit: 25 },
      );
      for (const o of orders) {
        const method = o.stripePaymentIntentId || (o as any).stripeChargeId ? 'stripe' : 'unknown';
        out.push(
          this.item(
            'shop',
            o.id,
            `Shop Order ${o.orderNumber}`,
            o.totalAmount,
            o.createdAt,
            method,
            o.stripePaymentIntentId || (o as any).stripeChargeId || null,
          ),
        );
      }
    } catch (err) {
      this.logger.warn(`purchases: shop query failed: ${(err as Error).message}`);
    }

    try {
      const regs = await em.find(
        EventRegistration,
        { user: userId, paymentStatus: PaymentStatus.PAID },
        { populate: ['event'], orderBy: { createdAt: 'DESC' }, limit: 25 },
      );
      for (const r of regs) {
        const method = (r as any).stripePaymentIntentId ? 'stripe' : 'unknown';
        out.push(
          this.item(
            'event_registration',
            r.id,
            `Event: ${(r as any).event?.title || 'Registration'}`,
            (r as any).amountPaid,
            (r as any).registeredAt || r.createdAt,
            method,
            (r as any).stripePaymentIntentId || (r as any).transactionId || null,
          ),
        );
      }
    } catch (err) {
      this.logger.warn(`purchases: event-registration query failed: ${(err as Error).message}`);
    }

    try {
      const finals = await em.find(
        FinalsRegistration,
        { user: userId, paymentStatus: 'paid' } as any,
        { populate: ['season'], orderBy: { createdAt: 'DESC' }, limit: 25 },
      );
      for (const f of finals) {
        out.push(
          this.item(
            'world_finals',
            f.id,
            `World Finals${(f as any).season?.name ? ` – ${(f as any).season.name}` : ''}`,
            (f as any).totalAmount,
            (f as any).registeredAt || f.createdAt,
            (f as any).stripePaymentIntentId ? 'stripe' : 'unknown',
            (f as any).stripePaymentIntentId || null,
          ),
        );
      }
    } catch (err) {
      this.logger.warn(`purchases: finals query failed: ${(err as Error).message}`);
    }

    // Newest first across all types.
    out.sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime());
    return out;
  }
}
