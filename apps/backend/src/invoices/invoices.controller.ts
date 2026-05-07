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
  ApplyManualPaymentDto,
  ApplyManualPaymentSchema,
  InvoiceListQuery,
  InvoiceListQuerySchema,
  UserRole,
} from '@newmeca/shared';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './pdf/invoice-pdf.service';
import { Public } from '../auth/public.decorator';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import { AdminAuditService } from '../user-activity/admin-audit.service';

@Controller('api/invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: InvoicePdfService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
    private readonly adminAuditService: AdminAuditService,
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
    if (!isAdminUser(profile)) {
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
  @Public()
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
    const { user } = await this.requireAdmin(authHeader);
    const validatedData = CreateInvoiceSchema.parse(data);
    const created = await this.invoicesService.create(validatedData);
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'invoice_create',
      resourceType: 'invoice',
      resourceId: created.id,
      description: `Created invoice ${created.invoiceNumber} (${created.currency} ${created.total})`,
      newValues: { items: validatedData.items.length, total: created.total },
    });
    return created;
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
    const { user } = await this.requireAdmin(authHeader);
    const validatedData = UpdateInvoiceStatusSchema.parse(data);
    const updated = await this.invoicesService.updateStatus(id, validatedData);
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'invoice_update_status',
      resourceType: 'invoice',
      resourceId: id,
      description: `Updated invoice ${updated.invoiceNumber} status → ${validatedData.status}`,
      newValues: { status: validatedData.status, notes: validatedData.notes },
    });
    return updated;
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
    const { user } = await this.requireAdmin(authHeader);
    const updated = await this.invoicesService.markAsPaid(id);
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'invoice_mark_paid',
      resourceType: 'invoice',
      resourceId: id,
      description: `Marked invoice ${updated.invoiceNumber} as paid`,
    });
    return updated;
  }

  /**
   * Apply a manual payment (cash, check, wire, money order, complimentary,
   * or other) to an invoice (admin). Records a Payment row, marks the
   * invoice PAID, and flips the paired Order to COMPLETED.
   */
  @Post(':id/apply-manual-payment')
  @HttpCode(HttpStatus.OK)
  async applyManualPayment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: ApplyManualPaymentDto,
  ) {
    const { user } = await this.requireAdmin(authHeader);
    const validatedData = ApplyManualPaymentSchema.parse(data);
    const updated = await this.invoicesService.applyManualPayment(id, validatedData);
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'invoice_apply_manual_payment',
      resourceType: 'invoice',
      resourceId: id,
      description: `Manual ${validatedData.method.toUpperCase()} payment recorded on ${updated.invoiceNumber}` +
        (validatedData.reference ? ` (${validatedData.reference})` : ''),
      newValues: {
        method: validatedData.method,
        reference: validatedData.reference,
        amount: validatedData.amount,
      },
    });
    return updated;
  }

  /**
   * Apply a credit memo (write-off) against an invoice (admin). No money
   * is recorded — the credit reduces the outstanding balance directly.
   */
  @Post(':id/apply-credit-memo')
  @HttpCode(HttpStatus.OK)
  async applyCreditMemo(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { amount: string; reason: string },
  ) {
    const { user } = await this.requireAdmin(authHeader);
    if (!body?.amount || !body?.reason) {
      throw new ForbiddenException('amount and reason are required');
    }
    const updated = await this.invoicesService.applyCreditMemo(id, body.amount, body.reason);
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'invoice_credit_memo',
      resourceType: 'invoice',
      resourceId: id,
      description: `Credit memo $${body.amount} applied to ${updated.invoiceNumber}: ${body.reason}`,
      newValues: { amount: body.amount, reason: body.reason },
    });
    return updated;
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
    const { user } = await this.requireAdmin(authHeader);
    const cancelled = await this.invoicesService.cancel(id, body.reason);
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'invoice_cancel',
      resourceType: 'invoice',
      resourceId: id,
      description: `Cancelled invoice ${cancelled.invoiceNumber}` + (body.reason ? `: ${body.reason}` : ''),
    });
    return cancelled;
  }

  /**
   * Refund a paid invoice: issues Stripe refund, marks the invoice/order/payment
   * as REFUNDED, and deletes the memberships created from the purchase so the
   * user can re-order with the same email. (admin)
   */
  @Post(':id/refund-cleanup')
  @HttpCode(HttpStatus.OK)
  async refundAndCleanup(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const { user } = await this.requireAdmin(authHeader);
    const result = await this.invoicesService.refundAndCleanup(id, body.reason || 'Refunded by admin');
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'invoice_refund',
      resourceType: 'invoice',
      resourceId: id,
      description: `Refunded invoice ${result.invoice.invoiceNumber}: ${body.reason || 'no reason given'}` +
        (result.deletedMembershipIds.length ? ` — deleted ${result.deletedMembershipIds.length} membership(s)` : ''),
      newValues: {
        stripeRefundId: result.stripeRefundId,
        deletedMembershipIds: result.deletedMembershipIds,
      },
    });
    return result;
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

  /**
   * Send invoice reminders (admin trigger; cron does this daily).
   */
  @Post('batch/send-reminders')
  @HttpCode(HttpStatus.OK)
  async sendReminders(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.invoicesService.sendInvoiceReminders();
  }

  /**
   * Bulk admin actions: mark paid / cancel / resend across multiple invoices.
   */
  @Post('bulk/mark-paid')
  @HttpCode(HttpStatus.OK)
  async bulkMarkPaid(
    @Headers('authorization') authHeader: string,
    @Body() body: { ids: string[] },
  ) {
    await this.requireAdmin(authHeader);
    return this.invoicesService.bulkMarkPaid(body?.ids ?? []);
  }

  @Post('bulk/cancel')
  @HttpCode(HttpStatus.OK)
  async bulkCancel(
    @Headers('authorization') authHeader: string,
    @Body() body: { ids: string[]; reason?: string },
  ) {
    await this.requireAdmin(authHeader);
    return this.invoicesService.bulkCancel(body?.ids ?? [], body?.reason);
  }

  @Post('bulk/resend')
  @HttpCode(HttpStatus.OK)
  async bulkResend(
    @Headers('authorization') authHeader: string,
    @Body() body: { ids: string[] },
  ) {
    await this.requireAdmin(authHeader);
    return this.invoicesService.bulkResend(body?.ids ?? []);
  }
}
