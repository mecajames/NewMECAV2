import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/core';
import {
  OrderStatus,
  OrderType,
  OrderItemType,
  CreateOrderDto,
  CreateOrderFromPaymentDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  RefundOrderDto,
  OrderListQuery,
  BillingAddress,
} from '@newmeca/shared';
import { Order } from './orders.entity';
import { OrderItem } from './order-items.entity';
import { Profile } from '../profiles/profiles.entity';
import { Payment } from '../payments/payments.entity';
import { EventRegistration } from '../event-registrations/event-registrations.entity';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Generate a unique order number
   * Uses database sequence if available, falls back to timestamp-based generation
   */
  private async generateOrderNumber(em: EntityManager): Promise<string> {
    const year = new Date().getFullYear();

    try {
      // Try using the database function first
      const connection = em.getConnection();
      const result = await connection.execute('SELECT generate_order_number() as order_number');
      return result[0].order_number;
    } catch {
      // Fallback: count existing orders for this year and increment
      const count = await em.count(Order, {
        orderNumber: { $like: `ORD-${year}-%` },
      });
      const nextNum = count + 1;
      return `ORD-${year}-${String(nextNum).padStart(5, '0')}`;
    }
  }

  /**
   * Calculate order totals from items
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
      total: subtotal.toFixed(2), // Tax and discount handled separately
    };
  }

  /**
   * Find order by ID with all relations
   */
  async findById(id: string): Promise<Order> {
    const em = this.em.fork();
    const order = await em.findOne(
      Order,
      { id },
      { populate: ['member', 'items', 'payment'] },
    );

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  /**
   * Find order by order number
   */
  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const em = this.em.fork();
    return em.findOne(
      Order,
      { orderNumber },
      { populate: ['member', 'items', 'payment'] },
    );
  }

  /**
   * Find orders by user with pagination
   * Note: Uses 'member' relation which maps to member_id column in database
   */
  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Order[]; total: number }> {
    const em = this.em.fork();
    const offset = (page - 1) * limit;

    const [orders, total] = await em.findAndCount(
      Order,
      { member: userId },
      {
        populate: ['items'],
        limit,
        offset,
        orderBy: { createdAt: 'DESC' },
      },
    );

    return { data: orders, total };
  }

  /**
   * Find all orders with filters and pagination
   */
  async findAll(query: OrderListQuery): Promise<{
    data: Order[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }> {
    const em = this.em.fork();
    const { page = 1, limit = 20, status, orderType, userId, startDate, endDate, search } = query;
    const offset = (page - 1) * limit;

    // The search box on the admin orders page is intentionally broad — admins
    // expect typing any substring (order number, customer name, email, MECA
    // ID, item description, dollar amount, Stripe ID, etc.) to surface the
    // matching row. MikroORM's nested `$or` over relations + decimal/integer
    // casts is awkward, so we run the filter as raw SQL to find matching IDs,
    // then hydrate full entities through MikroORM's normal populate path so
    // the response shape is identical to before.
    const conn = em.getConnection();
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) { conditions.push(`o.status = ?`); params.push(status); }
    if (orderType) {
      // The Orders admin filter exposes "New Membership" and "Membership
      // Renewal" as virtual order types. They both map to actual
      // orderType=membership rows, distinguished by whether the buyer had a
      // prior completed membership (same logic that drives is_renewal).
      if (orderType === 'new_membership' as any) {
        conditions.push(`o.order_type = 'membership'`);
        conditions.push(`NOT EXISTS (
          SELECT 1 FROM orders prior
          WHERE prior.member_id = o.member_id
            AND prior.order_type = 'membership'
            AND prior.status = 'completed'
            AND prior.created_at < o.created_at
        )`);
      } else if (orderType === 'membership_renewal' as any) {
        conditions.push(`o.order_type = 'membership'`);
        conditions.push(`EXISTS (
          SELECT 1 FROM orders prior
          WHERE prior.member_id = o.member_id
            AND prior.order_type = 'membership'
            AND prior.status = 'completed'
            AND prior.created_at < o.created_at
        )`);
      } else {
        conditions.push(`o.order_type = ?`);
        params.push(orderType);
      }
    }
    if (userId) { conditions.push(`o.member_id = ?`); params.push(userId); }
    if (startDate) { conditions.push(`o.created_at >= ?`); params.push(startDate); }
    if (endDate) { conditions.push(`o.created_at <= ?`); params.push(endDate); }

    if (search) {
      const term = `%${search}%`;
      // Keep the substitution count on params.push in sync with the number
      // of `?` placeholders in the clause below if you add or remove fields.
      // Note: payments has no stripe_subscription_id column — that lives on
      // memberships. We surface stripe_payment_intent_id / customer_id /
      // transaction_id / paypal IDs and join to memberships for subs.
      conditions.push(`(
        o.order_number ILIKE ?
        OR o.order_type::text ILIKE ?
        OR o.total::text ILIKE ?
        OR p.first_name ILIKE ?
        OR p.last_name ILIKE ?
        OR p.full_name ILIKE ?
        OR p.email ILIKE ?
        OR p.meca_id::text ILIKE ?
        OR pay.transaction_id ILIKE ?
        OR pay.stripe_payment_intent_id ILIKE ?
        OR pay.stripe_customer_id ILIKE ?
        OR pay.paypal_order_id ILIKE ?
        OR EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.user_id = o.member_id AND m.stripe_subscription_id ILIKE ?
        )
        OR EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = o.id AND oi.description ILIKE ?
        )
      )`);
      for (let i = 0; i < 14; i++) params.push(term);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const baseFrom = `FROM orders o
      LEFT JOIN profiles p ON p.id = o.member_id
      LEFT JOIN payments pay ON pay.id = o.payment_id`;

    const countRows: Array<{ count: string }> = await conn.execute(
      `SELECT COUNT(DISTINCT o.id) AS count ${baseFrom} ${where}`,
      params,
    );
    const total = parseInt(countRows[0]?.count ?? '0', 10);

    const idRows: Array<{ id: string }> = await conn.execute(
      `SELECT DISTINCT o.id, o.created_at ${baseFrom} ${where}
       ORDER BY o.created_at DESC
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

    // Hydrate with full populate; preserve original sort order from the SQL.
    const orders = await em.find(Order, { id: { $in: ids } }, {
      populate: ['member', 'items'],
    });
    const byId = new Map<string, Order>(orders.map(o => [o.id, o as unknown as Order]));
    const ordered: Order[] = [];
    for (const id of ids) {
      const o = byId.get(id);
      if (o) ordered.push(o);
    }

    // Mark which membership orders are renewals (the owner had a prior
    // completed membership order). Done as one batched lookup so the page
    // doesn't pay an N+1 cost.
    await this.attachRenewalFlags(em, ordered);

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
   * Create a new order manually (admin)
   */
  async create(data: CreateOrderDto): Promise<Order> {
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

    // Generate order number
    const orderNumber = await this.generateOrderNumber(em);

    // Calculate totals
    const { subtotal, total } = this.calculateTotals(data.items);

    // Create order (member is required for RLS policies)
    if (!user) {
      throw new BadRequestException('User is required to create an order');
    }

    const order = em.create(Order, {
      orderNumber,
      member: user,
      status: OrderStatus.PENDING,
      orderType: data.orderType,
      subtotal,
      tax: '0.00',
      discount: '0.00',
      total,
      currency: data.currency || 'USD',
      notes: data.notes,
      billingAddress: data.billingAddress,
    });

    // Create order items
    for (const itemData of data.items) {
      const itemTotal = (parseFloat(itemData.unitPrice) * itemData.quantity).toFixed(2);
      const item = em.create(OrderItem, {
        order,
        description: itemData.description,
        quantity: itemData.quantity,
        unitPrice: itemData.unitPrice,
        total: itemTotal,
        itemType: itemData.itemType,
        referenceId: itemData.referenceId,
        metadata: itemData.metadata,
      });
      order.items.add(item);
    }

    await em.persistAndFlush(order);

    return order;
  }

  /**
   * Create order from a successful payment (automated)
   * Supports both authenticated users and guest checkout
   */
  async createFromPayment(data: CreateOrderFromPaymentDto & {
    guestEmail?: string;
    guestName?: string;
    tax?: string;
    shipping?: string;
    discount?: string;
    couponCode?: string;
    shopOrderReference?: { shopOrderId: string; shopOrderNumber: string };
  }): Promise<Order> {
    const em = this.em.fork();

    // Look up payment if paymentId is provided
    let payment: Payment | undefined;
    if (data.paymentId) {
      payment = await em.findOne(Payment, { id: data.paymentId }) || undefined;
    }

    // Verify user exists if specified
    let user: Profile | undefined;
    if (data.userId) {
      const foundUser = await em.findOne(Profile, { id: data.userId });
      user = foundUser || undefined;
    }

    // For guest orders, we need either a user or guest email
    if (!user && !data.guestEmail) {
      throw new BadRequestException('Either userId or guestEmail is required to create an order');
    }

    // Idempotency: if shopOrderReference provided, check for existing order with same shop order
    if (data.shopOrderReference?.shopOrderId) {
      const existing = await em.getConnection().execute(
        `SELECT id FROM orders WHERE shop_order_reference->>'shopOrderId' = $1`,
        [data.shopOrderReference.shopOrderId],
      );
      if (existing.length > 0) {
        const existingOrder = await em.findOne(Order, { id: existing[0].id });
        if (existingOrder) return existingOrder;
      }
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber(em);

    // Calculate totals
    const { subtotal } = this.calculateTotals(data.items);
    const tax = data.tax || '0.00';
    const shipping = data.shipping || '0.00';
    const discount = data.discount || '0.00';
    // Include shipping in total if provided (Order entity doesn't have a shipping column,
    // so shipping is embedded in total and noted in the notes field)
    const total = (parseFloat(subtotal) - parseFloat(discount) + parseFloat(tax) + parseFloat(shipping)).toFixed(2);

    // Create order - for guest orders, member can be null but we set guestEmail
    const orderData: Partial<Order> = {
      orderNumber,
      status: OrderStatus.COMPLETED,
      orderType: data.orderType,
      subtotal,
      tax,
      discount,
      couponCode: data.couponCode || undefined,
      total,
      currency: 'USD',
      notes: data.notes,
      billingAddress: data.billingAddress,
      payment,
    };

    // Set member if we have one
    if (user) {
      orderData.member = user;
    }

    // Set guest fields if provided
    if (data.guestEmail) {
      orderData.guestEmail = data.guestEmail;
    }
    if (data.guestName) {
      orderData.guestName = data.guestName;
    }

    // Set shop order reference if provided
    if (data.shopOrderReference) {
      orderData.shopOrderReference = data.shopOrderReference;
    }

    const order = em.create(Order, orderData as Order);

    // Create order items
    for (const itemData of data.items) {
      const itemTotal = (parseFloat(itemData.unitPrice) * itemData.quantity).toFixed(2);
      const item = em.create(OrderItem, {
        order,
        description: itemData.description,
        quantity: itemData.quantity,
        unitPrice: itemData.unitPrice,
        total: itemTotal,
        itemType: itemData.itemType,
        referenceId: itemData.referenceId,
        metadata: itemData.metadata,
      });
      order.items.add(item);
    }

    await em.persistAndFlush(order);

    return order;
  }

  /**
   * Create order from an event registration (for billing sync)
   */
  async createFromEventRegistration(registrationId: string): Promise<Order> {
    const em = this.em.fork();

    // Load registration with all related data
    const registration = await em.findOne(
      EventRegistration,
      { id: registrationId },
      { populate: ['event', 'user', 'classes'] },
    );

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${registrationId} not found`);
    }

    // Only create orders for paid registrations
    if (registration.paymentStatus !== 'paid') {
      throw new BadRequestException(
        `Cannot create order for registration with payment status: ${registration.paymentStatus}`,
      );
    }

    // Verify user exists (required for order creation)
    if (!registration.user) {
      throw new BadRequestException(
        `Registration ${registrationId} does not have an associated user`,
      );
    }

    // Check if order already exists for this registration
    const existingOrder = await em.findOne(Order, {
      notes: { $like: `%registrationId:${registrationId}%` },
    });

    if (existingOrder) {
      return existingOrder;
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber(em);

    // Build order items from registration classes
    const items: Array<{
      description: string;
      quantity: number;
      unitPrice: string;
      itemType: OrderItemType;
      referenceId?: string;
      metadata?: Record<string, unknown>;
    }> = [];

    // Add each class as an order item
    for (const regClass of registration.classes.getItems()) {
      items.push({
        description: `${registration.event.title} - ${regClass.className} (${regClass.format})`,
        quantity: 1,
        unitPrice: String(regClass.feeCharged || 0),
        itemType: OrderItemType.EVENT_CLASS,
        referenceId: registration.event.id,
        metadata: {
          registrationId: registration.id,
          competitionClassId: regClass.competitionClassId,
          format: regClass.format,
        },
      });
    }

    // Build billing address from registration
    const billingAddress: BillingAddress | undefined = registration.firstName
      ? {
          name: `${registration.firstName} ${registration.lastName || ''}`.trim(),
          email: registration.email,
          phone: registration.phone,
          address1: registration.address,
          city: registration.city,
          state: registration.state,
          postalCode: registration.postalCode,
          country: registration.country || 'US',
        }
      : undefined;

    // Calculate totals
    const { subtotal, total } = this.calculateTotals(items);

    // Create order
    const order = em.create(Order, {
      orderNumber,
      member: registration.user,
      status: OrderStatus.COMPLETED,
      orderType: OrderType.EVENT_REGISTRATION,
      subtotal,
      tax: '0.00',
      discount: '0.00',
      total,
      currency: 'USD',
      notes: `Event Registration - registrationId:${registration.id}`,
      billingAddress,
    });

    // Create order items
    for (const itemData of items) {
      const itemTotal = (parseFloat(itemData.unitPrice) * itemData.quantity).toFixed(2);
      const item = em.create(OrderItem, {
        order,
        description: itemData.description,
        quantity: itemData.quantity,
        unitPrice: itemData.unitPrice,
        total: itemTotal,
        itemType: itemData.itemType,
        referenceId: itemData.referenceId,
        metadata: itemData.metadata,
      });
      order.items.add(item);
    }

    await em.persistAndFlush(order);

    return order;
  }

  /**
   * Update order status
   */
  async updateStatus(id: string, data: UpdateOrderStatusDto): Promise<Order> {
    const em = this.em.fork();
    const order = await em.findOne(Order, { id }, { populate: ['items'] });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    wrap(order).assign({
      status: data.status,
      notes: data.notes || order.notes,
    });

    await em.flush();

    return order;
  }

  /**
   * Cancel an order
   */
  async cancel(id: string, data: CancelOrderDto): Promise<Order> {
    const em = this.em.fork();
    const order = await em.findOne(Order, { id }, { populate: ['items'] });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}. Use refund instead.`,
      );
    }

    wrap(order).assign({
      status: OrderStatus.CANCELLED,
      notes: data.reason,
    });

    await em.flush();

    return order;
  }

  /**
   * Mark order as refunded
   */
  async markRefunded(id: string, reason: string): Promise<Order> {
    const em = this.em.fork();
    const order = await em.findOne(Order, { id }, { populate: ['items'] });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    wrap(order).assign({
      status: OrderStatus.REFUNDED,
      notes: reason,
    });

    await em.flush();

    return order;
  }

  /**
   * Get order counts by status
   */
  async getStatusCounts(opts?: { startDate?: string; endDate?: string }): Promise<Record<OrderStatus, number>> {
    const em = this.em.fork();

    const counts: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.PROCESSING]: 0,
      [OrderStatus.COMPLETED]: 0,
      [OrderStatus.CANCELLED]: 0,
      [OrderStatus.REFUNDED]: 0,
    };

    const dateFilter: any = {};
    if (opts?.startDate) dateFilter.$gte = opts.startDate;
    if (opts?.endDate) dateFilter.$lte = opts.endDate;
    const hasDate = Object.keys(dateFilter).length > 0;

    for (const status of Object.values(OrderStatus)) {
      const where: any = { status };
      if (hasDate) where.createdAt = dateFilter;
      counts[status] = await em.count(Order, where);
    }

    return counts;
  }

  /**
   * Get count + total revenue grouped by orderType, optionally restricted
   * to a date window. Membership orders are split into `new_membership` vs
   * `membership_renewal` based on whether the buyer already had a prior
   * completed membership order — same rule as the per-row is_renewal flag.
   */
  async getTypeBreakdown(opts?: { startDate?: string; endDate?: string }): Promise<Record<string, { count: number; revenue: string }>> {
    const em = this.em.fork();
    const conn = em.getConnection();
    const conditions: string[] = [];
    const params: any[] = [];
    if (opts?.startDate) { conditions.push(`o.created_at >= ?`); params.push(opts.startDate); }
    if (opts?.endDate) { conditions.push(`o.created_at <= ?`); params.push(opts.endDate); }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    type Row = { effective_type: string; count: string; revenue: string };
    const rows: Row[] = await conn.execute(
      `SELECT
         CASE
           WHEN o.order_type = 'membership' AND EXISTS (
             SELECT 1 FROM orders prior
             WHERE prior.member_id = o.member_id
               AND prior.order_type = 'membership'
               AND prior.status = 'completed'
               AND prior.created_at < o.created_at
           ) THEN 'membership_renewal'
           WHEN o.order_type = 'membership' THEN 'new_membership'
           ELSE o.order_type::text
         END AS effective_type,
         COUNT(*)::text AS count,
         COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total ELSE 0 END), 0)::text AS revenue
       FROM orders o
       ${where}
       GROUP BY effective_type`,
      params,
    );
    const result: Record<string, { count: number; revenue: string }> = {};
    for (const r of rows) {
      result[r.effective_type] = {
        count: parseInt(r.count, 10),
        revenue: parseFloat(r.revenue).toFixed(2),
      };
    }
    return result;
  }

  /**
   * Get recent orders (for dashboard)
   */
  async getRecentOrders(limit: number = 5): Promise<Order[]> {
    const em = this.em.fork();

    const recent = await em.find(
      Order,
      {},
      {
        populate: ['member', 'items'],
        limit,
        orderBy: { createdAt: 'DESC' },
      },
    );
    await this.attachRenewalFlags(em, recent);
    return recent;
  }

  /**
   * For each membership order in the given list, set `is_renewal = true` if
   * its owner had a prior completed membership order. Runs a single batched
   * SQL — finds the earliest completed membership timestamp per user across
   * the whole orders table, then compares each order's createdAt to that.
   *
   * Detection works regardless of order-number format: covers both modern
   * "ORD-YYYY-RENEW-*" naming and legacy "PMPRO-*" rows imported from the
   * old WordPress system, which carry no naming hint.
   */
  private async attachRenewalFlags(em: EntityManager, orders: Order[]): Promise<void> {
    const membershipOrders = orders.filter(o => o.orderType === OrderType.MEMBERSHIP && o.member?.id);
    if (membershipOrders.length === 0) return;

    const userIds = Array.from(new Set(membershipOrders.map(o => o.member!.id)));
    const placeholders = userIds.map(() => '?').join(',');
    const conn = em.getConnection();

    type Row = { member_id: string; earliest: string };
    const rows: Row[] = await conn.execute(
      `SELECT member_id, MIN(created_at) AS earliest
       FROM orders
       WHERE order_type = 'membership'
         AND status = 'completed'
         AND member_id IN (${placeholders})
       GROUP BY member_id`,
      userIds,
    );
    const earliestByUser = new Map<string, number>();
    for (const r of rows) {
      earliestByUser.set(r.member_id, new Date(r.earliest).getTime());
    }

    for (const order of membershipOrders) {
      const earliest = earliestByUser.get(order.member!.id);
      if (earliest == null) {
        // No completed membership in history — treat as a new (pending) one.
        order.is_renewal = false;
        continue;
      }
      // Renewal when this order is strictly after the earliest completed one
      // for the same user. The earliest completed order itself is therefore
      // "new", everything after is "renewal".
      const ts = order.createdAt ? new Date(order.createdAt).getTime() : 0;
      order.is_renewal = ts > earliest;
    }
  }

  /**
   * Link order to invoice
   */
  async linkInvoice(orderId: string, invoiceId: string): Promise<Order> {
    const em = this.em.fork();
    const order = await em.findOne(Order, { id: orderId });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    wrap(order).assign({ invoiceId });
    await em.flush();

    return order;
  }

  /**
   * Get orders completed since a date (for reconciliation)
   */
  async findCompletedSince(date: Date): Promise<Order[]> {
    const em = this.em.fork();

    return em.find(
      Order,
      {
        status: OrderStatus.COMPLETED,
        createdAt: { $gte: date },
      },
      {
        populate: ['member', 'items'],
        orderBy: { createdAt: 'ASC' },
      },
    );
  }
}
