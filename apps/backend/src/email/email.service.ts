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
}
