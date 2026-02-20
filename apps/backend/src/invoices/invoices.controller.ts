import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  Header,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Response } from 'express';
import {
  CreateInvoiceDto,
  CreateInvoiceSchema,
  UpdateInvoiceStatusDto,
  UpdateInvoiceStatusSchema,
  InvoiceListQuery,
  InvoiceListQuerySchema,
  UserRole,
} from '@newmeca/shared';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './pdf/invoice-pdf.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';

@Controller('api/invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: InvoicePdfService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  /**
   * Get all invoices with filters (admin)
   */
  @Get()
  async findAll(
    @Headers('authorization') authHeader: string,
    @Query() query: InvoiceListQuery,
  ) {
    await this.requireAdmin(authHeader);
    const validatedQuery = InvoiceListQuerySchema.parse(query);
    return this.invoicesService.findAll(validatedQuery);
  }

  /**
   * Get invoice for public payment page (no auth required)
   * Note: Must be before :id route
   */
  @Get('pay/:id')
  async getInvoiceForPayment(@Param('id') id: string) {
    const invoice = await this.invoicesService.findById(id);
    // Return only info needed for payment
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      discount: invoice.discount,
      total: invoice.total,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      items: invoice.items.getItems().map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      billingAddress: invoice.billingAddress,
      companyInfo: invoice.companyInfo,
      user: invoice.user ? {
        email: invoice.user.email,
        firstName: invoice.user.first_name,
        lastName: invoice.user.last_name,
      } : null,
    };
  }

  /**
   * Get invoices by user ID
   * Note: Must be before :id route
   */
  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.invoicesService.findByUser(userId, page, limit);
  }

  /**
   * Get invoice status counts (admin dashboard)
   * Note: Must be before :id route
   */
  @Get('stats/counts')
  async getStatusCounts() {
    return this.invoicesService.getStatusCounts();
  }

  /**
   * Get recent invoices (admin dashboard)
   * Note: Must be before :id route
   */
  @Get('stats/recent')
  async getRecentInvoices(@Query('limit') limit?: number) {
    return this.invoicesService.getRecentInvoices(limit);
  }

  /**
   * Get unpaid invoices total
   * Note: Must be before :id route
   */
  @Get('stats/unpaid')
  async getUnpaidTotal() {
    return this.invoicesService.getUnpaidTotal();
  }

  /**
   * Get invoice by ID
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.invoicesService.findById(id);
  }

  /**
   * Get invoice PDF (returns HTML for printing/PDF conversion)
   */
  @Get(':id/pdf')
  @Header('Content-Type', 'text/html')
  async getInvoicePdf(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.invoicesService.findById(id);
    const html = this.pdfService.generateInvoiceHtml(invoice);
    res.send(html);
  }

  /**
   * Get invoice PDF for download (with proper filename)
   */
  @Get(':id/download')
  @Header('Content-Type', 'text/html')
  async downloadInvoicePdf(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.invoicesService.findById(id);
    const html = this.pdfService.generateInvoiceHtml(invoice);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber}.html"`,
    );
    res.send(html);
  }

  /**
   * Create a new invoice (admin)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateInvoiceDto,
  ) {
    await this.requireAdmin(authHeader);
    const validatedData = CreateInvoiceSchema.parse(data);
    return this.invoicesService.create(validatedData);
  }

  /**
   * Create invoice from order (admin)
   */
  @Post('from-order/:orderId')
  @HttpCode(HttpStatus.CREATED)
  async createFromOrder(
    @Headers('authorization') authHeader: string,
    @Param('orderId') orderId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.invoicesService.createFromOrder(orderId);
  }

  /**
   * Update invoice status (admin)
   */
  @Put(':id/status')
  async updateStatus(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: UpdateInvoiceStatusDto,
  ) {
    await this.requireAdmin(authHeader);
    const validatedData = UpdateInvoiceStatusSchema.parse(data);
    return this.invoicesService.updateStatus(id, validatedData);
  }

  /**
   * Send invoice email to user (admin)
   */
  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  async sendInvoice(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.invoicesService.sendInvoice(id);
  }

  /**
   * Resend invoice email (admin)
   */
  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  async resendInvoice(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.invoicesService.resendInvoice(id);
  }

  /**
   * Mark invoice as paid (admin)
   */
  @Post(':id/paid')
  @HttpCode(HttpStatus.OK)
  async markAsPaid(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.invoicesService.markAsPaid(id);
  }

  /**
   * Cancel an invoice (admin)
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    await this.requireAdmin(authHeader);
    return this.invoicesService.cancel(id, body.reason);
  }

  /**
   * Mark overdue invoices (admin/cron job endpoint)
   */
  @Post('batch/mark-overdue')
  @HttpCode(HttpStatus.OK)
  async markOverdueInvoices(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    const count = await this.invoicesService.markOverdueInvoices();
    return { markedOverdue: count };
  }
}
