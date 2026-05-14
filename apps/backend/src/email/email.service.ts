import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { SiteSettingsService } from '../site-settings/site-settings.service';

export interface SendEmailDto {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string; // Optional per-email "from" override
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

export interface SendEventInterestReminderEmailDto {
  to: string;
  firstName?: string;
  eventName: string;
  eventDate: Date;
  venueName: string;
  venueAddress: string;
  venueCity?: string;
  venueState?: string;
  eventId: string;
}

export interface SendGuestInterestVerificationEmailDto {
  to: string;
  firstName?: string;
  eventName: string;
  verificationUrl: string;
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

export interface SendMembershipCancelledRefundedEmailDto {
  to: string;
  firstName?: string;
  mecaId: number;
  membershipType: string;
  cancellationDate: Date;
  refundAmount?: number;
  reason: string;
}

export interface SendInvoiceAutoCancelledEmailDto {
  to: string;
  firstName?: string;
  invoiceNumber: string;
  membershipCancelled: boolean;
  reason: string;
}

export interface SendInvoiceOverdueEmailDto {
  to: string;
  firstName?: string;
  invoiceNumber: string;
  amountDue: number;
  daysOverdue: number;
  dueDate: Date;
  paymentUrl: string;
}

export interface SendRefundConfirmationEmailDto {
  to: string;
  firstName?: string;
  refundAmount: number;
  paymentDescription: string;
  refundDate: Date;
  paymentMethod: 'stripe' | 'paypal';
  transactionId: string;
  isPartialRefund: boolean;
}

export interface SendSubscriptionCancelledEmailDto {
  to: string;
  firstName?: string;
  membershipType: string;
  mecaId?: number | string;
  cancellationDate: Date;
  cancellationReason?: string;
  endDate?: Date | null;
  renewalUrl: string;
  paymentMethod: 'stripe' | 'paypal';
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
  private mailgunDomain: string | null = null;
  private mailgunApiKey: string | null = null;
  private mailgunApiUrl: string = 'https://api.mailgun.net'; // US region default

  /**
   * Environment tag baked into the display name on every "from" address so
   * admins can see at a glance which environment an email came from when
   * all envs share one Mailgun account. Production gets no tag (clean
   * customer-facing emails); local and stage are obvious in the inbox.
   *
   * Reads APP_ENV first (set explicitly per deploy), falls back to
   * NODE_ENV. Anything not "production" gets tagged.
   */
  private getEnvTag(): string {
    const appEnv = (process.env.APP_ENV || '').toLowerCase().trim();
    if (appEnv === 'production' || appEnv === 'prod') return '';
    if (appEnv === 'staging' || appEnv === 'stage') return '[STAGE] ';
    if (appEnv === 'local' || appEnv === 'development' || appEnv === 'dev') return '[LOCAL DEV] ';
    // Fall back to NODE_ENV when APP_ENV isn't set
    const nodeEnv = (process.env.NODE_ENV || '').toLowerCase().trim();
    if (nodeEnv === 'production') return '';
    if (nodeEnv === 'staging' || nodeEnv === 'stage') return '[STAGE] ';
    // Default for unknown / development / undefined: assume local
    return '[LOCAL DEV] ';
  }

  /** Department-specific "from" addresses, env-tagged on every read. */
  private get fromAddresses() {
    const tag = this.getEnvTag();
    return {
      noreply: `"${tag}MECA" <noreply@mecacaraudio.com>`,
      support: `"${tag}MECA Support" <support@mecacaraudio.com>`,
      memberships: `"${tag}MECA Memberships" <memberships@mecacaraudio.com>`,
      billing: `"${tag}MECA Billing" <billing@mecacaraudio.com>`,
      events: `"${tag}MECA Events" <events@mecacaraudio.com>`,
      shop: `"${tag}MECA Shop" <shop@mecacaraudio.com>`,
    };
  }

  // Staging mode cache to avoid DB queries for every email
  private stagingModeCache: Map<string, { value: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(
    @Optional() @Inject(SiteSettingsService)
    private readonly siteSettingsService?: SiteSettingsService,
  ) {
    this.checkConfiguration();
  }

  /**
   * Get a staging mode setting with caching
   */
  private async getStagingModeSetting(key: string): Promise<any> {
    if (!this.siteSettingsService) {
      return null;
    }

    const cached = this.stagingModeCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.value;
    }

    try {
      const setting = await this.siteSettingsService.findByKey(key);
      let value: any = setting?.setting_value;

      // Parse based on type
      if (setting?.setting_type === 'boolean') {
        value = value === 'true';
      } else if (setting?.setting_type === 'json') {
        try {
          value = JSON.parse(value || '[]');
        } catch {
          value = [];
        }
      }

      this.stagingModeCache.set(key, { value, timestamp: Date.now() });
      return value;
    } catch (error) {
      this.logger.warn(`Failed to fetch staging mode setting ${key}: ${error}`);
      return null;
    }
  }

  /**
   * Filter email recipient based on staging mode settings
   */
  private async filterEmailRecipient(originalEmail: string): Promise<{
    shouldSend: boolean;
    recipientEmail: string;
    reason?: string;
  }> {
    // Check if staging mode is enabled
    const stagingEnabled = await this.getStagingModeSetting('staging_mode_enabled');

    if (!stagingEnabled) {
      return { shouldSend: true, recipientEmail: originalEmail };
    }

    // Check allowed emails list
    const allowedEmails: string[] = (await this.getStagingModeSetting('staging_mode_allowed_emails')) || [];
    if (allowedEmails.some(email => email.toLowerCase() === originalEmail.toLowerCase())) {
      return { shouldSend: true, recipientEmail: originalEmail };
    }

    // Check allowed domains
    const allowedDomains: string[] = (await this.getStagingModeSetting('staging_mode_allowed_domains')) || [];
    const emailDomain = originalEmail.split('@')[1]?.toLowerCase();
    if (emailDomain && allowedDomains.some(d => emailDomain === d.toLowerCase().replace('@', ''))) {
      return { shouldSend: true, recipientEmail: originalEmail };
    }

    // Redirect to test email if configured
    const testEmail = await this.getStagingModeSetting('staging_mode_test_email');
    if (testEmail) {
      return {
        shouldSend: true,
        recipientEmail: testEmail,
        reason: `Redirected from ${originalEmail} (staging mode)`,
      };
    }

    // Block the email
    return {
      shouldSend: false,
      recipientEmail: originalEmail,
      reason: `Blocked in staging mode: ${originalEmail}`,
    };
  }

  private checkConfiguration() {
    const rawProvider = process.env.EMAIL_PROVIDER;
    const provider = rawProvider?.trim().toLowerCase();

    this.logger.log(`Email provider config: EMAIL_PROVIDER="${rawProvider}" (resolved: "${provider}")`);
    this.logger.log(`Mailgun env check: MAILGUN_DOMAIN="${process.env.MAILGUN_DOMAIN || ''}", MAILGUN_API_KEY=${process.env.MAILGUN_API_KEY ? 'SET' : 'NOT SET'}, MAILGUN_SMTP_PASSWORD=${process.env.MAILGUN_SMTP_PASSWORD ? 'SET' : 'NOT SET'}`);

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
      // Mailgun for production via HTTP API
      const domain = process.env.MAILGUN_DOMAIN;
      const apiKey = process.env.MAILGUN_API_KEY || process.env.MAILGUN_SMTP_PASSWORD;

      if (!domain || !apiKey) {
        this.logger.warn('Mailgun configured but missing MAILGUN_DOMAIN or MAILGUN_API_KEY');
        return;
      }

      this.mailgunDomain = domain;
      this.mailgunApiKey = apiKey;
      this.mailgunApiUrl = process.env.MAILGUN_API_URL || 'https://api.mailgun.net';


      this.fromEmail = process.env.MAILGUN_FROM_EMAIL || `noreply@${domain}`;
      this.isConfigured = true;
      this.provider = 'mailgun';
      this.logger.log(`Email service configured with Mailgun API (${domain})`);

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

    // Apply staging mode filter
    const filtered = await this.filterEmailRecipient(dto.to);
    if (!filtered.shouldSend) {
      this.logger.warn(`[STAGING MODE] ${filtered.reason}`);
      return { success: true, error: filtered.reason }; // Success=true so callers don't retry
    }

    if (filtered.reason) {
      this.logger.log(`[STAGING MODE] ${filtered.reason}`);
    }

    // Use filtered email address
    const emailToSend = { ...dto, to: filtered.recipientEmail };

    try {
      if (this.provider === 'mailgun') {
        return await this.sendViaMailgunApi(emailToSend);
      } else if (this.provider === 'smtp') {
        return await this.sendViaNodemailer(emailToSend);
      } else if (this.provider === 'sendgrid') {
        return await this.sendViaSendGrid(emailToSend);
      } else if (this.provider === 'resend') {
        return await this.sendViaResend(emailToSend);
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
      from: this.fromAddresses.noreply,
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
      from: this.fromAddresses.support,
    });
  }

  /**
   * Dunning email — sent on day 1, 3, 7 of a failed renewal payment, plus a
   * final notice when the membership is auto-suspended at day 14.
   */
  async sendPaymentFailedDunningEmail(dto: {
    to: string;
    firstName?: string;
    membershipType: string;
    amountDue: string;
    step: 1 | 2 | 3 | 4;
    portalUrl: string;
  }): Promise<{ success: boolean; error?: string }> {
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';
    const isFinal = dto.step === 4;
    const subject = isFinal
      ? `MECA: Your ${dto.membershipType} has been suspended`
      : `MECA: Action required — your ${dto.membershipType} renewal payment failed`;

    const intro = isFinal
      ? `<p>${greeting},</p><p>We were unable to collect payment for your ${dto.membershipType} renewal after multiple attempts. Your membership has been <strong>suspended</strong>.</p>`
      : `<p>${greeting},</p><p>We tried to collect $${dto.amountDue} for your ${dto.membershipType} renewal but the charge was declined. Please update your payment method to keep your benefits active.</p>`;

    const html = `
      <html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
        ${intro}
        <p style="margin:24px 0">
          <a href="${dto.portalUrl}" style="background:#f97316;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
            ${isFinal ? 'Reactivate Membership' : 'Update Payment Method'}
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">If you've already updated your card, please ignore this message — our system will retry automatically.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#6b7280;font-size:12px">MECA — Mobile Electronics Competition Association</p>
      </body></html>
    `;
    const text = `${greeting},\n\nWe were unable to collect $${dto.amountDue} for your ${dto.membershipType} renewal. ${isFinal ? 'Your membership has been suspended.' : 'Please update your payment method.'}\n\n${dto.portalUrl}\n\n— MECA`;

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
      from: this.fromAddresses.billing,
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
      from: this.fromAddresses.billing,
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
      from: this.fromAddresses.events,
    });
  }

