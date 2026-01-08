import { Injectable, Logger } from '@nestjs/common';

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

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private isConfigured = false;
  private provider: 'sendgrid' | 'resend' | null = null;

  constructor() {
    this.checkConfiguration();
  }

  private checkConfiguration() {
    const provider = process.env.EMAIL_PROVIDER;

    if (provider === 'sendgrid' && process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'placeholder') {
      this.isConfigured = true;
      this.provider = 'sendgrid';
      this.logger.log('Email service configured with SendGrid');
    } else if (provider === 'resend' && process.env.RESEND_API_KEY) {
      this.isConfigured = true;
      this.provider = 'resend';
      this.logger.log('Email service configured with Resend');
    } else {
      this.logger.warn('Email service not configured - emails will not be sent');
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
      if (this.provider === 'sendgrid') {
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

  private async sendViaSendGrid(dto: SendEmailDto): Promise<{ success: boolean; error?: string }> {
    // Dynamic import to avoid requiring the package if not used
    try {
      // @ts-ignore - Package may not be installed, handled at runtime
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(process.env.SENDGRID_API_KEY!);

      await sgMail.default.send({
        to: dto.to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@meca.com',
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
        from: process.env.RESEND_FROM_EMAIL || 'noreply@meca.com',
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
}
