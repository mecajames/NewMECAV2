import { Injectable, Inject, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Payment } from '../payments/payments.entity';
import { Membership } from '../memberships/memberships.entity';
import { Profile } from '../profiles/profiles.entity';
import { Invoice } from '../invoices/invoices.entity';
import { Order } from '../orders/orders.entity';
import { ShopOrder } from '../shop/entities/shop-order.entity';
import { Refund } from '../payments/refund.entity';
import { ProcessedWebhookEvent } from '../stripe/processed-webhook-event.entity';
import { EventRegistration } from '../event-registrations/event-registrations.entity';
import { StripeService } from '../stripe/stripe.service';

export type TraceTokenType =
  | 'stripe_payment_intent'
  | 'stripe_charge'
  | 'stripe_subscription'
  | 'stripe_customer'
  | 'stripe_invoice'
  | 'stripe_refund'
  | 'paypal_subscription'
  | 'email'
  | 'meca_id'
  | 'invoice_or_order_number'
  | 'unknown';

export interface TraceResult {
  query: string;
  detectedType: TraceTokenType;
  // Everything Stripe told us about the token (null when Stripe wasn't consulted
  // or had no match). Raw-ish summaries — the admin UI renders key fields.
  stripe: {
    paymentIntent?: any;
    charge?: any;
    invoice?: any;
    customer?: any;
    subscriptionDetails?: any;
    subscriptions?: any[];
    recentCharges?: any[];
  } | null;
  // Local database matches
  profiles: any[];
  memberships: any[];
  payments: any[];
  invoices: any[];
  orders: any[];
  shopOrders: any[];
  eventRegistrations: any[];
  refunds: any[];
  webhookEvents: any[];
  // Identifiers discovered while walking the chain (Stripe → email → member),
  // so the admin can pivot the search.
  relatedIdentifiers: string[];
  notes: string[];
}

/**
 * Admin chargeback/trace tool: takes ANY payment identifier — Stripe payment
 * intent / charge / subscription / customer / invoice / refund id, PayPal
 * subscription id, our invoice/order number, a MECA ID, or an email — and
 * walks BOTH directions: Stripe → email/customer → our member, and our ledger
 * → memberships → member. Built for the case where a chargeback arrives with
 * nothing but a gateway id and no obvious local record.
 */
@Injectable()
export class PaymentTraceService {
  private readonly logger = new Logger(PaymentTraceService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly stripeService: StripeService,
  ) {}

  detectType(q: string): TraceTokenType {
    const t = q.trim();
    if (/^pi_/.test(t)) return 'stripe_payment_intent';
    if (/^ch_|^py_/.test(t)) return 'stripe_charge';
    if (/^sub_/.test(t)) return 'stripe_subscription';
    if (/^cus_/.test(t)) return 'stripe_customer';
    if (/^in_/.test(t)) return 'stripe_invoice';
    if (/^re_/.test(t)) return 'stripe_refund';
    if (/^I-/.test(t)) return 'paypal_subscription';
    if (t.includes('@')) return 'email';
    if (/^\d{6}$/.test(t)) return 'meca_id';
    if (/^(INV|ORD)/i.test(t) || /^\d+$/.test(t)) return 'invoice_or_order_number';
    return 'unknown';
  }

