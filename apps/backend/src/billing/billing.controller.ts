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
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // ==========================================
  // ORDERS ENDPOINTS
  // ==========================================

  /**
   * Get all orders with filters (admin)
   */
  @Get('orders')
  async getOrders(@Query() query: OrderListQuery) {
    const validatedQuery = OrderListQuerySchema.parse(query);
    return this.ordersService.findAll(validatedQuery);
  }

  /**
   * Get order by ID
   */
  @Get('orders/:id')
  async getOrder(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  /**
   * Create a new order (admin)
   */
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() data: CreateOrderDto) {
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
  async getInvoices(@Query() query: InvoiceListQuery) {
    const validatedQuery = InvoiceListQuerySchema.parse(query);
    return this.invoicesService.findAll(validatedQuery);
  }

  /**
   * Get invoice by ID
   */
  @Get('invoices/:id')
  async getInvoice(@Param('id') id: string) {
    return this.invoicesService.findById(id);
  }

  /**
   * Get invoice PDF
   */
  @Get('invoices/:id/pdf')
  @Header('Content-Type', 'text/html')
  async getInvoicePdf(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.invoicesService.findById(id);
    const html = this.pdfService.generateInvoiceHtml(invoice);
    res.send(html);
  }

  /**
   * Create a new invoice (admin)
   */
  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(@Body() data: CreateInvoiceDto) {
    const validatedData = CreateInvoiceSchema.parse(data);
    return this.invoicesService.create(validatedData);
  }

  /**
   * Send invoice email
   */
  @Post('invoices/:id/send')
  @HttpCode(HttpStatus.OK)
  async sendInvoice(@Param('id') id: string) {
    // Mark as sent (email sending would be added here)
    const invoice = await this.invoicesService.markAsSent(id);
    // TODO: Integrate with email service to send invoice
    return { success: true, invoice };
  }

  // ==========================================
  // USER BILLING ENDPOINTS (My Billing)
  // ==========================================

  /**
   * Get current user's orders
   */
  @Get('my/orders')
  async getMyOrders(
    @Query('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Note: In production, userId should come from authenticated user
    return this.ordersService.findByUser(userId, page, limit);
  }

  /**
   * Get current user's invoices
   */
  @Get('my/invoices')
  async getMyInvoices(
    @Query('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Note: In production, userId should come from authenticated user
    return this.invoicesService.findByUser(userId, page, limit);
  }

  /**
   * Get current user's invoice PDF
   */
  @Get('my/invoices/:id/pdf')
  @Header('Content-Type', 'text/html')
  async getMyInvoicePdf(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.invoicesService.findById(id);
    // TODO: Verify invoice belongs to authenticated user
    const html = this.pdfService.generateInvoiceHtml(invoice);
    res.send(html);
  }

  // ==========================================
  // DASHBOARD STATS ENDPOINTS
  // ==========================================

  /**
   * Get billing dashboard statistics
   */
  @Get('stats/dashboard')
  async getDashboardStats() {
    // Run all queries in parallel
    const [
      orderStatusCounts,
      invoiceStatusCounts,
      unpaidTotal,
      recentOrders,
      recentInvoices,
    ] = await Promise.all([
      this.ordersService.getStatusCounts(),
      this.invoicesService.getStatusCounts(),
      this.invoicesService.getUnpaidTotal(),
      this.ordersService.getRecentOrders(5),
      this.invoicesService.getRecentInvoices(5),
    ]);

    // Calculate revenue from completed orders
    const completedOrders = await this.ordersService.findAll({
      page: 1,
      status: OrderStatus.COMPLETED,
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
    };
  }

  /**
   * Get order statistics
   */
  @Get('stats/orders')
  async getOrderStats() {
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
  async getInvoiceStats() {
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
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
  async syncRegistrationOrders() {
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
  async syncSingleRegistration(@Param('registrationId') registrationId: string) {
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

  // ==========================================
  // EXPORT OPERATIONS
  // ==========================================

  /**
   * Export orders as CSV
   */
  @Get('export/orders')
  @Header('Content-Type', 'text/csv')
  async exportOrders(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: OrderStatus,
    @Res() res?: Response,
  ) {
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
      order.user?.email || '',
      order.user ? `${order.user.first_name || ''} ${order.user.last_name || ''}`.trim() : '',
      order.user?.meca_id || '',
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: InvoiceStatus,
    @Res() res?: Response,
  ) {
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
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
