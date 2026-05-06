import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  Header,
  Inject,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { EntityManager } from '@mikro-orm/core';
import {
  CreateOrderDto,
  CreateOrderSchema,
  OrderListQuery,
  OrderListQuerySchema,
  CreateInvoiceDto,
  CreateInvoiceSchema,
  InvoiceListQuery,
  InvoiceListQuerySchema,
  OrderStatus,
  InvoiceStatus,
  PaymentStatus,
} from '@newmeca/shared';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { InvoicePdfService } from '../invoices/pdf/invoice-pdf.service';
import { EventRegistration } from '../event-registrations/event-registrations.entity';
import { Order } from '../orders/orders.entity';
import { Membership } from '../memberships/memberships.entity';
import { ShopOrder } from '../shop/entities/shop-order.entity';
import { Invoice } from '../invoices/invoices.entity';
import { InvoiceItem } from '../invoices/invoice-items.entity';
import { InvoiceItemType } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import { UserRole } from '@newmeca/shared';

/**
 * Billing Controller - Aggregation layer for billing operations
 * Provides unified endpoints for orders, invoices, and billing stats
 */
@Controller('api/billing')
export class BillingController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: InvoicePdfService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // Helper to get current user from auth header
  private async getCurrentUser(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }

    return user;
  }

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string) {
    const user = await this.getCurrentUser(authHeader);
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (!isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required');
    }
    return user;
  }

  // ==========================================
  // ORDERS ENDPOINTS
  // ==========================================

  /**
   * Get all orders with filters (admin)
   */
  @Get('orders')
  async getOrders(
    @Headers('authorization') authHeader: string,
    @Query() query: OrderListQuery,
  ) {
    await this.requireAdmin(authHeader);
    const validatedQuery = OrderListQuerySchema.parse(query);
    return this.ordersService.findAll(validatedQuery);
  }

  /**
   * Get order by ID
   */
  @Get('orders/:id')
  async getOrder(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.ordersService.findById(id);
  }

  /**
   * Create a new order (admin)
   */
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateOrderDto,
  ) {
    await this.requireAdmin(authHeader);
    const validatedData = CreateOrderSchema.parse(data);
    return this.ordersService.create(validatedData);
  }

  // ==========================================
  // INVOICES ENDPOINTS
  // ==========================================

  /**
   * Get all invoices with filters (admin)
   */
  @Get('invoices')
  async getInvoices(
    @Headers('authorization') authHeader: string,
    @Query() query: InvoiceListQuery,
  ) {
    await this.requireAdmin(authHeader);
    const validatedQuery = InvoiceListQuerySchema.parse(query);
    return this.invoicesService.findAll(validatedQuery);
  }

  /**
   * Get invoice by ID
   */
  @Get('invoices/:id')
  async getInvoice(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.invoicesService.findById(id);
  }

  /**
   * Get invoice PDF
   */
  @Get('invoices/:id/pdf')
  @Header('Content-Type', 'text/html')
  async getInvoicePdf(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    await this.requireAdmin(authHeader);
    const invoice = await this.invoicesService.findById(id);
    const html = this.pdfService.generateInvoiceHtml(invoice);
    res.send(html);
  }

  /**
   * Create a new invoice (admin)
   */
  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateInvoiceDto,
  ) {
    await this.requireAdmin(authHeader);
    const validatedData = CreateInvoiceSchema.parse(data);
    return this.invoicesService.create(validatedData);
  }

  /**
   * Send invoice email
   */
  @Post('invoices/:id/send')
  @HttpCode(HttpStatus.OK)
  async sendInvoice(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    const result = await this.invoicesService.sendInvoice(id);
    return { success: result.success, invoice: result.invoice, error: result.error };
  }

  // ==========================================
  // USER BILLING ENDPOINTS (My Billing)
  // ==========================================

  /**
   * Get current user's orders
   */
  @Get('my/orders')
  async getMyOrders(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Get userId from authenticated user - users can only access their own orders
    const user = await this.getCurrentUser(authHeader);
    return this.ordersService.findByUser(user.id, page, limit);
  }

  /**
   * Get current user's invoices
   */
  @Get('my/invoices')
  async getMyInvoices(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Get userId from authenticated user - users can only access their own invoices
    const user = await this.getCurrentUser(authHeader);
    return this.invoicesService.findByUser(user.id, page, limit);
  }

  /**
   * Unified transaction history for the current user — pulls from event_registrations,
   * memberships, and shop_orders so users see every paid/pending purchase in one table
   * (the `orders` table alone misses comp memberships, pre-migration data, and
   * pending shop carts).
   */
  @Get('my/all-transactions')
  async getMyAllTransactions(
    @Headers('authorization') authHeader: string,
  ) {
    const user = await this.getCurrentUser(authHeader);
    const em = this.em.fork();

    const [registrations, memberships, shopOrders, billingOrders, userInvoices] = await Promise.all([
      em.find(
        EventRegistration,
        { user: user.id },
        { populate: ['event'], orderBy: { createdAt: 'DESC' } },
      ),
      em.find(
        Membership,
        { user: user.id },
        { populate: ['membershipTypeConfig'], orderBy: { createdAt: 'DESC' } },
      ),
      em.find(
        ShopOrder,
        { user: user.id },
        { orderBy: { createdAt: 'DESC' } },
      ),
      em.find(
        Order,
        { member: user.id },
        { orderBy: { createdAt: 'DESC' } },
      ),
      em.find(
        Invoice,
        { user: user.id },
        { populate: ['masterMembership', 'items'], orderBy: { createdAt: 'DESC' } },
      ),
    ]);

    // Build lookups so a source-of-truth row can surface its associated invoice
    const orderByPaymentIntentId = new Map<string, Order>();
    const orderByShopRef = new Map<string, Order>();
    for (const o of billingOrders) {
      const pi = (o.metadata as any)?.paymentIntentId || (o.metadata as any)?.stripe_payment_intent_id;
      if (pi) orderByPaymentIntentId.set(String(pi), o);
      const shopId = o.shopOrderReference?.shopOrderId;
      if (shopId) orderByShopRef.set(shopId, o);
    }

    // Also build invoice-side lookups so $0 / comp memberships and registrations (which have no linked Order)
    // can still surface their associated Invoice. Maps go from source-of-truth id → invoice.
    const invoiceByMembershipId = new Map<string, Invoice>();
    const invoiceByRegistrationId = new Map<string, Invoice>();
    for (const inv of userInvoices) {
      const mm = (inv.masterMembership as any)?.id || inv.masterMembership;
      if (mm && !invoiceByMembershipId.has(String(mm))) {
        invoiceByMembershipId.set(String(mm), inv);
      }
      const items = inv.items?.getItems?.() ?? [];
      for (const it of items as InvoiceItem[]) {
        if (!it.referenceId) continue;
        if (it.itemType === InvoiceItemType.MEMBERSHIP && !invoiceByMembershipId.has(it.referenceId)) {
          invoiceByMembershipId.set(it.referenceId, inv);
        } else if (it.itemType === InvoiceItemType.EVENT_CLASS && !invoiceByRegistrationId.has(it.referenceId)) {
          // EVENT_CLASS items reference the registrationId
          invoiceByRegistrationId.set(it.referenceId, inv);
        }
      }
    }

    type Transaction = {
      id: string;
      source: 'event_registration' | 'membership' | 'shop_order';
      type: string;
      reference: string;
      description: string;
      status: string;
      amount: number;
      currency: string;
      date: string;
      invoiceId?: string;
      detailUrl?: string;
    };

    const txs: Transaction[] = [];

    for (const r of registrations) {
      const linkedOrder = r.stripePaymentIntentId
        ? orderByPaymentIntentId.get(r.stripePaymentIntentId)
        : undefined;
      const invoiceId = linkedOrder?.invoiceId || invoiceByRegistrationId.get(r.id)?.id;
      txs.push({
        id: `event_registration:${r.id}`,
        source: 'event_registration',
        type: 'Event Registration',
        reference: linkedOrder?.orderNumber || r.id.slice(0, 8),
        description: `Event Registration${r.event?.title ? `: ${r.event.title}` : ''}`,
        status: r.paymentStatus,
        amount: Number(r.amountPaid ?? 0),
        currency: 'USD',
        date: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt as any)).toISOString(),
        invoiceId,
        detailUrl: r.event?.id ? `/events/${r.event.id}` : undefined,
      });
    }

    for (const m of memberships) {
      const linkedOrder = m.stripePaymentIntentId
        ? orderByPaymentIntentId.get(m.stripePaymentIntentId)
        : undefined;
      const invoiceId = linkedOrder?.invoiceId || invoiceByMembershipId.get(m.id)?.id;
      txs.push({
        id: `membership:${m.id}`,
        source: 'membership',
        type: 'Membership',
        reference: linkedOrder?.orderNumber || (m.mecaId ? `#${m.mecaId}` : m.id.slice(0, 8)),
        description: `Membership${m.membershipTypeConfig?.name ? `: ${m.membershipTypeConfig.name}` : ''}`,
        status: m.paymentStatus,
        amount: Number(m.amountPaid ?? 0),
        currency: 'USD',
        date: m.startDate
          ? (m.startDate instanceof Date ? m.startDate : new Date(m.startDate as any)).toISOString()
          : new Date().toISOString(),
        invoiceId,
        detailUrl: '/dashboard/membership',
      });
    }

    for (const s of shopOrders) {
      const linkedOrder = orderByShopRef.get(s.id)
        || (s.stripePaymentIntentId ? orderByPaymentIntentId.get(s.stripePaymentIntentId) : undefined);
      txs.push({
        id: `shop_order:${s.id}`,
        source: 'shop_order',
        type: 'Shop Purchase',
        reference: s.orderNumber,
        description: `Shop Order ${s.orderNumber}`,
        status: s.status,
        amount: Number(s.totalAmount ?? 0),
        currency: 'USD',
        date: (s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt as any)).toISOString(),
        invoiceId: linkedOrder?.invoiceId,
        detailUrl: `/shop/orders/${s.id}`,
      });
    }

    txs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return { data: txs, total: txs.length };
  }

  /**
   * Get current user's invoice PDF
   */
  @Get('my/invoices/:id/pdf')
  @Header('Content-Type', 'text/html')
  async getMyInvoicePdf(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
  ) {
    // Verify the user is authenticated
    const user = await this.getCurrentUser(authHeader);

    // Fetch the invoice
    const invoice = await this.invoicesService.findById(id);

    // Verify invoice belongs to the authenticated user
    if (invoice.user?.id !== user.id) {
      throw new ForbiddenException('You do not have permission to access this invoice');
    }

    const html = this.pdfService.generateInvoiceHtml(invoice);
    res.send(html);
  }

  /**
   * Get current user's membership receipt as printable HTML.
   * Used for memberships that have no formal Invoice record (comp / admin / $0).
   */
  @Get('my/memberships/:id/receipt-pdf')
  @Header('Content-Type', 'text/html')
  async getMyMembershipReceiptPdf(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
  ) {
    const user = await this.getCurrentUser(authHeader);
    const em = this.em.fork();

    const membership = await em.findOne(
      Membership,
      { id },
      { populate: ['user', 'membershipTypeConfig'] },
    );
    if (!membership) {
      throw new ForbiddenException('Membership not found');
    }

    // Verify membership belongs to the authenticated user
    if ((membership.user as any)?.id !== user.id) {
      throw new ForbiddenException('You do not have permission to access this membership receipt');
    }

    const html = this.pdfService.generateMembershipReceiptHtml(membership);
    res.send(html);
  }

  // ==========================================
  // DASHBOARD STATS ENDPOINTS
  // ==========================================

  /**
   * Get billing dashboard statistics
   */
  @Get('stats/dashboard')
  async getDashboardStats(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.requireAdmin(authHeader);

    // Run all queries in parallel — pass date filters into each so the
    // dashboard's Period selector actually changes the numbers. Without
    // these the page rendered the same totals regardless of the period.
    const [
      orderStatusCounts,
      orderTypeBreakdown,
      invoiceStatusCounts,
      unpaidTotal,
      recentOrders,
      recentInvoices,
    ] = await Promise.all([
      this.ordersService.getStatusCounts({ startDate, endDate }),
      this.ordersService.getTypeBreakdown({ startDate, endDate }),
      this.invoicesService.getStatusCounts({ startDate, endDate }),
      this.invoicesService.getUnpaidTotal(),
      this.ordersService.getRecentOrders(5),
      this.invoicesService.getRecentInvoices(5),
    ]);

    // Revenue = sum(total) of completed orders in period. The DTO types
    // startDate/endDate as Date — coerce here so the query string params
    // can be passed straight through.
    const completedOrders = await this.ordersService.findAll({
      page: 1,
      status: OrderStatus.COMPLETED,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: 1000,
    });
    const totalRevenue = completedOrders.data.reduce(
      (sum, order) => sum + parseFloat(order.total),
      0,
    );

    return {
      orders: {
        counts: orderStatusCounts,
        total: Object.values(orderStatusCounts).reduce((a, b) => a + b, 0),
        byType: orderTypeBreakdown,
      },
      invoices: {
        counts: invoiceStatusCounts,
        total: Object.values(invoiceStatusCounts).reduce((a, b) => a + b, 0),
        unpaid: unpaidTotal,
      },
      revenue: {
        total: totalRevenue.toFixed(2),
        currency: 'USD',
      },
      recent: {
        orders: recentOrders,
        invoices: recentInvoices,
      },
      period: {
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      },
    };
  }

  /**
   * Subscription-focused KPIs: active count, churn (30d), MRR, upcoming renewals
   * (next 14 days), failed payments (30d). Pure SQL — no Stripe API calls.
   */
  @Get('stats/subscriptions')
  async getSubscriptionStats(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    const conn = this.em.getConnection();

    // All five metrics + MRR in one round trip via a CTE-shaped union of counts.
    // Sum is annual amount_paid for active stripe-subscription rows; MRR ≈ /12.
    const rows = await conn.execute<Array<{
      active: string; churn: string; renew: string; failed: string; annual_sum: string;
    }>>(`
      SELECT
        COUNT(*) FILTER (WHERE payment_status = 'paid' AND cancelled_at IS NULL AND (end_date IS NULL OR end_date >= NOW()))                                              AS active,
        COUNT(*) FILTER (WHERE cancelled_at >= NOW() - INTERVAL '30 days')                                                                                                AS churn,
        COUNT(*) FILTER (WHERE stripe_subscription_id IS NOT NULL AND payment_status = 'paid' AND cancelled_at IS NULL AND end_date BETWEEN NOW() AND NOW() + INTERVAL '14 days') AS renew,
        COUNT(*) FILTER (WHERE payment_status = 'failed' AND updated_at >= NOW() - INTERVAL '30 days')                                                                    AS failed,
        COALESCE(SUM(amount_paid) FILTER (WHERE stripe_subscription_id IS NOT NULL AND payment_status = 'paid' AND cancelled_at IS NULL AND (end_date IS NULL OR end_date >= NOW())), 0) AS annual_sum
      FROM memberships
    `);
    const row = rows[0] || { active: '0', churn: '0', renew: '0', failed: '0', annual_sum: '0' };
    const mrrCents = Math.round((parseFloat(row.annual_sum) / 12) * 100);

    return {
      active: Number(row.active),
      churnLast30Days: Number(row.churn),
      upcomingRenewalsNext14Days: Number(row.renew),
      failedPaymentsLast30Days: Number(row.failed),
      mrrCents,
      mrrFormatted: `$${(mrrCents / 100).toFixed(2)}`,
    };
  }

  /**
   * Get order statistics
   */
  @Get('stats/orders')
  async getOrderStats(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    const counts = await this.ordersService.getStatusCounts();
    const recentOrders = await this.ordersService.getRecentOrders(10);

    return {
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      recent: recentOrders,
    };
  }

  /**
   * Get invoice statistics
   */
  @Get('stats/invoices')
  async getInvoiceStats(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    const counts = await this.invoicesService.getStatusCounts();
    const unpaid = await this.invoicesService.getUnpaidTotal();
    const recentInvoices = await this.invoicesService.getRecentInvoices(10);

    return {
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      unpaid,
      recent: recentInvoices,
    };
  }

  /**
   * Get revenue statistics
   */
  @Get('stats/revenue')
  async getRevenueStats(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.requireAdmin(authHeader);
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const completedOrders = await this.ordersService.findCompletedSince(start);
    const paidInvoices = await this.invoicesService.findPaidSince(start);

    const orderRevenue = completedOrders
      .filter(o => o.createdAt && new Date(o.createdAt) <= end)
      .reduce((sum, o) => sum + parseFloat(o.total), 0);

    const invoiceRevenue = paidInvoices
      .filter(i => i.paidAt && new Date(i.paidAt) <= end)
      .reduce((sum, i) => sum + parseFloat(i.total), 0);

    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      orders: {
        count: completedOrders.length,
        revenue: orderRevenue.toFixed(2),
      },
      invoices: {
        count: paidInvoices.length,
        revenue: invoiceRevenue.toFixed(2),
      },
      total: {
        revenue: Math.max(orderRevenue, invoiceRevenue).toFixed(2),
        currency: 'USD',
      },
    };
  }

  // ==========================================
  // SYNC OPERATIONS
  // ==========================================

  /**
   * Sync orders and invoices from paid event registrations
   * This creates orders/invoices for registrations that are missing them
   */
  @Post('sync/registrations')
  @HttpCode(HttpStatus.OK)
  async syncRegistrationOrders(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    const em = this.em.fork();

    // Find all paid registrations
    const paidRegistrations = await em.find(
      EventRegistration,
      { paymentStatus: PaymentStatus.PAID },
      { populate: ['event'] },
    );

    // Find all existing orders with registration references
    const existingOrders = await em.find(Order, {
      notes: { $like: '%registrationId:%' },
    });

    // Extract registration IDs that already have orders
    const registrationIdsWithOrders = new Set<string>();
    for (const order of existingOrders) {
      const match = order.notes?.match(/registrationId:([a-f0-9-]+)/);
      if (match) {
        registrationIdsWithOrders.add(match[1]);
      }
    }

    // Find registrations without orders
    const registrationsToSync = paidRegistrations.filter(
      (reg) => !registrationIdsWithOrders.has(reg.id),
    );

    const results = {
      totalPaidRegistrations: paidRegistrations.length,
      existingOrders: registrationIdsWithOrders.size,
      toSync: registrationsToSync.length,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Create orders and invoices for each registration
    for (const registration of registrationsToSync) {
      try {
        const order = await this.ordersService.createFromEventRegistration(registration.id);
        await this.invoicesService.createFromOrder(order.id);
        results.synced++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Registration ${registration.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return results;
  }

  /**
   * Sync a single registration to create order/invoice
   */
  @Post('sync/registrations/:registrationId')
  @HttpCode(HttpStatus.OK)
  async syncSingleRegistration(
    @Headers('authorization') authHeader: string,
    @Param('registrationId') registrationId: string,
  ) {
    await this.requireAdmin(authHeader);
    const order = await this.ordersService.createFromEventRegistration(registrationId);
    const invoice = await this.invoicesService.createFromOrder(order.id);

    return {
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
      },
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
      },
    };
  }

  /**
   * Fix invoices with null due dates (sets them to their creation date)
   */
  @Post('fix/null-due-dates')
  @HttpCode(HttpStatus.OK)
  async fixNullDueDates(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.invoicesService.fixNullDueDates();
  }

  // ==========================================
  // EXPORT OPERATIONS
  // ==========================================

  /**
   * Export orders as CSV
   */
  @Get('export/orders')
  @Header('Content-Type', 'text/csv')
  async exportOrders(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: OrderStatus,
    @Res() res?: Response,
  ) {
    await this.requireAdmin(authHeader);
    const query: OrderListQuery = {
      page: 1,
      limit: 10000, // Get all orders
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    };

    const result = await this.ordersService.findAll(query);

    // Build CSV content
    const headers = [
      'Order Number',
      'Date',
      'Customer Email',
      'Customer Name',
      'MECA ID',
      'Order Type',
      'Status',
      'Subtotal',
      'Tax',
      'Discount',
      'Total',
      'Currency',
      'Items',
    ];

    const rows = result.data.map(order => [
      order.orderNumber,
      order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : '',
      order.member?.email || '',
      order.member ? `${order.member.first_name || ''} ${order.member.last_name || ''}`.trim() : '',
      order.member?.meca_id || '',
      order.orderType,
      order.status,
      order.subtotal,
      order.tax,
      order.discount,
      order.total,
      order.currency,
      order.items.getItems().map(i => i.description).join('; '),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const filename = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
    res?.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res?.send(csv);
  }

  /**
   * Export invoices as CSV
   */
  @Get('export/invoices')
  @Header('Content-Type', 'text/csv')
  async exportInvoices(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: InvoiceStatus,
    @Res() res?: Response,
  ) {
    await this.requireAdmin(authHeader);
    const query: InvoiceListQuery = {
      page: 1,
      limit: 10000, // Get all invoices
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    };

    const result = await this.invoicesService.findAll(query);

    // Build CSV content
    const headers = [
      'Invoice Number',
      'Created Date',
      'Due Date',
      'Paid Date',
      'Customer Email',
      'Customer Name',
      'MECA ID',
      'Status',
      'Subtotal',
      'Tax',
      'Discount',
      'Total',
      'Currency',
      'Items',
    ];

    const rows = result.data.map(invoice => [
      invoice.invoiceNumber,
      invoice.createdAt ? new Date(invoice.createdAt).toISOString().split('T')[0] : '',
      invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
      invoice.paidAt ? new Date(invoice.paidAt).toISOString().split('T')[0] : '',
      invoice.user?.email || '',
      invoice.user ? `${invoice.user.first_name || ''} ${invoice.user.last_name || ''}`.trim() : '',
      invoice.user?.meca_id || '',
      invoice.status,
      invoice.subtotal,
      invoice.tax,
      invoice.discount,
      invoice.total,
      invoice.currency,
      invoice.items.getItems().map(i => i.description).join('; '),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const filename = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`;
    res?.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res?.send(csv);
  }

  /**
   * Export revenue report as CSV
   */
  @Get('export/revenue')
  @Header('Content-Type', 'text/csv')
  async exportRevenue(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    await this.requireAdmin(authHeader);
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get completed orders and paid invoices
    const completedOrders = await this.ordersService.findCompletedSince(start);
    const filteredOrders = completedOrders.filter(o => o.createdAt && new Date(o.createdAt) <= end);

    // Group by month
    const monthlyRevenue: Record<string, { orders: number; revenue: number }> = {};

    for (const order of filteredOrders) {
      if (!order.createdAt) continue;
      const date = new Date(order.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = { orders: 0, revenue: 0 };
      }

      monthlyRevenue[monthKey].orders++;
      monthlyRevenue[monthKey].revenue += parseFloat(order.total);
    }

    // Build CSV content
    const headers = ['Month', 'Orders', 'Revenue'];

    const sortedMonths = Object.keys(monthlyRevenue).sort();
    const rows = sortedMonths.map(month => [
      month,
      monthlyRevenue[month].orders,
      monthlyRevenue[month].revenue.toFixed(2),
    ]);

    // Add totals row
    const totalOrders = Object.values(monthlyRevenue).reduce((sum, m) => sum + m.orders, 0);
    const totalRevenue = Object.values(monthlyRevenue).reduce((sum, m) => sum + m.revenue, 0);
    rows.push(['TOTAL', totalOrders, totalRevenue.toFixed(2)]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const filename = `revenue-report-${new Date().toISOString().split('T')[0]}.csv`;
    res?.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res?.send(csv);
  }
}
