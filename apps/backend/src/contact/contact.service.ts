import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ContactSubmission } from './contact.entity';
import { EmailService } from '../email/email.service';
import { RecaptchaService } from '../recaptcha/recaptcha.service';
import { ContactStatus, ContactFormDto } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
    private readonly recaptchaService: RecaptchaService,
  ) {}

  /**
   * Escape HTML special characters to prevent HTML injection in email templates
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Submit a contact form message
   */
  async submitContactForm(
    dto: ContactFormDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string }> {
    const em = this.em.fork();

    // Verify reCAPTCHA token (throws BadRequestException if invalid)
    await this.recaptchaService.verifyToken(dto.recaptcha_token);

    // Create contact submission record
    const submission = em.create(ContactSubmission, {
      name: dto.name,
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
      status: ContactStatus.PENDING,
      ipAddress,
      userAgent,
      createdAt: new Date(),
    });

    await em.persistAndFlush(submission);
    this.logger.log(`Contact form submitted: ${submission.id} from ${dto.email}`);

    // Send notification email to MECA
    await this.sendNotificationEmail(submission);

    // Send confirmation email to user
    await this.sendConfirmationEmail(submission);

    return {
      success: true,
      message: 'Thank you for your message! We will get back to you soon.',
    };
  }

  /**
   * Send notification email to MECA admin
   */
  private async sendNotificationEmail(submission: ContactSubmission): Promise<void> {
    const adminEmail = process.env.CONTACT_FORM_EMAIL || 'mecacaraudio@gmail.com';

    const body = `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${this.escapeHtml(submission.name)}</p>
      <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${encodeURIComponent(submission.email)}" style="color: #f97316;">${this.escapeHtml(submission.email)}</a></p>
      <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${this.escapeHtml(submission.subject)}</p>
      <p style="margin: 0;"><strong>Submitted:</strong> ${submission.createdAt.toLocaleString()}</p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
      <p style="margin: 0 0 10px 0;"><strong>Message:</strong></p>
      <p style="margin: 0; white-space: pre-wrap;">${this.escapeHtml(submission.message)}</p>
    </div>

    ${this.emailService.brandedButton(`Reply to ${this.escapeHtml(submission.name)}`, `mailto:${encodeURIComponent(submission.email)}?subject=Re: ${encodeURIComponent(submission.subject)}`)}

    <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
      Submission ID: ${submission.id}<br>
      IP Address: ${submission.ipAddress || 'Unknown'}
    </p>`;
    const html = this.emailService.buildBrandedHtml('New Contact Form Submission', body, {
      preheader: `New contact submission from ${submission.name}: ${submission.subject}`,
    });

    const text = `
New Contact Form Submission
============================

From: ${submission.name}
Email: ${submission.email}
Subject: ${submission.subject}
Submitted: ${submission.createdAt.toLocaleString()}

Message:
${submission.message}

---
Submission ID: ${submission.id}
IP Address: ${submission.ipAddress || 'Unknown'}
    `.trim();

    const result = await this.emailService.sendEmail({
      to: adminEmail,
      subject: `[MECA Contact] ${submission.subject}`,
      html,
      text,
      from: 'support@mecacaraudio.com',
    });

    if (!result.success) {
      this.logger.warn(`Failed to send admin notification: ${result.error}`);
    }
  }

  /**
   * Send confirmation email to user
   */
  private async sendConfirmationEmail(submission: ContactSubmission): Promise<void> {
    const body = `
    <p style="font-size: 16px; margin: 0 0 16px 0;">Hello ${this.escapeHtml(submission.name)},</p>

    <p style="margin: 0 0 16px 0;">We've received your message and appreciate you reaching out to MECA. Our team will review your inquiry and get back to you as soon as possible.</p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Your Message</strong></p>
      <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${this.escapeHtml(submission.subject)}</p>
      <p style="margin: 0; color: #64748b; font-style: italic; white-space: pre-wrap;">${this.escapeHtml(submission.message.substring(0, 300))}${submission.message.length > 300 ? '...' : ''}</p>
    </div>

    <p style="margin: 0 0 8px 0;">In the meantime, feel free to:</p>
    <ul style="color: #64748b; margin: 0 0 16px 0;">
      <li>Visit our <a href="https://mecacaraudio.com/events" style="color: #f97316;">upcoming events</a></li>
      <li>Check out our <a href="https://mecacaraudio.com/faq" style="color: #f97316;">FAQ page</a></li>
    </ul>

    <p style="color: #64748b; font-size: 14px; margin: 0;">
      This is an automated confirmation. Please do not reply to this email.
    </p>`;
    const html = this.emailService.buildBrandedHtml('Thanks for Contacting Us!', body, {
      preheader: "We've received your message — our team will get back to you soon",
    });

    const text = `
Hello ${submission.name},

We've received your message and appreciate you reaching out to MECA. Our team will review your inquiry and get back to you as soon as possible.

Your Message:
Subject: ${submission.subject}
${submission.message.substring(0, 300)}${submission.message.length > 300 ? '...' : ''}

In the meantime, feel free to visit our website at https://mecacaraudio.com

This is an automated confirmation. Please do not reply to this email.

© ${new Date().getFullYear()} MECA - Mobile Electronics Competition Association
    `.trim();

    const result = await this.emailService.sendEmail({
      to: submission.email,
      subject: 'We Received Your Message - MECA',
      html,
      text,
      from: 'support@mecacaraudio.com',
    });

    if (!result.success) {
      this.logger.warn(`Failed to send user confirmation: ${result.error}`);
    }
  }

  /**
   * Get all contact submissions (admin only)
   */
  async getSubmissions(options?: {
    status?: ContactStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ submissions: ContactSubmission[]; total: number }> {
    const em = this.em.fork();

    const where: Record<string, unknown> = {};
    if (options?.status) {
      where.status = options.status;
    }

    const [submissions, total] = await em.findAndCount(
      ContactSubmission,
      where,
      {
        orderBy: { createdAt: 'DESC' },
        limit: options?.limit || 50,
        offset: options?.offset || 0,
        populate: ['repliedBy'],
      },
    );

    return { submissions, total };
  }

  /**
   * Get a single submission by ID
   */
  async getSubmission(id: string): Promise<ContactSubmission> {
    const em = this.em.fork();
    const submission = await em.findOne(ContactSubmission, { id }, { populate: ['repliedBy'] });

    if (!submission) {
      throw new NotFoundException('Contact submission not found');
    }

    return submission;
  }

  /**
   * Update submission status
   */
  async updateStatus(
    id: string,
    status: ContactStatus,
    adminId?: string,
    notes?: string,
  ): Promise<ContactSubmission> {
    const em = this.em.fork();
    const submission = await em.findOne(ContactSubmission, { id });

    if (!submission) {
      throw new NotFoundException('Contact submission not found');
    }

    submission.status = status;
    if (notes) {
      submission.adminNotes = notes;
    }

    if (status === ContactStatus.REPLIED && adminId) {
      submission.repliedAt = new Date();
      const admin = await em.findOne(Profile, { id: adminId });
      if (admin) {
        submission.repliedBy = admin;
      }
    }

    await em.flush();
    return submission;
  }

  /**
   * Delete a submission (archive or hard delete)
   */
  async deleteSubmission(id: string): Promise<void> {
    const em = this.em.fork();
    const submission = await em.findOne(ContactSubmission, { id });

    if (!submission) {
      throw new NotFoundException('Contact submission not found');
    }

    await em.removeAndFlush(submission);
  }
}
