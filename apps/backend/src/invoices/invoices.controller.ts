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
} from '@nestjs/common';
import { Response } from 'express';
import {
  CreateInvoiceDto,
  CreateInvoiceSchema,
  UpdateInvoiceStatusDto,
  UpdateInvoiceStatusSchema,
  InvoiceListQuery,
  InvoiceListQuerySchema,
} from '@newmeca/shared';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './pdf/invoice-pdf.service';

@Controller('api/invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: InvoicePdfService,
  ) {}

  /**
   * Get all invoices with filters (admin)
   */
  @Get()
  async findAll(@Query() query: InvoiceListQuery) {
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
  async create(@Body() data: CreateInvoiceDto) {
    const validatedData = CreateInvoiceSchema.parse(data);
    return this.invoicesService.create(validatedData);
  }

  /**
   * Create invoice from order
   */
  @Post('from-order/:orderId')
  @HttpCode(HttpStatus.CREATED)
  async createFromOrder(@Param('orderId') orderId: string) {
    return this.invoicesService.createFromOrder(orderId);
  }

  /**
   * Update invoice status
   */
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() data: UpdateInvoiceStatusDto,
  ) {
    const validatedData = UpdateInvoiceStatusSchema.parse(data);
    return this.invoicesService.updateStatus(id, validatedData);
  }

  /**
   * Send invoice email to user
   */
  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  async sendInvoice(@Param('id') id: string) {
    return this.invoicesService.sendInvoice(id);
  }

  /**
   * Resend invoice email (for already sent invoices)
   */
  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  async resendInvoice(@Param('id') id: string) {
    return this.invoicesService.resendInvoice(id);
  }

  /**
   * Mark invoice as paid
   */
  @Post(':id/paid')
  @HttpCode(HttpStatus.OK)
  async markAsPaid(@Param('id') id: string) {
    return this.invoicesService.markAsPaid(id);
  }

  /**
   * Cancel an invoice
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.invoicesService.cancel(id, body.reason);
  }

  /**
   * Mark overdue invoices (cron job endpoint)
   */
  @Post('batch/mark-overdue')
  @HttpCode(HttpStatus.OK)
  async markOverdueInvoices() {
    const count = await this.invoicesService.markOverdueInvoices();
    return { markedOverdue: count };
  }
}
