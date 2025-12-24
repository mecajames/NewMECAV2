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
} from '@nestjs/common';
import { Response } from 'express';
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
} from '@newmeca/shared';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { InvoicePdfService } from '../invoices/pdf/invoice-pdf.service';

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
}
