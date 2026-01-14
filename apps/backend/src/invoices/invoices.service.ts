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
  CreateInvoiceDto,
  UpdateInvoiceStatusDto,
  InvoiceListQuery,
  CompanyInfo,
  BillingAddress,
} from '@newmeca/shared';
import { Invoice } from './invoices.entity';
import { InvoiceItem } from './invoice-items.entity';
import { Profile } from '../profiles/profiles.entity';
import { Order } from '../orders/orders.entity';
import { EmailService } from '../email/email.service';

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
      { populate: ['user', 'items', 'order'] },
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
      { populate: ['user', 'items', 'order'] },
    );
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

    // Build filter
    const filter: any = {};

    if (status) {
      filter.status = status;
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
      filter.invoiceNumber = { $like: `%${search}%` };
    }

    if (overdue) {
      filter.status = InvoiceStatus.SENT;
      filter.dueDate = { $lt: new Date() };
    }

    const [invoices, total] = await em.findAndCount(Invoice, filter, {
      populate: ['user', 'items'],
      limit,
      offset,
      orderBy: { createdAt: 'DESC' },
    });

    return {
      data: invoices,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new invoice manually (admin)
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

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(em);

    // Calculate totals
    const { subtotal, total } = this.calculateTotals(data.items);

    // Calculate due date (30 days from now if not specified)
    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create invoice
    const invoice = em.create(Invoice, {
      invoiceNumber,
      user,
      status: InvoiceStatus.DRAFT,
      subtotal,
      tax: '0.00',
      discount: '0.00',
      total,
      currency: data.currency || 'USD',
      dueDate,
      notes: data.notes,
      billingAddress: data.billingAddress,
      companyInfo: DEFAULT_COMPANY_INFO,
    });

    // Create invoice items
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

    await em.persistAndFlush(invoice);

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
      { populate: ['user', 'items'] },
    );

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Check if invoice already exists for this order
    const existingInvoice = await em.findOne(Invoice, { order: orderId });
    if (existingInvoice) {
      return existingInvoice;
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(em);

    // Calculate due date (30 days from now)
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Build invoice data
    const invoiceData: Partial<Invoice> = {
      invoiceNumber,
      order,
      status: InvoiceStatus.PAID, // Since it's from a completed order
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      total: order.total,
      currency: order.currency,
      dueDate,
      paidAt: new Date(),
      notes: order.notes,
      billingAddress: order.billingAddress as BillingAddress,
      companyInfo: DEFAULT_COMPANY_INFO,
    };

    // Set user if available
    if (order.user) {
      invoiceData.user = order.user;
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
   * Update invoice status
   */
  async updateStatus(id: string, data: UpdateInvoiceStatusDto): Promise<Invoice> {
    const em = this.em.fork();
    const invoice = await em.findOne(Invoice, { id }, { populate: ['items'] });

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

    wrap(invoice).assign(updates);
    await em.flush();

    return invoice;
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
   * Cancel an invoice
   */
  async cancel(id: string, reason?: string): Promise<Invoice> {
    const em = this.em.fork();
    const invoice = await em.findOne(Invoice, { id }, { populate: ['items'] });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException(
        'Cannot cancel a paid invoice. Use refund instead.',
      );
    }

    wrap(invoice).assign({
      status: InvoiceStatus.CANCELLED,
      notes: reason || invoice.notes,
    });

    await em.flush();

    return invoice;
  }

  /**
   * Mark invoice as refunded
   */
  async markRefunded(id: string, reason: string): Promise<Invoice> {
    const em = this.em.fork();
    const invoice = await em.findOne(Invoice, { id }, { populate: ['items'] });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    wrap(invoice).assign({
      status: InvoiceStatus.REFUNDED,
      notes: reason,
    });

    await em.flush();

    return invoice;
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
    });

    for (const invoice of overdueInvoices) {
      wrap(invoice).assign({ status: InvoiceStatus.OVERDUE });
    }

    await em.flush();

    return overdueInvoices.length;
  }

  /**
   * Get invoice counts by status
   */
  async getStatusCounts(): Promise<Record<InvoiceStatus, number>> {
    const em = this.em.fork();

    const counts: Record<InvoiceStatus, number> = {
      [InvoiceStatus.DRAFT]: 0,
      [InvoiceStatus.SENT]: 0,
      [InvoiceStatus.PAID]: 0,
      [InvoiceStatus.OVERDUE]: 0,
      [InvoiceStatus.CANCELLED]: 0,
      [InvoiceStatus.REFUNDED]: 0,
    };

    for (const status of Object.values(InvoiceStatus)) {
      counts[status] = await em.count(Invoice, { status });
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
    wrap(invoice).assign({
      status: InvoiceStatus.SENT,
      sentAt: new Date(),
    });

    await em.flush();

    this.logger.log(`Invoice ${invoice.invoiceNumber} sent to ${email}`);

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

    return {
      success: true,
      invoice,
    };
  }
}