  /**
   * Send guest interest verification email
   */
  async sendGuestInterestVerificationEmail(dto: SendGuestInterestVerificationEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `Confirm your interest in ${dto.eventName}`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';

    const html = this.getGuestInterestVerificationEmailTemplate(greeting, dto.eventName, dto.verificationUrl);
    const text = this.getGuestInterestVerificationEmailText(greeting, dto.eventName, dto.verificationUrl);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
      from: this.fromAddresses.events,
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
      from: this.fromAddresses.events,
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
      from: this.fromAddresses.events,
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
      from: this.fromAddresses.events,
    });
  }

  /**
   * Send event interest reminder email (lighter nudge for interested-but-not-registered users)
   */
  async sendEventInterestReminderEmail(dto: SendEventInterestReminderEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `Reminder: ${dto.eventName} is Tomorrow — Register Now!`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';
    const eventDateStr = dto.eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.getEventInterestReminderTemplate(greeting, dto, eventDateStr);
    const text = this.getEventInterestReminderText(greeting, dto, eventDateStr);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
      from: this.fromAddresses.events,
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
      from: this.fromAddresses.support,
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
      from: this.fromAddresses.support,
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
      from: this.fromAddresses.support,
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
      from: this.fromAddresses.support,
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
      from: this.fromAddresses.support,
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
      from: this.fromAddresses.memberships,
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
      from: this.fromAddresses.memberships,
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
      from: this.fromAddresses.memberships,
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
      from: this.fromAddresses.memberships,
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
      from: this.fromAddresses.memberships,
    });
  }

  /**
   * Send notification when a membership is cancelled and refunded
   */
  async sendMembershipCancelledRefundedEmail(dto: SendMembershipCancelledRefundedEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = 'Your MECA Membership Has Been Cancelled';
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';
    const cancellationDateStr = dto.cancellationDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.getMembershipCancelledRefundedEmailTemplate(greeting, dto, cancellationDateStr);
    const text = this.getMembershipCancelledRefundedEmailText(greeting, dto, cancellationDateStr);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
      from: this.fromAddresses.memberships,
    });
  }

  // ==========================================================================
  // Invoice Auto-Cancel Email Methods
  // ==========================================================================

  /**
   * Send notification when an invoice is auto-cancelled due to non-payment
   */
  async sendInvoiceAutoCancelledEmail(dto: SendInvoiceAutoCancelledEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `MECA Invoice ${dto.invoiceNumber} - Automatically Cancelled`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';

    const html = this.getInvoiceAutoCancelledEmailTemplate(greeting, dto);
    const text = this.getInvoiceAutoCancelledEmailText(greeting, dto);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
      from: this.fromAddresses.billing,
    });
  }

  /**
   * Send notification when an invoice transitions to OVERDUE
   */
  async sendInvoiceOverdueEmail(dto: SendInvoiceOverdueEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `MECA Invoice ${dto.invoiceNumber} - Past Due`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';

    const html = this.getInvoiceOverdueEmailTemplate(greeting, dto);
    const text = this.getInvoiceOverdueEmailText(greeting, dto);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
      from: this.fromAddresses.billing,
    });
  }

  /**
   * Send refund confirmation to the customer
   */
  async sendRefundConfirmationEmail(dto: SendRefundConfirmationEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = dto.isPartialRefund
      ? `Your MECA partial refund has been processed`
      : `Your MECA refund has been processed`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';

    const html = this.getRefundConfirmationEmailTemplate(greeting, dto);
    const text = this.getRefundConfirmationEmailText(greeting, dto);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
      from: this.fromAddresses.billing,
    });
  }

  /**
   * Send notification when a subscription has been cancelled, expired, or suspended
   */
  async sendSubscriptionCancelledEmail(dto: SendSubscriptionCancelledEmailDto): Promise<{ success: boolean; error?: string }> {
    const subject = `Your MECA Subscription Has Ended`;
    const greeting = dto.firstName ? `Hello ${dto.firstName}` : 'Hello';

    const html = this.getSubscriptionCancelledEmailTemplate(greeting, dto);
    const text = this.getSubscriptionCancelledEmailText(greeting, dto);

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
      from: this.fromAddresses.memberships,
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
      from: this.fromAddresses.shop,
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
      from: this.fromAddresses.billing,
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
      from: this.fromAddresses.shop,
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
      from: this.fromAddresses.shop,
    });
  }

  // ==========================================================================
  // Test Template Email Method (Admin Panel)
  // ==========================================================================

  /**
   * Send a specific email template with sample data for testing purposes.
   * Used by the admin panel to preview/test all branded email templates.
   */
  async sendTestTemplateEmail(templateKey: string, toEmail: string): Promise<{ success: boolean; message: string }> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.maborc.com';
    const sampleDate = new Date('2025-12-31');
    const sampleShippedDate = new Date('2025-12-28');
    const sampleDeliveryDate = new Date('2026-01-02');
    const sampleOrderDate = new Date('2025-12-25');
    const samplePaymentDate = new Date('2025-12-25');

    const sampleItems = [
      { description: 'Pro Competitor Membership', quantity: 1, unitPrice: '$99.00', total: '$99.00' },
      { description: 'Event Registration - SQ Finals', quantity: 1, unitPrice: '$45.00', total: '$45.00' },
    ];

    const sampleClasses = [
      { format: 'SQ', className: 'Modified 1', feeCharged: 25 },
      { format: 'SPL', className: 'Street A', feeCharged: 20 },
    ];

    const sampleClassesSimple = [
      { format: 'SQ', className: 'Modified 1' },
      { format: 'SPL', className: 'Street A' },
    ];

    const sampleShopItems = [
      { productName: 'MECA T-Shirt (Large)', productSku: 'MECA-TSH-L', quantity: 2, unitPrice: 24.99, totalPrice: 49.98 },
      { productName: 'MECA Decal Pack', productSku: 'MECA-DCL-01', quantity: 1, unitPrice: 9.99, totalPrice: 9.99 },
    ];

    const sampleAddress = {
      name: 'Test User',
      line1: '123 Main Street',
      line2: 'Suite 100',
      city: 'Tampa',
      state: 'FL',
      postalCode: '33601',
      country: 'US',
    };

    const sampleBenefits = [
      'Compete in all MECA-sanctioned events',
      'Access to member-only forums and resources',
      'Exclusive discounts on MECA merchandise',
      'Annual competition points tracking',
    ];

    try {
      let result: { success: boolean; error?: string };

      switch (templateKey) {
        case 'password_new':
          result = await this.sendPasswordEmail({
            to: toEmail,
            firstName: 'Test',
            password: 'TempPass123!',
            isNewUser: true,
            forceChange: false,
          });
          break;

        case 'password_reset':
          result = await this.sendPasswordEmail({
            to: toEmail,
            firstName: 'Test',
            password: 'TempPass123!',
            isNewUser: false,
            forceChange: true,
          });
          break;

        case 'reference_verification':
          result = await this.sendReferenceVerificationEmail({
            referenceEmail: toEmail,
            referenceName: 'Test Reference',
            applicantName: 'John Smith',
            verificationUrl: `${frontendUrl}/verify-reference?token=test-token-12345`,
            applicationType: 'Judge',
          });
          break;

        case 'invoice':
          result = await this.sendInvoiceEmail({
            to: toEmail,
            firstName: 'Test',
            invoiceNumber: 'MECA-00001',
            invoiceTotal: '$144.00',
            dueDate: sampleDate,
            paymentUrl: `${frontendUrl}/pay/invoice/test-invoice-id`,
            items: sampleItems,
          });
          break;

        case 'invoice_overdue':
          result = await this.sendInvoiceOverdueEmail({
            to: toEmail,
            firstName: 'Test',
            invoiceNumber: 'MECA-00001',
            amountDue: 144.00,
            daysOverdue: 14,
            dueDate: new Date(Date.now() - 14 * 86400000),
            paymentUrl: `${frontendUrl}/pay/invoice/test-invoice-id`,
          });
          break;

        case 'refund_confirmation':
          result = await this.sendRefundConfirmationEmail({
            to: toEmail,
            firstName: 'Test',
            refundAmount: 99.00,
            paymentDescription: 'Pro Competitor Membership',
            refundDate: new Date(),
            paymentMethod: 'stripe',
            transactionId: 'ch_3PxYz2AbCdEfGhIj',
            isPartialRefund: false,
          });
          break;

        case 'payment_failed_dunning':
          result = await this.sendPaymentFailedDunningEmail({
            to: toEmail,
            firstName: 'Test',
            membershipType: 'Pro Competitor',
            amountDue: '$99.00',
            step: 2,
            portalUrl: `${frontendUrl}/billing`,
          });
          break;

        case 'event_rating_request':
          result = await this.sendEventRatingRequestEmail({
            to: toEmail,
            firstName: 'Test',
            eventName: 'MECA SQ Finals 2025',
            eventDate: sampleDate,
            ratingUrl: `${frontendUrl}/events/test-event-id#ratings`,
          });
          break;

        case 'event_registration_confirmation':
          result = await this.sendEventRegistrationConfirmationEmail({
            to: toEmail,
            firstName: 'Test',
            lastName: 'User',
            eventName: 'MECA SQ Finals 2025',
            eventDate: sampleDate,
            venueName: 'Tampa Convention Center',
            venueAddress: '333 S Franklin St',
            venueCity: 'Tampa',
            venueState: 'FL',
            registrationId: 'REG-TEST-001',
            checkInCode: 'CHK-12345',
            classes: sampleClasses,
            amountPaid: 45,
          });
          break;

        case 'event_registration_cancelled':
          result = await this.sendEventRegistrationCancelledEmail({
            to: toEmail,
            firstName: 'Test',
            eventName: 'MECA SQ Finals 2025',
            eventDate: sampleDate,
            registrationId: 'REG-TEST-001',
            checkInCode: 'CHK-12345',
            refundAmount: 45,
          });
          break;

        case 'event_reminder':
          result = await this.sendEventReminderEmail({
            to: toEmail,
            firstName: 'Test',
            eventName: 'MECA SQ Finals 2025',
            eventDate: sampleDate,
            venueName: 'Tampa Convention Center',
            venueAddress: '333 S Franklin St',
            venueCity: 'Tampa',
            venueState: 'FL',
            checkInCode: 'CHK-12345',
            classes: sampleClassesSimple,
          });
          break;

        case 'event_interest_reminder':
          result = await this.sendEventInterestReminderEmail({
            to: toEmail,
            firstName: 'Test',
            eventName: 'MECA SQ Finals 2025',
            eventDate: sampleDate,
            venueName: 'Tampa Convention Center',
            venueAddress: '333 S Franklin St',
            venueCity: 'Tampa',
            venueState: 'FL',
            eventId: 'test-event-id',
          });
          break;

        case 'guest_interest_verification':
          result = await this.sendGuestInterestVerificationEmail({
            to: toEmail,
            firstName: 'Test',
            eventName: 'MECA SQ Finals 2025',
            verificationUrl: `${frontendUrl}/events/test-event-id/verify-interest?token=test-token-12345`,
          });
          break;

        case 'world_finals_invitation':
          result = await this.sendWorldFinalsInvitationEmail({
            to: toEmail,
            firstName: 'Test',
            competitionClass: 'SQ Modified 1',
            totalPoints: 285,
            seasonName: '2025 Season',
            registrationUrl: `${frontendUrl}/world-finals/register?token=test-token`,
          });
          break;

        case 'world_finals_qualification':
          result = await this.sendWorldFinalsQualificationEmail({
            to: toEmail,
            firstName: 'Test',
            competitorName: 'Test Competitor',
            competitionClass: 'SQ Modified 1',
            totalPoints: 285,
            qualificationThreshold: 200,
            seasonName: '2025 Season',
          });
          break;

        case 'ticket_created':
          result = await this.sendTicketCreatedEmail({
            to: toEmail,
            firstName: 'Test',
            ticketNumber: 'TKT-00001',
            ticketTitle: 'Test Support Request',
            ticketDescription: 'This is a test support ticket to verify the email template is rendering correctly with the new MECA branding.',
            category: 'General Support',
            viewTicketUrl: `${frontendUrl}/tickets/test-ticket-id`,
          });
          break;

        case 'ticket_staff_alert':
          result = await this.sendTicketStaffAlertEmail({
            to: toEmail,
            staffName: 'Admin',
            ticketNumber: 'TKT-00001',
            ticketTitle: 'Test Support Request',
            ticketDescription: 'This is a test support ticket to verify the staff alert email template.',
            category: 'General Support',
            priority: 'high',
            departmentName: 'Technical Support',
            reporterName: 'John Smith',
            reporterEmail: 'john.smith@example.com',
            viewTicketUrl: `${frontendUrl}/admin/tickets/test-ticket-id`,
          });
          break;

        case 'ticket_reply':
          result = await this.sendTicketReplyEmail({
            to: toEmail,
            recipientName: 'Test',
            ticketNumber: 'TKT-00001',
            ticketTitle: 'Test Support Request',
            replyContent: 'Thank you for reaching out! This is a sample reply to test the email template. We are looking into your issue and will get back to you shortly.',
            replierName: 'MECA Support Team',
            isStaffReply: true,
            viewTicketUrl: `${frontendUrl}/tickets/test-ticket-id`,
          });
          break;

        case 'ticket_status':
          result = await this.sendTicketStatusEmail({
            to: toEmail,
            firstName: 'Test',
            ticketNumber: 'TKT-00001',
            ticketTitle: 'Test Support Request',
            oldStatus: 'open',
            newStatus: 'in_progress',
            viewTicketUrl: `${frontendUrl}/tickets/test-ticket-id`,
          });
          break;

        case 'ticket_guest_verification':
          result = await this.sendTicketGuestVerificationEmail({
            to: toEmail,
            magicLinkUrl: `${frontendUrl}/support/verify?token=test-magic-link-token`,
            expiresInHours: 24,
            isNewTicket: true,
            ticketNumber: 'TKT-00001',
          });
          break;

        case 'membership_welcome':
          result = await this.sendMembershipWelcomeEmail({
            to: toEmail,
            firstName: 'Test',
            mecaId: 10001,
            membershipType: 'Pro Competitor',
            membershipCategory: 'Competitor',
            expiryDate: sampleDate,
            benefits: sampleBenefits,
          });
          break;

        case 'membership_renewal':
          result = await this.sendMembershipRenewalEmail({
            to: toEmail,
            firstName: 'Test',
            mecaId: 10001,
            membershipType: 'Pro Competitor',
            expiryDate: sampleDate,
            benefits: sampleBenefits,
          });
          break;

        case 'membership_expiring':
          // Production: scheduled-tasks emits /membership/checkout/:membershipId
          // (active member is still logged-in eligible). Mirror that here so
          // the test preview lands on a real route.
          result = await this.sendMembershipExpiringEmail({
            to: toEmail,
            firstName: 'Test',
            mecaId: 10001,
            membershipType: 'Pro Competitor',
            expiryDate: sampleDate,
            daysRemaining: 7,
            renewalUrl: `${frontendUrl}/membership/checkout/test-membership-id`,
          });
          break;

        case 'membership_expired':
          // Production: tokenized public renewal link. Sample previews the
          // shape; the token is a placeholder for admin preview only.
          result = await this.sendMembershipExpiredEmail({
            to: toEmail,
            firstName: 'Test',
            mecaId: 10001,
            membershipType: 'Pro Competitor',
            expiredDate: sampleDate,
            renewalUrl: `${frontendUrl}/renew/test-renewal-token-preview-only`,
          });
          break;

        case 'secondary_member_welcome':
          result = await this.sendSecondaryMemberWelcomeEmail({
            to: toEmail,
            secondaryMemberName: 'Test Secondary',
            mecaId: 10002,
            membershipType: 'Team Membership',
            masterMemberName: 'John Smith',
            expiryDate: sampleDate,
            benefits: sampleBenefits,
          });
          break;

        case 'membership_cancelled':
          result = await this.sendMembershipCancelledRefundedEmail({
            to: toEmail,
            firstName: 'Test',
            mecaId: 10001,
            membershipType: 'Pro Competitor',
            cancellationDate: new Date(),
            refundAmount: 99.00,
            reason: 'Requested by member (test)',
          });
          break;

        case 'subscription_cancelled':
          result = await this.sendSubscriptionCancelledEmail({
            to: toEmail,
            firstName: 'Test',
            membershipType: 'Pro Competitor',
            mecaId: 10001,
            cancellationDate: new Date(),
            cancellationReason: 'Payment method removed (test)',
            endDate: sampleDate,
            // Subscription cancelled — they're signed in still; route to billing portal.
            renewalUrl: `${frontendUrl}/billing`,
            paymentMethod: 'stripe',
          });
          break;

        case 'invoice_auto_cancelled':
          result = await this.sendInvoiceAutoCancelledEmail({
            to: toEmail,
            firstName: 'Test',
            invoiceNumber: 'MECA-00001',
            membershipCancelled: true,
            reason: 'Auto-cancelled: unpaid for 30+ days past due date (test)',
          });
          break;

        case 'shop_order_confirmation':
          result = await this.sendShopOrderConfirmationEmail({
            to: toEmail,
            customerName: 'Test',
            orderNumber: 'ORD-00001',
            items: sampleShopItems,
            subtotal: 59.97,
            shippingAmount: 5.99,
            taxAmount: 4.20,
            totalAmount: 70.16,
            shippingAddress: sampleAddress,
            shippingMethod: 'USPS Priority Mail',
            orderDate: sampleOrderDate,
          });
          break;

        case 'shop_payment_receipt':
          result = await this.sendShopPaymentReceiptEmail({
            to: toEmail,
            customerName: 'Test',
            orderNumber: 'ORD-00001',
            items: sampleShopItems,
            subtotal: 59.97,
            shippingAmount: 5.99,
            taxAmount: 4.20,
            totalAmount: 70.16,
            paymentDate: samplePaymentDate,
            last4: '4242',
          });
          break;

        case 'shop_shipping_notification':
          result = await this.sendShopShippingNotificationEmail({
            to: toEmail,
            customerName: 'Test',
            orderNumber: 'ORD-00001',
            items: sampleShopItems,
            trackingNumber: '9400111899223456789012',
            trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223456789012',
            carrier: 'USPS',
            shippingAddress: sampleAddress,
            estimatedDelivery: 'January 2, 2026',
            shippedDate: sampleShippedDate,
          });
          break;

        case 'shop_delivery_confirmation':
          result = await this.sendShopDeliveryConfirmationEmail({
            to: toEmail,
            customerName: 'Test',
            orderNumber: 'ORD-00001',
            items: sampleShopItems,
            deliveryDate: sampleDeliveryDate,
          });
          break;

        case 'admin_new_membership':
          result = await this.sendAdminAlertEmail({
            to: toEmail,
            title: 'New Membership: John Smith',
            subtitle: 'competitor - $75.00',
            fields: [
              { label: 'Member', value: 'John Smith' },
              { label: 'Email', value: 'john.smith@example.com' },
              { label: 'MECA ID', value: '100456' },
              { label: 'Type', value: 'Competitor Annual' },
              { label: 'Category', value: 'competitor' },
              { label: 'Amount Paid', value: '$75.00' },
              { label: 'Date', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
            ],
            dashboardUrl: `${frontendUrl}/admin/members`,
            dashboardLabel: 'View Members',
          });
          break;

        case 'admin_new_shop_order':
          result = await this.sendAdminAlertEmail({
            to: toEmail,
            title: 'New Shop Order #SHOP-2026-00042',
            subtitle: '$129.95',
            fields: [
              { label: 'Order #', value: 'SHOP-2026-00042' },
              { label: 'Customer', value: 'Jane Doe' },
              { label: 'Email', value: 'jane.doe@example.com' },
              { label: 'Items', value: '3' },
              { label: 'Total', value: '$129.95' },
              { label: 'Date', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
            ],
            dashboardUrl: `${frontendUrl}/admin/shop/orders`,
            dashboardLabel: 'View Orders',
          });
          break;

        case 'admin_subscription_renewed':
          result = await this.sendAdminAlertEmail({
            to: toEmail,
            title: 'Subscription Renewed: Mike Johnson',
            subtitle: 'Extended to Apr 14, 2027',
            fields: [
              { label: 'Member', value: 'Mike Johnson' },
              { label: 'MECA ID', value: '100789' },
              { label: 'New End Date', value: 'Apr 14, 2027' },
              { label: 'Subscription ID', value: 'sub_1PxYz2AbCdEfGh' },
            ],
            dashboardUrl: `${frontendUrl}/admin/members`,
            dashboardLabel: 'View Members',
          });
          break;

        case 'admin_subscription_cancelled':
          result = await this.sendAdminAlertEmail({
            to: toEmail,
            title: 'Subscription Cancelled: Sarah Williams',
            subtitle: 'MECA ID: 100234',
            fields: [
              { label: 'Member', value: 'Sarah Williams' },
              { label: 'MECA ID', value: '100234' },
              { label: 'Date', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
            ],
            dashboardUrl: `${frontendUrl}/admin/members`,
            dashboardLabel: 'View Members',
          });
          break;

        case 'admin_membership_cancelled':
          result = await this.sendAdminAlertEmail({
            to: toEmail,
            title: 'Membership Cancelled: Bob Anderson',
            subtitle: 'MECA ID: 100567',
            fields: [
              { label: 'Member', value: 'Bob Anderson' },
              { label: 'MECA ID', value: '100567' },
              { label: 'Reason', value: 'Requested refund - moving out of state' },
              { label: 'Date', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
            ],
            dashboardUrl: `${frontendUrl}/admin/members`,
            dashboardLabel: 'View Members',
          });
          break;

        case 'admin_weekly_digest':
          result = await this.sendAdminWeeklyDigestEmail({
            to: toEmail,
            dateRange: `${new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
            summaryCards: [
              { label: 'New Members', value: '3', color: '#f97316' },
              { label: 'Shop Orders', value: '2', color: '#3b82f6' },
              { label: 'Revenue', value: '$515', color: '#22c55e' },
              { label: 'Cancellations', value: '1', color: '#ef4444' },
              { label: 'Upcoming Renewals', value: '2', color: '#eab308' },
              { label: 'Expiring Soon', value: '1', color: '#ef4444' },
            ],
            sections: [
              { title: 'New Memberships', count: 3, color: '#f97316', headers: ['Member', 'Type', 'Amount'], rows: [['John Smith', 'Competitor Annual', '$75.00'], ['Jane Doe', 'Retailer', '$200.00'], ['Mike Johnson', 'Competitor + Team', '$100.00']] },
              { title: 'Shop Orders', count: 2, color: '#3b82f6', headers: ['Order #', 'Customer', 'Total'], rows: [['SHOP-2026-00040', 'Tom Brown', '$49.99'], ['SHOP-2026-00041', 'Lisa Chen', '$89.50']] },
              { title: 'Cancellations', count: 1, color: '#ef4444', headers: ['Member', 'Reason', 'Date'], rows: [['Bob Anderson', 'Moving out of state', 'Apr 14, 2026']] },
              { title: 'Upcoming Renewals (Next 30 Days)', count: 2, color: '#eab308', headers: ['Member', 'MECA ID', 'Renewal Date'], rows: [['Chris Evans', '100111', 'Apr 28, 2026'], ['Diana Prince', '100222', 'May 5, 2026']] },
              { title: 'Expiring Soon - No Auto-Renewal (Next 30 Days)', count: 1, color: '#ef4444', headers: ['Member', 'MECA ID', 'Expiry Date'], rows: [['Bruce Wayne', '100333', 'Apr 21, 2026']] },
            ],
          });
          break;

        default:
          return { success: false, message: `Unknown template key: ${templateKey}` };
      }

      if (result.success) {
        return { success: true, message: `Test email "${templateKey}" sent successfully to ${toEmail}` };
      } else {
        return { success: false, message: `Failed to send "${templateKey}": ${result.error}` };
      }
    } catch (error: any) {
      return { success: false, message: `Error sending "${templateKey}": ${error.message}` };
    }
  }

  private async sendViaSendGrid(dto: SendEmailDto): Promise<{ success: boolean; error?: string }> {
    // Dynamic import to avoid requiring the package if not used
    try {
      // @ts-ignore - Package may not be installed, handled at runtime
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(process.env.SENDGRID_API_KEY!);

      await sgMail.default.send({
        to: dto.to,
        from: dto.from || this.fromEmail,
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
        from: dto.from || this.fromEmail,
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

  private async sendViaMailgunApi(dto: SendEmailDto): Promise<{ success: boolean; error?: string }> {
    if (!this.mailgunDomain || !this.mailgunApiKey) {
      return { success: false, error: 'Mailgun API not configured' };
    }

    const url = `${this.mailgunApiUrl}/v3/${this.mailgunDomain}/messages`;
    const form = new URLSearchParams();
    form.append('from', dto.from || this.fromEmail);
    form.append('to', dto.to);
    form.append('subject', dto.subject);
    form.append('html', dto.html);
    if (dto.text) {
      form.append('text', dto.text);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${this.mailgunApiKey}`).toString('base64')}`,
      },
      body: form,
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Mailgun API error (${response.status}): ${body}`);
      throw new Error(`Mailgun API error: ${response.status} ${body}`);
    }

    this.logger.log(`Email sent via Mailgun API to ${dto.to}`);
    return { success: true };
  }

  private async sendViaNodemailer(dto: SendEmailDto): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Nodemailer transporter not configured' };
    }

    try {
      await this.transporter.sendMail({
        from: dto.from || this.fromEmail,
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

  // ==========================================================================
  // Shared Email Template Helpers
  // ==========================================================================

  /**
   * Returns an Outlook-compatible button using a table-based layout.
   * Outlook ignores border-radius and display:inline-block on <a> tags.
   */
  private getEmailButton(text: string, url: string, bgColor = '#f97316'): string {
    return `<div style="text-align: center; margin: 30px 0;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:50px;v-text-anchor:middle;width:250px;" arcsize="16%" strokecolor="${bgColor}" fillcolor="${bgColor}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${text}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${url}" style="display: inline-block; background-color: ${bgColor}; color: #ffffff; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif;">${text}</a>
      <!--<![endif]-->
    </div>`;
  }

  private get logoUrl(): string {
    return `${process.env.FRONTEND_URL || 'https://www.mecacaraudio.com'}/meca-logo-transparent.png`;
  }

  private get supportDeskUrl(): string {
    return `${process.env.FRONTEND_URL || 'https://www.mecacaraudio.com'}/support`;
  }

  /**
   * Returns the standard MECA email header with logo, title, and optional subtitle.
   * The optional preheader is rendered as hidden text at the top of the <body> so
   * email clients (Outlook, Gmail, Apple Mail) show it as the inbox preview line
   * instead of the logo URL / alt text.
   */
  private getEmailHeaderHtml(title: string, subtitle?: string, preheader?: string): string {
    const subtitleHtml = subtitle
      ? `<p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">${subtitle}</p>`
      : '';
    const escapedPreheader = preheader
      ? preheader
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
      : '';
    const preheaderHtml = escapedPreheader
      ? `  <!-- Preheader: hidden preview text shown in the inbox preview line -->
  <div style="display:none; font-size:1px; color:#f1f5f9; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">${escapedPreheader}</div>
  <div style="display:none; font-size:1px; color:#f1f5f9; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">&#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;</div>
`
      : '';
    return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title} - MECA</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
${preheaderHtml}  <!-- Outer wrapper table for centering -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto;">
          <!-- MECA Logo Banner -->
          <tr>
            <td align="center" style="background-color: #1e293b; padding: 20px 30px;">
              <img src="${this.logoUrl}" alt="MECA - Mobile Electronics Competition Association" width="280" style="display: block; max-width: 280px; height: auto; border: 0;" />
            </td>
          </tr>

          <!-- Title Bar -->
          <tr>
            <td style="background-color: #c41e1e; padding: 15px 30px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-family: Arial, sans-serif;">${title}</h1>
              ${subtitleHtml}
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 30px;">`;
  }

  /**
   * Returns the standard MECA email footer with support link, slogan banner, and copyright
   */
  private getEmailFooterHtml(): string {
    return `
    <p style="color: #64748b; font-size: 13px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
      Need help? <a href="${this.supportDeskUrl}" style="color: #f97316; text-decoration: none; font-weight: bold;">Visit our Support Desk</a>
    </p>
            </td>
          </tr>

          <!-- Fun, Fair, Loud and Clear! Banner -->
          <tr>
            <td align="center" style="background-color: #c41e1e; padding: 20px 30px;">
              <p style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold; font-style: italic; font-family: Arial, sans-serif;">Fun, Fair, Loud and Clear!</p>
            </td>
          </tr>

          <!-- Copyright Footer -->
          <tr>
            <td align="center" style="background-color: #1e293b; padding: 15px 20px; color: #94a3b8; font-size: 12px;">
              <p style="margin: 0; color: #94a3b8; font-family: Arial, sans-serif;">MECA - Mobile Electronics Competition Association</p>
              <p style="margin: 5px 0 0 0; color: #94a3b8; font-family: Arial, sans-serif;">&copy; 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.</p>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ==========================================================================
  // Individual Email Templates
  // ==========================================================================

  private getNewUserEmailTemplate(greeting: string, email: string, password: string, forceChange: boolean): string {
    return `
${this.getEmailHeaderHtml('Welcome to MECA!', undefined, 'Your MECA account is ready — your account details are inside')}
    <p style="font-size: 16px;">${greeting},</p>

    <p>Your MECA account has been created. Here are your login details:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0;"><strong>Password:</strong> <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
    </td></tr></table>

    ${forceChange ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px;">
      <p style="margin: 0; color: #92400e;"><strong>Important:</strong> You will be required to change your password when you first log in.</p>
    </td></tr></table>
    ` : ''}

    <p>You can log in at: <a href="https://mecacaraudio.com/login" style="color: #f97316;">https://mecacaraudio.com/login</a></p>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      For security reasons, please do not share your password with anyone. If you did not request this account, please contact support.
    </p>
${this.getEmailFooterHtml()}
    `.trim();
  }

  private getPasswordResetEmailTemplate(greeting: string, password: string, forceChange: boolean): string {
    return `
${this.getEmailHeaderHtml('Password Reset', undefined, 'Your MECA password has been reset — sign in with your new credentials')}
    <p style="font-size: 16px;">${greeting},</p>

    <p>Your MECA account password has been reset by an administrator. Here is your new password:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px; text-align: center;">
      <p style="margin: 0;"><strong>New Password:</strong></p>
      <p style="margin: 10px 0 0 0;"><code style="background: #f1f5f9; padding: 8px 16px; border-radius: 4px; font-family: monospace; font-size: 18px;">${password}</code></p>
    </td></tr></table>

    ${forceChange ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px;">
      <p style="margin: 0; color: #92400e;"><strong>Important:</strong> You will be required to change your password when you next log in.</p>
    </td></tr></table>
    ` : ''}

    <p>You can log in at: <a href="https://mecacaraudio.com/login" style="color: #f97316;">https://mecacaraudio.com/login</a></p>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      If you did not request this password reset, please contact support immediately.
    </p>
${this.getEmailFooterHtml()}
    `.trim();
  }

  private getNewUserEmailText(greeting: string, email: string, password: string, forceChange: boolean): string {
    return `
${greeting},

Your MECA account has been created. Here are your login details:

Email: ${email}
Password: ${password}

${forceChange ? 'IMPORTANT: You will be required to change your password when you first log in.\n' : ''}
You can log in at: https://mecacaraudio.com/login

For security reasons, please do not share your password with anyone. If you did not request this account, please contact support.

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getPasswordResetEmailText(greeting: string, password: string, forceChange: boolean): string {
    return `
${greeting},

Your MECA account password has been reset by an administrator.

New Password: ${password}

${forceChange ? 'IMPORTANT: You will be required to change your password when you next log in.\n' : ''}
You can log in at: https://mecacaraudio.com/login

If you did not request this password reset, please contact support immediately.

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
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
${this.getEmailHeaderHtml('Invoice ' + invoiceNumber, undefined, `Invoice ${invoiceNumber} — payment due`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>A new invoice has been generated for your MECA membership. Please review the details below and make payment by the due date.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
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
    </td></tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px;">
      <p style="margin: 0; color: #92400e;"><strong>Due Date:</strong> ${dueDate}</p>
    </td></tr></table>

    ${this.getEmailButton('Pay Invoice Now', paymentUrl)}
${this.getEmailFooterHtml()}
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

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getReferenceVerificationEmailTemplate(dto: SendReferenceVerificationEmailDto): string {
    return `
${this.getEmailHeaderHtml(dto.applicationType + ' Application', 'Reference Verification Request', `A MECA ${dto.applicationType} applicant has listed you as a reference`)}
    <p style="font-size: 16px;">Hello ${dto.referenceName},</p>

    <p><strong>${dto.applicantName}</strong> has applied to become a MECA ${dto.applicationType} and has listed you as a professional reference.</p>

    <p>We would greatly appreciate it if you could take a few minutes to verify that you know this applicant and provide a brief testimonial about their qualifications.</p>

    ${this.getEmailButton('Verify Reference', dto.verificationUrl)}

    <p style="color: #64748b; font-size: 14px;">This link will expire in 14 days.</p>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      If you did not expect this email or do not know the applicant, you can safely ignore this message.
    </p>
${this.getEmailFooterHtml()}
    `.trim();
  }

  private getReferenceVerificationEmailText(dto: SendReferenceVerificationEmailDto): string {
    return `
Hello ${dto.referenceName},

${dto.applicantName} has applied to become a MECA ${dto.applicationType} and has listed you as a professional reference.

We would greatly appreciate it if you could take a few minutes to verify that you know this applicant and provide a brief testimonial about their qualifications.

Click here to verify: ${dto.verificationUrl}

This link will expire in 14 days.

If you did not expect this email or do not know the applicant, you can safely ignore this message.

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getEventRatingEmailTemplate(greeting: string, eventName: string, eventDate: string, ratingUrl: string): string {
    return `
${this.getEmailHeaderHtml('How Was Your Experience?', "We'd love to hear your feedback", `Tell us how ${eventName} went — it only takes a minute`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>Thank you for participating in <strong>${eventName}</strong> on ${eventDate}!</p>

    <p>Your feedback helps us improve our events and recognize our outstanding judges and event directors. Please take a moment to rate your experience.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px; text-align: center;">
      <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 15px;">
        <span style="font-size: 32px;">⭐</span>
        <span style="font-size: 32px;">⭐</span>
        <span style="font-size: 32px;">⭐</span>
        <span style="font-size: 32px;">⭐</span>
        <span style="font-size: 32px;">⭐</span>
      </div>
      <p style="margin: 0; color: #64748b;">Rate the judges and event directors who made this event possible</p>
    </td></tr></table>

    ${this.getEmailButton('Rate Event Staff Now', ratingUrl)}

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      Your ratings can be anonymous if you prefer. All feedback is valuable and helps us maintain the highest standards at MECA events.
    </p>
${this.getEmailFooterHtml()}
    `.trim();
  }

  private getEventRatingEmailText(greeting: string, eventName: string, eventDate: string, ratingUrl: string): string {
    return `
${greeting},

Thank you for participating in ${eventName} on ${eventDate}!

Your feedback helps us improve our events and recognize our outstanding judges and event directors. Please take a moment to rate your experience.

Rate Event Staff Now: ${ratingUrl}

Your ratings can be anonymous if you prefer. All feedback is valuable and helps us maintain the highest standards at MECA events.

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
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
${this.getEmailHeaderHtml('Support Request Received', 'Ticket ' + dto.ticketNumber, `We've received your support request — ticket ${dto.ticketNumber}`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>Thank you for contacting MECA Support. We have received your request and our team will review it shortly.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <p style="margin: 0 0 10px 0;"><strong>Ticket Number:</strong> ${dto.ticketNumber}</p>
      <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${dto.ticketTitle}</p>
      <p style="margin: 0 0 10px 0;"><strong>Category:</strong> ${this.formatCategory(dto.category)}</p>
      <p style="margin: 0;"><strong>Description:</strong></p>
      <p style="margin: 10px 0 0 0; padding: 10px; background: #f1f5f9; border-radius: 4px; white-space: pre-wrap;">${truncatedDescription}</p>
    </td></tr></table>

    ${this.getEmailButton('View Ticket', dto.viewTicketUrl)}

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      We typically respond within 24-48 hours. You will receive an email notification when our team responds to your request.
    </p>
${this.getEmailFooterHtml()}
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

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getTicketStaffAlertEmailTemplate(dto: SendTicketStaffAlertEmailDto, greeting: string): string {
    const truncatedDescription = dto.ticketDescription.length > 300
      ? dto.ticketDescription.substring(0, 300) + '...'
      : dto.ticketDescription;

    return `
${this.getEmailHeaderHtml('New Support Ticket', dto.departmentName + ' Department', `New ${dto.priority} priority ticket in ${dto.departmentName} — action needed`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>A new support ticket has been submitted that requires your attention.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
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
    </td></tr></table>

    ${this.getEmailButton('View & Respond', dto.viewTicketUrl)}
${this.getEmailFooterHtml()}
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

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getTicketReplyEmailTemplate(dto: SendTicketReplyEmailDto, greeting: string): string {
    const replyLabel = dto.isStaffReply ? 'MECA Support' : 'Customer';
    // Escape user-provided content so HTML in the reply doesn't render and
    // break layout / open XSS. Preserve newlines via white-space:pre-wrap.
    const escapedReply = (dto.replyContent || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `
${this.getEmailHeaderHtml('New Reply on Your Ticket', 'Ticket ' + dto.ticketNumber, `${dto.replierName} replied to your MECA support ticket ${dto.ticketNumber}`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p><strong>${dto.replierName}</strong> replied to your support ticket <strong>"${dto.ticketTitle}"</strong>:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border-left: 4px solid ${dto.isStaffReply ? '#f97316' : '#3b82f6'}; padding: 0;">
      <div style="background-color: ${dto.isStaffReply ? '#fff7ed' : '#eff6ff'}; padding: 12px 20px; border-bottom: 1px solid #e2e8f0;">
        <span style="display: inline-block; width: 36px; height: 36px; background: ${dto.isStaffReply ? '#f97316' : '#3b82f6'}; border-radius: 50%; text-align: center; line-height: 36px; color: #fff; font-weight: bold; vertical-align: middle;">${dto.replierName.charAt(0).toUpperCase()}</span>
        <span style="margin-left: 12px; vertical-align: middle;">
          <strong style="color: #1e293b;">${dto.replierName}</strong>
          <span style="color: #64748b; font-size: 12px; display: block;">${replyLabel}</span>
        </span>
      </div>
      <div style="padding: 20px; color: #1e293b; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapedReply}</div>
    </td></tr></table>

    ${this.getEmailButton(dto.isStaffReply ? 'View & Reply' : 'View Full Conversation', dto.viewTicketUrl)}

    <p style="color: #64748b; font-size: 13px; margin-top: 30px; text-align: center;">
      Click the button above to ${dto.isStaffReply ? 'open the ticket and continue the conversation' : 'see the full thread and respond'}.
    </p>
${this.getEmailFooterHtml()}
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

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getTicketStatusEmailTemplate(dto: SendTicketStatusEmailDto, greeting: string): string {
    const statusMessage = this.getStatusChangeMessage(dto.newStatus);
    const statusColor = dto.newStatus === 'resolved' || dto.newStatus === 'closed' ? '#22c55e' : '#3b82f6';

    return `
${this.getEmailHeaderHtml('Ticket Status Update', `Ticket ${dto.ticketNumber}`, `Status update on your MECA support ticket ${dto.ticketNumber}`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>The status of your support ticket has been updated.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px; text-align: center;">
      <p style="margin: 0 0 10px 0;"><strong>${dto.ticketTitle}</strong></p>
      <div style="margin: 20px 0;">
        <span style="padding: 8px 16px; background: #e2e8f0; border-radius: 4px; color: #64748b; text-decoration: line-through;">${this.formatStatus(dto.oldStatus)}</span>
        <span style="margin: 0 10px;">-></span>
        <span style="padding: 8px 16px; background: ${statusColor}; border-radius: 4px; color: #fff; font-weight: bold;">${this.formatStatus(dto.newStatus)}</span>
      </div>
      <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">${statusMessage}</p>
    </td></tr></table>

    ${this.getEmailButton('View Ticket', dto.viewTicketUrl)}

    ${dto.newStatus === 'resolved' ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #dcfce7; border: 1px solid #22c55e; padding: 15px;">
      <p style="margin: 0; color: #166534;">If you need further assistance or the issue persists, you can reopen this ticket by replying.</p>
    </td></tr></table>
    ` : ''}
${this.getEmailFooterHtml()}
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
Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
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
${this.getEmailHeaderHtml(title, 'MECA Support System', dto.isNewTicket ? 'Verify your email to submit your MECA support request' : `Access your MECA support ticket ${dto.ticketNumber}`)}
    <p style="font-size: 16px;">Hello,</p>

    <p>${description}</p>

    ${this.getEmailButton(dto.isNewTicket ? 'Verify & Continue' : 'Access Ticket', dto.magicLinkUrl)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px;">
      <p style="margin: 0; color: #92400e;"><strong>Important:</strong> This link will expire in ${dto.expiresInHours} hour${dto.expiresInHours > 1 ? 's' : ''}.</p>
    </td></tr></table>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      If you did not request this email, you can safely ignore it. For security reasons, do not share this link with anyone.
    </p>
${this.getEmailFooterHtml()}
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

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
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
${this.getEmailHeaderHtml('Registration Confirmed!', `You're all set for ${dto.eventName}`, `You're registered for ${dto.eventName} — see you there!`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>Your registration for <strong>${dto.eventName}</strong> has been confirmed. We look forward to seeing you there!</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Event Details</h3>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDateStr}</p>
      <p style="margin: 5px 0;"><strong>Venue:</strong> ${dto.venueName}</p>
      <p style="margin: 5px 0;"><strong>Address:</strong> ${dto.venueAddress}${venueLocation ? `, ${venueLocation}` : ''}</p>
    </td></tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Registration Details</h3>
      <p style="margin: 5px 0;"><strong>Confirmation #:</strong> <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${dto.checkInCode}</code></p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Format</th>
            <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Competition Class</th>
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
    </td></tr></table>

    ${dto.qrCodeData ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px; text-align: center;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Your Check-In QR Code</h3>
      <img src="${dto.qrCodeData}" alt="Check-in QR Code" style="max-width: 200px; height: auto;" />
      <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">Show this at the event for quick check-in</p>
    </td></tr></table>
    ` : ''}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #dbeafe; border: 1px solid #3b82f6; padding: 15px;">
      <p style="margin: 0; color: #1e40af;"><strong>Important:</strong> Please bring your MECA Membership card or log in to your <strong>MY MECA</strong> account and have your QR code ready for the event team to scan at check-in. Arrive at least 30 minutes early.</p>
    </td></tr></table>

${this.getEmailFooterHtml()}
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

IMPORTANT: Please bring your MECA Membership card or log in to your MY MECA account and have your QR code ready for the event team to scan at check-in. Arrive at least 30 minutes early.

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getEventRegistrationCancelledTemplate(
    greeting: string,
    dto: SendEventRegistrationCancelledEmailDto,
    eventDateStr: string,
  ): string {
    return `
${this.getEmailHeaderHtml('Registration Cancelled', dto.eventName, `Your registration for ${dto.eventName} has been cancelled`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>Your registration for <strong>${dto.eventName}</strong> scheduled for ${eventDateStr} has been cancelled.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <p style="margin: 5px 0;"><strong>Event:</strong> ${dto.eventName}</p>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDateStr}</p>
      <p style="margin: 5px 0;"><strong>Confirmation #:</strong> ${dto.checkInCode}</p>
    </td></tr></table>

    ${dto.refundAmount !== undefined && dto.refundAmount > 0 ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #dcfce7; border: 1px solid #22c55e; padding: 15px;">
      <p style="margin: 0; color: #166534;"><strong>Refund Amount:</strong> $${dto.refundAmount.toFixed(2)}</p>
      <p style="margin: 5px 0 0 0; color: #166534; font-size: 14px;">Your refund will be processed within 5-10 business days.</p>
    </td></tr></table>
    ` : ''}

    <p>We're sorry you won't be joining us at this event. We hope to see you at a future MECA competition!</p>

${this.getEmailFooterHtml()}
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

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
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
${this.getEmailHeaderHtml('See You Tomorrow!', `${dto.eventName} is coming up`, `Reminder — ${dto.eventName} is tomorrow!`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>This is a friendly reminder that <strong>${dto.eventName}</strong> is tomorrow! Here's everything you need to know:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Event Details</h3>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDateStr}</p>
      <p style="margin: 5px 0;"><strong>Venue:</strong> ${dto.venueName}</p>
      <p style="margin: 5px 0;"><strong>Address:</strong> ${dto.venueAddress}${venueLocation ? `, ${venueLocation}` : ''}</p>
      <p style="margin: 15px 0 5px 0;"><strong>Your Check-In Code:</strong></p>
      <p style="margin: 0;"><code style="background: #f1f5f9; padding: 8px 16px; border-radius: 4px; font-family: monospace; font-size: 18px;">${dto.checkInCode}</code></p>
    </td></tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #1e293b;">Your Competition Classes</h3>
      <ul style="margin: 0; padding-left: 20px;">
        ${classesHtml}
      </ul>
    </td></tr></table>

    ${dto.qrCodeData ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px; text-align: center;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Your Check-In QR Code</h3>
      <img src="${dto.qrCodeData}" alt="Check-in QR Code" style="max-width: 200px; height: auto;" />
      <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">Show this at the event for quick check-in</p>
    </td></tr></table>
    ` : ''}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px;">
      <p style="margin: 0; color: #92400e;"><strong>Checklist for Tomorrow:</strong></p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e;">
        <li>Bring your MECA Membership card or log in to MY MECA</li>
        <li>Have your QR code ready for the event team to scan</li>
        <li>Arrive 30 minutes early</li>
        <li>Ensure your vehicle is ready for competition</li>
      </ul>
    </td></tr></table>

    <p>Good luck, and we'll see you at the competition!</p>

${this.getEmailFooterHtml()}
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

YOUR COMPETITION CLASSES
------------------------
${classesText}

CHECKLIST FOR TOMORROW
----------------------
- Bring your MECA Membership card or log in to MY MECA
- Have your QR code ready for the event team to scan
- Arrive 30 minutes early
- Ensure your vehicle is ready for competition

Good luck, and we'll see you at the competition!

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  // =========================================================================
  // Event Interest Reminder Templates
  // =========================================================================

  private getEventInterestReminderTemplate(
    greeting: string,
    dto: SendEventInterestReminderEmailDto,
    eventDateStr: string,
  ): string {
    const venueLocation = [dto.venueCity, dto.venueState].filter(Boolean).join(', ');
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.mecacaraudio.com';
    const registerUrl = `${frontendUrl}/events/${dto.eventId}/register`;

    return `
${this.getEmailHeaderHtml('Still Interested?', `${dto.eventName} is tomorrow!`, `Don't miss out — register for ${dto.eventName} before tomorrow`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>You expressed interest in <strong>${dto.eventName}</strong>, and it's happening <strong>tomorrow</strong>! There's still time to register and secure your spot.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Event Details</h3>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${eventDateStr}</p>
      <p style="margin: 5px 0;"><strong>Venue:</strong> ${dto.venueName}</p>
      <p style="margin: 5px 0;"><strong>Address:</strong> ${dto.venueAddress}${venueLocation ? `, ${venueLocation}` : ''}</p>
    </td></tr></table>

    <div style="text-align: center; margin: 30px 0;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${registerUrl}" style="height:50px;v-text-anchor:middle;width:250px;" arcsize="16%" strokecolor="#ea580c" fillcolor="#ea580c">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Register Now</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${registerUrl}" style="display: inline-block; background-color: #ea580c; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Register Now</a>
      <!--<![endif]-->
    </div>

    <p style="color: #64748b; font-size: 14px;">Don't miss out — spots may be limited. We'd love to see you there!</p>

${this.getEmailFooterHtml()}
    `.trim();
  }

  private getEventInterestReminderText(
    greeting: string,
    dto: SendEventInterestReminderEmailDto,
    eventDateStr: string,
  ): string {
    const venueLocation = [dto.venueCity, dto.venueState].filter(Boolean).join(', ');
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.mecacaraudio.com';
    const registerUrl = `${frontendUrl}/events/${dto.eventId}/register`;

    return `
${greeting},

You expressed interest in ${dto.eventName}, and it's happening TOMORROW! There's still time to register and secure your spot.

EVENT DETAILS
--------------
Date: ${eventDateStr}
Venue: ${dto.venueName}
Address: ${dto.venueAddress}${venueLocation ? `, ${venueLocation}` : ''}

Register now: ${registerUrl}

Don't miss out — spots may be limited. We'd love to see you there!

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  // =========================================================================
  // Guest Interest Verification Email Templates
  // =========================================================================

  private getGuestInterestVerificationEmailTemplate(greeting: string, eventName: string, verificationUrl: string): string {
    return `
${this.getEmailHeaderHtml('Confirm Your Interest', eventName, `Confirm your interest in ${eventName}`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>Thanks for your interest in <strong>${eventName}</strong>! To keep our event lists accurate, please click the button below to confirm.</p>

    <div style="text-align: center; margin: 30px 0;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${verificationUrl}" style="height:50px;v-text-anchor:middle;width:250px;" arcsize="16%" strokecolor="#ea580c" fillcolor="#ea580c">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Confirm Interest</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${verificationUrl}" style="display: inline-block; background-color: #ea580c; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Confirm Interest</a>
      <!--<![endif]-->
    </div>

    <p style="color: #64748b; font-size: 14px;">This link will expire in 24 hours. If you didn't request this, you can safely ignore this email.</p>

${this.getEmailFooterHtml()}
    `.trim();
  }

  private getGuestInterestVerificationEmailText(greeting: string, eventName: string, verificationUrl: string): string {
    return `
${greeting},

Thanks for your interest in ${eventName}! To keep our event lists accurate, please confirm by visiting the link below:

${verificationUrl}

This link will expire in 24 hours. If you didn't request this, you can safely ignore this email.

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
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
${this.getEmailHeaderHtml('Welcome to MECA!', `Your ${dto.membershipType} Membership is Active`, 'Welcome to MECA — Thank you for joining MECA!')}
    <p style="font-size: 16px;">${greeting},</p>

    <p>Congratulations! Your MECA ${dto.membershipType} membership has been successfully activated. Welcome to the Mobile Electronics Competition Association family!</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Your Membership Details</h3>
      <p style="margin: 5px 0;"><strong>MECA ID:</strong> <span style="font-size: 20px; color: #f97316; font-weight: bold;">#${dto.mecaId}</span></p>
      <p style="margin: 5px 0;"><strong>Membership Type:</strong> ${dto.membershipType} (${dto.membershipCategory})</p>
      <p style="margin: 5px 0;"><strong>Valid Until:</strong> ${expiryDateStr}</p>
      ${businessOrTeamInfo}
    </td></tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #065f46;">Your Member Benefits</h3>
      <ul style="margin: 0; padding-left: 20px; color: #047857;">
        ${this.getMembershipBenefitsList(dto.benefits)}
      </ul>
    </td></tr></table>

    ${this.getEmailButton('Go to Your Dashboard', 'https://mecacaraudio.com/dashboard')}

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      Keep your MECA ID handy - you'll need it when registering for events and competitions.
    </p>
${this.getEmailFooterHtml()}
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

Go to your dashboard: https://mecacaraudio.com/dashboard

Keep your MECA ID handy - you'll need it when registering for events and competitions.

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getMembershipRenewalEmailTemplate(greeting: string, dto: SendMembershipRenewalEmailDto, expiryDateStr: string): string {
    return `
${this.getEmailHeaderHtml('Membership Renewed!', 'Thank you for your continued support', 'Thanks for renewing — your MECA membership is active')}
    <p style="font-size: 16px;">${greeting},</p>

    <p>Great news! Your MECA membership has been successfully renewed. We're thrilled to have you continue as part of the MECA community!</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Renewal Confirmation</h3>
      <p style="margin: 5px 0;"><strong>MECA ID:</strong> <span style="font-size: 20px; color: #f97316; font-weight: bold;">#${dto.mecaId}</span></p>
      <p style="margin: 5px 0;"><strong>Membership Type:</strong> ${dto.membershipType}</p>
      <p style="margin: 5px 0;"><strong>New Expiration Date:</strong> ${expiryDateStr}</p>
    </td></tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #065f46;">Your Member Benefits Continue</h3>
      <ul style="margin: 0; padding-left: 20px; color: #047857;">
        ${this.getMembershipBenefitsList(dto.benefits)}
      </ul>
    </td></tr></table>

    ${this.getEmailButton('Find Upcoming Events', 'https://mecacaraudio.com/events')}

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      Thank you for being a valued member of MECA. We look forward to seeing you at upcoming events!
    </p>
${this.getEmailFooterHtml()}
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

Find upcoming events: https://mecacaraudio.com/events

Thank you for being a valued member of MECA. We look forward to seeing you at upcoming events!

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
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
${this.getEmailHeaderHtml(headerText, "Don't lose your membership benefits", `Your MECA membership will be expiring soon — renew today`)}
    <p style="font-size: 16px;">${greeting},</p>

    <div style="background: ${warningBgColor}; border: 2px solid ${warningBorderColor}; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; color: ${warningTextColor}; font-size: 18px; font-weight: bold;">
        Your MECA membership expires in ${dto.daysRemaining} day${dto.daysRemaining === 1 ? '' : 's'}!
      </p>
      <p style="margin: 10px 0 0 0; color: ${warningTextColor};">
        Expiration Date: <strong>${expiryDateStr}</strong>
      </p>
    </div>

    <table role="presentation" width="100%" cellpadding="20" cellspacing="0" border="1" bordercolor="#e2e8f0" style="margin: 20px 0; border-collapse: collapse; border: 1px solid #e2e8f0;"><tr><td style="background-color: #f8fafc;">
      <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>MECA ID:</strong> #${dto.mecaId}</p>
      <p style="margin: 0; font-size: 15px;"><strong>Membership Type:</strong> ${dto.membershipType}</p>
    </td></tr></table>

    <p>Renew now to maintain uninterrupted access to:</p>
    <ul style="color: #64748b;">
      <li>Event registrations and competitions</li>
      <li>Your accumulated points and rankings</li>
      <li>Member-only discounts and benefits</li>
      <li>Your MECA ID number</li>
    </ul>

    ${this.getEmailButton('Renew Membership Now', dto.renewalUrl)}

${this.getEmailFooterHtml()}
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

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getMembershipExpiredEmailTemplate(greeting: string, dto: SendMembershipExpiredEmailDto, expiredDateStr: string): string {
    return `
${this.getEmailHeaderHtml('Your Membership Has Expired', 'We miss you at MECA!', 'Your MECA membership has expired — renew today to restore your benefits')}
    <p style="font-size: 16px;">${greeting},</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #fef2f2; border: 2px solid #ef4444; padding: 20px;">
      <p style="margin: 0; color: #991b1b; font-size: 18px; font-weight: bold;">
        Your MECA membership has expired
      </p>
      <p style="margin: 10px 0 0 0; color: #991b1b;">
        Expired on: <strong>${expiredDateStr}</strong>
      </p>
    </td></tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <p style="margin: 0 0 10px 0;"><strong>MECA ID:</strong> #${dto.mecaId}</p>
      <p style="margin: 0;"><strong>Previous Membership:</strong> ${dto.membershipType}</p>
    </td></tr></table>

    <p>Without an active membership, you:</p>
    <ul style="color: #64748b;">
      <li>Cannot register for MECA events</li>
      <li>Lose access to member-only benefits</li>
      <li>May lose your ranking position</li>
    </ul>

    <p><strong>Good news:</strong> If you renew within 30 days, you can keep your same MECA ID number!</p>

    ${this.getEmailButton('Renew Membership Now', dto.renewalUrl)}
${this.getEmailFooterHtml()}
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

GOOD NEWS: If you renew within 30 days, you can keep your same MECA ID number!

Renew your membership here: ${dto.renewalUrl}

We'd love to have you back!

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getSecondaryMemberWelcomeEmailTemplate(dto: SendSecondaryMemberWelcomeEmailDto, expiryDateStr: string): string {
    return `
${this.getEmailHeaderHtml('Welcome to MECA!', "You've been added as a secondary member", "You've been added as a secondary MECA member — welcome to MECA!")}
    <p style="font-size: 16px;">Hello ${dto.secondaryMemberName},</p>

    <p><strong>${dto.masterMemberName}</strong> has added you as a secondary member to their MECA account. You now have your own MECA membership and can compete at MECA events!</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Your Membership Details</h3>
      <p style="margin: 5px 0;"><strong>MECA ID:</strong> <span style="font-size: 20px; color: #f97316; font-weight: bold;">#${dto.mecaId}</span></p>
      <p style="margin: 5px 0;"><strong>Membership Type:</strong> ${dto.membershipType}</p>
      <p style="margin: 5px 0;"><strong>Valid Until:</strong> ${expiryDateStr}</p>
      <p style="margin: 5px 0;"><strong>Primary Account:</strong> ${dto.masterMemberName}</p>
    </td></tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #065f46;">Your Member Benefits</h3>
      <ul style="margin: 0; padding-left: 20px; color: #047857;">
        ${this.getMembershipBenefitsList(dto.benefits)}
      </ul>
    </td></tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #f0f9ff; border: 1px solid #0ea5e9; padding: 15px;">
      <p style="margin: 0; color: #0369a1;">
        <strong>Note:</strong> As a secondary member, your membership is managed by ${dto.masterMemberName}. Contact them for any account changes or renewals.
      </p>
    </td></tr></table>

    ${this.getEmailButton('Find Upcoming Events', 'https://mecacaraudio.com/events')}
${this.getEmailFooterHtml()}
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

Find upcoming events: https://mecacaraudio.com/events

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getMembershipCancelledRefundedEmailTemplate(
    greeting: string,
    dto: SendMembershipCancelledRefundedEmailDto,
    cancellationDateStr: string
  ): string {
    const refundSection = dto.refundAmount
      ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #065f46;">Refund Processed</h3>
        <p style="margin: 0; color: #047857; font-size: 20px; font-weight: bold;">
          $${dto.refundAmount.toFixed(2)}
        </p>
        <p style="margin: 10px 0 0 0; color: #047857; font-size: 14px;">
          The refund will appear on your original payment method within 5-10 business days.
        </p>
      </td></tr></table>`
      : '';

    return `
${this.getEmailHeaderHtml('Membership Cancelled', 'Your MECA membership has been cancelled', 'Your MECA membership has been cancelled')}
    <p style="font-size: 16px;">${greeting},</p>

    <p>We're writing to confirm that your MECA membership has been cancelled as requested.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Cancellation Details</h3>
      <p style="margin: 5px 0;"><strong>MECA ID:</strong> #${dto.mecaId}</p>
      <p style="margin: 5px 0;"><strong>Membership Type:</strong> ${dto.membershipType}</p>
      <p style="margin: 5px 0;"><strong>Cancelled On:</strong> ${cancellationDateStr}</p>
      ${dto.reason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${dto.reason}</p>` : ''}
    </td></tr></table>

    ${refundSection}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px;">
      <p style="margin: 0; color: #92400e;">
        <strong>Important:</strong> Your membership is now inactive. You will no longer be able to:
      </p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e;">
        <li>Register for MECA events</li>
        <li>Access member-only benefits</li>
        <li>Maintain your competition standings</li>
      </ul>
    </td></tr></table>

    <p>If you change your mind, you can rejoin MECA at any time by visiting our website.</p>

    ${this.getEmailButton('Rejoin MECA', 'https://mecacaraudio.com/memberships')}
${this.getEmailFooterHtml()}
    `.trim();
  }

  private getMembershipCancelledRefundedEmailText(
    greeting: string,
    dto: SendMembershipCancelledRefundedEmailDto,
    cancellationDateStr: string
  ): string {
    const refundSection = dto.refundAmount
      ? `
REFUND PROCESSED
----------------
Amount: $${dto.refundAmount.toFixed(2)}
The refund will appear on your original payment method within 5-10 business days.
`
      : '';

    return `
${greeting},

We're writing to confirm that your MECA membership has been cancelled as requested.

CANCELLATION DETAILS
--------------------
MECA ID: #${dto.mecaId}
Membership Type: ${dto.membershipType}
Cancelled On: ${cancellationDateStr}
${dto.reason ? `Reason: ${dto.reason}` : ''}

${refundSection}
IMPORTANT: Your membership is now inactive. You will no longer be able to:
- Register for MECA events
- Access member-only benefits
- Maintain your competition standings

If you change your mind, you can rejoin MECA at any time by visiting: https://mecacaraudio.com/memberships

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  // ==========================================================================
  // Invoice Auto-Cancel Email Templates
  // ==========================================================================

  private getInvoiceAutoCancelledEmailTemplate(
    greeting: string,
    dto: SendInvoiceAutoCancelledEmailDto
  ): string {
    const membershipSection = dto.membershipCancelled
      ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #fef2f2; border: 1px solid #ef4444; padding: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #991b1b;">Membership Also Cancelled</h3>
        <p style="margin: 0; color: #991b1b; font-size: 14px;">
          The membership associated with this invoice has also been cancelled due to non-payment.
          You will no longer be able to register for MECA events or access member-only benefits.
        </p>
      </td></tr></table>`
      : '';

    return `
${this.getEmailHeaderHtml('Invoice Cancelled', 'Your invoice has been automatically cancelled due to non-payment', `Invoice ${dto.invoiceNumber} has been automatically cancelled due to non-payment`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>We're writing to inform you that your invoice has been automatically cancelled because payment was not received within the required timeframe.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Cancellation Details</h3>
      <p style="margin: 5px 0;"><strong>Invoice:</strong> ${dto.invoiceNumber}</p>
      <p style="margin: 5px 0;"><strong>Reason:</strong> ${dto.reason}</p>
    </td></tr></table>

    ${membershipSection}

    <p>If you believe this was a mistake or would like to reinstate your membership, please contact us.</p>

    ${this.getEmailButton('Contact Support', 'mailto:support@mecacaraudio.com')}
${this.getEmailFooterHtml()}
    `.trim();
  }

  private getInvoiceAutoCancelledEmailText(
    greeting: string,
    dto: SendInvoiceAutoCancelledEmailDto
  ): string {
    const membershipSection = dto.membershipCancelled
      ? `
MEMBERSHIP ALSO CANCELLED
--------------------------
The membership associated with this invoice has also been cancelled due to non-payment.
You will no longer be able to register for MECA events or access member-only benefits.
`
      : '';

    return `
${greeting},

We're writing to inform you that your invoice has been automatically cancelled because payment was not received within the required timeframe.

CANCELLATION DETAILS
--------------------
Invoice: ${dto.invoiceNumber}
Reason: ${dto.reason}

${membershipSection}
If you believe this was a mistake or would like to reinstate your membership, visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  // ==========================================================================
  // Invoice Overdue Email Templates
  // ==========================================================================

  private getInvoiceOverdueEmailTemplate(
    greeting: string,
    dto: SendInvoiceOverdueEmailDto,
  ): string {
    const dueDateStr = dto.dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return `
${this.getEmailHeaderHtml('Invoice Past Due', `Invoice ${dto.invoiceNumber} is now overdue`, `Your MECA invoice ${dto.invoiceNumber} is ${dto.daysOverdue} day(s) past due — pay now to avoid cancellation`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>This is a reminder that your MECA invoice <strong>${dto.invoiceNumber}</strong> is now <strong>${dto.daysOverdue} day(s) past due</strong>.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #fef2f2; border: 1px solid #ef4444; padding: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #991b1b;">Payment Required</h3>
      <p style="margin: 5px 0; color: #991b1b;"><strong>Invoice:</strong> ${dto.invoiceNumber}</p>
      <p style="margin: 5px 0; color: #991b1b;"><strong>Amount Due:</strong> $${dto.amountDue.toFixed(2)}</p>
      <p style="margin: 5px 0; color: #991b1b;"><strong>Due Date:</strong> ${dueDateStr}</p>
      <p style="margin: 5px 0; color: #991b1b;"><strong>Days Past Due:</strong> ${dto.daysOverdue}</p>
    </td></tr></table>

    <p>To avoid automatic cancellation of any associated membership or service, please pay this invoice as soon as possible.</p>

    ${this.getEmailButton('Pay Invoice Now', dto.paymentUrl)}
${this.getEmailFooterHtml()}
    `.trim();
  }

  private getInvoiceOverdueEmailText(
    greeting: string,
    dto: SendInvoiceOverdueEmailDto,
  ): string {
    const dueDateStr = dto.dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return `
${greeting},

This is a reminder that your MECA invoice ${dto.invoiceNumber} is now ${dto.daysOverdue} day(s) past due.

PAYMENT REQUIRED
----------------
Invoice: ${dto.invoiceNumber}
Amount Due: $${dto.amountDue.toFixed(2)}
Due Date: ${dueDateStr}
Days Past Due: ${dto.daysOverdue}

To avoid automatic cancellation of any associated membership or service, please pay this invoice as soon as possible.

Pay invoice: ${dto.paymentUrl}
Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  // ==========================================================================
  // Refund Confirmation Email Templates
  // ==========================================================================

  private getRefundConfirmationEmailTemplate(
    greeting: string,
    dto: SendRefundConfirmationEmailDto,
  ): string {
    const refundDateStr = dto.refundDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const providerLabel = dto.paymentMethod === 'stripe' ? 'credit card' : 'PayPal account';
    const refundType = dto.isPartialRefund ? 'Partial Refund' : 'Refund';
    return `
${this.getEmailHeaderHtml(`${refundType} Processed`, `Your refund of $${dto.refundAmount.toFixed(2)} is on its way`, `MECA has processed a ${dto.isPartialRefund ? 'partial ' : ''}refund of $${dto.refundAmount.toFixed(2)}`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>We've processed a ${dto.isPartialRefund ? 'partial ' : ''}refund for your recent MECA purchase. The funds will be returned to your original ${providerLabel} within 5-10 business days, depending on your bank.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #f0fdf4; border: 1px solid #22c55e; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #166534;">Refund Details</h3>
      <p style="margin: 5px 0;"><strong>Refund Type:</strong> ${refundType}</p>
      <p style="margin: 5px 0;"><strong>Amount:</strong> $${dto.refundAmount.toFixed(2)}</p>
      <p style="margin: 5px 0;"><strong>For:</strong> ${dto.paymentDescription}</p>
      <p style="margin: 5px 0;"><strong>Processed:</strong> ${refundDateStr}</p>
      <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${dto.transactionId}</p>
    </td></tr></table>

    <p>If you have any questions about this refund, please reach out and we'll be happy to help.</p>
${this.getEmailFooterHtml()}
    `.trim();
  }

  private getRefundConfirmationEmailText(
    greeting: string,
    dto: SendRefundConfirmationEmailDto,
  ): string {
    const refundDateStr = dto.refundDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const providerLabel = dto.paymentMethod === 'stripe' ? 'credit card' : 'PayPal account';
    const refundType = dto.isPartialRefund ? 'Partial Refund' : 'Refund';
    return `
${greeting},

We've processed a ${dto.isPartialRefund ? 'partial ' : ''}refund for your recent MECA purchase. The funds will be returned to your original ${providerLabel} within 5-10 business days, depending on your bank.

REFUND DETAILS
--------------
Refund Type: ${refundType}
Amount: $${dto.refundAmount.toFixed(2)}
For: ${dto.paymentDescription}
Processed: ${refundDateStr}
Transaction ID: ${dto.transactionId}

If you have any questions about this refund, please reach out and we'll be happy to help.

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  // ==========================================================================
  // Subscription Cancelled Email Templates
  // ==========================================================================

  private getSubscriptionCancelledEmailTemplate(
    greeting: string,
    dto: SendSubscriptionCancelledEmailDto,
  ): string {
    const cancellationDateStr = dto.cancellationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const endDateSection = dto.endDate
      ? `<p style="margin: 5px 0;"><strong>Access Through:</strong> ${dto.endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`
      : '';
    const reasonSection = dto.cancellationReason
      ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${dto.cancellationReason}</p>`
      : '';
    return `
${this.getEmailHeaderHtml('Subscription Ended', `Your MECA ${dto.membershipType} subscription has ended`, `Your MECA ${dto.membershipType} subscription has been cancelled`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>Your MECA <strong>${dto.membershipType}</strong> subscription has ended. We're sorry to see you go.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Subscription Details</h3>
      <p style="margin: 5px 0;"><strong>Membership Type:</strong> ${dto.membershipType}</p>
      ${dto.mecaId ? `<p style="margin: 5px 0;"><strong>MECA ID:</strong> ${dto.mecaId}</p>` : ''}
      <p style="margin: 5px 0;"><strong>Cancelled On:</strong> ${cancellationDateStr}</p>
      <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${dto.paymentMethod === 'paypal' ? 'PayPal' : 'Credit Card'}</p>
      ${endDateSection}
      ${reasonSection}
    </td></tr></table>

    <p>Once your access ends, you will no longer be able to register for MECA events as a member or access member-only benefits. You can renew at any time to restore access.</p>

    ${this.getEmailButton('Renew Membership', dto.renewalUrl)}
${this.getEmailFooterHtml()}
    `.trim();
  }

  private getSubscriptionCancelledEmailText(
    greeting: string,
    dto: SendSubscriptionCancelledEmailDto,
  ): string {
    const cancellationDateStr = dto.cancellationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const endDateLine = dto.endDate
      ? `Access Through: ${dto.endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
      : '';
    const reasonLine = dto.cancellationReason ? `Reason: ${dto.cancellationReason}` : '';
    return `
${greeting},

Your MECA ${dto.membershipType} subscription has ended. We're sorry to see you go.

SUBSCRIPTION DETAILS
--------------------
Membership Type: ${dto.membershipType}
${dto.mecaId ? `MECA ID: ${dto.mecaId}` : ''}
Cancelled On: ${cancellationDateStr}
Payment Method: ${dto.paymentMethod === 'paypal' ? 'PayPal' : 'Credit Card'}
${endDateLine}
${reasonLine}

Once your access ends, you will no longer be able to register for MECA events as a member or access member-only benefits. You can renew at any time to restore access.

Renew membership: ${dto.renewalUrl}
Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
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
${this.getEmailHeaderHtml('Order Confirmed!', `Order #${dto.orderNumber}`, `Thanks for your order — here's your MECA Shop confirmation for order #${dto.orderNumber}`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>Thank you for your order from the MECA Shop! We've received your order and are getting it ready.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Order Details</h3>
      <p style="margin: 0; color: #64748b;">Order Date: ${orderDateStr}</p>
      ${dto.shippingMethod ? `<p style="margin: 5px 0 0 0; color: #64748b;">Shipping: ${dto.shippingMethod === 'priority' ? 'Priority Shipping' : 'Standard Shipping'}</p>` : ''}
    </td></tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
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
    </td></tr></table>

    ${dto.shippingAddress ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Shipping Address</h3>
      <p style="margin: 0; color: #64748b;">
        ${dto.shippingAddress.name ? `<strong>${dto.shippingAddress.name}</strong><br>` : ''}
        ${this.formatShopAddress(dto.shippingAddress)}
      </p>
    </td></tr></table>
    ` : ''}

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      We'll send you another email when your order ships with tracking information.
    </p>
${this.getEmailFooterHtml()}
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

We'll send you another email when your order ships with tracking information.

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getShopPaymentReceiptEmailTemplate(dto: SendShopPaymentReceiptEmailDto, greeting: string): string {
    const paymentDateStr = dto.paymentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
${this.getEmailHeaderHtml('Payment Received!', `Order #${dto.orderNumber}`, `Payment received for MECA Shop order #${dto.orderNumber} — your receipt is inside`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>We've received your payment. Thank you for shopping with MECA!</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #dcfce7; border: 1px solid #22c55e; padding: 20px; text-align: center;">
      <p style="margin: 0; color: #166534; font-size: 14px;">Payment Confirmed</p>
      <p style="margin: 10px 0 0 0; color: #166534; font-size: 24px; font-weight: bold;">${this.formatCurrency(dto.totalAmount)}</p>
      <p style="margin: 10px 0 0 0; color: #166534; font-size: 12px;">${paymentDateStr}${dto.last4 ? ` | Card ending in ${dto.last4}` : ''}</p>
    </td></tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
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
    </td></tr></table>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      This email serves as your payment receipt. Your order is now being processed and we'll notify you when it ships.
    </p>
${this.getEmailFooterHtml()}
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

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getShopShippingNotificationEmailTemplate(dto: SendShopShippingNotificationEmailDto, greeting: string): string {
    const shippedDateStr = dto.shippedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
${this.getEmailHeaderHtml('Your Order Has Shipped!', `Order #${dto.orderNumber}`, `Good news — your MECA Shop order #${dto.orderNumber} is on its way!`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>Great news! Your order is on its way. Here are the shipping details:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
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
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${dto.trackingUrl}" style="height:45px;v-text-anchor:middle;width:200px;" arcsize="16%" strokecolor="#f97316" fillcolor="#f97316">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">Track Package</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${dto.trackingUrl}" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Track Package</a>
          <!--<![endif]-->
        </div>
        ` : ''}
      </div>
      ` : ''}
    </td></tr></table>

    ${dto.shippingAddress ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Shipping To</h3>
      <p style="margin: 0; color: #64748b;">
        ${dto.shippingAddress.name ? `<strong>${dto.shippingAddress.name}</strong><br>` : ''}
        ${this.formatShopAddress(dto.shippingAddress)}
      </p>
    </td></tr></table>
    ` : ''}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Items Shipped</h3>
      ${dto.items.map(item => `
      <div style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
        <p style="margin: 0;"><strong>${item.productName}</strong> x ${item.quantity}</p>
        ${item.productSku ? `<p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 12px;">SKU: ${item.productSku}</p>` : ''}
      </div>
      `).join('')}
    </td></tr></table>

${this.getEmailFooterHtml()}
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

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  private getShopDeliveryConfirmationEmailTemplate(dto: SendShopDeliveryConfirmationEmailDto, greeting: string): string {
    const deliveryDateStr = dto.deliveryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
${this.getEmailHeaderHtml('Order Delivered!', `Order #${dto.orderNumber}`, `Your MECA Shop order #${dto.orderNumber} has been delivered — enjoy!`)}
    <p style="font-size: 16px;">${greeting},</p>

    <p>Your order has been delivered! We hope you enjoy your MECA merchandise.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #dcfce7; border: 1px solid #22c55e; padding: 20px; text-align: center;">
      <p style="margin: 0; color: #166534; font-size: 18px; font-weight: bold;">Delivered on ${deliveryDateStr}</p>
    </td></tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1e293b;">Items Delivered</h3>
      ${dto.items.map(item => `
      <div style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
        <p style="margin: 0;"><strong>${item.productName}</strong> x ${item.quantity}</p>
        ${item.productSku ? `<p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 12px;">SKU: ${item.productSku}</p>` : ''}
      </div>
      `).join('')}
    </td></tr></table>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      Thank you for shopping with MECA!
    </p>
${this.getEmailFooterHtml()}
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

Thank you for shopping with MECA!

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();
  }

  // ==========================================================================
  // World Finals Qualification Email
  // ==========================================================================

  async sendWorldFinalsInvitationEmail(dto: {
    to: string;
    firstName: string;
    competitionClass: string;
    totalPoints: number;
    seasonName: string;
    registrationUrl: string;
  }): Promise<{ success: boolean; error?: string }> {
    const subject = `Your Exclusive MECA World Finals Pre-Registration Invitation - ${dto.competitionClass}`;

    const html = `
${this.getEmailHeaderHtml('World Finals Invitation', `Pre-Register for ${dto.competitionClass}`, `You're invited to pre-register for the MECA World Finals in ${dto.competitionClass}`)}
    <p style="font-size: 16px;">Dear ${dto.firstName},</p>

    <p>As a qualified competitor with <strong>${dto.totalPoints} points</strong> in <strong>${dto.competitionClass}</strong> during the ${dto.seasonName}, you are invited to pre-register for the MECA World Finals!</p>

    ${this.getEmailButton(`Pre-Register for ${dto.competitionClass}`, dto.registrationUrl)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #f0fdf4; border: 1px solid #22c55e; padding: 20px; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0; color: #166534;">Pre-Registration Benefits:</h3>
      <ul style="color: #15803d; margin: 0;">
        <li>Priority registration before general public</li>
        <li>Guaranteed competition spot in ${dto.competitionClass}</li>
        <li>Early bird pricing (if applicable)</li>
      </ul>
    </td></tr></table>

    <p style="color: #64748b; font-size: 14px;">
      This invitation is exclusive to you and cannot be transferred. If you have any questions,
      please contact us at <a href="mailto:support@mecacaraudio.com" style="color: #f97316;">support@mecacaraudio.com</a>.
    </p>
${this.getEmailFooterHtml()}
    `.trim();

    const text = `
Dear ${dto.firstName},

As a qualified competitor with ${dto.totalPoints} points in ${dto.competitionClass} during the ${dto.seasonName}, you are invited to pre-register for the MECA World Finals!

PRE-REGISTER NOW: ${dto.registrationUrl}

PRE-REGISTRATION BENEFITS:
- Priority registration before general public
- Guaranteed competition spot in ${dto.competitionClass}
- Early bird pricing (if applicable)

This invitation is exclusive to you and cannot be transferred.

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
      from: this.fromAddresses.events,
    });
  }

  async sendWorldFinalsQualificationEmail(dto: {
    to: string;
    firstName: string;
    competitorName: string;
    competitionClass: string;
    totalPoints: number;
    qualificationThreshold: number;
    seasonName: string;
  }): Promise<{ success: boolean; error?: string }> {
    const subject = `Congratulations! You've Qualified for MECA World Finals in ${dto.competitionClass}!`;

    const html = `
${this.getEmailHeaderHtml('World Finals Qualification!', `You've Qualified in ${dto.competitionClass}`, `Congratulations — you've qualified for the MECA World Finals in ${dto.competitionClass}!`)}
    <p style="font-size: 16px;">Congratulations, ${dto.firstName}!</p>

    <p>You have officially qualified for the <strong>MECA World Finals</strong> in <strong>${dto.competitionClass}</strong>!</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;"><tr><td style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0; color: #92400e;">Your Achievement</h3>
      <p style="margin: 5px 0; font-size: 28px; font-weight: bold; color: #92400e;">${dto.totalPoints} Points</p>
      <p style="margin: 5px 0; color: #92400e;">in ${dto.competitionClass}</p>
      <p style="margin: 5px 0 0 0; font-size: 14px; color: #a16207;">${dto.seasonName}</p>
    </td></tr></table>

    <p>By earning ${dto.totalPoints} points in ${dto.competitionClass}, you have met the ${dto.qualificationThreshold}-point threshold required to compete at the highest level of car audio competition.</p>

    <h3 style="color: #1e293b;">What's Next?</h3>
    <ul style="color: #333;">
      <li>You will receive an exclusive pre-registration invitation for World Finals</li>
      <li>Pre-registration gives you priority access before general registration opens</li>
      <li>Keep competing to qualify in more classes!</li>
    </ul>

    ${this.getEmailButton('View Your Dashboard', 'https://mecacaraudio.com/dashboard/mymeca')}

    <p style="color: #64748b; font-size: 14px;">
      View your competition stats and track your progress on your MyMECA Dashboard.
    </p>
${this.getEmailFooterHtml()}
    `.trim();

    const text = `
Congratulations, ${dto.firstName}!

You have officially qualified for the MECA World Finals in ${dto.competitionClass}!

YOUR ACHIEVEMENT
----------------
${dto.totalPoints} Points in ${dto.competitionClass}
${dto.seasonName}

By earning ${dto.totalPoints} points, you have met the ${dto.qualificationThreshold}-point threshold required to compete at the highest level of car audio competition.

WHAT'S NEXT?
- You will receive an exclusive pre-registration invitation for World Finals
- Pre-registration gives you priority access before general registration opens
- Keep competing to qualify in more classes!

View your dashboard: https://mecacaraudio.com/dashboard/mymeca

Need help? Visit our Support Desk: ${this.supportDeskUrl}

Fun, Fair, Loud and Clear!
© 1997 - ${new Date().getFullYear()} MECA Inc. All Rights Reserved.
    `.trim();

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      text,
      from: this.fromAddresses.events,
    });
  }

  // ==========================================================================
  // Admin Notification Email Templates
  // ==========================================================================

  async sendAdminAlertEmail(dto: {
    to: string;
    title: string;
    subtitle?: string;
    fields: Array<{ label: string; value: string }>;
    dashboardUrl?: string;
    dashboardLabel?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const subject = dto.title;

    const fieldsHtml = dto.fields.map(f => `
      <tr>
        <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-family: Arial, sans-serif; vertical-align: top; width: 140px;">${f.label}:</td>
        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-family: Arial, sans-serif; font-weight: bold; vertical-align: top;">${f.value}</td>
      </tr>
    `).join('');

    const buttonHtml = dto.dashboardUrl
      ? this.getEmailButton(dto.dashboardLabel || 'View in Dashboard', dto.dashboardUrl)
      : '';

    const html = `
${this.getEmailHeaderHtml(dto.title, dto.subtitle || 'Admin Notification', dto.subtitle || dto.title)}
    <p style="font-size: 16px; font-family: Arial, sans-serif;">Hello Admin,</p>

    <p style="font-family: Arial, sans-serif;">This is an automated notification from the MECA system.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${fieldsHtml}
          </table>
        </td>
      </tr>
    </table>

    ${buttonHtml}
${this.getEmailFooterHtml()}
    `.trim();

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      from: this.fromAddresses.billing,
    });
  }

  async sendAdminWeeklyDigestEmail(dto: {
    to: string;
    dateRange: string;
    sections: Array<{
      title: string;
      count: number;
      color: string;
      rows?: Array<string[]>;
      headers?: string[];
      emptyMessage?: string;
    }>;
    summaryCards: Array<{ label: string; value: string; color: string }>;
  }): Promise<{ success: boolean; error?: string }> {
    const subject = `MECA Weekly Business Summary - ${dto.dateRange}`;

    const cardsHtml = dto.summaryCards.map(card => `
      <td style="padding: 5px; width: ${Math.floor(100 / dto.summaryCards.length)}%;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 10px;">
              <p style="color: #64748b; font-size: 11px; margin: 0; text-transform: uppercase; font-family: Arial, sans-serif;">${card.label}</p>
              <p style="color: ${card.color}; font-size: 26px; font-weight: bold; margin: 6px 0 0; font-family: Arial, sans-serif;">${card.value}</p>
            </td>
          </tr>
        </table>
      </td>
    `).join('');

    const sectionsHtml = dto.sections.map(section => {
      if (section.count === 0 && section.emptyMessage) {
        return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px;">
          <tr><td style="padding: 10px 0 5px;"><h3 style="margin: 0; color: #1e293b; font-size: 15px; font-family: Arial, sans-serif;">${section.title} (${section.count})</h3></td></tr>
          <tr><td style="color: #94a3b8; font-size: 13px; font-family: Arial, sans-serif; padding: 8px 0;">${section.emptyMessage}</td></tr>
        </table>`;
      }
      if (section.count === 0) return '';

      const headerRow = section.headers ? `<tr style="border-bottom: 2px solid #e2e8f0;">
        ${section.headers.map(h => `<th style="text-align: left; padding: 8px 10px; color: #64748b; font-size: 11px; font-weight: 600; font-family: Arial, sans-serif; text-transform: uppercase;">${h}</th>`).join('')}
      </tr>` : '';

      const dataRows = (section.rows || []).map(row => `<tr style="border-bottom: 1px solid #f1f5f9;">
        ${row.map(cell => `<td style="padding: 7px 10px; color: #334155; font-size: 13px; font-family: Arial, sans-serif;">${cell}</td>`).join('')}
      </tr>`).join('');

      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px;">
        <tr><td style="padding: 10px 0 5px;"><h3 style="margin: 0; color: #1e293b; font-size: 15px; font-family: Arial, sans-serif;">${section.title} (${section.count})</h3></td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px; border: 1px solid #e2e8f0;">
        ${headerRow}
        ${dataRows}
      </table>`;
    }).join('');

    const html = `
${this.getEmailHeaderHtml('Weekly Business Summary', dto.dateRange, `Weekly MECA business summary for ${dto.dateRange}`)}
    <p style="font-size: 16px; font-family: Arial, sans-serif;">Hello Admin,</p>
    <p style="font-family: Arial, sans-serif;">Here is your weekly business summary for MECA.</p>

    <!-- Summary Cards -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
      <tr>${cardsHtml}</tr>
    </table>

    <!-- Sections -->
    ${sectionsHtml}

    ${this.getEmailButton('View Billing Dashboard', 'https://mecacaraudio.com/admin/billing')}
${this.getEmailFooterHtml()}
    `.trim();

    return this.sendEmail({
      to: dto.to,
      subject,
      html,
      from: this.fromAddresses.billing,
    });
  }
}
