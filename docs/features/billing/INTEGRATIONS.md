# Billing Integrations

## Overview

The billing system integrates with several external services and internal modules to provide complete payment processing, accounting, and notification capabilities.

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BILLING INTEGRATIONS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │   BILLING    │
                              │   SYSTEM     │
                              └──────┬───────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│    STRIPE    │           │  QUICKBOOKS  │           │    EMAIL     │
│  (Payments)  │           │ (Accounting) │           │ (Notifications)
└──────────────┘           └──────────────┘           └──────────────┘
        │                            │                            │
        │                            │                            │
        ▼                            ▼                            ▼
┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│ Payment      │           │ Sales        │           │ Invoice      │
│ Processing   │           │ Receipts     │           │ Delivery     │
│              │           │              │           │              │
│ Refunds      │           │ Credit       │           │ Payment      │
│              │           │ Memos        │           │ Reminders    │
└──────────────┘           └──────────────┘           └──────────────┘
```

---

## Stripe Integration

### Existing Infrastructure

The billing system leverages the existing Stripe module:
- `apps/backend/src/stripe/stripe.service.ts`
- `apps/backend/src/stripe/stripe.controller.ts`

### Payment Flow Integration

```typescript
// Enhanced stripe webhook handler for order/invoice creation
// apps/backend/src/stripe/stripe.controller.ts

@Post('webhook')
async handleWebhook(
  @Body() body: Buffer,
  @Headers('stripe-signature') signature: string,
) {
  const event = this.stripeService.verifyWebhookSignature(body, signature);

  switch (event.type) {
    case 'payment_intent.succeeded':
      await this.handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await this.handlePaymentFailed(event.data.object);
      break;
    case 'charge.refunded':
      await this.handleRefund(event.data.object);
      break;
  }
}

private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata;

  // 1. Update/create payment record (existing)
  const payment = await this.paymentService.processPayment({
    stripePaymentIntentId: paymentIntent.id,
    amount: (paymentIntent.amount / 100).toFixed(2),
    paymentStatus: PaymentStatus.PAID,
  });

  // 2. NEW: Create order from payment
  const order = await this.orderService.createFromPayment({
    paymentId: payment.id,
    userId: metadata.userId,
    orderType: metadata.paymentType as OrderType,
    items: this.extractOrderItems(metadata),
    billingAddress: this.extractBillingAddress(paymentIntent),
  });

  // 3. NEW: Generate invoice
  const invoice = await this.invoiceService.createFromOrder(order);

  // 4. NEW: Generate PDF
  await this.invoicePdfService.generate(invoice);

  // 5. NEW: Send invoice email (if enabled)
  if (metadata.sendInvoiceEmail !== 'false') {
    await this.emailService.sendInvoice(invoice);
  }

  // 6. Sync to QuickBooks (existing)
  await this.quickbooksService.createSalesReceipt(payment);
}

private async handleRefund(charge: Stripe.Charge) {
  const refund = charge.refunds?.data[0];
  if (!refund) return;

  // 1. Update payment status
  const payment = await this.paymentService.findByStripePaymentIntent(
    charge.payment_intent as string
  );

  await this.paymentService.refundPayment({
    id: payment.id,
    refundReason: refund.reason || 'Refund processed',
  });

  // 2. NEW: Update order status
  await this.orderService.updateStatus(payment.order?.id, {
    status: OrderStatus.REFUNDED,
    notes: `Refund processed: ${refund.reason || 'No reason provided'}`,
  });

  // 3. NEW: Update invoice status
  await this.invoiceService.updateStatus(payment.invoice?.id, {
    status: InvoiceStatus.REFUNDED,
  });

  // 4. Create QuickBooks credit memo
  await this.quickbooksService.createCreditMemo(payment);
}
```

### Refund Processing

```typescript
// apps/backend/src/billing/billing.service.ts

