import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/core';
import {
  InvoiceStatus,
  InvoiceItemType,
  OrderStatus,
  OrderType,
  OrderItemType,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  CreateInvoiceDto,
  ApplyManualPaymentDto,
  UpdateInvoiceStatusDto,
  InvoiceListQuery,
  CompanyInfo,
  BillingAddress,
} from '@newmeca/shared';
import { Invoice } from './invoices.entity';
import { InvoiceItem } from './invoice-items.entity';
import { Profile } from '../profiles/profiles.entity';
import { Order } from '../orders/orders.entity';
import { OrderItem } from '../orders/order-items.entity';
import { Payment } from '../payments/payments.entity';
import { Membership } from '../memberships/memberships.entity';
import { Team } from '../teams/team.entity';
import { TeamMember } from '../teams/team-member.entity';
import { EmailService } from '../email/email.service';
import { StripeService } from '../stripe/stripe.service';
import { NotificationsService } from '../notifications/notifications.service';

// Default MECA company info
const DEFAULT_COMPANY_INFO = {
  name: 'Mobile Electronics Competition Association',
  address: {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  },
  email: 'billing@mecacaraudio.com',
  phone: '',
  website: 'https://mecacaraudio.com',
};

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
    private readonly stripeService: StripeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Generate a unique invoice number
   * Uses database sequence if available, falls back to timestamp-based generation
   */
  private async generateInvoiceNumber(em: EntityManager): Promise<string> {
    const year = new Date().getFullYear();

    try {
      // Try using the database function first
      const connection = em.getConnection();
      const result = await connection.execute('SELECT generate_invoice_number() as invoice_number');
      return result[0].invoice_number;
    } catch {
      // Fallback: count existing invoices for this year and increment
      const count = await em.count(Invoice, {
        invoiceNumber: { $like: `INV-${year}-%` },
      });
      const nextNum = count + 1;
      return `INV-${year}-${String(nextNum).padStart(5, '0')}`;
    }
  }

  /**
   * Generate a unique order number for invoice→order coupling.
   * Mirrors the format used by OrdersService.
   */
  private async generateOrderNumber(em: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    try {
      const connection = em.getConnection();
      const result = await connection.execute('SELECT generate_order_number() as order_number');
      return result[0].order_number;
    } catch {
      const count = await em.count(Order, {
        orderNumber: { $like: `ORD-${year}-%` },
      });
      const nextNum = count + 1;
      return `ORD-${year}-${String(nextNum).padStart(5, '0')}`;
    }
  }

  /**
   * Map an InvoiceItemType to its OrderItemType equivalent. Every invoice
   * item type has a corresponding order item type (the inverse — order →
   * invoice — has gaps, since OrderItemType.TEAM_ADDON / SHOP_PRODUCT do
   * not exist on the invoice side).
   */
  private mapItemTypeForOrder(invoiceType: InvoiceItemType): OrderItemType {
    switch (invoiceType) {
      case InvoiceItemType.MEMBERSHIP: return OrderItemType.MEMBERSHIP;
      case InvoiceItemType.EVENT_CLASS: return OrderItemType.EVENT_CLASS;
      case InvoiceItemType.PROCESSING_FEE: return OrderItemType.PROCESSING_FEE;
      case InvoiceItemType.DISCOUNT: return OrderItemType.DISCOUNT;
      case InvoiceItemType.TAX: return OrderItemType.TAX;
      case InvoiceItemType.OTHER: return OrderItemType.OTHER;
      default: return OrderItemType.OTHER;
    }
  }

  /**
   * Pick an OrderType for an invoice based on its line items. Membership
   * line items take precedence so revenue reports/breakdowns can attribute
   * to the right bucket; event_class lines map to event_registration; the
   * rest fall back to MANUAL.
   */
  private inferOrderTypeFromItems(items: { itemType: InvoiceItemType }[]): OrderType {
    if (items.some(i => i.itemType === InvoiceItemType.MEMBERSHIP)) return OrderType.MEMBERSHIP;
    if (items.some(i => i.itemType === InvoiceItemType.EVENT_CLASS)) return OrderType.EVENT_REGISTRATION;
    return OrderType.MANUAL;
  }

  /**
   * Calculate invoice totals from items
   */
  private calculateTotals(items: { unitPrice: string; quantity: number }[]): {
    subtotal: string;
    total: string;
  } {
    const subtotal = items.reduce((sum, item) => {
      return sum + parseFloat(item.unitPrice) * item.quantity;
    }, 0);

    return {
      subtotal: subtotal.toFixed(2),
      total: subtotal.toFixed(2), // Tax handled separately
    };
  }

  /**
   * Find invoice by ID with all relations
   */
  async findById(id: string): Promise<Invoice> {
    const em = this.em.fork();
    const invoice = await em.findOne(
      Invoice,
      { id },
      { populate: ['user', 'items'] },
    );

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  /**
   * Find invoice by invoice number
   */
  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    const em = this.em.fork();
    return em.findOne(
      Invoice,
      { invoiceNumber },
      { populate: ['user', 'items'] },
    );
  }

  /**
   * Find invoice by billing order ID
   */
  async findByOrderId(orderId: string): Promise<Invoice | null> {
    const em = this.em.fork();
    return em.findOne(Invoice, { order: orderId }, { populate: ['items'] });
  }

  /**
   * Find invoices by user with pagination
   */
  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Invoice[]; total: number }> {
    const em = this.em.fork();
    const offset = (page - 1) * limit;

    const [invoices, total] = await em.findAndCount(
      Invoice,
      { user: userId },
      {
        populate: ['items'],
        limit,
        offset,
        orderBy: { createdAt: 'DESC' },
      },
    );

    return { data: invoices, total };
  }

  /**
   * Find all invoices with filters and pagination
   */
  async findAll(query: InvoiceListQuery): Promise<{
    data: Invoice[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const em = this.em.fork();
    const { page = 1, limit = 20, status, userId, startDate, endDate, search, overdue } = query;
    const offset = (page - 1) * limit;

    // Same approach as OrdersService.findAll: build the search filter as
    // raw SQL so the admin can match across invoice number, customer,
    // MECA ID, items, total, due date, and Stripe IDs in one query, then
    // hydrate the full entities through MikroORM's populate path.
    const conn = em.getConnection();
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) { conditions.push(`i.status = ?`); params.push(status); }
    if (userId) { conditions.push(`i.user_id = ?`); params.push(userId); }
    if (startDate) { conditions.push(`i.created_at >= ?`); params.push(startDate); }
    if (endDate) { conditions.push(`i.created_at <= ?`); params.push(endDate); }
    if (overdue) {
      conditions.push(`i.status = ?`);
      params.push(InvoiceStatus.SENT);
      conditions.push(`i.due_date < ?`);
      params.push(new Date().toISOString());
    }

    if (search) {
      const term = `%${search}%`;
      // Same caveat as OrdersService: payments has no stripe_subscription_id;
      // that lives on memberships and is surfaced via the EXISTS subquery.
      conditions.push(`(
        i.invoice_number ILIKE ?
        OR i.status::text ILIKE ?
        OR i.total::text ILIKE ?
        OR i.due_date::text ILIKE ?
        OR p.first_name ILIKE ?
        OR p.last_name ILIKE ?
        OR p.full_name ILIKE ?
        OR p.email ILIKE ?
        OR p.meca_id::text ILIKE ?
        OR o.order_type::text ILIKE ?
        OR pay.transaction_id ILIKE ?
        OR pay.stripe_payment_intent_id ILIKE ?
        OR pay.stripe_customer_id ILIKE ?
        OR pay.paypal_order_id ILIKE ?
        OR EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.user_id = i.user_id AND m.stripe_subscription_id ILIKE ?
        )
        OR EXISTS (
          SELECT 1 FROM invoice_items ii
          WHERE ii.invoice_id = i.id AND ii.description ILIKE ?
        )
      )`);
      for (let n = 0; n < 16; n++) params.push(term);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const baseFrom = `FROM invoices i
      LEFT JOIN profiles p ON p.id = i.user_id
      LEFT JOIN orders o ON o.id = i.order_id
      LEFT JOIN payments pay ON pay.id = o.payment_id`;

    const countRows: Array<{ count: string }> = await conn.execute(
      `SELECT COUNT(DISTINCT i.id) AS count ${baseFrom} ${where}`,
      params,
    );
    const total = parseInt(countRows[0]?.count ?? '0', 10);

    const idRows: Array<{ id: string }> = await conn.execute(
      `SELECT DISTINCT i.id, i.created_at ${baseFrom} ${where}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const ids = idRows.map(r => r.id);

    if (ids.length === 0) {
      return {
        data: [],
        pagination: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) },
      };
    }

    const invoices = await em.find(Invoice, { id: { $in: ids } }, {
      populate: ['user', 'items'],
    });
    const byId = new Map<string, Invoice>(invoices.map(inv => [inv.id, inv as unknown as Invoice]));
    const ordered: Invoice[] = [];
    for (const id of ids) {
      const inv = byId.get(id);
      if (inv) ordered.push(inv);
    }

    return {
      data: ordered,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new invoice manually (admin) AND generate a paired Order so
   * the books stay symmetric. Without the paired Order, manual invoices
   * are invisible to revenue reports / dashboard stats / CSV exports —
   * those all read from the orders table as the source of truth.
   *
   * The flow:
   *   1. Generate invoice + order numbers
   *   2. Compute subtotal from items, total = subtotal + tax - discount
   *   3. Create the Order (status=PENDING, mirrored line items)
   *   4. Create the Invoice (status=DRAFT)
   *   5. Cross-link: Invoice.order = Order, Order.invoiceId = Invoice.id
   *   6. Persist both in one flush
   *
   * When the invoice is later paid, sentMarkPaid() flips the order to
   * COMPLETED. When cancelled/refunded, the order follows.
   */
  async create(data: CreateInvoiceDto): Promise<Invoice> {
    const em = this.em.fork();

    // Verify user exists if specified
    let user: Profile | undefined;
    if (data.userId) {
      const foundUser = await em.findOne(Profile, { id: data.userId });
      if (!foundUser) {
        throw new NotFoundException(`User with ID ${data.userId} not found`);
      }
      user = foundUser;
    }

    // Generate invoice + order numbers up-front so we can cross-reference
    const invoiceNumber = await this.generateInvoiceNumber(em);
    const orderNumber = await this.generateOrderNumber(em);

    // Money math: subtotal from items, total = subtotal + tax - discount.
    const { subtotal } = this.calculateTotals(data.items);
    const tax = (data.tax ?? '0.00');
    const discount = (data.discount ?? '0.00');
    const total = (parseFloat(subtotal) + parseFloat(tax) - parseFloat(discount)).toFixed(2);

    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date();
    const currency = data.currency || 'USD';
    const orderType = this.inferOrderTypeFromItems(data.items);

    // Build the Order (PENDING — the invoice is DRAFT; nothing is paid yet)
    const order = em.create(Order, {
      orderNumber,
      member: user,
      status: OrderStatus.PENDING,
      orderType,
      subtotal,
      tax,
      discount,
      couponCode: data.couponCode,
      total,
      currency,
      notes: data.notes,
      billingAddress: data.billingAddress,
    } as Partial<Order> as Order);

    // Mirror invoice items as order items so they show up in order detail too
    for (const itemData of data.items) {
      const itemTotal = (parseFloat(itemData.unitPrice) * itemData.quantity).toFixed(2);
      const oi = em.create(OrderItem, {
        order,
        description: itemData.description,
        quantity: itemData.quantity,
        unitPrice: itemData.unitPrice,
        total: itemTotal,
        itemType: this.mapItemTypeForOrder(itemData.itemType),
        referenceId: itemData.referenceId,
        metadata: itemData.metadata,
      });
      order.items.add(oi);
    }

    // Build the Invoice and link to the order
    const invoice = em.create(Invoice, {
      invoiceNumber,
      user,
      order,
      status: InvoiceStatus.DRAFT,
      subtotal,
      tax,
      discount,
      couponCode: data.couponCode,
      total,
      currency,
      dueDate,
      notes: data.notes,
      billingAddress: data.billingAddress,
      companyInfo: DEFAULT_COMPANY_INFO,
    });

    // Mirror line items into invoice_items
    for (const itemData of data.items) {
      const itemTotal = (parseFloat(itemData.unitPrice) * itemData.quantity).toFixed(2);
      const item = em.create(InvoiceItem, {
        invoice,
        description: itemData.description,
        quantity: itemData.quantity,
        unitPrice: itemData.unitPrice,
        total: itemTotal,
        itemType: itemData.itemType,
        referenceId: itemData.referenceId,
        metadata: itemData.metadata,
      });
      invoice.items.add(item);
    }

    await em.persistAndFlush([order, invoice]);

    // Back-fill the order.invoice_id pointer now that the invoice has its UUID
    order.invoiceId = invoice.id;
    await em.flush();

    this.logger.log(
      `Manual invoice ${invoiceNumber} created with paired order ${orderNumber} (total ${currency} ${total})`,
    );

    return invoice;
  }

  /**
   * Create invoice from an order (automated)
   * Supports both authenticated users and guest orders
   */
  async createFromOrder(orderId: string): Promise<Invoice> {
    const em = this.em.fork();

    // Get the order with items
    const order = await em.findOne(
      Order,
      { id: orderId },
      { populate: ['member', 'items'] },
    );

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Validate order is completed before creating a PAID invoice
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot create invoice for order ${orderId} with status ${order.status} - order must be COMPLETED`,
      );
    }

    // Check if invoice already exists for this order
    const existingInvoice = await em.findOne(Invoice, { order: orderId });
    if (existingInvoice) {
      return existingInvoice;
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(em);

    // Due date is today (invoices from orders are due immediately since they're already paid)
    const dueDate = new Date();

    // Build invoice data
    const invoiceData: Partial<Invoice> = {
      invoiceNumber,
      order,
      status: InvoiceStatus.PAID, // Since it's from a completed order
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      couponCode: order.couponCode || undefined,
      total: order.total,
      currency: order.currency,
      dueDate,
      paidAt: new Date(),
      notes: order.notes,
      billingAddress: order.billingAddress as BillingAddress,
      companyInfo: DEFAULT_COMPANY_INFO,
    };

    // Set user if available
    if (order.member) {
      invoiceData.user = order.member;
    }

    // Set guest email if available (for guest checkout)
    if ((order as any).guestEmail) {
      invoiceData.guestEmail = (order as any).guestEmail;
    }

    // Create invoice
    const invoice = em.create(Invoice, invoiceData as Invoice);

    // Copy order items to invoice items
    for (const orderItem of order.items.getItems()) {
      const item = em.create(InvoiceItem, {
        invoice,
        description: orderItem.description,
        quantity: orderItem.quantity,
        unitPrice: orderItem.unitPrice,
        total: orderItem.total,
        itemType: orderItem.itemType as unknown as InvoiceItemType,
        referenceId: orderItem.referenceId,
        metadata: orderItem.metadata,
      });
      invoice.items.add(item);
    }

    // Link invoice to order
    order.invoiceId = invoice.id;

    await em.persistAndFlush([invoice, order]);

    return invoice;
  }

  /**
   * Update invoice status. Also keeps the linked Order in sync so manual
   * invoices created via create() (which produce a paired pending order)
   * don't end up with mismatched states across the two tables.
   *
   * Status mapping:
   *   InvoiceStatus.PAID      → OrderStatus.COMPLETED
   *   InvoiceStatus.CANCELLED → OrderStatus.CANCELLED
   *   InvoiceStatus.REFUNDED  → OrderStatus.REFUNDED
   *   (DRAFT / SENT / OVERDUE leave the order at PENDING)
   */
  async updateStatus(id: string, data: UpdateInvoiceStatusDto): Promise<Invoice> {
    const em = this.em.fork();
    const invoice = await em.findOne(Invoice, { id }, { populate: ['items', 'order'] });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    const updates: Partial<Invoice> = {
      status: data.status,
      notes: data.notes || invoice.notes,
    };

    // Set sent date if transitioning to sent
    if (data.status === InvoiceStatus.SENT && !invoice.sentAt) {
      updates.sentAt = new Date();
    }

    // Set paid date if transitioning to paid
    if (data.status === InvoiceStatus.PAID && !invoice.paidAt) {
      updates.paidAt = new Date();
    }

    // Direct property assignment — Invoice has serializedName on
    // coupon_code, billing_address, company_info, last_reminder_sent_at,
    // amount_paid, etc. Avoid em.assign().
    for (const [key, value] of Object.entries(updates)) {
      (invoice as any)[key] = value;
    }

    // Mirror status onto the linked order so revenue stats stay accurate.
    if (invoice.order) {
      const linkedOrder = invoice.order as unknown as Order;
      const previousStatus = linkedOrder.status;
      let nextStatus: OrderStatus | null = null;
      if (data.status === InvoiceStatus.PAID) nextStatus = OrderStatus.COMPLETED;
      else if (data.status === InvoiceStatus.CANCELLED) nextStatus = OrderStatus.CANCELLED;
      else if (data.status === InvoiceStatus.REFUNDED) nextStatus = OrderStatus.REFUNDED;
      if (nextStatus && nextStatus !== previousStatus) {
        linkedOrder.status = nextStatus;
      }
    }

    await em.flush();

    // If this invoice belonged to a Mode-B "pay-to-activate" provision flow,
    // an admin created the membership in PENDING state and pinned the user
    // to /billing via profiles.restricted_to_billing. Now that the invoice is
    // paid, lift both restrictions in the same transaction so the user
    // regains full access on their next request.
    if (data.status === InvoiceStatus.PAID) {
      await this.clearProvisioningHoldIfApplicable(em, id);
    }

    return invoice;
  }

  /**
   * Apply a manual payment (cash / check / wire / money_order / comp / other)
   * to an invoice. Records a Payment row, marks the invoice PAID, marks the
   * paired Order COMPLETED, and runs the same provisioning-hold cleanup as
   * an automated payment would.
   *
   * Use cases: walk-in renewals paid by cash at an event, mailed-in checks,
   * wire transfers, comp memberships handed out by directors.
   */
  async applyManualPayment(invoiceId: string, data: ApplyManualPaymentDto): Promise<Invoice> {
    const em = this.em.fork();
    return em.transactional(async (tx) => {
      const invoice = await tx.findOne(
        Invoice,
        { id: invoiceId },
        { populate: ['items', 'order', 'user'] },
      );
      if (!invoice) {
        throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
      }
      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException('Invoice is already paid');
      }
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException('Cannot apply payment to a cancelled invoice');
      }
      if (invoice.status === InvoiceStatus.REFUNDED) {
        throw new BadRequestException('Cannot apply payment to a refunded invoice');
      }

      const owner = invoice.user as Profile | undefined;
      // Payment table requires a user — guest invoices can't record a Payment
      // row today. We still mark the invoice paid so reporting reflects it.
      const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
      const amount = data.amount ?? invoice.total;

      // Build the descriptive transaction reference: prefer explicit reference
      // (check #, wire confirmation), fall back to the method name.
      const transactionId = data.reference
        ? `${data.method.toUpperCase()}: ${data.reference}`
        : `${data.method.toUpperCase()} (invoice ${invoice.invoiceNumber})`;

      // Map our manual method onto the PaymentMethod enum used by the
      // payments table. Unknown variants fall back to OTHER so we never
      // hit a constraint violation.
      const methodMap: Record<string, PaymentMethod> = {
        cash: PaymentMethod.CASH,
        check: PaymentMethod.CHECK,
        wire: PaymentMethod.WIRE,
        money_order: PaymentMethod.MONEY_ORDER,
        comp: PaymentMethod.COMPLIMENTARY,
        other: PaymentMethod.OTHER,
      };
      const paymentMethod = methodMap[data.method] ?? PaymentMethod.OTHER;

      // Best-effort PaymentType inference: if any line item is a membership
      // we attribute as MEMBERSHIP; if any is an event class we attribute
      // as EVENT_REGISTRATION; otherwise OTHER. Keeps revenue-by-type
      // breakdowns aligned with what was actually paid for.
      const items = invoice.items.getItems();
      const hasMembership = items.some(i => String(i.itemType) === 'membership');
      const hasEvent = items.some(i => String(i.itemType) === 'event_class');
      const inferredPaymentType = hasMembership
        ? PaymentType.MEMBERSHIP
        : hasEvent
          ? PaymentType.EVENT_REGISTRATION
          : PaymentType.OTHER;

      let payment: Payment | undefined;
      if (owner) {
        payment = tx.create(Payment, {
          user: owner,
          paymentType: inferredPaymentType,
          paymentMethod,
          paymentStatus: PaymentStatus.PAID,
          amount: parseFloat(amount),
          currency: invoice.currency,
          transactionId,
          paidAt,
          description: data.notes
            ? `Manual payment for ${invoice.invoiceNumber}: ${data.notes}`
            : `Manual payment for ${invoice.invoiceNumber}`,
          paymentMetadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            method: data.method,
            reference: data.reference,
          },
        } as Partial<Payment> as Payment);
        tx.persist(payment);
      }

      // Money math for partial payments: bump amount_paid by the recorded
      // amount; only flip to PAID once the running total covers the invoice.
      const currentPaid = parseFloat(invoice.amountPaid || '0');
      const recorded = parseFloat(amount);
      const totalAmount = parseFloat(invoice.total);
      const newPaid = Math.min(totalAmount, currentPaid + recorded);
      const fullyPaid = newPaid >= totalAmount - 0.005;

      const updateNotes = data.notes
        ? `${invoice.notes ? invoice.notes + '\n' : ''}${data.notes}`
        : invoice.notes;

      invoice.status = fullyPaid ? InvoiceStatus.PAID : invoice.status;
      invoice.amountPaid = newPaid.toFixed(2);
      invoice.paidAt = fullyPaid ? paidAt : invoice.paidAt;
      invoice.notes = updateNotes;

      // Only flip the linked order to COMPLETED on full payment. Partial
      // payment leaves it PENDING so revenue reports don't credit revenue
      // until the books actually close.
      if (invoice.order && fullyPaid) {
        const linkedOrder = invoice.order as unknown as Order;
        linkedOrder.status = OrderStatus.COMPLETED;
        if (payment) linkedOrder.payment = payment;
      }

      await tx.flush();

      // Clear billing-restriction hold if this was a Mode-B provisioning invoice
      await this.clearProvisioningHoldIfApplicable(tx, invoice.id);

      this.logger.log(
        `Manual payment recorded on invoice ${invoice.invoiceNumber}: ${data.method}` +
        (data.reference ? ` (${data.reference})` : '') +
        ` for ${invoice.currency} ${amount}`,
      );

      return invoice;
    });
  }

  /**
   * Mode B (admin-provisioned, pay-to-activate) post-payment hook. Looks up
   * the invoice's user; if they have `restricted_to_billing = true`, clears
   * the flag and promotes any PENDING memberships to PAID. No-op if the
   * invoice didn't come from a provisioning flow.
   */
  private async clearProvisioningHoldIfApplicable(em: EntityManager, invoiceId: string): Promise<void> {
    try {
      const inv = await em.findOne(Invoice, { id: invoiceId }, { populate: ['user'] as any });
      const user = inv?.user as any as Profile | undefined;
      if (!user || !user.restricted_to_billing) return;

      const pending = await em.find(Membership, {
        user: user.id,
        paymentStatus: PaymentStatus.PENDING,
      });
      const invoiceTotal = Number(inv?.total ?? 0);
      for (const m of pending) {
        m.paymentStatus = PaymentStatus.PAID;
        if (invoiceTotal > 0 && (!m.amountPaid || Number(m.amountPaid) === 0)) {
          m.amountPaid = invoiceTotal;
        }
      }
      user.restricted_to_billing = false;
      await em.flush();

      this.logger.log(
        `Cleared restricted_to_billing for user ${user.id} after invoice ${inv?.invoiceNumber} paid; ` +
        `${pending.length} pending membership(s) activated.`,
      );
    } catch (err) {
      // Don't fail the payment-recording flow if the cleanup hits an issue —
      // the invoice update has already succeeded; admin can retry manually.
      this.logger.error(`Provisioning-hold cleanup failed for invoice ${invoiceId}:`, err);
    }
  }

  /**
   * Mark invoice as sent
   */
  async markAsSent(id: string): Promise<Invoice> {
    return this.updateStatus(id, { status: InvoiceStatus.SENT });
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(id: string): Promise<Invoice> {
    return this.updateStatus(id, { status: InvoiceStatus.PAID });
  }

  /**
   * Cancel an invoice. Also flips the paired Order to CANCELLED so the
   * orders table doesn't keep a stale PENDING row pointing at a cancelled
   * invoice.
   */
  async cancel(id: string, reason?: string): Promise<Invoice> {
    const em = this.em.fork();
    const invoice = await em.findOne(Invoice, { id }, { populate: ['items', 'order'] });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException(
        'Cannot cancel a paid invoice. Use refund instead.',
      );
    }

    invoice.status = InvoiceStatus.CANCELLED;
    invoice.notes = reason || invoice.notes;

    if (invoice.order) {
      const linkedOrder = invoice.order as unknown as Order;
      if (linkedOrder.status !== OrderStatus.CANCELLED && linkedOrder.status !== OrderStatus.REFUNDED) {
        linkedOrder.status = OrderStatus.CANCELLED;
      }
    }

    await em.flush();

    return invoice;
  }

  /**
   * Mark invoice as refunded. Also flips the paired Order to REFUNDED.
   */
  async markRefunded(id: string, reason: string): Promise<Invoice> {
    const em = this.em.fork();
    const invoice = await em.findOne(Invoice, { id }, { populate: ['items', 'order'] });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    invoice.status = InvoiceStatus.REFUNDED;
    invoice.notes = reason;

    if (invoice.order) {
      (invoice.order as unknown as Order).status = OrderStatus.REFUNDED;
    }

    await em.flush();

    return invoice;
  }

  /**
   * Refund a paid invoice AND clean up the records it created.
   *
   * Steps (single transaction):
   *  1. Issue Stripe refund against the linked Payment's paymentIntent
   *  2. Mark Payment as REFUNDED
   *  3. Mark linked Order as REFUNDED
   *  4. Delete Membership(s) created from this payment and clear the owner
   *     profile's cached meca_id so the email can purchase again
   *  5. Mark Invoice as REFUNDED
   */
  async refundAndCleanup(
    id: string,
    reason: string,
  ): Promise<{
    invoice: Invoice;
    stripeRefundId?: string;
    deletedMembershipIds: string[];
    deletedTeamIds: string[];
  }> {
    const em = this.em.fork();

    return em.transactional(async (tx) => {
      const invoice = await tx.findOne(
        Invoice,
        { id },
        { populate: ['items', 'order', 'order.payment', 'user'] },
      );

      if (!invoice) {
        throw new NotFoundException(`Invoice with ID ${id} not found`);
      }

      if (invoice.status !== InvoiceStatus.PAID) {
        throw new BadRequestException(
          `Only paid invoices can be refunded. Current status: ${invoice.status}`,
        );
      }

      // Locate the payment (via order.payment); fall back to matching by
      // membership.transactionId when the order link is missing.
      let payment: Payment | null = invoice.order?.payment
        ? await tx.findOne(
            Payment,
            { id: invoice.order.payment.id },
            { populate: ['membership'] },
          )
        : null;

      // Issue Stripe refund if we have a payment intent
      let stripeRefundId: string | undefined;
      if (payment?.stripePaymentIntentId) {
        const refund = await this.stripeService.createRefund(
          payment.stripePaymentIntentId,
          reason,
        );
        stripeRefundId = refund.id;
        this.logger.log(
          `Stripe refund ${refund.id} issued for payment ${payment.id} (invoice ${invoice.invoiceNumber})`,
        );
      } else {
        this.logger.warn(
          `No Stripe payment intent found for invoice ${invoice.invoiceNumber}; skipping Stripe refund`,
        );
      }

      // Find memberships tied to this payment. Prefer payment.membership;
      // also sweep any memberships whose transactionId matches (covers
      // multi-membership checkouts where only one is linked on Payment).
      const membershipsToDelete: Membership[] = [];
      if (payment) {
        if (payment.membership) {
          const m = await tx.findOne(Membership, { id: payment.membership.id });
          if (m) membershipsToDelete.push(m);
        }

        const siblingTxId = payment.stripePaymentIntentId || payment.transactionId;
        if (siblingTxId) {
          const siblings = await tx.find(Membership, {
            transactionId: siblingTxId,
          });
          for (const s of siblings) {
            if (!membershipsToDelete.find((m) => m.id === s.id)) {
              membershipsToDelete.push(s);
            }
          }
        }
      }

      // Clear profile.meca_id cache for any owners whose cached value matches
      // a membership we're about to delete, so the next purchase doesn't see
      // stale data.
      for (const membership of membershipsToDelete) {
        if (membership.mecaId && membership.user) {
          await tx.getConnection().execute(
            `UPDATE profiles SET meca_id = NULL, meca_id_invalidated_at = NULL, updated_at = NOW() WHERE id = ? AND meca_id = ?`,
            [
              (membership.user as any).id ?? membership.user,
              String(membership.mecaId),
            ],
          );
        }
      }

      // Delete any teams created for these memberships (hasTeamAddon / includesTeam).
      // teams.membership_id is ON DELETE SET NULL, so without this step teams would
      // be orphaned in team lists. team_members has no FK to teams, so wipe members first.
      const deletedTeamIds: string[] = [];
      for (const membership of membershipsToDelete) {
        const teams = await tx.find(Team, { membership: membership.id });
        for (const team of teams) {
          await tx.nativeDelete(TeamMember, { teamId: team.id });
          tx.remove(team);
          deletedTeamIds.push(team.id);
        }
      }

      const deletedMembershipIds = membershipsToDelete.map((m) => m.id);
      for (const m of membershipsToDelete) {
        tx.remove(m);
      }

      // Update payment
      if (payment) {
        payment.paymentStatus = PaymentStatus.REFUNDED;
        payment.refundedAt = new Date();
        payment.refundReason = reason;
      }

      // Update order
      if (invoice.order) {
        invoice.order.status = OrderStatus.REFUNDED;
        invoice.order.notes = reason;
      }

      // Update invoice
      invoice.status = InvoiceStatus.REFUNDED;
      invoice.notes = reason;

      await tx.flush();

      this.logger.log(
        `Refunded invoice ${invoice.invoiceNumber}: deleted ${deletedMembershipIds.length} membership(s), ${deletedTeamIds.length} team(s), Stripe refund ${stripeRefundId ?? 'n/a'}`,
      );

      return { invoice, stripeRefundId, deletedMembershipIds, deletedTeamIds };
    });
  }

  /**
   * Apply a credit memo against an invoice — writes off `amount` of the
   * remaining balance without a Payment row (no money actually received).
   * Use cases: courtesy credit, dispute settlement, write-off of bad debt.
   *
   * Credit memos move money out of accounts receivable and into a
   * write-off bucket conceptually — they're still tracked via amount_paid
   * and an audit-log entry rather than a real Payment.
   */
  async applyCreditMemo(invoiceId: string, amount: string, reason: string): Promise<Invoice> {
    const em = this.em.fork();
    return em.transactional(async (tx) => {
      const invoice = await tx.findOne(Invoice, { id: invoiceId }, { populate: ['order'] });
      if (!invoice) throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);

      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException('Cannot apply credit memo to a cancelled invoice');
      }
      if (invoice.status === InvoiceStatus.REFUNDED) {
        throw new BadRequestException('Cannot apply credit memo to a refunded invoice');
      }

      const credit = parseFloat(amount);
      if (!isFinite(credit) || credit <= 0) {
        throw new BadRequestException('Credit memo amount must be positive');
      }
      const currentPaid = parseFloat(invoice.amountPaid || '0');
      const totalAmount = parseFloat(invoice.total);
      const remaining = Math.max(0, totalAmount - currentPaid);
      if (credit > remaining + 0.005) {
        throw new BadRequestException(
          `Credit memo (${credit.toFixed(2)}) exceeds remaining balance (${remaining.toFixed(2)})`,
        );
      }

      const newPaid = Math.min(totalAmount, currentPaid + credit);
      const fullyPaid = newPaid >= totalAmount - 0.005;
      const noteLine = `Credit memo $${credit.toFixed(2)} applied: ${reason}`;

      invoice.amountPaid = newPaid.toFixed(2);
      invoice.status = fullyPaid ? InvoiceStatus.PAID : invoice.status;
      invoice.paidAt = fullyPaid ? new Date() : invoice.paidAt;
      invoice.notes = invoice.notes ? `${invoice.notes}\n${noteLine}` : noteLine;

      if (invoice.order && fullyPaid) {
        (invoice.order as unknown as Order).status = OrderStatus.COMPLETED;
      }

      await tx.flush();
      this.logger.log(
        `Credit memo $${credit.toFixed(2)} applied to invoice ${invoice.invoiceNumber}: ${reason}`,
      );
      return invoice;
    });
  }

  /**
   * Send reminder emails for unpaid invoices.
   *
   * Cadence:
   *   - SENT/OVERDUE due-soon: 3 days before due date
   *   - OVERDUE: 1, 7, 14, 30 days past due date
   *
   * De-duplication: skip an invoice if `last_reminder_sent_at` is within
   * the last 23 hours (so a daily 8am cron is safe even if it ran late
   * the previous day).
   *
   * Returns the count of reminders sent.
   */
  async sendInvoiceReminders(): Promise<{ sent: number; skipped: number }> {
    const em = this.em.fork();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 23 * 60 * 60 * 1000);

    // Pull all SENT or OVERDUE invoices with a due date. Populate items so
    // the due-soon email branch can include the line-item table.
    const candidates = await em.find(Invoice, {
      status: { $in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
      dueDate: { $ne: null as any },
    }, { populate: ['user', 'items'] });

    let sent = 0;
    let skipped = 0;

    for (const invoice of candidates) {
      // Skip if reminded in the last 23 hours
      if (invoice.lastReminderSentAt && invoice.lastReminderSentAt > yesterday) {
        skipped++;
        continue;
      }
      const recipientEmail = invoice.user?.email || invoice.guestEmail;
      if (!recipientEmail) {
        skipped++;
        continue;
      }

      const due = invoice.dueDate ? new Date(invoice.dueDate) : null;
      if (!due) { skipped++; continue; }

      // Whole-day delta: positive means due in N days, negative means N days overdue
      const msPerDay = 1000 * 60 * 60 * 24;
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
      const dayDelta = Math.round((startOfDue - startOfToday) / msPerDay);

      // Decide whether today is a reminder trigger day.
      // dueDate +3 days BEFORE due (dayDelta=3); on day-of we don't remind, the overdue cron
      // will handle it. Past-due triggers: 1, 7, 14, 30 days overdue (dayDelta=-1,-7,-14,-30).
      const reminderDays = [3, -1, -7, -14, -30];
      if (!reminderDays.includes(dayDelta)) { skipped++; continue; }

      const isOverdue = dayDelta < 0;
      const daysOverdue = Math.abs(dayDelta);
      const paymentUrl = this.generatePaymentUrl(invoice.id);

      try {
        if (isOverdue) {
          await this.emailService.sendInvoiceOverdueEmail({
            to: recipientEmail,
            firstName: invoice.user?.first_name || undefined,
            invoiceNumber: invoice.invoiceNumber,
            amountDue: parseFloat(invoice.total),
            daysOverdue,
            dueDate: due,
            paymentUrl,
          });
        } else {
          // Due-soon reminder reuses the standard invoice email — same
          // structure as the original send, just adds context in notes.
          const items = invoice.items.getItems().map(it => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            total: it.total,
          }));
          await this.emailService.sendInvoiceEmail({
            to: recipientEmail,
            firstName: invoice.user?.first_name || undefined,
            invoiceNumber: invoice.invoiceNumber,
            invoiceTotal: invoice.total,
            dueDate: due,
            paymentUrl,
            items,
          });
        }
        invoice.lastReminderSentAt = new Date();
        sent++;
      } catch (err) {
        this.logger.error(`Failed to send reminder for invoice ${invoice.invoiceNumber}: ${err}`);
      }
    }

    if (sent > 0) await em.flush();
    this.logger.log(`Invoice reminders sent: ${sent}, skipped: ${skipped}`);
    return { sent, skipped };
  }

  /**
   * Bulk-update operations called from the admin invoice list. Each result
   * row carries the per-invoice outcome so the UI can flag partial failures
   * without bringing the whole batch down.
   */
  async bulkMarkPaid(ids: string[]): Promise<{ id: string; ok: boolean; error?: string }[]> {
    const out: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        await this.markAsPaid(id);
        out.push({ id, ok: true });
      } catch (err: any) {
        out.push({ id, ok: false, error: err?.message || 'failed' });
      }
    }
    return out;
  }

  async bulkCancel(ids: string[], reason?: string): Promise<{ id: string; ok: boolean; error?: string }[]> {
    const out: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        await this.cancel(id, reason);
        out.push({ id, ok: true });
      } catch (err: any) {
        out.push({ id, ok: false, error: err?.message || 'failed' });
      }
    }
    return out;
  }

  async bulkResend(ids: string[]): Promise<{ id: string; ok: boolean; error?: string }[]> {
    const out: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        const result = await this.resendInvoice(id);
        out.push({ id, ok: result.success, error: result.error });
      } catch (err: any) {
        out.push({ id, ok: false, error: err?.message || 'failed' });
      }
    }
    return out;
  }

  /**
   * Mark overdue invoices (batch operation)
   */
  async markOverdueInvoices(): Promise<number> {
    const em = this.em.fork();
    const now = new Date();

    const overdueInvoices = await em.find(Invoice, {
      status: InvoiceStatus.SENT,
      dueDate: { $lt: now },
    }, {
      populate: ['user'],
    });

    for (const invoice of overdueInvoices) {
      invoice.status = InvoiceStatus.OVERDUE;
    }

    await em.flush();

    // Send overdue notification to each affected user (one-shot per invoice — only fires on transition).
    for (const invoice of overdueInvoices) {
      const recipientEmail = invoice.user?.email || invoice.guestEmail || undefined;
      if (!recipientEmail) {
        this.logger.warn(`Invoice ${invoice.invoiceNumber} marked overdue but has no recipient email`);
        continue;
      }

      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : now;
      const daysOverdue = Math.max(1, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      const paymentUrl = this.generatePaymentUrl(invoice.id);

      try {
        await this.emailService.sendInvoiceOverdueEmail({
          to: recipientEmail,
          firstName: invoice.user?.first_name || undefined,
          invoiceNumber: invoice.invoiceNumber,
          amountDue: parseFloat(invoice.total),
          daysOverdue,
          dueDate,
          paymentUrl,
        });
      } catch (err) {
        this.logger.error(`Failed to send overdue email for invoice ${invoice.invoiceNumber}: ${err}`);
      }

      if (invoice.user?.id) {
        await this.notificationsService.createForUser({
          userId: invoice.user.id,
          title: `Invoice ${invoice.invoiceNumber} is past due`,
          message: `Your invoice for $${parseFloat(invoice.total).toFixed(2)} is ${daysOverdue} day(s) overdue. Pay now to avoid cancellation.`,
          type: 'alert',
          link: `/pay/invoice/${invoice.id}`,
        });
      }
    }

    return overdueInvoices.length;
  }

  /**
   * Fix invoices with null due dates by setting them to their creation date
   */
  async fixNullDueDates(): Promise<{ fixed: number; invoiceNumbers: string[] }> {
    const em = this.em.fork();

    // Find all invoices with null due dates
    const invoicesWithNullDueDate = await em.find(Invoice, {
      dueDate: null,
    });

    const fixedInvoiceNumbers: string[] = [];

    for (const invoice of invoicesWithNullDueDate) {
      // Set due date to created date, or today if created date is missing
      const dueDate = invoice.createdAt || new Date();
      invoice.dueDate = dueDate;
      fixedInvoiceNumbers.push(invoice.invoiceNumber);
    }

    await em.flush();

    return {
      fixed: invoicesWithNullDueDate.length,
      invoiceNumbers: fixedInvoiceNumbers,
    };
  }

  /**
   * Get invoice counts by status
   */
  async getStatusCounts(opts?: { startDate?: string; endDate?: string }): Promise<Record<InvoiceStatus, number>> {
    const em = this.em.fork();

    const counts: Record<InvoiceStatus, number> = {
      [InvoiceStatus.DRAFT]: 0,
      [InvoiceStatus.SENT]: 0,
      [InvoiceStatus.PAID]: 0,
      [InvoiceStatus.OVERDUE]: 0,
      [InvoiceStatus.CANCELLED]: 0,
      [InvoiceStatus.REFUNDED]: 0,
      [InvoiceStatus.FAILED]: 0,
    };

    const dateFilter: any = {};
    if (opts?.startDate) dateFilter.$gte = opts.startDate;
    if (opts?.endDate) dateFilter.$lte = opts.endDate;
    const hasDate = Object.keys(dateFilter).length > 0;

    for (const status of Object.values(InvoiceStatus)) {
      const where: any = { status };
      if (hasDate) where.createdAt = dateFilter;
      counts[status] = await em.count(Invoice, where);
    }

    return counts;
  }

  /**
   * Get recent invoices (for dashboard)
   */
  async getRecentInvoices(limit: number = 5): Promise<Invoice[]> {
    const em = this.em.fork();

    return em.find(
      Invoice,
      {},
      {
        populate: ['user', 'items'],
        limit,
        orderBy: { createdAt: 'DESC' },
      },
    );
  }

  /**
   * Get unpaid invoices total
   */
  async getUnpaidTotal(): Promise<{ count: number; total: string }> {
    const em = this.em.fork();

    const unpaidInvoices = await em.find(Invoice, {
      status: { $in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
    });

    const total = unpaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);

    return {
      count: unpaidInvoices.length,
      total: total.toFixed(2),
    };
  }

  /**
   * Get invoices paid since a date (for reconciliation)
   */
  async findPaidSince(date: Date): Promise<Invoice[]> {
    const em = this.em.fork();

    return em.find(
      Invoice,
      {
        status: InvoiceStatus.PAID,
        paidAt: { $gte: date },
      },
      {
        populate: ['user', 'items'],
        orderBy: { paidAt: 'ASC' },
      },
    );
  }

  /**
   * Generate payment URL for an invoice
   */
  generatePaymentUrl(invoiceId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${baseUrl}/pay/invoice/${invoiceId}`;
  }

  /**
   * Send invoice email to user and update status
   */
  async sendInvoice(invoiceId: string): Promise<{
    success: boolean;
    invoice: Invoice;
    error?: string;
  }> {
    const em = this.em.fork();

    // Get invoice with user and items
    const invoice = await em.findOne(
      Invoice,
      { id: invoiceId },
      { populate: ['user', 'items'] },
    );

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    // Check if invoice can be sent
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot send a paid invoice');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cannot send a cancelled invoice');
    }

    if (invoice.status === InvoiceStatus.REFUNDED) {
      throw new BadRequestException('Cannot send a refunded invoice');
    }

    // Get email address (prefer user email, fallback to guest email)
    const user = invoice.user;
    const email = user?.email || (invoice as any).guestEmail;
    if (!email) {
      throw new BadRequestException('Invoice has no associated email address');
    }

    // Generate payment URL
    const paymentUrl = this.generatePaymentUrl(invoice.id);

    // Prepare items for email
    const items = invoice.items.getItems().map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    }));

    // Use due date or default to 30 days from now
    const dueDate = invoice.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Send email
    const emailResult = await this.emailService.sendInvoiceEmail({
      to: email,
      firstName: user?.first_name || undefined,
      invoiceNumber: invoice.invoiceNumber,
      invoiceTotal: invoice.total,
      dueDate,
      paymentUrl,
      items,
    });

    if (!emailResult.success) {
      this.logger.error(`Failed to send invoice email: ${emailResult.error}`);
      return {
        success: false,
        invoice,
        error: emailResult.error,
      };
    }

    // Update invoice status to SENT
    invoice.status = InvoiceStatus.SENT;
    invoice.sentAt = new Date();

    await em.flush();

    this.logger.log(`Invoice ${invoice.invoiceNumber} sent to ${email}`);

    if (user?.id) {
      await this.notificationsService.createForUser({
        userId: user.id,
        title: `Invoice ${invoice.invoiceNumber} ready`,
        message: `An invoice for $${parseFloat(invoice.total).toFixed(2)} is ready for payment.`,
        type: 'info',
        link: `/pay/invoice/${invoice.id}`,
      });
    }

    return {
      success: true,
      invoice,
    };
  }

  /**
   * Resend invoice email (for already sent invoices)
   */
  async resendInvoice(invoiceId: string): Promise<{
    success: boolean;
    invoice: Invoice;
    error?: string;
  }> {
    const em = this.em.fork();

    const invoice = await em.findOne(
      Invoice,
      { id: invoiceId },
      { populate: ['user', 'items'] },
    );

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    // Can only resend if status is SENT or OVERDUE
    if (![InvoiceStatus.SENT, InvoiceStatus.OVERDUE].includes(invoice.status)) {
      throw new BadRequestException(
        `Cannot resend invoice with status ${invoice.status}`,
      );
    }

    // Get email address (prefer user email, fallback to guest email)
    const user = invoice.user;
    const email = user?.email || (invoice as any).guestEmail;
    if (!email) {
      throw new BadRequestException('Invoice has no associated email address');
    }

    const paymentUrl = this.generatePaymentUrl(invoice.id);

    const items = invoice.items.getItems().map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    }));

    // Use due date or default to 30 days from now
    const dueDate = invoice.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const emailResult = await this.emailService.sendInvoiceEmail({
      to: email,
      firstName: user?.first_name || undefined,
      invoiceNumber: invoice.invoiceNumber,
      invoiceTotal: invoice.total,
      dueDate,
      paymentUrl,
      items,
    });

    if (!emailResult.success) {
      this.logger.error(`Failed to resend invoice email: ${emailResult.error}`);
      return {
        success: false,
        invoice,
        error: emailResult.error,
      };
    }

    this.logger.log(`Invoice ${invoice.invoiceNumber} resent to ${email}`);

    if (user?.id) {
      await this.notificationsService.createForUser({
        userId: user.id,
        title: `Invoice ${invoice.invoiceNumber} reminder`,
        message: `Reminder: invoice for $${parseFloat(invoice.total).toFixed(2)} is awaiting payment.`,
        type: 'info',
        link: `/pay/invoice/${invoice.id}`,
      });
    }

    return {
      success: true,
      invoice,
    };
  }
}
