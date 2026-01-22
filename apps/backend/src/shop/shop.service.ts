import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/core';
import {
  ShopProductCategory,
  ShopOrderStatus,
  CreateShopProductDto,
  UpdateShopProductDto,
  ShopAddress,
  OrderStatus,
} from '@newmeca/shared';
import { ShopProduct } from './entities/shop-product.entity';
import { ShopOrder } from './entities/shop-order.entity';
import { ShopOrderItem } from './entities/shop-order-item.entity';
import { ShippingService } from './shipping.service';
import {
  EmailService,
  ShopOrderItemDto,
  ShopAddressDto,
} from '../email/email.service';

interface CartItem {
  productId: string;
  quantity: number;
}

interface OrderTotals {
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
}

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly shippingService: ShippingService,
    private readonly emailService: EmailService,
  ) {}

  // =============================================================================
  // PRODUCT METHODS
  // =============================================================================

  async findAllProducts(filters?: {
    category?: ShopProductCategory;
    isActive?: boolean;
    isFeatured?: boolean;
  }): Promise<ShopProduct[]> {
    const em = this.em.fork();
    const where: Record<string, unknown> = {};

    if (filters?.category) where.category = filters.category;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.isFeatured !== undefined) where.isFeatured = filters.isFeatured;

    return em.find(ShopProduct, where, {
      orderBy: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async findActiveProducts(category?: ShopProductCategory): Promise<ShopProduct[]> {
    const em = this.em.fork();
    const where: Record<string, unknown> = { isActive: true };

    if (category) where.category = category;

    return em.find(ShopProduct, where, {
      orderBy: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async findFeaturedProducts(): Promise<ShopProduct[]> {
    const em = this.em.fork();
    return em.find(
      ShopProduct,
      { isActive: true, isFeatured: true },
      { orderBy: { displayOrder: 'ASC', name: 'ASC' } },
    );
  }

  async findProductById(id: string): Promise<ShopProduct> {
    const em = this.em.fork();
    const product = await em.findOne(ShopProduct, { id });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async createProduct(data: CreateShopProductDto): Promise<ShopProduct> {
    const em = this.em.fork();

    const product = em.create(ShopProduct, {
      name: data.name,
      description: data.description,
      shortDescription: data.shortDescription,
      category: data.category,
      price: data.price,
      compareAtPrice: data.compareAtPrice,
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      displayOrder: data.displayOrder ?? 0,
      imageUrl: data.imageUrl,
      additionalImages: data.additionalImages,
      sku: data.sku,
      stockQuantity: data.stockQuantity ?? -1,
      trackInventory: data.trackInventory ?? false,
      stripeProductId: data.stripeProductId,
      stripePriceId: data.stripePriceId,
      quickbooksItemId: data.quickbooksItemId,
      metadata: data.metadata,
    } as unknown as ShopProduct);

    await em.persistAndFlush(product);
    return product;
  }

  async updateProduct(id: string, data: UpdateShopProductDto): Promise<ShopProduct> {
    const em = this.em.fork();
    const product = await em.findOne(ShopProduct, { id });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Map DTO fields to entity fields
    const updateData: Partial<ShopProduct> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.compareAtPrice !== undefined) updateData.compareAtPrice = data.compareAtPrice;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.additionalImages !== undefined) updateData.additionalImages = data.additionalImages;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity;
    if (data.trackInventory !== undefined) updateData.trackInventory = data.trackInventory;
    if (data.stripeProductId !== undefined) updateData.stripeProductId = data.stripeProductId;
    if (data.stripePriceId !== undefined) updateData.stripePriceId = data.stripePriceId;
    if (data.quickbooksItemId !== undefined) updateData.quickbooksItemId = data.quickbooksItemId;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    em.assign(product, updateData);
    await em.flush();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    const em = this.em.fork();
    const product = await em.findOne(ShopProduct, { id });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await em.removeAndFlush(product);
  }

  async getCategories(): Promise<{ category: string; count: number }[]> {
    const em = this.em.fork();
    const result = await em.getConnection().execute(`
      SELECT category, COUNT(*) as count
      FROM shop_products
      WHERE is_active = true
      GROUP BY category
      ORDER BY category
    `);
    return result as { category: string; count: number }[];
  }

  // =============================================================================
  // ORDER METHODS
  // =============================================================================

  async createOrder(data: {
    userId?: string;
    guestEmail?: string;
    guestName?: string;
    items: CartItem[];
    shippingAddress?: ShopAddress;
    billingAddress?: ShopAddress;
    notes?: string;
    stripePaymentIntentId?: string;
    shippingMethod?: 'standard' | 'priority';
    shippingAmount?: number;
  }): Promise<ShopOrder> {
    const em = this.em.fork();

    // Validate items and calculate totals
    const products = await this.validateAndGetProducts(em, data.items);
    const totals = this.calculateOrderTotals(products, data.items, data.shippingAmount);

    // Generate order number
    const orderNumber = await this.generateOrderNumber(em);

    // Create order
    const order = em.create(ShopOrder, {
      orderNumber,
      guestEmail: data.guestEmail,
      guestName: data.guestName,
      status: ShopOrderStatus.PENDING,
      subtotal: totals.subtotal,
      shippingAmount: totals.shippingAmount,
      shippingMethod: data.shippingMethod || 'standard',
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      shippingAddress: data.shippingAddress,
      billingAddress: data.billingAddress,
      notes: data.notes,
      stripePaymentIntentId: data.stripePaymentIntentId,
    } as unknown as ShopOrder);

    // Link user if provided
    if (data.userId) {
      order.user = em.getReference('Profile', data.userId) as any;
    }

    await em.persistAndFlush(order);

    // Create order items
    for (const item of data.items) {
      const product = products.find(p => p.id === item.productId)!;
      const orderItem = em.create(ShopOrderItem, {
        order,
        product,
        productName: product.name,
        productSku: product.sku,
        unitPrice: product.price,
        quantity: item.quantity,
        totalPrice: Number(product.price) * item.quantity,
      } as unknown as ShopOrderItem);
      em.persist(orderItem);
    }

    await em.flush();

    // Reload with items
    const fullOrder = await this.findOrderById(order.id);

    // Send order confirmation email
    await this.sendOrderConfirmationEmail(fullOrder, products, data.items);

    return fullOrder;
  }

  async findOrderById(id: string): Promise<ShopOrder> {
    const em = this.em.fork();
    const order = await em.findOne(ShopOrder, { id }, {
      populate: ['items', 'items.product', 'user'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findOrderByNumber(orderNumber: string): Promise<ShopOrder> {
    const em = this.em.fork();
    const order = await em.findOne(ShopOrder, { orderNumber }, {
      populate: ['items', 'items.product', 'user'],
    });

    if (!order) {
      throw new NotFoundException(`Order with number ${orderNumber} not found`);
    }

    return order;
  }

  async findOrdersByUser(userId: string): Promise<ShopOrder[]> {
    const em = this.em.fork();
    return em.find(
      ShopOrder,
      { user: { id: userId } },
      {
        populate: ['items'],
        orderBy: { createdAt: 'DESC' },
      },
    );
  }

  async findAllOrders(filters?: {
    status?: ShopOrderStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: ShopOrder[]; total: number }> {
    const em = this.em.fork();
    const where: Record<string, unknown> = {};

    if (filters?.status) where.status = filters.status;

    const [orders, total] = await em.findAndCount(ShopOrder, where, {
      populate: ['items', 'user'],
      orderBy: { createdAt: 'DESC' },
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    });

    return { orders, total };
  }

  async updateOrderStatus(id: string, status: ShopOrderStatus): Promise<ShopOrder> {
    const em = this.em.fork();
    const order = await em.findOne(ShopOrder, { id });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const previousStatus = order.status;
    order.status = status;

    // Set shipped_at timestamp when marked as shipped
    if (status === ShopOrderStatus.SHIPPED && !order.shippedAt) {
      order.shippedAt = new Date();
    }

    await em.flush();
    const fullOrder = await this.findOrderById(id);

    // Send shipping notification email when order is shipped
    if (status === ShopOrderStatus.SHIPPED && previousStatus !== ShopOrderStatus.SHIPPED) {
      await this.sendShippingNotificationEmail(fullOrder);
    }

    // Send delivery confirmation email when order is delivered
    if (status === ShopOrderStatus.DELIVERED && previousStatus !== ShopOrderStatus.DELIVERED) {
      await this.sendDeliveryConfirmationEmail(fullOrder);
    }

    return fullOrder;
  }

  async addTrackingNumber(id: string, trackingNumber: string): Promise<ShopOrder> {
    const em = this.em.fork();
    const order = await em.findOne(ShopOrder, { id });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    order.trackingNumber = trackingNumber;
    await em.flush();
    return this.findOrderById(id);
  }

  async updateAdminNotes(id: string, adminNotes: string): Promise<ShopOrder> {
    const em = this.em.fork();
    const order = await em.findOne(ShopOrder, { id });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    order.adminNotes = adminNotes;
    await em.flush();
    return this.findOrderById(id);
  }

  // =============================================================================
  // CHECKOUT METHODS
  // =============================================================================

  async processPaymentSuccess(
    paymentIntentId: string,
    chargeId: string,
    last4?: string,
  ): Promise<ShopOrder> {
    const em = this.em.fork();
    const order = await em.findOne(ShopOrder, { stripePaymentIntentId: paymentIntentId });

    if (!order) {
      throw new NotFoundException(`Order with payment intent ${paymentIntentId} not found`);
    }

    order.status = ShopOrderStatus.PAID;
    order.stripeChargeId = chargeId;

    // Decrement stock for tracked inventory products
    await this.decrementStock(em, order.id);

    await em.flush();
    const fullOrder = await this.findOrderById(order.id);

    // Send payment receipt email
    await this.sendPaymentReceiptEmail(fullOrder, last4);

    return fullOrder;
  }

  async checkStockAvailability(items: CartItem[]): Promise<{
    available: boolean;
    unavailableItems: Array<{ productId: string; productName: string; requested: number; available: number }>;
  }> {
    const em = this.em.fork();
    const unavailableItems: Array<{ productId: string; productName: string; requested: number; available: number }> = [];

    for (const item of items) {
      const product = await em.findOne(ShopProduct, { id: item.productId });

      if (!product) {
        unavailableItems.push({
          productId: item.productId,
          productName: 'Unknown Product',
          requested: item.quantity,
          available: 0,
        });
        continue;
      }

      if (product.trackInventory && product.stockQuantity >= 0 && product.stockQuantity < item.quantity) {
        unavailableItems.push({
          productId: item.productId,
          productName: product.name,
          requested: item.quantity,
          available: product.stockQuantity,
        });
      }
    }

    return {
      available: unavailableItems.length === 0,
      unavailableItems,
    };
  }

  // =============================================================================
  // STATS METHODS
  // =============================================================================

  async getStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    pendingOrders: number;
    processingOrders: number;
    shippedOrders: number;
    totalRevenue: number;
    ordersThisMonth: number;
    revenueThisMonth: number;
  }> {
    const em = this.em.fork();

    const [
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
    ] = await Promise.all([
      em.count(ShopProduct, {}),
      em.count(ShopProduct, { isActive: true }),
      em.count(ShopOrder, {}),
      em.count(ShopOrder, { status: ShopOrderStatus.PENDING }),
      em.count(ShopOrder, { status: ShopOrderStatus.PROCESSING }),
      em.count(ShopOrder, { status: ShopOrderStatus.SHIPPED }),
    ]);

    // Get revenue stats
    const revenueResult = await em.getConnection().execute(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN total_amount ELSE 0 END), 0) as revenue_this_month,
        COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as orders_this_month
      FROM shop_orders
      WHERE status IN ('paid', 'processing', 'shipped', 'delivered')
    `);

    const stats = revenueResult[0] || {};

    return {
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      totalRevenue: Number(stats.total_revenue) || 0,
      ordersThisMonth: Number(stats.orders_this_month) || 0,
      revenueThisMonth: Number(stats.revenue_this_month) || 0,
    };
  }

  // =============================================================================
  // REFUND METHODS
  // =============================================================================

  /**
   * Process a refund for a shop order
   * Updates shop order status, restores inventory, and marks billing order as refunded
   */
  async processRefund(orderId: string, reason?: string): Promise<ShopOrder> {
    const em = this.em.fork();

    // Get the shop order with items and products
    const order = await em.findOne(
      ShopOrder,
      { id: orderId },
      { populate: ['items', 'items.product'] },
    );

    if (!order) {
      throw new NotFoundException(`Shop order with ID ${orderId} not found`);
    }

    if (order.status === ShopOrderStatus.REFUNDED) {
      throw new BadRequestException('Order has already been refunded');
    }

    if (order.status !== ShopOrderStatus.PAID && order.status !== ShopOrderStatus.PROCESSING) {
      throw new BadRequestException(
        `Cannot refund order with status ${order.status}. Only paid or processing orders can be refunded.`,
      );
    }

    // Update shop order status
    order.status = ShopOrderStatus.REFUNDED;
    if (reason) {
      order.adminNotes = reason;
    }

    // Restore inventory for tracked products
    for (const item of order.items) {
      if (item.product && item.product.trackInventory && item.product.stockQuantity >= 0) {
        item.product.stockQuantity += item.quantity;
      }
    }

    // Update billing order if exists
    if (order.billingOrderId) {
      try {
        const { Order } = await import('../orders/orders.entity');
        const billingOrder = await em.findOne(Order, { id: order.billingOrderId });
        if (billingOrder) {
          wrap(billingOrder).assign({
            status: OrderStatus.REFUNDED,
            notes: reason || 'Refunded via shop order',
          });
        }

        // Also update associated invoice if exists
        if (billingOrder?.invoiceId) {
          const { Invoice } = await import('../invoices/invoices.entity');
          const { InvoiceStatus } = await import('@newmeca/shared');
          const invoice = await em.findOne(Invoice, { id: billingOrder.invoiceId });
          if (invoice) {
            wrap(invoice).assign({
              status: InvoiceStatus.REFUNDED,
              notes: reason || 'Refunded via shop order',
            });
          }
        }
      } catch (error) {
        console.error('Error updating billing order/invoice during refund:', error);
        // Non-critical - continue with the refund
      }
    }

    await em.flush();

    return order;
  }

  // =============================================================================
  // PRIVATE HELPERS
  // =============================================================================

  private async validateAndGetProducts(em: EntityManager, items: CartItem[]): Promise<ShopProduct[]> {
    const productIds = items.map(item => item.productId);
    const products = await em.find(ShopProduct, { id: { $in: productIds }, isActive: true });

    if (products.length !== items.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(`Products not found or inactive: ${missingIds.join(', ')}`);
    }

    return products;
  }

  private calculateOrderTotals(
    products: ShopProduct[],
    items: CartItem[],
    providedShippingAmount?: number,
  ): OrderTotals {
    let subtotal = 0;

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!;
      subtotal += Number(product.price) * item.quantity;
    }

    // Use provided shipping amount or default to 0
    const shippingAmount = providedShippingAmount ?? 0;
    const taxAmount = 0; // Tax can be configured later
    const totalAmount = subtotal + shippingAmount + taxAmount;

    return { subtotal, shippingAmount, taxAmount, totalAmount };
  }

  private async generateOrderNumber(em: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SHOP-${year}`;

    const result = await em.getConnection().execute(`
      SELECT order_number FROM shop_orders
      WHERE order_number LIKE '${prefix}-%'
      ORDER BY order_number DESC
      LIMIT 1
    `);

    let sequence = 1;
    if (result.length > 0) {
      const lastNumber = result[0].order_number;
      const lastSequence = parseInt(lastNumber.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(5, '0')}`;
  }

  private async decrementStock(em: EntityManager, orderId: string): Promise<void> {
    const order = await em.findOne(ShopOrder, { id: orderId }, { populate: ['items', 'items.product'] });
    if (!order) return;

    for (const item of order.items) {
      if (item.product && item.product.trackInventory && item.product.stockQuantity >= 0) {
        item.product.stockQuantity = Math.max(0, item.product.stockQuantity - item.quantity);
      }
    }

    await em.flush();
  }

  // =============================================================================
  // EMAIL HELPER METHODS
  // =============================================================================

  private getCustomerEmail(order: ShopOrder): string | undefined {
    // Check guest email first, then fall back to user email
    if (order.guestEmail) return order.guestEmail;
    if (order.user?.email) return order.user.email;
    return undefined;
  }

  private getCustomerName(order: ShopOrder): string | undefined {
    // Check guest name first, then fall back to user name
    if (order.guestName) return order.guestName;
    if (order.user?.first_name) {
      return order.user.last_name
        ? `${order.user.first_name} ${order.user.last_name}`
        : order.user.first_name;
    }
    return undefined;
  }

  private mapOrderItemsToEmailDto(order: ShopOrder): ShopOrderItemDto[] {
    return order.items.getItems().map(item => ({
      productName: item.productName,
      productSku: item.productSku || undefined,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    }));
  }

  private mapShippingAddressToEmailDto(address: ShopAddress | null | undefined): ShopAddressDto | undefined {
    if (!address) return undefined;
    return {
      name: address.name,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country || 'US',
    };
  }

  private async sendOrderConfirmationEmail(
    order: ShopOrder,
    products: ShopProduct[],
    cartItems: CartItem[],
  ): Promise<void> {
    const email = this.getCustomerEmail(order);
    if (!email) {
      this.logger.warn(`Cannot send order confirmation email - no email for order ${order.orderNumber}`);
      return;
    }

    try {
      await this.emailService.sendShopOrderConfirmationEmail({
        to: email,
        customerName: this.getCustomerName(order),
        orderNumber: order.orderNumber,
        items: this.mapOrderItemsToEmailDto(order),
        subtotal: Number(order.subtotal),
        shippingAmount: Number(order.shippingAmount),
        taxAmount: Number(order.taxAmount),
        totalAmount: Number(order.totalAmount),
        shippingAddress: this.mapShippingAddressToEmailDto(order.shippingAddress),
        shippingMethod: order.shippingMethod,
        orderDate: order.createdAt,
      });
      this.logger.log(`Order confirmation email sent for order ${order.orderNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send order confirmation email for order ${order.orderNumber}: ${error}`);
    }
  }

  private async sendPaymentReceiptEmail(order: ShopOrder, last4?: string): Promise<void> {
    const email = this.getCustomerEmail(order);
    if (!email) {
      this.logger.warn(`Cannot send payment receipt email - no email for order ${order.orderNumber}`);
      return;
    }

    try {
      await this.emailService.sendShopPaymentReceiptEmail({
        to: email,
        customerName: this.getCustomerName(order),
        orderNumber: order.orderNumber,
        items: this.mapOrderItemsToEmailDto(order),
        subtotal: Number(order.subtotal),
        shippingAmount: Number(order.shippingAmount),
        taxAmount: Number(order.taxAmount),
        totalAmount: Number(order.totalAmount),
        paymentDate: new Date(),
        last4,
      });
      this.logger.log(`Payment receipt email sent for order ${order.orderNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send payment receipt email for order ${order.orderNumber}: ${error}`);
    }
  }

  private async sendShippingNotificationEmail(order: ShopOrder): Promise<void> {
    const email = this.getCustomerEmail(order);
    if (!email) {
      this.logger.warn(`Cannot send shipping notification email - no email for order ${order.orderNumber}`);
      return;
    }

    try {
      await this.emailService.sendShopShippingNotificationEmail({
        to: email,
        customerName: this.getCustomerName(order),
        orderNumber: order.orderNumber,
        items: this.mapOrderItemsToEmailDto(order),
        trackingNumber: order.trackingNumber || undefined,
        trackingUrl: order.trackingNumber
          ? `https://track.aftership.com/${order.trackingNumber}`
          : undefined,
        shippingAddress: this.mapShippingAddressToEmailDto(order.shippingAddress),
        shippedDate: order.shippedAt || new Date(),
      });
      this.logger.log(`Shipping notification email sent for order ${order.orderNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send shipping notification email for order ${order.orderNumber}: ${error}`);
    }
  }

  private async sendDeliveryConfirmationEmail(order: ShopOrder): Promise<void> {
    const email = this.getCustomerEmail(order);
    if (!email) {
      this.logger.warn(`Cannot send delivery confirmation email - no email for order ${order.orderNumber}`);
      return;
    }

    try {
      await this.emailService.sendShopDeliveryConfirmationEmail({
        to: email,
        customerName: this.getCustomerName(order),
        orderNumber: order.orderNumber,
        items: this.mapOrderItemsToEmailDto(order),
        deliveryDate: new Date(),
      });
      this.logger.log(`Delivery confirmation email sent for order ${order.orderNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send delivery confirmation email for order ${order.orderNumber}: ${error}`);
    }
  }
}