@Injectable()
export class BillingService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly orderService: OrderService,
    private readonly invoiceService: InvoiceService,
    private readonly paymentService: PaymentService,
    private readonly quickbooksService: QuickBooksService,
    private readonly emailService: EmailService,
  ) {}

  async processRefund(orderId: string, data: RefundOrderDto) {
    const order = await this.orderService.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const payment = order.payment;
    if (!payment) throw new BadRequestException('No payment found for order');

    const refundAmount = data.amount
      ? parseFloat(data.amount)
      : parseFloat(order.total);

    // 1. Process Stripe refund (if requested)
    if (data.refundToStripe && payment.stripePaymentIntentId) {
      await this.stripeService.createRefund({
        payment_intent: payment.stripePaymentIntentId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: 'requested_by_customer',
      });
    }

    // 2. Update payment record
    await this.paymentService.refundPayment({
      id: payment.id,
      refundReason: data.reason,
    });

    // 3. Update order status
    await this.orderService.updateStatus(orderId, {
      status: OrderStatus.REFUNDED,
      notes: `Refund: ${data.reason}`,
    });

    // 4. Update invoice status
    if (order.invoice) {
      await this.invoiceService.updateStatus(order.invoice.id, {
        status: InvoiceStatus.REFUNDED,
      });
    }

    // 5. Create QuickBooks credit memo
    await this.quickbooksService.createCreditMemo(payment);

    // 6. Send refund confirmation email
    await this.emailService.sendRefundConfirmation(order, refundAmount);

    return order;
  }
}
```

---

## QuickBooks Integration

### Existing Infrastructure

The QuickBooks module handles accounting synchronization:
- `apps/backend/src/quickbooks/quickbooks.service.ts`
- OAuth connection management
- Sales receipt creation

### Enhanced Integration

```typescript
// apps/backend/src/quickbooks/quickbooks.service.ts

@Injectable()
export class QuickBooksService {
  // Existing methods...

  /**
   * Create a sales receipt for a completed order
   */
  async createSalesReceiptFromOrder(order: Order): Promise<void> {
    if (!this.isConnected()) {
      this.logger.warn('QuickBooks not connected, skipping sales receipt');
      return;
    }

    const lineItems = order.items.map((item) => ({
      Description: item.description,
      Amount: parseFloat(item.total),
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        Qty: item.quantity,
        UnitPrice: parseFloat(item.unitPrice),
        ItemRef: this.mapItemType(item.itemType),
      },
    }));

    const salesReceipt = {
      Line: lineItems,
      CustomerRef: await this.findOrCreateCustomer(order.user),
      TxnDate: order.createdAt.toISOString().split('T')[0],
      PrivateNote: `Order: ${order.orderNumber}`,
      CustomField: [
        {
          DefinitionId: '1',
          Name: 'Order Number',
          Type: 'StringType',
          StringValue: order.orderNumber,
        },
      ],
    };

    try {
      await this.qbo.createSalesReceipt(salesReceipt);
      this.logger.log(`QuickBooks sales receipt created for ${order.orderNumber}`);
    } catch (error) {
      this.logger.error(`Failed to create QuickBooks receipt: ${error.message}`);
      // Don't throw - QuickBooks failures shouldn't block the main flow
    }
  }

  /**
   * Create a credit memo for a refund
   */
  async createCreditMemo(payment: Payment): Promise<void> {
    if (!this.isConnected()) {
      this.logger.warn('QuickBooks not connected, skipping credit memo');
      return;
    }

    const creditMemo = {
      Line: [
        {
          Description: `Refund: ${payment.refundReason || 'Customer refund'}`,
          Amount: parseFloat(payment.amount),
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            Qty: 1,
            UnitPrice: parseFloat(payment.amount),
          },
        },
      ],
      CustomerRef: await this.findOrCreateCustomer(payment.user),
      TxnDate: new Date().toISOString().split('T')[0],
      PrivateNote: `Refund for payment ${payment.id}`,
    };

    try {
      await this.qbo.createCreditMemo(creditMemo);
      this.logger.log(`QuickBooks credit memo created for payment ${payment.id}`);
    } catch (error) {
      this.logger.error(`Failed to create QuickBooks credit memo: ${error.message}`);
    }
  }

  /**
   * Map order item types to QuickBooks items
   */
  private mapItemType(itemType: OrderItemType): { value: string; name: string } {
    const mapping: Record<OrderItemType, { value: string; name: string }> = {
      [OrderItemType.MEMBERSHIP]: { value: '1', name: 'Membership' },
      [OrderItemType.EVENT_CLASS]: { value: '2', name: 'Event Registration' },
      [OrderItemType.PROCESSING_FEE]: { value: '3', name: 'Processing Fee' },
      [OrderItemType.DISCOUNT]: { value: '4', name: 'Discount' },
      [OrderItemType.OTHER]: { value: '5', name: 'Other' },
    };
    return mapping[itemType] || mapping[OrderItemType.OTHER];
  }

  /**
   * Find or create a QuickBooks customer
   */
  private async findOrCreateCustomer(user: Profile | null) {
    if (!user) {
      return { value: '0', name: 'Guest Customer' };
    }

    // Check if customer exists
    const existing = await this.findCustomerByEmail(user.email);
    if (existing) {
      return { value: existing.Id, name: existing.DisplayName };
    }

    // Create new customer
    const customer = await this.qbo.createCustomer({
      DisplayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      PrimaryEmailAddr: { Address: user.email },
      GivenName: user.firstName,
      FamilyName: user.lastName,
    });

    return { value: customer.Id, name: customer.DisplayName };
  }
}
```

### Reconciliation Job

```typescript
// apps/backend/src/quickbooks/quickbooks-reconciliation.job.ts