  async trace(rawQuery: string): Promise<TraceResult> {
    const query = rawQuery.trim();
    const detectedType = this.detectType(query);
    const notes: string[] = [];

    // Identifier pool: starts with the query, grows as Stripe reveals linked
    // ids (customer, PI, charge, invoice, subscription) and emails.
    const ids = new Set<string>([query]);
    const emails = new Set<string>();
    if (detectedType === 'email') emails.add(query.toLowerCase());

    // ---- Phase 1: ask Stripe about Stripe-shaped tokens ------------------
    const stripe: TraceResult['stripe'] = {};
    const addStripeIds = (...candidates: Array<string | null | undefined>) => {
      for (const c of candidates) {
        if (typeof c === 'string' && c.length > 0) ids.add(c);
      }
    };

    try {
      if (detectedType === 'stripe_payment_intent') {
        try {
          const pi = await this.stripeService.getPaymentIntent(query);
          stripe.paymentIntent = this.summarizePaymentIntent(pi);
          addStripeIds(
            typeof pi.customer === 'string' ? pi.customer : (pi.customer as any)?.id,
            typeof (pi as any).latest_charge === 'string' ? (pi as any).latest_charge : (pi as any).latest_charge?.id,
          );
          if ((pi as any).receipt_email) emails.add(String((pi as any).receipt_email).toLowerCase());
        } catch {
          notes.push(`Stripe has no payment intent ${query} (or the API is unavailable).`);
        }
      }

      if (detectedType === 'stripe_charge') {
        const charge = await this.stripeService.retrieveCharge(query);
        if (charge) {
          stripe.charge = this.summarizeCharge(charge);
          addStripeIds(
            typeof charge.payment_intent === 'string' ? charge.payment_intent : (charge.payment_intent as any)?.id,
            typeof charge.customer === 'string' ? charge.customer : (charge.customer as any)?.id,
            typeof charge.invoice === 'string' ? charge.invoice : (charge.invoice as any)?.id,
          );
          const email =
            charge.billing_details?.email ||
            (typeof charge.customer === 'object' ? (charge.customer as any)?.email : null) ||
            charge.receipt_email;
          if (email) emails.add(String(email).toLowerCase());
        } else {
          notes.push(`Stripe has no charge ${query} (or the API is unavailable).`);
        }
      }

      if (detectedType === 'stripe_subscription') {
        try {
          const bundle = await this.stripeService.getSubscriptionDetails(query);
          stripe.subscriptionDetails = bundle;
          addStripeIds(bundle.customerId, bundle.latestInvoiceId, bundle.paymentIntentId, bundle.chargeId);
          if (bundle.customerEmail) emails.add(bundle.customerEmail.toLowerCase());
        } catch {
          notes.push(`Stripe has no subscription ${query} (or the API is unavailable).`);
        }
      }

      if (detectedType === 'stripe_invoice') {
        const inv = await this.stripeService.retrieveInvoice(query);
        if (inv) {
          stripe.invoice = this.summarizeStripeInvoice(inv);
          addStripeIds(
            typeof inv.customer === 'string' ? inv.customer : (inv.customer as any)?.id,
            typeof (inv as any).subscription === 'string' ? (inv as any).subscription : (inv as any).subscription?.id,
            typeof (inv as any).payment_intent === 'string' ? (inv as any).payment_intent : (inv as any).payment_intent?.id,
            (inv as any).charge ?? undefined,
          );
          const email = inv.customer_email || (typeof inv.customer === 'object' ? (inv.customer as any)?.email : null);
          if (email) emails.add(String(email).toLowerCase());
        } else {
          notes.push(`Stripe has no invoice ${query} (or the API is unavailable).`);
        }
      }

      if (detectedType === 'stripe_customer') {
        const customer = await this.stripeService.retrieveCustomer(query);
        if (customer) {
          stripe.customer = { id: customer.id, email: customer.email, name: customer.name, created: customer.created };
          if (customer.email) emails.add(customer.email.toLowerCase());
        } else {
          notes.push(`Stripe has no customer ${query} (deleted, missing, or API unavailable).`);
        }
        const subs = await this.stripeService.listSubscriptionsForCustomer(query);
        stripe.subscriptions = subs.map((s) => ({
          id: s.id,
          status: s.status,
          cancelAtPeriodEnd: s.cancel_at_period_end,
          currentPeriodEnd: s.current_period_end ? new Date(s.current_period_end * 1000) : null,
        }));
        subs.forEach((s) => ids.add(s.id));
        const charges = await this.stripeService.listChargesForCustomer(query);
        stripe.recentCharges = charges.map((c) => this.summarizeCharge(c));
        charges.forEach((c) => {
          ids.add(c.id);
          if (typeof c.payment_intent === 'string') ids.add(c.payment_intent);
        });
      }

      if (detectedType === 'email') {
        const customers = await this.stripeService.listCustomersByEmail(query);
        if (customers.length > 0) {
          stripe.customer = customers.map((c) => ({ id: c.id, email: c.email, name: c.name, created: c.created }));
          const allSubs: any[] = [];
          for (const c of customers) {
            ids.add(c.id);
            const subs = await this.stripeService.listSubscriptionsForCustomer(c.id);
            subs.forEach((s) => {
              ids.add(s.id);
              allSubs.push({
                id: s.id,
                customerId: c.id,
                status: s.status,
                cancelAtPeriodEnd: s.cancel_at_period_end,
                currentPeriodEnd: s.current_period_end ? new Date(s.current_period_end * 1000) : null,
              });
            });
          }
          stripe.subscriptions = allSubs;
        }
      }
    } catch (err) {
      // Stripe being down must never break the local-ledger half of the trace.
      this.logger.warn(`Stripe phase of trace(${query}) failed: ${err}`);
      notes.push('Stripe lookup failed — showing local database matches only.');
    }

    // ---- Phase 2: search OUR ledger with every identifier we now hold ----
    const em = this.em.fork();
    const idList = [...ids];
    const emailList = [...emails];

    const payments = await em.find(Payment, {
      $or: [
        { stripePaymentIntentId: { $in: idList } },
        { transactionId: { $in: idList } },
        { externalPaymentId: { $in: idList } },
        { stripeCustomerId: { $in: idList } },
        { paypalOrderId: { $in: idList } },
        { paypalCaptureId: { $in: idList } },
      ],
    }, { populate: ['user', 'membership', 'order'] as any, limit: 50 });

    // paymentMetadata->>'stripeSubscriptionId' lives in jsonb — raw SQL match.
    const placeholders = idList.map(() => '?').join(',');
    const metaRows: Array<{ id: string }> = await em.getConnection().execute(
      `SELECT "id" FROM "public"."payments" WHERE "payment_metadata"->>'stripeSubscriptionId' IN (${placeholders})`,
      idList,
    );
    const missingMetaIds = metaRows.map((r) => r.id).filter((id) => !payments.some((p) => p.id === id));
    if (missingMetaIds.length > 0) {
      payments.push(...await em.find(Payment, { id: { $in: missingMetaIds } }, { populate: ['user', 'membership', 'order'] as any }));
    }

    const memberships = await em.find(Membership, {
      $or: [
        { stripeSubscriptionId: { $in: idList } },
        { paypalSubscriptionId: { $in: idList } },
        { stripePaymentIntentId: { $in: idList } },
        { transactionId: { $in: idList } },
        { paypalCaptureId: { $in: idList } },
        ...(detectedType === 'meca_id' ? [{ mecaId: parseInt(query, 10) }] : []),
      ],
    }, { populate: ['user', 'membershipTypeConfig'] as any, limit: 50 });

    const shopOrders = await em.find(ShopOrder, {
      $or: [
        { stripePaymentIntentId: { $in: idList } },
        { stripeChargeId: { $in: idList } },
        { paypalCaptureId: { $in: idList } },
      ],
    }, { limit: 25 });

    const eventRegistrations = await em.find(EventRegistration, {
      $or: [
        { stripeCustomerId: { $in: idList } },
        { paypalCaptureId: { $in: idList } },
        ...(emailList.length > 0 ? [{ email: { $in: emailList } }] : []),
      ],
    } as any, { limit: 25 });

    const refunds = await em.find(Refund, { gatewayRefundId: { $in: idList } }, { populate: ['payment'] as any, limit: 25 });

    const webhookEvents = await em.find(ProcessedWebhookEvent, {
      paymentIntentId: { $in: idList },
    }, { orderBy: { processedAt: 'DESC' } as any, limit: 25 });

    // Our invoice/order numbers (also try the raw query against them directly)
    const invoices = await em.find(Invoice, {
      invoiceNumber: { $ilike: `%${query}%` },
    }, { populate: ['user', 'order'] as any, limit: 10 });

    const orders = detectedType === 'invoice_or_order_number' || detectedType === 'unknown'
      ? await em.find(Order, { orderNumber: { $ilike: `%${query}%` } }, { populate: ['member'] as any, limit: 10 })
      : [];

    // ---- Phase 3: resolve members (email + everything already matched) ---
    const profileIds = new Set<string>();
    payments.forEach((p) => p.user?.id && profileIds.add(p.user.id));
    memberships.forEach((m) => m.user?.id && profileIds.add(m.user.id));
    orders.forEach((o: any) => o.member?.id && profileIds.add(o.member.id));
    invoices.forEach((i: any) => i.user?.id && profileIds.add(i.user.id));

    const profileWhere: any[] = [];
    if (profileIds.size > 0) profileWhere.push({ id: { $in: [...profileIds] } });
    if (emailList.length > 0) profileWhere.push({ email: { $in: emailList } });
    if (detectedType === 'meca_id') profileWhere.push({ meca_id: query });

    const profiles = profileWhere.length > 0
      ? await em.find(Profile, { $or: profileWhere }, {
          fields: ['id', 'email', 'first_name', 'last_name', 'full_name', 'meca_id',
            'membership_status', 'role', 'login_banned', 'can_login'] as any,
          limit: 25,
        })
      : [];

    // If we found members by email/id but their memberships weren't matched by
    // gateway ids, pull their memberships too — the admin needs something to cancel.
    const knownMembershipIds = new Set(memberships.map((m) => m.id));
    if (profiles.length > 0) {
      const more = await em.find(Membership, {
        user: { $in: profiles.map((p) => p.id) },
      }, { populate: ['user', 'membershipTypeConfig'] as any, orderBy: { endDate: 'DESC' } as any, limit: 50 });
      for (const m of more) {
        if (!knownMembershipIds.has(m.id)) {
          knownMembershipIds.add(m.id);
          memberships.push(m);
        }
      }
    }

    // Flag disputed payments prominently (webhook stamps paymentMetadata.dispute)
    for (const p of payments) {
      if (p.paymentMetadata?.dispute) {
        notes.push(
          `Payment ${p.id} has a DISPUTE on record: ${JSON.stringify(p.paymentMetadata.dispute)}`,
        );
      }
    }

    if (profiles.length === 0 && payments.length === 0 && memberships.length === 0 && !stripe.paymentIntent
        && !stripe.charge && !stripe.customer && !stripe.subscriptionDetails && !stripe.invoice) {
      notes.push('No matches found in the local database or Stripe for this identifier.');
    }

    return {
      query,
      detectedType,
      stripe: Object.keys(stripe).length > 0 ? stripe : null,
      profiles,
      memberships: memberships.map((m) => this.summarizeMembership(m)),
      payments: payments.map((p) => this.summarizePayment(p)),
      invoices: invoices.map((i: any) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        total: i.total,
        userId: i.user?.id ?? null,
        userEmail: i.user?.email ?? null,
        orderId: i.order?.id ?? null,
      })),
      orders: orders.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        orderType: o.orderType,
        memberId: o.member?.id ?? null,
        memberEmail: o.member?.email ?? null,
      })),
      shopOrders,
      eventRegistrations,
      refunds,
      webhookEvents,
      relatedIdentifiers: idList.filter((i) => i !== query).concat(emailList),
      notes,
    };
  }

  private summarizePaymentIntent(pi: any) {
    return {
      id: pi.id,
      status: pi.status,
      amount: typeof pi.amount === 'number' ? pi.amount / 100 : null,
      currency: pi.currency,
      customerId: typeof pi.customer === 'string' ? pi.customer : pi.customer?.id ?? null,
      latestChargeId: typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null,
      receiptEmail: pi.receipt_email ?? null,
      created: pi.created ? new Date(pi.created * 1000) : null,
      metadata: pi.metadata ?? {},
    };
  }

  private summarizeCharge(c: any) {
    return {
      id: c.id,
      status: c.status,
      amount: typeof c.amount === 'number' ? c.amount / 100 : null,
      amountRefunded: typeof c.amount_refunded === 'number' ? c.amount_refunded / 100 : null,
      refunded: c.refunded,
      disputed: c.disputed ?? false,
      paymentIntentId: typeof c.payment_intent === 'string' ? c.payment_intent : c.payment_intent?.id ?? null,
      customerId: typeof c.customer === 'string' ? c.customer : c.customer?.id ?? null,
      invoiceId: typeof c.invoice === 'string' ? c.invoice : c.invoice?.id ?? null,
      billingEmail: c.billing_details?.email ?? c.receipt_email ?? null,
      billingName: c.billing_details?.name ?? null,
      created: c.created ? new Date(c.created * 1000) : null,
    };
  }

  private summarizeStripeInvoice(inv: any) {
    return {
      id: inv.id,
      status: inv.status,
      total: typeof inv.total === 'number' ? inv.total / 100 : null,
      customerId: typeof inv.customer === 'string' ? inv.customer : inv.customer?.id ?? null,
      customerEmail: inv.customer_email ?? null,
      subscriptionId: typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id ?? null,
      paymentIntentId: typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent?.id ?? null,
      created: inv.created ? new Date(inv.created * 1000) : null,
    };
  }

  private summarizeMembership(m: Membership) {
    return {
      id: m.id,
      mecaId: m.mecaId ?? null,
      competitorName: m.competitorName ?? null,
      userId: m.user?.id ?? null,
      userEmail: (m.user as any)?.email ?? null,
      userName: [(m.user as any)?.first_name, (m.user as any)?.last_name].filter(Boolean).join(' ') || null,
      membershipType: (m.membershipTypeConfig as any)?.name ?? null,
      paymentStatus: m.paymentStatus,
      startDate: m.startDate,
      endDate: m.endDate,
      stripeSubscriptionId: m.stripeSubscriptionId ?? null,
      paypalSubscriptionId: m.paypalSubscriptionId ?? null,
      stripePaymentIntentId: m.stripePaymentIntentId ?? null,
      transactionId: m.transactionId ?? null,
      cancelledAt: (m as any).cancelledAt ?? null,
      cancelAtPeriodEnd: (m as any).cancelAtPeriodEnd ?? null,
      frozenAt: m.frozenAt ?? null,
      freezeReason: m.freezeReason ?? null,
      disputeId: m.disputeId ?? null,
    };
  }

  private summarizePayment(p: Payment) {
    return {
      id: p.id,
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      paymentStatus: p.paymentStatus,
      amount: p.amount,
      currency: p.currency ?? 'usd',
      transactionId: p.transactionId ?? null,
      stripePaymentIntentId: p.stripePaymentIntentId ?? null,
      stripeCustomerId: p.stripeCustomerId ?? null,
      externalPaymentId: p.externalPaymentId ?? null,
      paypalOrderId: p.paypalOrderId ?? null,
      paypalCaptureId: p.paypalCaptureId ?? null,
      userId: p.user?.id ?? null,
      userEmail: (p.user as any)?.email ?? null,
      membershipId: p.membership?.id ?? null,
      orderId: (p.order as any)?.id ?? null,
      paidAt: p.paidAt ?? null,
      refundedAt: p.refundedAt ?? null,
      amountRefunded: p.amountRefunded,
      dispute: p.paymentMetadata?.dispute ?? null,
      metadata: p.paymentMetadata ?? null,
      createdAt: p.createdAt,
    };
  }
}
