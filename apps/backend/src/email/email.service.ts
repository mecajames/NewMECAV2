import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendEmailDto {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendPasswordEmailDto {
  to: string;
  firstName?: string;
  password: string;
  isNewUser: boolean;
  forceChange: boolean;
}

export interface SendInvoiceEmailDto {
  to: string;
  firstName?: string;
  invoiceNumber: string;
  invoiceTotal: string;
  dueDate: Date;
  paymentUrl: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: string;
    total: string;
  }>;
}

export interface SendReferenceVerificationEmailDto {
  referenceEmail: string;
  referenceName: string;
  applicantName: string;
  verificationUrl: string;
  applicationType: 'Judge' | 'Event Director';
}

export interface SendEventRatingRequestEmailDto {
  to: string;
  firstName?: string;
  eventName: string;
  eventDate: Date;
  ratingUrl: string;
}

export interface SendEventRegistrationConfirmationEmailDto {
  to: string;
  firstName?: string;
  lastName?: string;
  eventName: string;
  eventDate: Date;
  venueName: string;
  venueAddress: string;
  venueCity?: string;
  venueState?: string;
  registrationId: string;
  checkInCode: string;
  classes: Array<{
    format: string;
    className: string;
    feeCharged: number;
  }>;
  amountPaid: number;
  qrCodeData?: string;
}

export interface SendEventRegistrationCancelledEmailDto {
  to: string;
  firstName?: string;
  eventName: string;
  eventDate: Date;
  registrationId: string;
  checkInCode: string;
  refundAmount?: number;
}

export interface SendEventReminderEmailDto {
  to: string;
  firstName?: string;
  eventName: string;
  eventDate: Date;
  venueName: string;
  venueAddress: string;
  venueCity?: string;
  venueState?: string;
  checkInCode: string;
  classes: Array<{
    format: string;
    className: string;
  }>;
  qrCodeData?: string;
}

// Membership email DTOs
export interface SendMembershipWelcomeEmailDto {
  to: string;
  firstName?: string;
  mecaId: number;
  membershipType: string;
  membershipCategory: string;
  expiryDate: Date;
  benefits?: string[];
  teamName?: string;
  businessName?: string;
}

export interface SendMembershipRenewalEmailDto {
  to: string;
  firstName?: string;
  mecaId: number;
  membershipType: string;
  expiryDate: Date;
  benefits?: string[];
}

export interface SendMembershipExpiringEmailDto {
  to: string;
  firstName?: string;
  mecaId: number;
  membershipType: string;
  expiryDate: Date;
  daysRemaining: number;
  renewalUrl: string;
}

export interface SendMembershipExpiredEmailDto {
  to: string;
  firstName?: string;
  mecaId: number;
  membershipType: string;
  expiredDate: Date;
  renewalUrl: string;
}

export interface SendSecondaryMemberWelcomeEmailDto {
  to: string;
  secondaryMemberName: string;
  mecaId: number;
  membershipType: string;
  masterMemberName: string;
  expiryDate: Date;
  benefits?: string[];
}

// ==========================================================================
// Ticket Email DTOs
// ==========================================================================

export interface SendTicketCreatedEmailDto {
  to: string;
  firstName?: string;
  ticketNumber: string;
  ticketTitle: string;
  ticketDescription: string;
  category: string;
  viewTicketUrl: string;
}

export interface SendTicketStaffAlertEmailDto {
  to: string;
  staffName?: string;
  ticketNumber: string;
  ticketTitle: string;
  ticketDescription: string;
  category: string;
  priority: string;
  departmentName: string;
  reporterName: string;
  reporterEmail: string;
  viewTicketUrl: string;
}

export interface SendTicketReplyEmailDto {
  to: string;
  recipientName?: string;
  ticketNumber: string;
  ticketTitle: string;
  replyContent: string;
  replierName: string;
  isStaffReply: boolean;
  viewTicketUrl: string;
}

export interface SendTicketStatusEmailDto {
  to: string;
  firstName?: string;
  ticketNumber: string;
  ticketTitle: string;
  oldStatus: string;
  newStatus: string;
  viewTicketUrl: string;
}

export interface SendTicketGuestVerificationEmailDto {
  to: string;
  magicLinkUrl: string;
  expiresInHours: number;
  isNewTicket: boolean;
  ticketNumber?: string;
}

// =============================================================================
// SHOP ORDER EMAIL DTOs
// =============================================================================