@Injectable()
export class QuickBooksReconciliationJob {
  constructor(
    private readonly quickbooksService: QuickBooksService,
    private readonly orderService: OrderService,
    private readonly logger: Logger,
  ) {}

  /**
   * Daily job to reconcile orders with QuickBooks
   */
  @Cron('0 2 * * *') // Run at 2 AM daily
  async reconcile() {
    this.logger.log('Starting QuickBooks reconciliation');

    // Find orders completed in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const orders = await this.orderService.findCompletedSince(yesterday);

    for (const order of orders) {
      const hasReceipt = await this.quickbooksService.checkSalesReceipt(
        order.orderNumber
      );

      if (!hasReceipt) {
        this.logger.warn(`Missing QuickBooks receipt for ${order.orderNumber}`);
        await this.quickbooksService.createSalesReceiptFromOrder(order);
      }
    }

    this.logger.log(`Reconciliation complete. Processed ${orders.length} orders.`);
  }
}
```

---

## Email Integration

### Email Service

```typescript
// apps/backend/src/email/email.service.ts

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send invoice email with PDF attachment
   */
  async sendInvoice(invoice: Invoice): Promise<void> {
    const recipientEmail = invoice.billingAddress?.email || invoice.user?.email;
    if (!recipientEmail) {
      throw new Error('No recipient email for invoice');
    }

    // Generate PDF
    const pdfBuffer = await this.invoicePdfService.generate(invoice);

    await this.mailerService.sendMail({
      to: recipientEmail,
      subject: `Invoice ${invoice.invoiceNumber} from MECA`,
      template: 'invoice',
      context: {
        invoiceNumber: invoice.invoiceNumber,
        customerName:
          invoice.billingAddress?.name ||
          `${invoice.user?.firstName || ''} ${invoice.user?.lastName || ''}`.trim(),
        total: this.formatCurrency(invoice.total),
        dueDate: invoice.dueDate
          ? this.formatDate(invoice.dueDate)
          : 'Upon receipt',
        items: invoice.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: this.formatCurrency(item.unitPrice),
          total: this.formatCurrency(item.total),
        })),
        viewUrl: `${this.configService.get('APP_URL')}/billing/invoices/${invoice.id}`,
      },
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    // Update invoice sent timestamp
    await this.invoiceService.markAsSent(invoice.id);
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(order: Order): Promise<void> {
    const recipientEmail = order.billingAddress?.email || order.user?.email;
    if (!recipientEmail) return;

    await this.mailerService.sendMail({
      to: recipientEmail,
      subject: `Payment Confirmed - Order ${order.orderNumber}`,
      template: 'payment-confirmation',
      context: {
        orderNumber: order.orderNumber,
        customerName:
          order.billingAddress?.name ||
          `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim(),
        total: this.formatCurrency(order.total),
        items: order.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          total: this.formatCurrency(item.total),
        })),
        date: this.formatDate(order.createdAt),
      },
    });
  }

  /**
   * Send refund confirmation email
   */
  async sendRefundConfirmation(order: Order, refundAmount: number): Promise<void> {
    const recipientEmail = order.billingAddress?.email || order.user?.email;
    if (!recipientEmail) return;

    await this.mailerService.sendMail({
      to: recipientEmail,
      subject: `Refund Processed - Order ${order.orderNumber}`,
      template: 'refund-confirmation',
      context: {
        orderNumber: order.orderNumber,
        customerName:
          order.billingAddress?.name ||
          `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim(),
        refundAmount: this.formatCurrency(refundAmount.toFixed(2)),
        originalTotal: this.formatCurrency(order.total),
        date: this.formatDate(new Date()),
      },
    });
  }

  /**
   * Send payment reminder for overdue invoices
   */
  async sendPaymentReminder(invoice: Invoice): Promise<void> {
    const recipientEmail = invoice.billingAddress?.email || invoice.user?.email;
    if (!recipientEmail) return;

    const daysOverdue = invoice.dueDate
      ? Math.floor(
          (Date.now() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;

    await this.mailerService.sendMail({
      to: recipientEmail,
      subject: `Payment Reminder - Invoice ${invoice.invoiceNumber}`,
      template: 'payment-reminder',
      context: {
        invoiceNumber: invoice.invoiceNumber,
        customerName:
          invoice.billingAddress?.name ||
          `${invoice.user?.firstName || ''} ${invoice.user?.lastName || ''}`.trim(),
        total: this.formatCurrency(invoice.total),
        dueDate: this.formatDate(invoice.dueDate),
        daysOverdue,
        payUrl: `${this.configService.get('APP_URL')}/billing/invoices/${invoice.id}/pay`,
      },
    });
  }

  private formatCurrency(amount: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }
}
```

### Email Templates

```handlebars
{{! templates/invoice.hbs }}
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #1e293b; color: white; padding: 20px; }
    .content { padding: 20px; }
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .total { font-weight: bold; font-size: 18px; }
    .button { background: #f97316; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MECA Invoice</h1>
    </div>
    <div class="content">
      <p>Hi {{customerName}},</p>
      <p>Please find your invoice attached.</p>

      <h2>Invoice {{invoiceNumber}}</h2>
      <p><strong>Due Date:</strong> {{dueDate}}</p>

      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {{#each items}}
          <tr>
            <td>{{description}}</td>
            <td>{{quantity}}</td>
            <td>{{unitPrice}}</td>
            <td>{{total}}</td>
          </tr>
          {{/each}}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="total">Total</td>
            <td class="total">{{total}}</td>
          </tr>
        </tfoot>
      </table>

      <p style="margin-top: 30px;">
        <a href="{{viewUrl}}" class="button">View Invoice Online</a>
      </p>

      <p>Thank you for your business!</p>
      <p>MECA Team</p>
    </div>
  </div>
</body>
</html>
```

### Overdue Invoice Job

```typescript
// apps/backend/src/billing/overdue-invoice.job.ts

@Injectable()
export class OverdueInvoiceJob {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly emailService: EmailService,
    private readonly logger: Logger,
  ) {}

  /**
   * Daily job to mark invoices as overdue and send reminders
   */
  @Cron('0 9 * * *') // Run at 9 AM daily
  async processOverdueInvoices() {
    this.logger.log('Processing overdue invoices');

    // Find invoices past due date that aren't already overdue
    const overdueInvoices = await this.invoiceService.findOverdue();

    for (const invoice of overdueInvoices) {
      // Mark as overdue
      await this.invoiceService.updateStatus(invoice.id, {
        status: InvoiceStatus.OVERDUE,
      });

      // Send reminder email
      await this.emailService.sendPaymentReminder(invoice);

      this.logger.log(`Marked invoice ${invoice.invoiceNumber} as overdue`);
    }

    this.logger.log(`Processed ${overdueInvoices.length} overdue invoices`);
  }
}
```

---

## Integration Testing

### Stripe Mock

```typescript
// tests/mocks/stripe.mock.ts
export const mockStripeService = {
  createPaymentIntent: jest.fn().mockResolvedValue({
    id: 'pi_test_123',
    client_secret: 'pi_test_123_secret',
  }),
  createRefund: jest.fn().mockResolvedValue({
    id: 're_test_123',
    status: 'succeeded',
  }),
  verifyWebhookSignature: jest.fn().mockImplementation((body) => JSON.parse(body)),
};
```

### QuickBooks Mock

```typescript
// tests/mocks/quickbooks.mock.ts
export const mockQuickBooksService = {
  isConnected: jest.fn().mockReturnValue(true),
  createSalesReceiptFromOrder: jest.fn().mockResolvedValue(undefined),
  createCreditMemo: jest.fn().mockResolvedValue(undefined),
};
```

### Email Mock

```typescript
// tests/mocks/email.mock.ts
export const mockEmailService = {
  sendInvoice: jest.fn().mockResolvedValue(undefined),
  sendPaymentConfirmation: jest.fn().mockResolvedValue(undefined),
  sendRefundConfirmation: jest.fn().mockResolvedValue(undefined),
  sendPaymentReminder: jest.fn().mockResolvedValue(undefined),
};
```

---

## Environment Configuration

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# QuickBooks
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
QUICKBOOKS_REDIRECT_URI=http://localhost:3001/api/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox  # or production

# Email (using Mailgun example)
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USER=postmaster@yourdomain.com
MAIL_PASSWORD=...
MAIL_FROM=noreply@mecacaraudio.com

# Application
APP_URL=http://localhost:5173
```
