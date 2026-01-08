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
      { populate: ['user', 'items', 'payment'] },
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
      { populate: ['user', 'items', 'payment'] },
    );
  }

  /**
   * Find orders by user with pagination
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
      { user: userId },
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

    // Build filter
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (orderType) {
      filter.orderType = orderType;
    }

    if (userId) {
      filter.user = userId;
    }

    if (startDate) {
      filter.createdAt = { $gte: startDate };
    }

    if (endDate) {
      filter.createdAt = { ...filter.createdAt, $lte: endDate };
    }

    if (search) {
      filter.orderNumber = { $like: `%${search}%` };
    }

    const [orders, total] = await em.findAndCount(Order, filter, {
      populate: ['user', 'items'],
      limit,
      offset,
      orderBy: { createdAt: 'DESC' },
    });

    return {
      data: orders,
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
      user,
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
   */
  async createFromPayment(data: CreateOrderFromPaymentDto): Promise<Order> {
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
      user,
      member: user,
      status: OrderStatus.COMPLETED,
      orderType: data.orderType,
      subtotal,
      tax: '0.00',
      discount: '0.00',
      total,
      currency: 'USD',
      notes: data.notes,
      billingAddress: data.billingAddress,
      payment,
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
      user: registration.user,
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
  async getStatusCounts(): Promise<Record<OrderStatus, number>> {
    const em = this.em.fork();

    const counts: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.PROCESSING]: 0,
      [OrderStatus.COMPLETED]: 0,
      [OrderStatus.CANCELLED]: 0,
      [OrderStatus.REFUNDED]: 0,
    };

    for (const status of Object.values(OrderStatus)) {
      counts[status] = await em.count(Order, { status });
    }

    return counts;
  }

  /**
   * Get recent orders (for dashboard)
   */
  async getRecentOrders(limit: number = 5): Promise<Order[]> {
    const em = this.em.fork();

    return em.find(
      Order,
      {},
      {
        populate: ['user', 'items'],
        limit,
        orderBy: { createdAt: 'DESC' },
      },
    );
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
        populate: ['user', 'items'],
        orderBy: { createdAt: 'ASC' },
      },
    );
  }
}