export interface ShopOrderItemDto {
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ShopAddressDto {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface SendShopOrderConfirmationEmailDto {
  to: string;
  customerName?: string;
  orderNumber: string;
  items: ShopOrderItemDto[];
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  shippingAddress?: ShopAddressDto;
  shippingMethod?: string;
  orderDate: Date;
}

export interface SendShopPaymentReceiptEmailDto {
  to: string;
  customerName?: string;
  orderNumber: string;
  items: ShopOrderItemDto[];
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentDate: Date;
  last4?: string; // Last 4 digits of card (if available)
}

export interface SendShopShippingNotificationEmailDto {
  to: string;
  customerName?: string;
  orderNumber: string;
  items: ShopOrderItemDto[];
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  shippingAddress?: ShopAddressDto;
  estimatedDelivery?: string;
  shippedDate: Date;
}

export interface SendShopDeliveryConfirmationEmailDto {
  to: string;
  customerName?: string;
  orderNumber: string;
  items: ShopOrderItemDto[];
  deliveryDate: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private isConfigured = false;
  private provider: 'sendgrid' | 'resend' | 'mailgun' | 'smtp' | null = null;
  private transporter: Transporter | null = null;
  private fromEmail: string = 'noreply@mecacaraudio.com';

  constructor() {
    this.checkConfiguration();
  }

  private checkConfiguration() {
    const provider = process.env.EMAIL_PROVIDER;

    if (provider === 'smtp') {
      // SMTP for local development (Mailpit, Mailtrap, etc.)
      const host = process.env.SMTP_HOST || '127.0.0.1';
      const port = parseInt(process.env.SMTP_PORT || '54325', 10);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: false, // Mailpit doesn't use TLS
        auth: user && pass ? { user, pass } : undefined,
        ignoreTLS: true, // For local dev servers that don't support TLS
      });

      this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@mecacaraudio.com';
      this.isConfigured = true;
      this.provider = 'smtp';
      this.logger.log(`Email service configured with SMTP (${host}:${port})`);

    } else if (provider === 'mailgun') {
      // Mailgun for production via SMTP
      const domain = process.env.MAILGUN_DOMAIN;
      const apiKey = process.env.MAILGUN_SMTP_PASSWORD || process.env.MAILGUN_API_KEY;

      if (!domain || !apiKey) {
        this.logger.warn('Mailgun configured but missing MAILGUN_DOMAIN or MAILGUN_SMTP_PASSWORD');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.MAILGUN_SMTP_HOST || 'smtp.mailgun.org',
        port: parseInt(process.env.MAILGUN_SMTP_PORT || '587', 10),
        secure: false,
        auth: {
          user: process.env.MAILGUN_SMTP_USER || `postmaster@${domain}`,
          pass: apiKey,
        },
      });

      this.fromEmail = process.env.MAILGUN_FROM_EMAIL || `noreply@${domain}`;
      this.isConfigured = true;
      this.provider = 'mailgun';
      this.logger.log(`Email service configured with Mailgun (${domain})`);

    } else if (provider === 'sendgrid' && process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'placeholder') {
      this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@mecacaraudio.com';
      this.isConfigured = true;
      this.provider = 'sendgrid';
      this.logger.log('Email service configured with SendGrid');

    } else if (provider === 'resend' && process.env.RESEND_API_KEY) {
      this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@mecacaraudio.com';
      this.isConfigured = true;
      this.provider = 'resend';
      this.logger.log('Email service configured with Resend');

    } else {
      this.logger.warn('Email service not configured - emails will not be sent');
      this.logger.warn('Set EMAIL_PROVIDER to one of: smtp, mailgun, sendgrid, resend');
    }
  }

  /**
   * Check if email service is configured and ready to send
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get current provider name
   */
  getProvider(): string | null {
    return this.provider;
  }

  /**
   * Send a generic email
   */
  async sendEmail(dto: SendEmailDto): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      this.logger.warn(`Email not sent (not configured): ${dto.subject} to ${dto.to}`);
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      if (this.provider === 'smtp' || this.provider === 'mailgun') {
        return await this.sendViaNodemailer(dto);
      } else if (this.provider === 'sendgrid') {
        return await this.sendViaSendGrid(dto);
      } else if (this.provider === 'resend') {
        return await this.sendViaResend(dto);
      }

      return { success: false, error: 'No provider configured' };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send password email to user (new account or password reset)
   */
  async sendPasswordEmail(dto: SendPasswordEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = dto.isNewUser
      ? 'Welcome to MECA - Your Account Details'
      : 'MECA - Your Password Has Been Reset';

    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';

    const html = dto.isNewUser
      ? this.getNewUserEmailTemplate(greeting, dto.to, dto.password, dto.forceChange)
      : this.getPasswordResetEmailTemplate(greeting, dto.password, dto.forceChange);

    const text = dto.isNewUser
      ? this.getNewUserEmailText(greeting, dto.to, dto.password, dto.forceChange)
      : this.getPasswordResetEmailText(greeting, dto.password, dto.forceChange);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send reference verification email
   */
  async sendReferenceVerificationEmail(dto: SendReferenceVerificationEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `MECA ${dto.applicationType} Application - Reference Verification Request`;

    const html = this.getReferenceVerificationEmailTemplate(dto);
    const text = this.getReferenceVerificationEmailText(dto);

    return this.sendEmail({
      to: dto.referenceEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send invoice email to user with payment link
   */
  async sendInvoiceEmail(dto: SendInvoiceEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `MECA Invoice ${dto.invoiceNumber} - Payment Due`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';
    const dueDateStr = dto.dueDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.getInvoiceEmailTemplate(greeting, dto.invoiceNumber, dto.invoiceTotal, dueDateStr, dto.paymentUrl, dto.items);
    const text = this.getInvoiceEmailText(greeting, dto.invoiceNumber, dto.invoiceTotal, dueDateStr, dto.paymentUrl, dto.items);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send event rating request email after event completion
   */
  async sendEventRatingRequestEmail(dto: SendEventRatingRequestEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `Rate Your Experience at ${dto.eventName}`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';
    const eventDateStr = dto.eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.getEventRatingEmailTemplate(greeting, dto.eventName, eventDateStr, dto.ratingUrl);
    const text = this.getEventRatingEmailText(greeting, dto.eventName, eventDateStr, dto.ratingUrl);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  // ==========================================================================
  // Event Registration Email Methods
  // ==========================================================================

  /**
   * Send event registration confirmation email
   */
  async sendEventRegistrationConfirmationEmail(dto: SendEventRegistrationConfirmationEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `Registration Confirmed - ${dto.eventName}`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';
    const eventDateStr = dto.eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.getEventRegistrationConfirmationTemplate(greeting, dto, eventDateStr);
    const text = this.getEventRegistrationConfirmationText(greeting, dto, eventDateStr);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send event registration cancelled email
   */
  async sendEventRegistrationCancelledEmail(dto: SendEventRegistrationCancelledEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `Registration Cancelled - ${dto.eventName}`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';
    const eventDateStr = dto.eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.getEventRegistrationCancelledTemplate(greeting, dto, eventDateStr);
    const text = this.getEventRegistrationCancelledText(greeting, dto, eventDateStr);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send event reminder email (day-before reminder)
   */
  async sendEventReminderEmail(dto: SendEventReminderEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `Reminder: ${dto.eventName} is Tomorrow!`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';
    const eventDateStr = dto.eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.getEventReminderTemplate(greeting, dto, eventDateStr);
    const text = this.getEventReminderText(greeting, dto, eventDateStr);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  // ==========================================================================
  // Ticket Email Methods
  // ==========================================================================

  /**
   * Send ticket created confirmation email to the submitter
   */
  async sendTicketCreatedEmail(dto: SendTicketCreatedEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `Support Ticket ${dto.ticketNumber} - We've Received Your Request`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';

    const html = this.getTicketCreatedEmailTemplate(dto, greeting);
    const text = this.getTicketCreatedEmailText(dto, greeting);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send new ticket alert email to assigned department staff
   */
  async sendTicketStaffAlertEmail(dto: SendTicketStaffAlertEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `[${dto.priority.toUpperCase()}] New Support Ticket ${dto.ticketNumber} - ${dto.departmentName}`;
    const greeting = dto.staffName ? `Hello ${dto.staffName}` : 'Hello';

    const html = this.getTicketStaffAlertEmailTemplate(dto, greeting);
    const text = this.getTicketStaffAlertEmailText(dto, greeting);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send ticket reply notification email
   */
  async sendTicketReplyEmail(dto: SendTicketReplyEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = dto.isStaffReply
      ? `Support Ticket ${dto.ticketNumber} - New Response from MECA Support`
      : `Support Ticket ${dto.ticketNumber} - Customer Response Received`;
    const greeting = dto.recipientName ? `Hello ${dto.recipientName}` : 'Hello';

    const html = this.getTicketReplyEmailTemplate(dto, greeting);
    const text = this.getTicketReplyEmailText(dto, greeting);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send ticket status change email to submitter
   */
  async sendTicketStatusEmail(dto: SendTicketStatusEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `Support Ticket ${dto.ticketNumber} - Status Update: ${this.formatStatus(dto.newStatus)}`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';

    const html = this.getTicketStatusEmailTemplate(dto, greeting);
    const text = this.getTicketStatusEmailText(dto, greeting);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send guest magic link verification email
   */
  async sendTicketGuestVerificationEmail(dto: SendTicketGuestVerificationEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = dto.isNewTicket
      ? 'MECA Support - Verify Your Email to Submit a Ticket'
      : `MECA Support - Access Your Ticket ${dto.ticketNumber}`;

    const html = this.getTicketGuestVerificationEmailTemplate(dto);
    const text = this.getTicketGuestVerificationEmailText(dto);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  // =========================================================================
  // Membership Email Methods
  // =========================================================================

  /**
   * Send welcome email when a new membership is purchased
   */
  async sendMembershipWelcomeEmail(dto: SendMembershipWelcomeEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `Welcome to MECA - Your ${dto.membershipType} Membership`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';
    const expiryDateStr = dto.expiryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.getMembershipWelcomeEmailTemplate(greeting, dto, expiryDateStr);
    const text = this.getMembershipWelcomeEmailText(greeting, dto, expiryDateStr);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send confirmation email when a membership is renewed
   */
  async sendMembershipRenewalEmail(dto: SendMembershipRenewalEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `MECA Membership Renewed - MECA #${dto.mecaId}`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';
    const expiryDateStr = dto.expiryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.getMembershipRenewalEmailTemplate(greeting, dto, expiryDateStr);
    const text = this.getMembershipRenewalEmailText(greeting, dto, expiryDateStr);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send warning email when membership is expiring soon (30 days or 7 days)
   */
  async sendMembershipExpiringEmail(dto: SendMembershipExpiringEmailDto): Promise<{ success: boolean; error?: string }> {
    const urgency = dto.daysRemaining <= 7 ? 'URGENT: ' : '';
    const subject = `${urgency}Your MECA Membership Expires in ${dto.daysRemaining} Days`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';
    const expiryDateStr = dto.expiryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.getMembershipExpiringEmailTemplate(greeting, dto, expiryDateStr);
    const text = this.getMembershipExpiringEmailText(greeting, dto, expiryDateStr);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send notification when membership has expired
   */
  async sendMembershipExpiredEmail(dto: SendMembershipExpiredEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `Your MECA Membership Has Expired - Renew Now`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';
    const expiredDateStr = dto.expiredDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.getMembershipExpiredEmailTemplate(greeting, dto, expiredDateStr);
    const text = this.getMembershipExpiredEmailText(greeting, dto, expiredDateStr);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send welcome email to secondary member when added to a master membership
   */
  async sendSecondaryMemberWelcomeEmail(dto: SendSecondaryMemberWelcomeEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `Welcome to MECA - You've Been Added as a Secondary Member`;
    const expiryDateStr = dto.expiryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.getSecondaryMemberWelcomeEmailTemplate(dto, expiryDateStr);
    const text = this.getSecondaryMemberWelcomeEmailText(dto, expiryDateStr);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  // ==========================================================================
  // Shop Order Email Methods
  // ==========================================================================

  /**
   * Send shop order confirmation email when order is placed
   */
  async sendShopOrderConfirmationEmail(dto: SendShopOrderConfirmationEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `MECA Shop - Order Confirmation #${dto.orderNumber}`;
    const greeting = dto.customerName ? `Hello ${dto.customerName}` : 'Hello';

    const html = this.getShopOrderConfirmationEmailTemplate(dto, greeting);
    const text = this.getShopOrderConfirmationEmailText(dto, greeting);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send payment receipt email when payment is confirmed
   */
  async sendShopPaymentReceiptEmail(dto: SendShopPaymentReceiptEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `MECA Shop - Payment Receipt for Order #${dto.orderNumber}`;
    const greeting = dto.customerName ? `Hello ${dto.customerName}` : 'Hello';

    const html = this.getShopPaymentReceiptEmailTemplate(dto, greeting);
    const text = this.getShopPaymentReceiptEmailText(dto, greeting);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send shipping notification email when order is shipped
   */
  async sendShopShippingNotificationEmail(dto: SendShopShippingNotificationEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `MECA Shop - Your Order #${dto.orderNumber} Has Shipped!`;
    const greeting = dto.customerName ? `Hello ${dto.customerName}` : 'Hello';

    const html = this.getShopShippingNotificationEmailTemplate(dto, greeting);
    const text = this.getShopShippingNotificationEmailText(dto, greeting);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send delivery confirmation email when order is delivered
   */
  async sendShopDeliveryConfirmationEmail(dto: SendShopDeliveryConfirmationEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `MECA Shop - Order #${dto.orderNumber} Has Been Delivered!`;
    const greeting = dto.customerName ? `Hello ${dto.customerName}` : 'Hello';

    const html = this.getShopDeliveryConfirmationEmailTemplate(dto, greeting);
    const text = this.getShopDeliveryConfirmationEmailText(dto, greeting);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
    });
  }

  private async sendViaSendGrid(dto: SendEmailDto): Promise<{ success: boolean; error?: string }> {
    // Dynamic import to avoid requiring the package if not used
    try {
      // @ts-ignore - Package may not be installed, handled at runtime
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(process.env.SENDGRID_API_KEY!);

      await sgMail.default.send({
        to: dto.to,
        from: this.fromEmail,
        subject: dto.subject,
        text: dto.text || '',
        html: dto.html,
      });

      this.logger.log(`Email sent via SendGrid to ${dto.to}`);
      return { success: true };
    } catch (error) {
      // If SendGrid package is not installed, log and return error
      if ((error as any)?.code === 'MODULE_NOT_FOUND') {
        this.logger.error('SendGrid package not installed. Run: rush add -p @sendgrid/mail');
        return { success: false, error: 'SendGrid package not installed' };
      }
      throw error;
    }
  }

  private async sendViaResend(dto: SendEmailDto): Promise<{ success: boolean; error?: string }> {
    // Dynamic import to avoid requiring the package if not used
    try {
      // @ts-ignore - Package may not be installed, handled at runtime
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: this.fromEmail,
        to: dto.to,
        subject: dto.subject,
        html: dto.html,
        text: dto.text,
      });

      this.logger.log(`Email sent via Resend to ${dto.to}`);
      return { success: true };
    } catch (error) {
      // If Resend package is not installed, log and return error
      if ((error as any)?.code === 'MODULE_NOT_FOUND') {
        this.logger.error('Resend package not installed. Run: rush add -p resend');
        return { success: false, error: 'Resend package not installed' };
      }
      throw error;
    }
  }

  private async sendViaNodemailer(dto: SendEmailDto): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Nodemailer transporter not configured' };
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: dto.to,
        subject: dto.subject,
        html: dto.html,
        text: dto.text,
      });

      this.logger.log(`Email sent via ${this.provider} to ${dto.to}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send email via ${this.provider}: ${error}`);
      throw error;
    }
  }

  private getNewUserEmailTemplate(greeting: string, email: string, password: string, forceChange: boolean): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MECA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">Welcome to MECA!</h1>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>Your MECA account has been created. Here are your login details:</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0;"><strong>Password:</strong> <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
    </div>

    ${forceChange ? `
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e;"><strong>Important:</strong> You will be required to change your password when you first log in.</p>
    </div>
    ` : ''}

    <p>You can log in at: <a href="https://meca.com/login" style="color: #f97316;">https://meca.com/login</a></p>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      For security reasons, please do not share your password with anyone. If you did not request this account, please contact support.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getPasswordResetEmailTemplate(greeting: string, password: string, forceChange: boolean): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - MECA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">Password Reset</h1>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>Your MECA account password has been reset by an administrator. Here is your new password:</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0;"><strong>New Password:</strong></p>
      <p style="margin: 10px 0 0 0;"><code style="background: #f1f5f9; padding: 8px 16px; border-radius: 4px; font-family: monospace; font-size: 18px;">${password}</code></p>
    </div>

    ${forceChange ? `
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e;"><strong>Important:</strong> You will be required to change your password when you next log in.</p>
    </div>
    ` : ''}

    <p>You can log in at: <a href="https://meca.com/login" style="color: #f97316;">https://meca.com/login</a></p>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      If you did not request this password reset, please contact support immediately.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getNewUserEmailText(greeting: string, email: string, password: string, forceChange: boolean): string {
    return `
${greeting},

Your MECA account has been created. Here are your login details:

Email: ${email}
Password: ${password}

${forceChange ? 'IMPORTANT: You will be required to change your password when you first log in.\n' : ''}
You can log in at: https://meca.com/login

For security reasons, please do not share your password with anyone. If you did not request this account, please contact support.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getPasswordResetEmailText(greeting: string, password: string, forceChange: boolean): string {
    return `
${greeting},

Your MECA account password has been reset by an administrator.

New Password: ${password}

${forceChange ? 'IMPORTANT: You will be required to change your password when you next log in.\n' : ''}
You can log in at: https://meca.com/login

If you did not request this password reset, please contact support immediately.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getInvoiceEmailTemplate(
    greeting: string,
    invoiceNumber: string,
    total: string,
    dueDate: string,
    paymentUrl: string,
    items: Array<{ description: string; quantity: number; unitPrice: string; total: string }>,
  ): string {
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${item.unitPrice}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${item.total}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber} - MECA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">Invoice ${invoiceNumber}</h1>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>A new invoice has been generated for your MECA membership. Please review the details below and make payment by the due date.</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Description</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0;">Qty</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Unit Price</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total Due:</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #f97316;">$${total}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e;"><strong>Due Date:</strong> ${dueDate}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${paymentUrl}" style="display: inline-block; background: #f97316; color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Pay Invoice Now</a>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      If you have any questions about this invoice, please contact us at billing@mecacaraudio.com.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getInvoiceEmailText(
    greeting: string,
    invoiceNumber: string,
    total: string,
    dueDate: string,
    paymentUrl: string,
    items: Array<{ description: string; quantity: number; unitPrice: string; total: string }>,
  ): string {
    const itemsText = items.map(item =>
      `- ${item.description}: ${item.quantity} x $${item.unitPrice} = $${item.total}`
    ).join('\n');

    return `
${greeting},

A new invoice has been generated for your MECA membership.

INVOICE ${invoiceNumber}
------------------------
${itemsText}

Total Due: $${total}
Due Date: ${dueDate}

Pay your invoice here: ${paymentUrl}

If you have any questions about this invoice, please contact us at billing@mecacaraudio.com.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getReferenceVerificationEmailTemplate(dto: SendReferenceVerificationEmailDto): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MECA ${dto.applicationType} Application - Reference Verification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">${dto.applicationType} Application</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">Reference Verification Request</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hello ${dto.referenceName},</p>

    <p><strong>${dto.applicantName}</strong> has applied to become a MECA ${dto.applicationType} and has listed you as a professional reference.</p>

    <p>We would greatly appreciate it if you could take a few minutes to verify that you know this applicant and provide a brief testimonial about their qualifications.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dto.verificationUrl}" style="display: inline-block; background: #f97316; color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Verify Reference</a>
    </div>

    <p style="color: #64748b; font-size: 14px;">This link will expire in 14 days. If you have any questions, please contact us at support@mecacaraudio.com.</p>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      If you did not expect this email or do not know the applicant, you can safely ignore this message.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getReferenceVerificationEmailText(dto: SendReferenceVerificationEmailDto): string {
    return `
Hello ${dto.referenceName},

${dto.applicantName} has applied to become a MECA ${dto.applicationType} and has listed you as a professional reference.

We would greatly appreciate it if you could take a few minutes to verify that you know this applicant and provide a brief testimonial about their qualifications.

Click here to verify: ${dto.verificationUrl}

This link will expire in 14 days. If you have any questions, please contact us at support@mecacaraudio.com.

If you did not expect this email or do not know the applicant, you can safely ignore this message.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getEventRatingEmailTemplate(greeting: string, eventName: string, eventDate: string, ratingUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rate Your Experience - MECA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">How Was Your Experience?</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">We'd love to hear your feedback</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>Thank you for participating in <strong>${eventName}</strong> on ${eventDate}!</p>

    <p>Your feedback helps us improve our events and recognize our outstanding judges and event directors. Please take a moment to rate your experience.</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 15px;">
        <span style="font-size: 32px;">⭐</span>
        <span style="font-size: 32px;">⭐</span>
        <span style="font-size: 32px;">⭐</span>
        <span style="font-size: 32px;">⭐</span>
        <span style="font-size: 32px;">⭐</span>
      </div>
      <p style="margin: 0; color: #64748b;">Rate the judges and event directors who made this event possible</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${ratingUrl}" style="display: inline-block; background: #f97316; color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Rate Event Staff Now</a>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      Your ratings can be anonymous if you prefer. All feedback is valuable and helps us maintain the highest standards at MECA events.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getEventRatingEmailText(greeting: string, eventName: string, eventDate: string, ratingUrl: string): string {
    return `
${greeting},

Thank you for participating in ${eventName} on ${eventDate}!

Your feedback helps us improve our events and recognize our outstanding judges and event directors. Please take a moment to rate your experience.

Rate Event Staff Now: ${ratingUrl}

Your ratings can be anonymous if you prefer. All feedback is valuable and helps us maintain the highest standards at MECA events.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  // ==========================================================================
  // Ticket Email Templates
  // ==========================================================================

  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      awaiting_response: 'Awaiting Response',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private formatCategory(category: string): string {
    return category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private getPriorityColor(priority: string): string {
    const colorMap: Record<string, string> = {
      low: '#22c55e',
      medium: '#f59e0b',
      high: '#f97316',
      critical: '#ef4444',
    };
    return colorMap[priority] || '#64748b';
  }

  private getTicketCreatedEmailTemplate(dto: SendTicketCreatedEmailDto, greeting: string): string {
    const truncatedDescription = dto.ticketDescription.length > 200
      ? dto.ticketDescription.substring(0, 200) + '...'
      : dto.ticketDescription;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Ticket ${dto.ticketNumber} - MECA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">Support Request Received</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">Ticket ${dto.ticketNumber}</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>Thank you for contacting MECA Support. We have received your request and our team will review it shortly.</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Ticket Number:</strong> ${dto.ticketNumber}</p>
      <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${dto.ticketTitle}</p>
      <p style="margin: 0 0 10px 0;"><strong>Category:</strong> ${this.formatCategory(dto.category)}</p>
      <p style="margin: 0;"><strong>Description:</strong></p>
      <p style="margin: 10px 0 0 0; padding: 10px; background: #f1f5f9; border-radius: 4px; white-space: pre-wrap;">${truncatedDescription}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dto.viewTicketUrl}" style="display: inline-block; background: #f97316; color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">View Ticket</a>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      We typically respond within 24-48 hours. You will receive an email notification when our team responds to your request.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getTicketCreatedEmailText(dto: SendTicketCreatedEmailDto, greeting: string): string {
    return `
${greeting},

Thank you for contacting MECA Support. We have received your request and our team will review it shortly.

TICKET DETAILS
--------------
Ticket Number: ${dto.ticketNumber}
Subject: ${dto.ticketTitle}
Category: ${this.formatCategory(dto.category)}
Description: ${dto.ticketDescription}

View your ticket: ${dto.viewTicketUrl}

We typically respond within 24-48 hours. You will receive an email notification when our team responds to your request.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getTicketStaffAlertEmailTemplate(dto: SendTicketStaffAlertEmailDto, greeting: string): string {
    const truncatedDescription = dto.ticketDescription.length > 300
      ? dto.ticketDescription.substring(0, 300) + '...'
      : dto.ticketDescription;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Support Ticket ${dto.ticketNumber} - MECA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">New Support Ticket</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">${dto.departmentName} Department</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>A new support ticket has been submitted that requires your attention.</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="margin-bottom: 15px;">
        <span style="font-weight: bold; font-size: 18px;">${dto.ticketNumber}</span>
        <span style="background: ${this.getPriorityColor(dto.priority)}; color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-left: 10px;">${dto.priority}</span>
      </div>
      <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${dto.ticketTitle}</p>
      <p style="margin: 0 0 10px 0;"><strong>Category:</strong> ${this.formatCategory(dto.category)}</p>
      <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${dto.reporterName} (${dto.reporterEmail})</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;">
      <p style="margin: 0;"><strong>Description:</strong></p>
      <p style="margin: 10px 0 0 0; padding: 10px; background: #f1f5f9; border-radius: 4px; white-space: pre-wrap;">${truncatedDescription}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dto.viewTicketUrl}" style="display: inline-block; background: #f97316; color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">View & Respond</a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getTicketStaffAlertEmailText(dto: SendTicketStaffAlertEmailDto, greeting: string): string {
    return `
${greeting},

A new support ticket has been submitted that requires your attention.

TICKET DETAILS
--------------
Ticket Number: ${dto.ticketNumber}
Priority: ${dto.priority.toUpperCase()}
Department: ${dto.departmentName}
Subject: ${dto.ticketTitle}
Category: ${this.formatCategory(dto.category)}
From: ${dto.reporterName} (${dto.reporterEmail})

Description:
${dto.ticketDescription}

View and respond to this ticket: ${dto.viewTicketUrl}

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getTicketReplyEmailTemplate(dto: SendTicketReplyEmailDto, greeting: string): string {
    const replyLabel = dto.isStaffReply ? 'MECA Support' : 'Customer';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Ticket ${dto.ticketNumber} - New Reply</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">New Reply on Your Ticket</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">Ticket ${dto.ticketNumber}</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>There is a new reply on your support ticket <strong>"${dto.ticketTitle}"</strong>.</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="margin-bottom: 15px;">
        <span style="display: inline-block; width: 40px; height: 40px; background: ${dto.isStaffReply ? '#f97316' : '#3b82f6'}; border-radius: 50%; text-align: center; line-height: 40px; color: #fff; font-weight: bold; vertical-align: middle;">${dto.replierName.charAt(0).toUpperCase()}</span>
        <span style="margin-left: 12px; vertical-align: middle;">
          <strong>${dto.replierName}</strong>
          <span style="color: #64748b; font-size: 12px; display: block;">${replyLabel}</span>
        </span>
      </div>
      <div style="padding: 15px; background: #f1f5f9; border-radius: 8px; white-space: pre-wrap;">${dto.replyContent}</div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dto.viewTicketUrl}" style="display: inline-block; background: #f97316; color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">View Full Conversation</a>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      You can reply directly to continue the conversation.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getTicketReplyEmailText(dto: SendTicketReplyEmailDto, greeting: string): string {
    const replyLabel = dto.isStaffReply ? 'MECA Support' : 'Customer';

    return `
${greeting},

There is a new reply on your support ticket "${dto.ticketTitle}" (${dto.ticketNumber}).

FROM: ${dto.replierName} (${replyLabel})
-----------------------------------------
${dto.replyContent}
-----------------------------------------

View the full conversation: ${dto.viewTicketUrl}

You can reply directly to continue the conversation.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getTicketStatusEmailTemplate(dto: SendTicketStatusEmailDto, greeting: string): string {
    const statusMessage = this.getStatusChangeMessage(dto.newStatus);
    const statusColor = dto.newStatus === 'resolved' || dto.newStatus === 'closed' ? '#22c55e' : '#3b82f6';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Ticket ${dto.ticketNumber} - Status Update</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">Ticket Status Update</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">Ticket ${dto.ticketNumber}</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>The status of your support ticket has been updated.</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 10px 0;"><strong>${dto.ticketTitle}</strong></p>
      <div style="margin: 20px 0;">
        <span style="padding: 8px 16px; background: #e2e8f0; border-radius: 4px; color: #64748b; text-decoration: line-through;">${this.formatStatus(dto.oldStatus)}</span>
        <span style="margin: 0 10px;">-></span>
        <span style="padding: 8px 16px; background: ${statusColor}; border-radius: 4px; color: #fff; font-weight: bold;">${this.formatStatus(dto.newStatus)}</span>
      </div>
      <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">${statusMessage}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dto.viewTicketUrl}" style="display: inline-block; background: #f97316; color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">View Ticket</a>
    </div>

    ${dto.newStatus === 'resolved' ? `
    <div style="background: #dcfce7; border: 1px solid #22c55e; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #166534;">If you need further assistance or the issue persists, you can reopen this ticket by replying.</p>
    </div>
    ` : ''}
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getTicketStatusEmailText(dto: SendTicketStatusEmailDto, greeting: string): string {
    const statusMessage = this.getStatusChangeMessage(dto.newStatus);

    return `
${greeting},

The status of your support ticket has been updated.

TICKET: ${dto.ticketTitle} (${dto.ticketNumber})
Status: ${this.formatStatus(dto.oldStatus)} -> ${this.formatStatus(dto.newStatus)}

${statusMessage}

View your ticket: ${dto.viewTicketUrl}

${dto.newStatus === 'resolved' ? 'If you need further assistance or the issue persists, you can reopen this ticket by replying.\n' : ''}
© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getStatusChangeMessage(status: string): string {
    const messages: Record<string, string> = {
      open: 'Your ticket is now open and awaiting review.',
      in_progress: 'Our team is actively working on your request.',
      awaiting_response: 'We are waiting for additional information from you.',
      resolved: 'Your ticket has been marked as resolved.',
      closed: 'Your ticket has been closed.',
    };
    return messages[status] || 'Your ticket status has been updated.';
  }

  private getTicketGuestVerificationEmailTemplate(dto: SendTicketGuestVerificationEmailDto): string {
    const title = dto.isNewTicket ? 'Verify Your Email' : 'Access Your Ticket';
    const description = dto.isNewTicket
      ? 'Click the button below to verify your email address and submit your support request.'
      : `Click the button below to access your support ticket ${dto.ticketNumber}.`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - MECA Support</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">${title}</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">MECA Support System</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hello,</p>

    <p>${description}</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dto.magicLinkUrl}" style="display: inline-block; background: #f97316; color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">${dto.isNewTicket ? 'Verify & Continue' : 'Access Ticket'}</a>
    </div>

    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e;"><strong>Important:</strong> This link will expire in ${dto.expiresInHours} hour${dto.expiresInHours > 1 ? 's' : ''}.</p>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      If you did not request this email, you can safely ignore it. For security reasons, do not share this link with anyone.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getTicketGuestVerificationEmailText(dto: SendTicketGuestVerificationEmailDto): string {
    const description = dto.isNewTicket
      ? 'Click the link below to verify your email address and submit your support request.'
      : `Click the link below to access your support ticket ${dto.ticketNumber}.`;

    return `
Hello,

${description}

${dto.isNewTicket ? 'Verify & Continue' : 'Access Ticket'}: ${dto.magicLinkUrl}

IMPORTANT: This link will expire in ${dto.expiresInHours} hour${dto.expiresInHours > 1 ? 's' : ''}.

If you did not request this email, you can safely ignore it. For security reasons, do not share this link with anyone.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  // ==========================================================================
  // Event Registration Email Templates
  // ==========================================================================

  private getEventRegistrationConfirmationTemplate(
    greeting: string,
    dto: SendEventRegistrationConfirmationEmailDto,
    eventDateStr: string,
  ): string {
    const venueLocation = [dto.venueCity, dto.venueState].filter(Boolean).join(', ');
    const classesHtml = dto.classes.map(c => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${c.format}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${c.className}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${c.feeCharged.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmed - ${dto.eventName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">Registration Confirmed!</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">You're all set for ${dto.eventName}</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>Your registration for <strong>${dto.eventName}</strong> has been confirmed. We look forward to seeing you there!</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Event Details</h3>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDateStr}</p>
      <p style="margin: 5px 0;"><strong>Venue:</strong> ${dto.venueName}</p>
      <p style="margin: 5px 0;"><strong>Address:</strong> ${dto.venueAddress}${venueLocation ? `, ${venueLocation}` : ''}</p>
    </div>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Registration Details</h3>
      <p style="margin: 5px 0;"><strong>Confirmation #:</strong> <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${dto.checkInCode}</code></p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Format</th>
            <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Class</th>
            <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Fee</th>
          </tr>
        </thead>
        <tbody>
          ${classesHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 8px 12px; text-align: right; font-weight: bold;">Total Paid:</td>
            <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: #f97316;">$${dto.amountPaid.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    ${dto.qrCodeData ? `
    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Your Check-In QR Code</h3>
      <img src="${dto.qrCodeData}" alt="Check-in QR Code" style="max-width: 200px; height: auto;" />
      <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">Show this at the event for quick check-in</p>
    </div>
    ` : ''}

    <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #1e40af;"><strong>Important:</strong> Please bring a valid ID and arrive at least 30 minutes before your scheduled class time.</p>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      If you have any questions or need to modify your registration, please contact us at events@mecacaraudio.com.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getEventRegistrationConfirmationText(
    greeting: string,
    dto: SendEventRegistrationConfirmationEmailDto,
    eventDateStr: string,
  ): string {
    const venueLocation = [dto.venueCity, dto.venueState].filter(Boolean).join(', ');
    const classesText = dto.classes.map(c => `  - ${c.format}: ${c.className} - $${c.feeCharged.toFixed(2)}`).join('\n');

    return `
${greeting},

Your registration for ${dto.eventName} has been confirmed!

EVENT DETAILS
--------------
Date: ${eventDateStr}
Venue: ${dto.venueName}
Address: ${dto.venueAddress}${venueLocation ? `, ${venueLocation}` : ''}

REGISTRATION DETAILS
--------------------
Confirmation #: ${dto.checkInCode}

Classes Registered:
${classesText}

Total Paid: $${dto.amountPaid.toFixed(2)}

IMPORTANT: Please bring a valid ID and arrive at least 30 minutes before your scheduled class time.

If you have any questions or need to modify your registration, please contact us at events@mecacaraudio.com.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getEventRegistrationCancelledTemplate(
    greeting: string,
    dto: SendEventRegistrationCancelledEmailDto,
    eventDateStr: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Cancelled - ${dto.eventName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">Registration Cancelled</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">${dto.eventName}</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>Your registration for <strong>${dto.eventName}</strong> scheduled for ${eventDateStr} has been cancelled.</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Event:</strong> ${dto.eventName}</p>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDateStr}</p>
      <p style="margin: 5px 0;"><strong>Confirmation #:</strong> ${dto.checkInCode}</p>
    </div>

    ${dto.refundAmount !== undefined && dto.refundAmount > 0 ? `
    <div style="background: #dcfce7; border: 1px solid #22c55e; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #166534;"><strong>Refund Amount:</strong> $${dto.refundAmount.toFixed(2)}</p>
      <p style="margin: 5px 0 0 0; color: #166534; font-size: 14px;">Your refund will be processed within 5-10 business days.</p>
    </div>
    ` : ''}

    <p>We're sorry you won't be joining us at this event. We hope to see you at a future MECA competition!</p>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      If you did not request this cancellation or have any questions, please contact us at events@mecacaraudio.com.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getEventRegistrationCancelledText(
    greeting: string,
    dto: SendEventRegistrationCancelledEmailDto,
    eventDateStr: string,
  ): string {
    return `
${greeting},

Your registration for ${dto.eventName} scheduled for ${eventDateStr} has been cancelled.

CANCELLED REGISTRATION
----------------------
Event: ${dto.eventName}
Date: ${eventDateStr}
Confirmation #: ${dto.checkInCode}
${dto.refundAmount !== undefined && dto.refundAmount > 0 ? `
REFUND
------
Amount: $${dto.refundAmount.toFixed(2)}
Your refund will be processed within 5-10 business days.
` : ''}
We're sorry you won't be joining us at this event. We hope to see you at a future MECA competition!

If you did not request this cancellation or have any questions, please contact us at events@mecacaraudio.com.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getEventReminderTemplate(
    greeting: string,
    dto: SendEventReminderEmailDto,
    eventDateStr: string,
  ): string {
    const venueLocation = [dto.venueCity, dto.venueState].filter(Boolean).join(', ');
    const classesHtml = dto.classes.map(c => `
      <li style="margin: 5px 0;">${c.format}: ${c.className}</li>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Reminder - ${dto.eventName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">See You Tomorrow!</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">${dto.eventName} is coming up</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>This is a friendly reminder that <strong>${dto.eventName}</strong> is tomorrow! Here's everything you need to know:</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Event Details</h3>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDateStr}</p>
      <p style="margin: 5px 0;"><strong>Venue:</strong> ${dto.venueName}</p>
      <p style="margin: 5px 0;"><strong>Address:</strong> ${dto.venueAddress}${venueLocation ? `, ${venueLocation}` : ''}</p>
      <p style="margin: 15px 0 5px 0;"><strong>Your Check-In Code:</strong></p>
      <p style="margin: 0;"><code style="background: #f1f5f9; padding: 8px 16px; border-radius: 4px; font-family: monospace; font-size: 18px;">${dto.checkInCode}</code></p>
    </div>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #1e293b;">Your Classes</h3>
      <ul style="margin: 0; padding-left: 20px;">
        ${classesHtml}
      </ul>
    </div>

    ${dto.qrCodeData ? `
    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Your Check-In QR Code</h3>
      <img src="${dto.qrCodeData}" alt="Check-in QR Code" style="max-width: 200px; height: auto;" />
      <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">Show this at the event for quick check-in</p>
    </div>
    ` : ''}

    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e;"><strong>Checklist for Tomorrow:</strong></p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e;">
        <li>Bring a valid ID</li>
        <li>Arrive 30 minutes early</li>
        <li>Have your check-in code or QR ready</li>
        <li>Ensure your vehicle is ready for competition</li>
      </ul>
    </div>

    <p>Good luck, and we'll see you at the competition!</p>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      If you have any last-minute questions, contact us at events@mecacaraudio.com.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getEventReminderText(
    greeting: string,
    dto: SendEventReminderEmailDto,
    eventDateStr: string,
  ): string {
    const venueLocation = [dto.venueCity, dto.venueState].filter(Boolean).join(', ');
    const classesText = dto.classes.map(c => `  - ${c.format}: ${c.className}`).join('\n');

    return `
${greeting},

This is a friendly reminder that ${dto.eventName} is TOMORROW!

EVENT DETAILS
--------------
Date: ${eventDateStr}
Venue: ${dto.venueName}
Address: ${dto.venueAddress}${venueLocation ? `, ${venueLocation}` : ''}

Your Check-In Code: ${dto.checkInCode}

YOUR CLASSES
-------------
${classesText}

CHECKLIST FOR TOMORROW
----------------------
- Bring a valid ID
- Arrive 30 minutes early
- Have your check-in code ready
- Ensure your vehicle is ready for competition

Good luck, and we'll see you at the competition!

If you have any last-minute questions, contact us at events@mecacaraudio.com.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  // =========================================================================
  // Membership Email Templates
  // =========================================================================

  private getMembershipBenefitsList(benefits?: string[]): string {
    const defaultBenefits = [
      'Compete at MECA-sanctioned events nationwide',
      'Earn points toward national rankings',
      'Access exclusive member discounts from sponsors',
      'Connect with the car audio community',
      'Receive MECA newsletters and updates',
    ];
    const benefitsList = benefits && benefits.length > 0 ? benefits : defaultBenefits;
    return benefitsList.map(b => `<li style="margin-bottom: 8px;">${b}</li>`).join('');
  }

  private getMembershipBenefitsText(benefits?: string[]): string {
    const defaultBenefits = [
      'Compete at MECA-sanctioned events nationwide',
      'Earn points toward national rankings',
      'Access exclusive member discounts from sponsors',
      'Connect with the car audio community',
      'Receive MECA newsletters and updates',
    ];
    const benefitsList = benefits && benefits.length > 0 ? benefits : defaultBenefits;
    return benefitsList.map(b => `- ${b}`).join('\n');
  }

  private getMembershipWelcomeEmailTemplate(greeting: string, dto: SendMembershipWelcomeEmailDto, expiryDateStr: string): string {
    const businessOrTeamInfo = dto.businessName
      ? `<p style="margin: 5px 0;"><strong>Business:</strong> ${dto.businessName}</p>`
      : dto.teamName
        ? `<p style="margin: 5px 0;"><strong>Team:</strong> ${dto.teamName}</p>`
        : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MECA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">Welcome to MECA!</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">Your ${dto.membershipType} Membership is Active</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>Congratulations! Your MECA ${dto.membershipType} membership has been successfully activated. Welcome to the Mobile Electronics Competition Association family!</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Your Membership Details</h3>
      <p style="margin: 5px 0;"><strong>MECA ID:</strong> <span style="font-size: 20px; color: #f97316; font-weight: bold;">#${dto.mecaId}</span></p>
      <p style="margin: 5px 0;"><strong>Membership Type:</strong> ${dto.membershipType} (${dto.membershipCategory})</p>
      <p style="margin: 5px 0;"><strong>Valid Until:</strong> ${expiryDateStr}</p>
      ${businessOrTeamInfo}
    </div>

    <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #065f46;">Your Member Benefits</h3>
      <ul style="margin: 0; padding-left: 20px; color: #047857;">
        ${this.getMembershipBenefitsList(dto.benefits)}
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://meca.com/dashboard" style="display: inline-block; background: #f97316; color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Go to Your Dashboard</a>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      Keep your MECA ID handy - you'll need it when registering for events and competitions. If you have any questions, contact us at support@mecacaraudio.com.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getMembershipWelcomeEmailText(greeting: string, dto: SendMembershipWelcomeEmailDto, expiryDateStr: string): string {
    const businessOrTeamInfo = dto.businessName
      ? `Business: ${dto.businessName}`
      : dto.teamName
        ? `Team: ${dto.teamName}`
        : '';

    return `
${greeting},

Congratulations! Your MECA ${dto.membershipType} membership has been successfully activated. Welcome to the Mobile Electronics Competition Association family!

YOUR MEMBERSHIP DETAILS
-----------------------
MECA ID: #${dto.mecaId}
Membership Type: ${dto.membershipType} (${dto.membershipCategory})
Valid Until: ${expiryDateStr}
${businessOrTeamInfo}

YOUR MEMBER BENEFITS
--------------------
${this.getMembershipBenefitsText(dto.benefits)}

Go to your dashboard: https://meca.com/dashboard

Keep your MECA ID handy - you'll need it when registering for events and competitions. If you have any questions, contact us at support@mecacaraudio.com.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getMembershipRenewalEmailTemplate(greeting: string, dto: SendMembershipRenewalEmailDto, expiryDateStr: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Membership Renewed - MECA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">Membership Renewed!</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">Thank you for your continued support</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>Great news! Your MECA membership has been successfully renewed. We're thrilled to have you continue as part of the MECA community!</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Renewal Confirmation</h3>
      <p style="margin: 5px 0;"><strong>MECA ID:</strong> <span style="font-size: 20px; color: #f97316; font-weight: bold;">#${dto.mecaId}</span></p>
      <p style="margin: 5px 0;"><strong>Membership Type:</strong> ${dto.membershipType}</p>
      <p style="margin: 5px 0;"><strong>New Expiration Date:</strong> ${expiryDateStr}</p>
    </div>

    <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #065f46;">Your Member Benefits Continue</h3>
      <ul style="margin: 0; padding-left: 20px; color: #047857;">
        ${this.getMembershipBenefitsList(dto.benefits)}
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://meca.com/events" style="display: inline-block; background: #f97316; color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Find Upcoming Events</a>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      Thank you for being a valued member of MECA. We look forward to seeing you at upcoming events!
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getMembershipRenewalEmailText(greeting: string, dto: SendMembershipRenewalEmailDto, expiryDateStr: string): string {
    return `
${greeting},

Great news! Your MECA membership has been successfully renewed. We're thrilled to have you continue as part of the MECA community!

RENEWAL CONFIRMATION
--------------------
MECA ID: #${dto.mecaId}
Membership Type: ${dto.membershipType}
New Expiration Date: ${expiryDateStr}

YOUR MEMBER BENEFITS CONTINUE
-----------------------------
${this.getMembershipBenefitsText(dto.benefits)}

Find upcoming events: https://meca.com/events

Thank you for being a valued member of MECA. We look forward to seeing you at upcoming events!

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getMembershipExpiringEmailTemplate(greeting: string, dto: SendMembershipExpiringEmailDto, expiryDateStr: string): string {
    const isUrgent = dto.daysRemaining <= 7;
    const headerColor = isUrgent ? '#dc2626' : '#f59e0b';
    const headerText = isUrgent ? 'Your Membership Expires Soon!' : 'Membership Renewal Reminder';
    const warningBgColor = isUrgent ? '#fef2f2' : '#fef3c7';
    const warningBorderColor = isUrgent ? '#ef4444' : '#f59e0b';
    const warningTextColor = isUrgent ? '#991b1b' : '#92400e';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Membership Expiring - MECA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: ${headerColor}; margin: 0; font-size: 28px;">${headerText}</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">Don't lose your membership benefits</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <div style="background: ${warningBgColor}; border: 2px solid ${warningBorderColor}; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; color: ${warningTextColor}; font-size: 18px; font-weight: bold;">
        Your MECA membership expires in ${dto.daysRemaining} day${dto.daysRemaining === 1 ? '' : 's'}!
      </p>
      <p style="margin: 10px 0 0 0; color: ${warningTextColor};">
        Expiration Date: <strong>${expiryDateStr}</strong>
      </p>
    </div>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>MECA ID:</strong> #${dto.mecaId}</p>
      <p style="margin: 0;"><strong>Membership Type:</strong> ${dto.membershipType}</p>
    </div>

    <p>Renew now to maintain uninterrupted access to:</p>
    <ul style="color: #64748b;">
      <li>Event registrations and competitions</li>
      <li>Your accumulated points and rankings</li>
      <li>Member-only discounts and benefits</li>
      <li>Your MECA ID number</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dto.renewalUrl}" style="display: inline-block; background: #f97316; color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Renew Membership Now</a>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      Questions? Contact us at support@mecacaraudio.com
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getMembershipExpiringEmailText(greeting: string, dto: SendMembershipExpiringEmailDto, expiryDateStr: string): string {
    const urgency = dto.daysRemaining <= 7 ? 'URGENT: ' : '';
    return `
${greeting},

${urgency}Your MECA membership expires in ${dto.daysRemaining} day${dto.daysRemaining === 1 ? '' : 's'}!

MEMBERSHIP DETAILS
------------------
MECA ID: #${dto.mecaId}
Membership Type: ${dto.membershipType}
Expiration Date: ${expiryDateStr}

Renew now to maintain uninterrupted access to:
- Event registrations and competitions
- Your accumulated points and rankings
- Member-only discounts and benefits
- Your MECA ID number

Renew your membership here: ${dto.renewalUrl}

Questions? Contact us at support@mecacaraudio.com

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getMembershipExpiredEmailTemplate(greeting: string, dto: SendMembershipExpiredEmailDto, expiredDateStr: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Membership Expired - MECA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #dc2626; margin: 0; font-size: 28px;">Your Membership Has Expired</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">We miss you at MECA!</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b; font-size: 18px; font-weight: bold;">
        Your MECA membership has expired
      </p>
      <p style="margin: 10px 0 0 0; color: #991b1b;">
        Expired on: <strong>${expiredDateStr}</strong>
      </p>
    </div>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>MECA ID:</strong> #${dto.mecaId}</p>
      <p style="margin: 0;"><strong>Previous Membership:</strong> ${dto.membershipType}</p>
    </div>

    <p>Without an active membership, you:</p>
    <ul style="color: #64748b;">
      <li>Cannot register for MECA events</li>
      <li>Lose access to member-only benefits</li>
      <li>May lose your ranking position</li>
    </ul>

    <p><strong>Good news:</strong> If you renew within 90 days, you can keep your same MECA ID number!</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dto.renewalUrl}" style="display: inline-block; background: #f97316; color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Renew Membership Now</a>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      We'd love to have you back! If you have any questions about renewing, contact us at support@mecacaraudio.com
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getMembershipExpiredEmailText(greeting: string, dto: SendMembershipExpiredEmailDto, expiredDateStr: string): string {
    return `
${greeting},

Your MECA membership has expired.

MEMBERSHIP DETAILS
------------------
MECA ID: #${dto.mecaId}
Previous Membership: ${dto.membershipType}
Expired on: ${expiredDateStr}

Without an active membership, you:
- Cannot register for MECA events
- Lose access to member-only benefits
- May lose your ranking position

GOOD NEWS: If you renew within 90 days, you can keep your same MECA ID number!

Renew your membership here: ${dto.renewalUrl}

We'd love to have you back! If you have any questions about renewing, contact us at support@mecacaraudio.com

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getSecondaryMemberWelcomeEmailTemplate(dto: SendSecondaryMemberWelcomeEmailDto, expiryDateStr: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MECA - Secondary Member</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">Welcome to MECA!</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">You've been added as a secondary member</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hello ${dto.secondaryMemberName},</p>

    <p><strong>${dto.masterMemberName}</strong> has added you as a secondary member to their MECA account. You now have your own MECA membership and can compete at MECA events!</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Your Membership Details</h3>
      <p style="margin: 5px 0;"><strong>MECA ID:</strong> <span style="font-size: 20px; color: #f97316; font-weight: bold;">#${dto.mecaId}</span></p>
      <p style="margin: 5px 0;"><strong>Membership Type:</strong> ${dto.membershipType}</p>
      <p style="margin: 5px 0;"><strong>Valid Until:</strong> ${expiryDateStr}</p>
      <p style="margin: 5px 0;"><strong>Primary Account:</strong> ${dto.masterMemberName}</p>
    </div>

    <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #065f46;">Your Member Benefits</h3>
      <ul style="margin: 0; padding-left: 20px; color: #047857;">
        ${this.getMembershipBenefitsList(dto.benefits)}
      </ul>
    </div>

    <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #0369a1;">
        <strong>Note:</strong> As a secondary member, your membership is managed by ${dto.masterMemberName}. Contact them for any account changes or renewals.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://meca.com/events" style="display: inline-block; background: #f97316; color: #fff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Find Upcoming Events</a>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      Questions? Contact us at support@mecacaraudio.com
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getSecondaryMemberWelcomeEmailText(dto: SendSecondaryMemberWelcomeEmailDto, expiryDateStr: string): string {
    return `
Hello ${dto.secondaryMemberName},

${dto.masterMemberName} has added you as a secondary member to their MECA account. You now have your own MECA membership and can compete at MECA events!

YOUR MEMBERSHIP DETAILS
-----------------------
MECA ID: #${dto.mecaId}
Membership Type: ${dto.membershipType}
Valid Until: ${expiryDateStr}
Primary Account: ${dto.masterMemberName}

YOUR MEMBER BENEFITS
--------------------
${this.getMembershipBenefitsText(dto.benefits)}

NOTE: As a secondary member, your membership is managed by ${dto.masterMemberName}. Contact them for any account changes or renewals.

Find upcoming events: https://meca.com/events

Questions? Contact us at support@mecacaraudio.com

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  // ==========================================================================
  // Shop Order Email Templates
  // ==========================================================================

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  private formatShopAddress(address: ShopAddressDto): string {
    const parts = [address.line1];
    if (address.line2) parts.push(address.line2);
    parts.push(`${address.city}, ${address.state} ${address.postalCode}`);
    if (address.country && address.country !== 'US') parts.push(address.country);
    return parts.join('<br>');
  }

  private formatShopAddressText(address: ShopAddressDto): string {
    const parts = [address.line1];
    if (address.line2) parts.push(address.line2);
    parts.push(`${address.city}, ${address.state} ${address.postalCode}`);
    if (address.country && address.country !== 'US') parts.push(address.country);
    return parts.join('\n');
  }

  private getShopOrderItemsHtml(items: ShopOrderItemDto[]): string {
    return items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
          ${item.productName}
          ${item.productSku ? `<br><span style="color: #94a3b8; font-size: 12px;">SKU: ${item.productSku}</span>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${this.formatCurrency(item.unitPrice)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${this.formatCurrency(item.totalPrice)}</td>
      </tr>
    `).join('');
  }

  private getShopOrderItemsText(items: ShopOrderItemDto[]): string {
    return items.map(item =>
      `- ${item.productName} (x${item.quantity}) - ${this.formatCurrency(item.totalPrice)}`
    ).join('\n');
  }

  private getShopOrderConfirmationEmailTemplate(dto: SendShopOrderConfirmationEmailDto, greeting: string): string {
    const orderDateStr = dto.orderDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - MECA Shop</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">Order Confirmed!</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">Order #${dto.orderNumber}</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>Thank you for your order from the MECA Shop! We've received your order and are getting it ready.</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Order Details</h3>
      <p style="margin: 0; color: #64748b;">Order Date: ${orderDateStr}</p>
      ${dto.shippingMethod ? `<p style="margin: 5px 0 0 0; color: #64748b;">Shipping: ${dto.shippingMethod === 'priority' ? 'Priority Shipping' : 'Standard Shipping'}</p>` : ''}
    </div>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Item</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0;">Qty</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Price</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${this.getShopOrderItemsHtml(dto.items)}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 8px 12px; text-align: right;">Subtotal:</td>
            <td style="padding: 8px 12px; text-align: right;">${this.formatCurrency(dto.subtotal)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 8px 12px; text-align: right;">Shipping:</td>
            <td style="padding: 8px 12px; text-align: right;">${this.formatCurrency(dto.shippingAmount)}</td>
          </tr>
          ${dto.taxAmount > 0 ? `
          <tr>
            <td colspan="3" style="padding: 8px 12px; text-align: right;">Tax:</td>
            <td style="padding: 8px 12px; text-align: right;">${this.formatCurrency(dto.taxAmount)}</td>
          </tr>
          ` : ''}
          <tr>
            <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold; border-top: 2px solid #e2e8f0;">Total:</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #f97316; border-top: 2px solid #e2e8f0;">${this.formatCurrency(dto.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    ${dto.shippingAddress ? `
    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Shipping Address</h3>
      <p style="margin: 0; color: #64748b;">
        ${dto.shippingAddress.name ? `<strong>${dto.shippingAddress.name}</strong><br>` : ''}
        ${this.formatShopAddress(dto.shippingAddress)}
      </p>
    </div>
    ` : ''}

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      We'll send you another email when your order ships with tracking information. If you have any questions, please contact us at shop@mecacaraudio.com.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getShopOrderConfirmationEmailText(dto: SendShopOrderConfirmationEmailDto, greeting: string): string {
    const orderDateStr = dto.orderDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
${greeting},

Thank you for your order from the MECA Shop! We've received your order and are getting it ready.

ORDER CONFIRMATION
==================
Order Number: ${dto.orderNumber}
Order Date: ${orderDateStr}
${dto.shippingMethod ? `Shipping Method: ${dto.shippingMethod === 'priority' ? 'Priority Shipping' : 'Standard Shipping'}` : ''}

ITEMS
-----
${this.getShopOrderItemsText(dto.items)}

Subtotal: ${this.formatCurrency(dto.subtotal)}
Shipping: ${this.formatCurrency(dto.shippingAmount)}
${dto.taxAmount > 0 ? `Tax: ${this.formatCurrency(dto.taxAmount)}` : ''}
Total: ${this.formatCurrency(dto.totalAmount)}

${dto.shippingAddress ? `
SHIPPING ADDRESS
----------------
${dto.shippingAddress.name ? dto.shippingAddress.name + '\n' : ''}${this.formatShopAddressText(dto.shippingAddress)}
` : ''}

We'll send you another email when your order ships with tracking information. If you have any questions, please contact us at shop@mecacaraudio.com.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getShopPaymentReceiptEmailTemplate(dto: SendShopPaymentReceiptEmailDto, greeting: string): string {
    const paymentDateStr = dto.paymentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - MECA Shop</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #22c55e; margin: 0; font-size: 28px;">Payment Received!</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">Order #${dto.orderNumber}</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>We've received your payment. Thank you for shopping with MECA!</p>

    <div style="background: #dcfce7; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #166534; font-size: 14px;">Payment Confirmed</p>
      <p style="margin: 10px 0 0 0; color: #166534; font-size: 24px; font-weight: bold;">${this.formatCurrency(dto.totalAmount)}</p>
      <p style="margin: 10px 0 0 0; color: #166534; font-size: 12px;">${paymentDateStr}${dto.last4 ? ` | Card ending in ${dto.last4}` : ''}</p>
    </div>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Item</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0;">Qty</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Price</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${this.getShopOrderItemsHtml(dto.items)}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 8px 12px; text-align: right;">Subtotal:</td>
            <td style="padding: 8px 12px; text-align: right;">${this.formatCurrency(dto.subtotal)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 8px 12px; text-align: right;">Shipping:</td>
            <td style="padding: 8px 12px; text-align: right;">${this.formatCurrency(dto.shippingAmount)}</td>
          </tr>
          ${dto.taxAmount > 0 ? `
          <tr>
            <td colspan="3" style="padding: 8px 12px; text-align: right;">Tax:</td>
            <td style="padding: 8px 12px; text-align: right;">${this.formatCurrency(dto.taxAmount)}</td>
          </tr>
          ` : ''}
          <tr>
            <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold; border-top: 2px solid #e2e8f0;">Total Paid:</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #22c55e; border-top: 2px solid #e2e8f0;">${this.formatCurrency(dto.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      This email serves as your payment receipt. Your order is now being processed and we'll notify you when it ships.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getShopPaymentReceiptEmailText(dto: SendShopPaymentReceiptEmailDto, greeting: string): string {
    const paymentDateStr = dto.paymentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
${greeting},

We've received your payment. Thank you for shopping with MECA!

PAYMENT RECEIPT
===============
Order Number: ${dto.orderNumber}
Payment Date: ${paymentDateStr}
${dto.last4 ? `Card: **** **** **** ${dto.last4}` : ''}
Amount Paid: ${this.formatCurrency(dto.totalAmount)}

ITEMS
-----
${this.getShopOrderItemsText(dto.items)}

Subtotal: ${this.formatCurrency(dto.subtotal)}
Shipping: ${this.formatCurrency(dto.shippingAmount)}
${dto.taxAmount > 0 ? `Tax: ${this.formatCurrency(dto.taxAmount)}` : ''}
Total Paid: ${this.formatCurrency(dto.totalAmount)}

This email serves as your payment receipt. Your order is now being processed and we'll notify you when it ships.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getShopShippingNotificationEmailTemplate(dto: SendShopShippingNotificationEmailDto, greeting: string): string {
    const shippedDateStr = dto.shippedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Order Has Shipped - MECA Shop</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #f97316; margin: 0; font-size: 28px;">Your Order Has Shipped!</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">Order #${dto.orderNumber}</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>Great news! Your order is on its way. Here are the shipping details:</p>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Shipping Information</h3>
      <p style="margin: 0; color: #64748b;">Shipped: ${shippedDateStr}</p>
      ${dto.carrier ? `<p style="margin: 5px 0 0 0; color: #64748b;">Carrier: ${dto.carrier}</p>` : ''}
      ${dto.estimatedDelivery ? `<p style="margin: 5px 0 0 0; color: #64748b;">Estimated Delivery: ${dto.estimatedDelivery}</p>` : ''}
      ${dto.trackingNumber ? `
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #1e293b;"><strong>Tracking Number:</strong></p>
        <p style="margin: 5px 0 0 0;"><code style="background: #f1f5f9; padding: 8px 16px; border-radius: 4px; font-family: monospace;">${dto.trackingNumber}</code></p>
        ${dto.trackingUrl ? `
        <div style="margin-top: 15px;">
          <a href="${dto.trackingUrl}" style="display: inline-block; background: #f97316; color: #fff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Track Package</a>
        </div>
        ` : ''}
      </div>
      ` : ''}
    </div>

    ${dto.shippingAddress ? `
    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Shipping To</h3>
      <p style="margin: 0; color: #64748b;">
        ${dto.shippingAddress.name ? `<strong>${dto.shippingAddress.name}</strong><br>` : ''}
        ${this.formatShopAddress(dto.shippingAddress)}
      </p>
    </div>
    ` : ''}

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Items Shipped</h3>
      ${dto.items.map(item => `
      <div style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
        <p style="margin: 0;"><strong>${item.productName}</strong> x ${item.quantity}</p>
        ${item.productSku ? `<p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 12px;">SKU: ${item.productSku}</p>` : ''}
      </div>
      `).join('')}
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      If you have any questions about your shipment, please contact us at shop@mecacaraudio.com.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getShopShippingNotificationEmailText(dto: SendShopShippingNotificationEmailDto, greeting: string): string {
    const shippedDateStr = dto.shippedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
${greeting},

Great news! Your order is on its way.

SHIPPING INFORMATION
====================
Order Number: ${dto.orderNumber}
Shipped: ${shippedDateStr}
${dto.carrier ? `Carrier: ${dto.carrier}` : ''}
${dto.estimatedDelivery ? `Estimated Delivery: ${dto.estimatedDelivery}` : ''}
${dto.trackingNumber ? `Tracking Number: ${dto.trackingNumber}` : ''}
${dto.trackingUrl ? `Track your package: ${dto.trackingUrl}` : ''}

${dto.shippingAddress ? `
SHIPPING TO
-----------
${dto.shippingAddress.name ? dto.shippingAddress.name + '\n' : ''}${this.formatShopAddressText(dto.shippingAddress)}
` : ''}

ITEMS SHIPPED
-------------
${this.getShopOrderItemsText(dto.items)}

If you have any questions about your shipment, please contact us at shop@mecacaraudio.com.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }

  private getShopDeliveryConfirmationEmailTemplate(dto: SendShopDeliveryConfirmationEmailDto, greeting: string): string {
    const deliveryDateStr = dto.deliveryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Delivered - MECA Shop</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #22c55e; margin: 0; font-size: 28px;">Order Delivered!</h1>
    <p style="color: #94a3b8; margin: 10px 0 0 0;">Order #${dto.orderNumber}</p>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${greeting},</p>

    <p>Your order has been delivered! We hope you enjoy your MECA merchandise.</p>

    <div style="background: #dcfce7; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #166534; font-size: 18px; font-weight: bold;">Delivered on ${deliveryDateStr}</p>
    </div>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Items Delivered</h3>
      ${dto.items.map(item => `
      <div style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
        <p style="margin: 0;"><strong>${item.productName}</strong> x ${item.quantity}</p>
        ${item.productSku ? `<p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 12px;">SKU: ${item.productSku}</p>` : ''}
      </div>
      `).join('')}
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      Thank you for shopping with MECA! If you have any issues with your order or would like to provide feedback, please contact us at shop@mecacaraudio.com.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association</p>
  </div>
</body>
</html>
    `.trim();
  }

  private getShopDeliveryConfirmationEmailText(dto: SendShopDeliveryConfirmationEmailDto, greeting: string): string {
    const deliveryDateStr = dto.deliveryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
${greeting},

Your order has been delivered! We hope you enjoy your MECA merchandise.

ORDER DELIVERED
===============
Order Number: ${dto.orderNumber}
Delivered: ${deliveryDateStr}

ITEMS DELIVERED
---------------
${this.getShopOrderItemsText(dto.items)}

Thank you for shopping with MECA! If you have any issues with your order or would like to provide feedback, please contact us at shop@mecacaraudio.com.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();
  }
}
