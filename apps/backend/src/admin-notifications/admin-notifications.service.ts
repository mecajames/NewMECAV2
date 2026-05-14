import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/core';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Profile } from '../profiles/profiles.entity';
import { Membership } from '../memberships/memberships.entity';
import { ShopOrder } from '../shop/entities/shop-order.entity';
import { Order } from '../orders/orders.entity';
import { Invoice } from '../invoices/invoices.entity';
import { UserRole, PaymentStatus, ShopOrderStatus } from '@newmeca/shared';

@Injectable()
export class AdminNotificationsService {
  private readonly logger = new Logger(AdminNotificationsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async getAdminEmails(): Promise<string[]> {
    const em = this.em.fork();
    const admins = await em.find(Profile, {
      role: UserRole.ADMIN,
    }, { fields: ['email'] });
    return admins.map(a => a.email).filter((e): e is string => !!e);
  }

  private async getAdminUserIds(): Promise<string[]> {
    const em = this.em.fork();
    const admins = await em.find(Profile, {
      role: UserRole.ADMIN,
    }, { fields: ['id'] });
    return admins.map(a => a.id);
  }

  private async sendAlertToAllAdmins(dto: {
    title: string;
    subtitle?: string;
    fields: Array<{ label: string; value: string }>;
    dashboardPath?: string;
    dashboardLabel?: string;
  }): Promise<void> {
    const adminEmails = await this.getAdminEmails();
    if (adminEmails.length === 0) {
      this.logger.warn('No admin emails found');
      return;
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';

    for (const email of adminEmails) {
      await this.emailService.sendAdminAlertEmail({
        to: email,
        title: dto.title,
        subtitle: dto.subtitle,
        fields: dto.fields,
        dashboardUrl: dto.dashboardPath ? `${baseUrl}${dto.dashboardPath}` : undefined,
        dashboardLabel: dto.dashboardLabel,
      });
    }
    this.logger.log(`Admin alert sent to ${adminEmails.length} admin(s): ${dto.title}`);
  }

  private async notifyAllAdmins(title: string, message: string, link?: string): Promise<void> {
    const adminIds = await this.getAdminUserIds();
    if (adminIds.length === 0) return;

    await this.notificationsService.adminSendNotification({
      recipientIds: adminIds,
      title,
      message,
      type: 'alert',
      link,
    });
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Best-effort: enrich a failed-payment notification with member info
   * (full name, MECA ID, member-detail link) by looking up the local
   * Profile from any of the available signals. Tries in order:
   *   1. local Invoice row → invoice.user
   *   2. local Order row → order.member
   *   3. Profile lookup by email
   *
   * Returns null if no match is found. Callers should silently degrade
   * (omit the extra fields) rather than fail the notification.
   */
  private async lookupMemberContext(args: {
    userId?: string | null;
    invoiceId?: string | null;
    orderId?: string | null;
    customerEmail?: string | null;
  }): Promise<{
    fullName: string | null;
    email: string | null;
    mecaId: string | number | null;
    profileId: string | null;
  } | null> {
    const em = this.em.fork();
    let profile: Profile | null = null;

    try {
      // userId first — when Stripe metadata carried the logged-in user it's
      // the most reliable signal. Skips DB joins for the common case.
      if (args.userId) {
        profile = await em.findOne(Profile, { id: args.userId });
      }
      if (!profile && args.invoiceId) {
        const inv = await em.findOne(Invoice, { id: args.invoiceId }, { populate: ['user'] });
        if (inv?.user) profile = inv.user as any as Profile;
      }
      if (!profile && args.orderId) {
        const ord = await em.findOne(Order, { id: args.orderId }, { populate: ['member'] });
        if (ord?.member) profile = ord.member as any as Profile;
      }
      if (!profile && args.customerEmail) {
        profile = await em.findOne(Profile, { email: args.customerEmail.toLowerCase() });
      }
    } catch (err) {
      this.logger.warn(`lookupMemberContext failed: ${err}`);
    }

    if (!profile) return null;

    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null;
    return {
      fullName,
      email: profile.email || args.customerEmail || null,
      mecaId: profile.meca_id ?? null,
      profileId: profile.id,
    };
  }

  // ── Real-Time Notifications ────────────────────────────────────────────────

  async notifyNewMembership(membership: any, amountPaid: number): Promise<void> {
    try {
      const memberName = membership.competitorName ||
        `${membership.user?.first_name || ''} ${membership.user?.last_name || ''}`.trim() ||
        membership.user?.email || 'Unknown';
      const memberEmail = membership.user?.email || 'N/A';
      const mecaId = membership.mecaId || 'N/A';
      const membershipType = membership.membershipTypeConfig?.name || 'Membership';
      const category = membership.membershipTypeConfig?.category || 'N/A';
      const profileId = membership.user?.id || null;
      const baseUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';
      // Deep-link directly to the member's billing/profile when possible
      // so admins can verify the purchase + see related history in one
      // click instead of searching the members list.
      const link = profileId ? `/admin/members/${profileId}` : '/admin/members';
      const dashboardLabel = profileId ? 'View Member Billing' : 'View Members';

      await this.notifyAllAdmins(
        'New Membership Purchased',
        `${memberName} (MECA ID: ${mecaId}) purchased a ${membershipType} membership ($${amountPaid.toFixed(2)})`,
        link,
      );

      const fields: Array<{ label: string; value: string }> = [
        { label: 'Member', value: memberName },
        { label: 'MECA ID', value: String(mecaId) },
        { label: 'Email', value: memberEmail },
      ];
      if (profileId) fields.push({ label: 'Member Billing', value: `${baseUrl}/admin/members/${profileId}` });
      fields.push(
        { label: 'Type', value: membershipType },
        { label: 'Category', value: category },
        { label: 'Amount Paid', value: `$${amountPaid.toFixed(2)}` },
        { label: 'Date', value: this.formatDate(new Date()) },
      );

      await this.sendAlertToAllAdmins({
        title: `New Membership: ${memberName}`,
        subtitle: `${category} · MECA ID ${mecaId} · $${amountPaid.toFixed(2)}`,
        fields,
        dashboardPath: link,
        dashboardLabel,
      });
    } catch (error) {
      this.logger.error(`Failed to send new membership admin notification: ${error}`);
    }
  }

  async notifyNewShopOrder(order: any): Promise<void> {
    try {
      const customerName = order.guestName ||
        `${order.user?.first_name || ''} ${order.user?.last_name || ''}`.trim() ||
        order.guestEmail || 'Unknown';
      const customerEmail = order.user?.email || order.guestEmail || 'N/A';
      const total = Number(order.totalAmount || 0).toFixed(2);
      const itemCount = order.items?.length || 0;

      await this.notifyAllAdmins(
        'New Shop Order',
        `Order #${order.orderNumber} from ${customerName} - $${total} (${itemCount} item${itemCount !== 1 ? 's' : ''})`,
        '/admin/shop/orders',
      );

      await this.sendAlertToAllAdmins({
        title: `New Shop Order #${order.orderNumber}`,
        subtitle: `$${total}`,
        fields: [
          { label: 'Order #', value: order.orderNumber },
          { label: 'Customer', value: customerName },
          { label: 'Email', value: customerEmail },
          { label: 'Items', value: String(itemCount) },
          { label: 'Total', value: `$${total}` },
          { label: 'Date', value: this.formatDate(new Date()) },
        ],
        dashboardPath: '/admin/shop/orders',
        dashboardLabel: 'View Orders',
      });
    } catch (error) {
      this.logger.error(`Failed to send new shop order admin notification: ${error}`);
    }
  }

  async notifyInvoicePaymentFailed(
    membership: any,
    info: {
      attemptCount: number;
      amountDueCents: number;
      hostedInvoiceUrl: string | null;
      // Local Invoice id, when one was created off this renewal. Without it
      // the link falls back to the failed-payments triage view (renewals
      // typically don't have a local Invoice row).
      invoiceId?: string | null;
    },
  ): Promise<void> {
    try {
      const memberName = membership.competitorName ||
        `${membership.user?.first_name || ''} ${membership.user?.last_name || ''}`.trim() ||
        'Unknown';
      const mecaId = membership.mecaId || 'N/A';
      const memberEmail = membership.user?.email || null;
      const profileId = membership.user?.id || null;
      const amount = (info.amountDueCents / 100).toFixed(2);

      const baseUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';
      // Prefer member billing page so admin lands on a context-rich view
      // (subscription, payment history, retry options) rather than the
      // narrow invoice. Falls back gracefully when profile is unknown.
      const link = profileId
        ? `/admin/members/${profileId}`
        : info.invoiceId
          ? `/admin/billing/invoices/${info.invoiceId}`
          : '/admin/billing/failed-payments';
      const dashboardLabel = profileId
        ? 'View Member Billing'
        : info.invoiceId
          ? 'View Failed Invoice'
          : 'View Failed Payments';

      await this.notifyAllAdmins(
        'Renewal Payment Failed',
        `${memberName} (MECA ID: ${mecaId}) renewal payment failed (attempt ${info.attemptCount}, $${amount})`,
        link,
      );

      const fields: Array<{ label: string; value: string }> = [
        { label: 'Member', value: memberName },
        { label: 'MECA ID', value: String(mecaId) },
      ];
      if (memberEmail) fields.push({ label: 'Email', value: memberEmail });
      if (profileId) fields.push({ label: 'Member Billing', value: `${baseUrl}/admin/members/${profileId}` });
      fields.push(
        { label: 'Amount Due', value: `$${amount}` },
        { label: 'Attempt #', value: String(info.attemptCount) },
        { label: 'Subscription ID', value: membership.stripeSubscriptionId || 'N/A' },
      );
      if (info.hostedInvoiceUrl) fields.push({ label: 'Stripe Invoice', value: info.hostedInvoiceUrl });

      await this.sendAlertToAllAdmins({
        title: `Renewal Payment Failed: ${memberName}`,
        subtitle: `MECA ID ${mecaId} · Attempt ${info.attemptCount} — $${amount} due`,
        fields,
        dashboardPath: link,
        dashboardLabel,
      });
    } catch (error) {
      this.logger.error(`Failed to send invoice payment failed admin notification: ${error}`);
    }
  }

  async notifySubscriptionRenewal(membership: any, newEndDate: Date): Promise<void> {
    try {
      const memberName = membership.competitorName ||
        `${membership.user?.first_name || ''} ${membership.user?.last_name || ''}`.trim() ||
        'Unknown';
      const mecaId = membership.mecaId || 'N/A';
      const memberEmail = membership.user?.email || null;
      const profileId = membership.user?.id || null;
      const baseUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';
      const link = profileId ? `/admin/members/${profileId}` : '/admin/members';
      const dashboardLabel = profileId ? 'View Member Billing' : 'View Members';

      await this.notifyAllAdmins(
        'Subscription Renewed',
        `${memberName} (MECA ID: ${mecaId}) subscription renewed - extended to ${this.formatDate(newEndDate)}`,
        link,
      );

      const fields: Array<{ label: string; value: string }> = [
        { label: 'Member', value: memberName },
        { label: 'MECA ID', value: String(mecaId) },
      ];
      if (memberEmail) fields.push({ label: 'Email', value: memberEmail });
      if (profileId) fields.push({ label: 'Member Billing', value: `${baseUrl}/admin/members/${profileId}` });
      fields.push(
        { label: 'New End Date', value: this.formatDate(newEndDate) },
        { label: 'Subscription ID', value: membership.stripeSubscriptionId || 'N/A' },
      );

      await this.sendAlertToAllAdmins({
        title: `Subscription Renewed: ${memberName}`,
        subtitle: `MECA ID ${mecaId} · Extended to ${this.formatDate(newEndDate)}`,
        fields,
        dashboardPath: link,
        dashboardLabel,
      });
    } catch (error) {
      this.logger.error(`Failed to send subscription renewal admin notification: ${error}`);
    }
  }

  async notifySubscriptionCancelled(membership: any): Promise<void> {
    try {
      const memberName = membership.competitorName ||
        `${membership.user?.first_name || ''} ${membership.user?.last_name || ''}`.trim() ||
        'Unknown';
      const mecaId = membership.mecaId || 'N/A';
      const memberEmail = membership.user?.email || null;
      const profileId = membership.user?.id || null;
      const baseUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';
      const link = profileId ? `/admin/members/${profileId}` : '/admin/members';
      const dashboardLabel = profileId ? 'View Member Billing' : 'View Members';

      await this.notifyAllAdmins(
        'Subscription Cancelled',
        `${memberName} (MECA ID: ${mecaId}) subscription was cancelled`,
        link,
      );

      const fields: Array<{ label: string; value: string }> = [
        { label: 'Member', value: memberName },
        { label: 'MECA ID', value: String(mecaId) },
      ];
      if (memberEmail) fields.push({ label: 'Email', value: memberEmail });
      if (profileId) fields.push({ label: 'Member Billing', value: `${baseUrl}/admin/members/${profileId}` });
      fields.push({ label: 'Date', value: this.formatDate(new Date()) });

      await this.sendAlertToAllAdmins({
        title: `Subscription Cancelled: ${memberName}`,
        subtitle: `MECA ID: ${mecaId}`,
        fields,
        dashboardPath: link,
        dashboardLabel,
      });
    } catch (error) {
      this.logger.error(`Failed to send subscription cancellation admin notification: ${error}`);
    }
  }

  async notifyMembershipCancelled(membership: any, reason?: string): Promise<void> {
    try {
      const memberName = membership.competitorName ||
        `${membership.user?.first_name || ''} ${membership.user?.last_name || ''}`.trim() ||
        'Unknown';
      const mecaId = membership.mecaId || 'N/A';
      const memberEmail = membership.user?.email || null;
      const profileId = membership.user?.id || null;
      const baseUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';
      const link = profileId ? `/admin/members/${profileId}` : '/admin/members';
      const dashboardLabel = profileId ? 'View Member Billing' : 'View Members';

      await this.notifyAllAdmins(
        'Membership Cancelled',
        `${memberName} (MECA ID: ${mecaId}) membership was cancelled${reason ? `: ${reason}` : ''}`,
        link,
      );

      const fields: Array<{ label: string; value: string }> = [
        { label: 'Member', value: memberName },
        { label: 'MECA ID', value: String(mecaId) },
      ];
      if (memberEmail) fields.push({ label: 'Email', value: memberEmail });
      if (profileId) fields.push({ label: 'Member Billing', value: `${baseUrl}/admin/members/${profileId}` });
      fields.push({ label: 'Date', value: this.formatDate(new Date()) });
      if (reason) fields.push({ label: 'Reason', value: reason });

      await this.sendAlertToAllAdmins({
        title: `Membership Cancelled: ${memberName}`,
        subtitle: `MECA ID: ${mecaId}`,
        fields,
        dashboardPath: link,
        dashboardLabel,
      });
    } catch (error) {
      this.logger.error(`Failed to send membership cancellation admin notification: ${error}`);
    }
  }

  async notifyDisputeCreated(args: {
    disputeId: string;
    amountCents: number;
    reason: string;
    paymentIntentId: string;
    evidenceDueBy?: Date | null;
    customerEmail?: string | null;
    customerName?: string | null;
    paymentType?: string | null;
  }): Promise<void> {
    try {
      const amount = (args.amountCents / 100).toFixed(2);
      const dueByStr = args.evidenceDueBy ? this.formatDate(args.evidenceDueBy) : 'Not provided';
      const ctx = await this.lookupMemberContext({ customerEmail: args.customerEmail });
      const memberName = ctx?.fullName || args.customerName || null;
      const memberEmail = ctx?.email || args.customerEmail || null;
      const mecaId = ctx?.mecaId ?? null;
      const baseUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';

      const memberStr = memberName
        ? ` — ${memberName}${mecaId ? ` (MECA ID: ${mecaId})` : ''}`
        : '';
      await this.notifyAllAdmins(
        'CHARGEBACK OPENED',
        `Dispute ${args.disputeId} - $${amount} (${args.reason}). Evidence due ${dueByStr}.${memberStr}`,
        '/admin/billing/orders',
      );

      const fields: Array<{ label: string; value: string }> = [
        { label: 'Dispute ID', value: args.disputeId },
        { label: 'Amount', value: `$${amount}` },
        { label: 'Reason', value: args.reason || 'Not specified' },
        { label: 'Evidence Due By', value: dueByStr },
        { label: 'Payment Intent', value: args.paymentIntentId },
      ];
      if (memberName) fields.push({ label: 'Member', value: memberName });
      if (mecaId != null) fields.push({ label: 'MECA ID', value: String(mecaId) });
      if (memberEmail) fields.push({ label: 'Email', value: memberEmail });
      if (args.paymentType) fields.push({ label: 'Payment Type', value: args.paymentType });
      if (ctx?.profileId) fields.push({ label: 'Member Profile', value: `${baseUrl}/admin/members/${ctx.profileId}` });

      await this.sendAlertToAllAdmins({
        title: `[URGENT] Chargeback Opened: $${amount}`,
        subtitle: `${memberName ? `${memberName} · ` : ''}Reason: ${args.reason || 'Not specified'} - Evidence due ${dueByStr}`,
        fields,
        dashboardPath: '/admin/billing/orders',
        dashboardLabel: 'View Orders',
      });
    } catch (error) {
      this.logger.error(`Failed to send dispute-created admin notification: ${error}`);
    }
  }

  async notifyDisputeLost(args: {
    disputeId: string;
    amountCents: number;
    reason: string;
    paymentIntentId: string;
    customerEmail?: string | null;
    customerName?: string | null;
    paymentType?: string | null;
  }): Promise<void> {
    try {
      const amount = (args.amountCents / 100).toFixed(2);
      const ctx = await this.lookupMemberContext({ customerEmail: args.customerEmail });
      const memberName = ctx?.fullName || args.customerName || null;
      const memberEmail = ctx?.email || args.customerEmail || null;
      const mecaId = ctx?.mecaId ?? null;
      const baseUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';

      const memberStr = memberName ? ` — ${memberName}${mecaId ? ` (MECA ID: ${mecaId})` : ''}` : '';
      await this.notifyAllAdmins(
        'CHARGEBACK LOST',
        `Dispute ${args.disputeId} closed as LOST - $${amount} debited.${memberStr}`,
        '/admin/billing/orders',
      );

      const fields: Array<{ label: string; value: string }> = [
        { label: 'Dispute ID', value: args.disputeId },
        { label: 'Amount Lost', value: `$${amount}` },
        { label: 'Reason', value: args.reason || 'Not specified' },
        { label: 'Payment Intent', value: args.paymentIntentId },
      ];
      if (memberName) fields.push({ label: 'Member', value: memberName });
      if (mecaId != null) fields.push({ label: 'MECA ID', value: String(mecaId) });
      if (memberEmail) fields.push({ label: 'Email', value: memberEmail });
      if (args.paymentType) fields.push({ label: 'Payment Type', value: args.paymentType });
      if (ctx?.profileId) fields.push({ label: 'Member Profile', value: `${baseUrl}/admin/members/${ctx.profileId}` });

      await this.sendAlertToAllAdmins({
        title: `[URGENT] Chargeback LOST: $${amount}`,
        subtitle: `${memberName ? `${memberName} · ` : ''}Funds have been debited from your account`,
        fields,
        dashboardPath: '/admin/billing/orders',
        dashboardLabel: 'View Orders',
      });
    } catch (error) {
      this.logger.error(`Failed to send dispute-lost admin notification: ${error}`);
    }
  }

  async notifyOneTimePaymentFailed(args: {
    transactionId: string;
    amountCents?: number | null;
    paymentMethod: 'stripe' | 'paypal';
    paymentType?: string | null;
    /** Logged-in member's profile id from Stripe metadata, if present. */
    customerUserId?: string | null;
    customerEmail?: string | null;
    customerName?: string | null;
    failureCode?: string | null;
    failureMessage?: string | null;
    // Local order/invoice ids when the failed payment was tied to one. Used to
    // deep-link the bell notification + email button to the specific row so
    // admins land on the failed entity in one click instead of the generic list.
    orderId?: string | null;
    invoiceId?: string | null;
  }): Promise<void> {
    try {
      const amount = typeof args.amountCents === 'number' ? `$${(args.amountCents / 100).toFixed(2)}` : 'Unknown';
      const provider = args.paymentMethod === 'stripe' ? 'Stripe' : 'PayPal';
      const typeLabel = args.paymentType || 'Payment';

      // Enrich with member info — payment-failed webhooks often arrive with
      // sparse metadata (no name, no MECA ID), but we can usually resolve
      // the local Profile from the userId in Stripe metadata, the linked
      // Order/Invoice, or by customer email.
      const memberCtx = await this.lookupMemberContext({
        userId: args.customerUserId,
        invoiceId: args.invoiceId,
        orderId: args.orderId,
        customerEmail: args.customerEmail,
      });

      const memberName = memberCtx?.fullName || args.customerName || null;
      const memberEmail = memberCtx?.email || args.customerEmail || null;
      const mecaId = memberCtx?.mecaId ?? null;

      // Prefer the most specific link:
      //   member billing → invoice → order → failed-payments list
      // Going straight to the member's billing page lets the admin see
      // every related charge + retry options in one place. The other
      // sources stay as fallbacks for guest / orphan payments.
      const link = memberCtx?.profileId
        ? `/admin/members/${memberCtx.profileId}`
        : args.invoiceId
          ? `/admin/billing/invoices/${args.invoiceId}`
          : args.orderId
            ? `/admin/billing/orders/${args.orderId}`
            : '/admin/billing/failed-payments';
      const dashboardLabel = memberCtx?.profileId
        ? 'View Member Billing'
        : args.invoiceId
          ? 'View Failed Invoice'
          : args.orderId
            ? 'View Failed Order'
            : 'View Failed Payments';

      // Build a richer bell-notification message so admins can identify the
      // member from the dropdown without opening the email.
      const memberStr = memberName
        ? ` — ${memberName}${mecaId ? ` (MECA ID: ${mecaId})` : ''}`
        : memberEmail
          ? ` — ${memberEmail}`
          : '';
      await this.notifyAllAdmins(
        'Payment Failed',
        `${provider} ${typeLabel} payment of ${amount} failed${memberStr}.`,
        link,
      );

      // Member identification ALWAYS renders, so the admin never has to ask
      // "whose payment failed?" — even guest checkouts that can't be matched
      // show an explicit "(unknown — guest / no metadata)" line.
      const baseUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';
      const memberBillingUrl = memberCtx?.profileId
        ? `${baseUrl}/admin/members/${memberCtx.profileId}`
        : null;

      const fields: Array<{ label: string; value: string }> = [
        { label: 'Member', value: memberName || '(unknown — guest checkout or no metadata)' },
        { label: 'MECA ID', value: mecaId != null ? String(mecaId) : '—' },
        { label: 'Email', value: memberEmail || '—' },
      ];
      if (memberBillingUrl) {
        fields.push({ label: 'Member Billing', value: memberBillingUrl });
      }
      fields.push(
        { label: 'Provider', value: provider },
        { label: 'Type', value: typeLabel },
        { label: 'Amount', value: amount },
        { label: 'Transaction ID', value: args.transactionId },
      );
      if (args.failureCode) fields.push({ label: 'Failure Code', value: args.failureCode });
      if (args.failureMessage) fields.push({ label: 'Failure Reason', value: args.failureMessage });
      fields.push({ label: 'Date', value: this.formatDate(new Date()) });

      // Build subtitle with member context so it shows in the email
      // preview/header before the field table.
      const subtitle = memberName
        ? `${memberName}${mecaId ? ` · MECA ID ${mecaId}` : ''} — ${typeLabel}`
        : typeLabel;

      await this.sendAlertToAllAdmins({
        title: `${provider} Payment Failed: ${amount}`,
        subtitle,
        fields,
        dashboardPath: link,
        dashboardLabel,
      });
    } catch (error) {
      this.logger.error(`Failed to send one-time-payment-failed admin notification: ${error}`);
    }
  }

  async notifyRefundIssued(args: {
    amountCents: number;
    paymentMethod: 'stripe' | 'paypal';
    paymentType?: string | null;
    transactionId: string;
    customerEmail?: string | null;
    customerName?: string | null;
    isPartialRefund: boolean;
  }): Promise<void> {
    try {
      const amount = (args.amountCents / 100).toFixed(2);
      const provider = args.paymentMethod === 'stripe' ? 'Stripe' : 'PayPal';
      const refundType = args.isPartialRefund ? 'Partial refund' : 'Refund';
      const typeLabel = args.paymentType || 'purchase';
      const ctx = await this.lookupMemberContext({ customerEmail: args.customerEmail });
      const memberName = ctx?.fullName || args.customerName || null;
      const memberEmail = ctx?.email || args.customerEmail || null;
      const mecaId = ctx?.mecaId ?? null;
      const baseUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';

      const memberStr = memberName ? ` — ${memberName}${mecaId ? ` (MECA ID: ${mecaId})` : ''}` : memberEmail ? ` — ${memberEmail}` : '';
      // Prefer the member-billing page so admin lands on related billing
      // history; fall back to the unified payments list (where the refund
      // shows as paymentStatus=refunded).
      const link = ctx?.profileId
        ? `/admin/members/${ctx.profileId}`
        : '/admin/billing/payments?status=refunded';
      const dashboardLabel = ctx?.profileId ? 'View Member Billing' : 'View Refunds';
      await this.notifyAllAdmins(
        `${refundType} Issued`,
        `${refundType} of $${amount} on ${provider} (${typeLabel})${memberStr}.`,
        link,
      );

      const fields: Array<{ label: string; value: string }> = [
        { label: 'Member', value: memberName || '(unknown — guest or no metadata)' },
        { label: 'MECA ID', value: mecaId != null ? String(mecaId) : '—' },
        { label: 'Email', value: memberEmail || '—' },
      ];
      if (ctx?.profileId) fields.push({ label: 'Member Billing', value: `${baseUrl}/admin/members/${ctx.profileId}` });
      fields.push(
        { label: 'Refund Type', value: refundType },
        { label: 'Amount', value: `$${amount}` },
        { label: 'Provider', value: provider },
        { label: 'Type', value: typeLabel },
        { label: 'Transaction ID', value: args.transactionId },
        { label: 'Date', value: this.formatDate(new Date()) },
      );

      await this.sendAlertToAllAdmins({
        title: `${refundType} Issued: $${amount}`,
        subtitle: `${memberName ? `${memberName} · ` : ''}${provider} ${typeLabel}`,
        fields,
        dashboardPath: link,
        dashboardLabel,
      });
    } catch (error) {
      this.logger.error(`Failed to send refund-issued admin notification: ${error}`);
    }
  }

  async notifyNewEventRegistration(args: {
    registrationId: string;
    eventName: string;
    eventDate?: Date | null;
    registrantName: string;
    registrantEmail: string;
    classes?: string[];
    amountPaid?: number | null;
    isFree?: boolean;
    isPreRegistration?: boolean;
  }): Promise<void> {
    try {
      const amount = typeof args.amountPaid === 'number' ? `$${args.amountPaid.toFixed(2)}` : (args.isFree ? 'Free' : 'N/A');
      const classesStr = args.classes && args.classes.length > 0 ? args.classes.join(', ') : 'No classes selected';
      const labelPrefix = args.isPreRegistration ? 'Pre-Registration' : 'Registration';

      await this.notifyAllAdmins(
        `New Event ${labelPrefix}`,
        `${args.registrantName} registered for ${args.eventName} (${amount})`,
        '/admin/event-registrations',
      );

      const fields = [
        { label: 'Event', value: args.eventName },
        { label: 'Registrant', value: args.registrantName },
        { label: 'Email', value: args.registrantEmail },
        { label: 'Classes', value: classesStr },
        { label: 'Amount', value: amount },
      ];
      if (args.eventDate) fields.push({ label: 'Event Date', value: this.formatDate(args.eventDate) });
      fields.push({ label: 'Date', value: this.formatDate(new Date()) });

      await this.sendAlertToAllAdmins({
        title: `New ${labelPrefix}: ${args.registrantName}`,
        subtitle: `${args.eventName} - ${amount}`,
        fields,
        dashboardPath: '/admin/event-registrations',
        dashboardLabel: 'View Registrations',
      });
    } catch (error) {
      this.logger.error(`Failed to send new-event-registration admin notification: ${error}`);
    }
  }

  // ── Weekly Digest ──────────────────────────────────────────────────────────

  @Cron('0 9 * * 1') // Monday at 9 AM
  async sendWeeklyDigest(): Promise<void> {
    this.logger.log('Running weekly admin digest email...');

    try {
      const adminEmails = await this.getAdminEmails();
      if (adminEmails.length === 0) {
        this.logger.warn('No admin emails found - skipping weekly digest');
        return;
      }

      const digestData = await this.gatherWeeklyDigestData();

      for (const email of adminEmails) {
        await this.emailService.sendAdminWeeklyDigestEmail({
          to: email,
          ...digestData,
        });
      }

      this.logger.log(`Weekly digest sent to ${adminEmails.length} admin(s)`);
    } catch (error) {
      this.logger.error(`Failed to send weekly digest: ${error}`);
    }
  }

  private async gatherWeeklyDigestData() {
    const em = this.em.fork();
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [newMemberships, newShopOrders, cancelledMemberships, upcomingExpirations] = await Promise.all([
      em.find(Membership, {
        createdAt: { $gte: weekAgo },
        paymentStatus: PaymentStatus.PAID,
      }, { populate: ['user', 'membershipTypeConfig'], orderBy: { createdAt: 'DESC' } }),

      em.find(ShopOrder, {
        createdAt: { $gte: weekAgo },
        status: { $in: [ShopOrderStatus.PAID, ShopOrderStatus.PROCESSING, ShopOrderStatus.SHIPPED, ShopOrderStatus.DELIVERED] },
      }, { populate: ['user'], orderBy: { createdAt: 'DESC' } }),

      em.find(Membership, {
        cancelledAt: { $gte: weekAgo },
      }, { populate: ['user', 'membershipTypeConfig'], orderBy: { cancelledAt: 'DESC' } }),

      em.find(Membership, {
        endDate: { $gte: now, $lte: thirtyDaysFromNow },
        paymentStatus: PaymentStatus.PAID,
      }, { populate: ['user', 'membershipTypeConfig'], orderBy: { endDate: 'ASC' } }),
    ]);

    const upcomingRenewals = upcomingExpirations.filter(m => m.stripeSubscriptionId);
    const upcomingExpiring = upcomingExpirations.filter(m => !m.stripeSubscriptionId);

    const shopRevenue = newShopOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const membershipRevenue = newMemberships.reduce((sum, m) => sum + Number(m.amountPaid || 0), 0);
    const totalRevenue = shopRevenue + membershipRevenue;

    const dateRange = `${this.formatDate(weekAgo)} - ${this.formatDate(now)}`;

    return {
      dateRange,
      summaryCards: [
        { label: 'New Members', value: String(newMemberships.length), color: '#f97316' },
        { label: 'Shop Orders', value: String(newShopOrders.length), color: '#3b82f6' },
        { label: 'Revenue', value: `$${totalRevenue.toFixed(0)}`, color: '#22c55e' },
        { label: 'Cancellations', value: String(cancelledMemberships.length), color: '#ef4444' },
        { label: 'Upcoming Renewals', value: String(upcomingRenewals.length), color: '#eab308' },
        { label: 'Expiring Soon', value: String(upcomingExpiring.length), color: '#ef4444' },
      ],
      sections: [
        {
          title: 'New Memberships',
          count: newMemberships.length,
          color: '#f97316',
          headers: ['Member', 'Type', 'Amount'],
          rows: newMemberships.slice(0, 20).map(m => [
            m.competitorName || `${m.user?.first_name || ''} ${m.user?.last_name || ''}`.trim() || 'N/A',
            m.membershipTypeConfig?.name || 'N/A',
            `$${Number(m.amountPaid || 0).toFixed(2)}`,
          ]),
          emptyMessage: 'No new memberships this week',
        },
        {
          title: 'Shop Orders',
          count: newShopOrders.length,
          color: '#3b82f6',
          headers: ['Order #', 'Customer', 'Total'],
          rows: newShopOrders.slice(0, 20).map(o => [
            o.orderNumber,
            o.guestName || `${o.user?.first_name || ''} ${o.user?.last_name || ''}`.trim() || o.guestEmail || 'N/A',
            `$${Number(o.totalAmount || 0).toFixed(2)}`,
          ]),
          emptyMessage: 'No shop orders this week',
        },
        {
          title: 'Cancellations',
          count: cancelledMemberships.length,
          color: '#ef4444',
          headers: ['Member', 'Reason', 'Date'],
          rows: cancelledMemberships.slice(0, 20).map(m => [
            m.competitorName || `${m.user?.first_name || ''} ${m.user?.last_name || ''}`.trim() || 'N/A',
            m.cancellationReason || 'Not specified',
            m.cancelledAt ? this.formatDate(m.cancelledAt) : 'N/A',
          ]),
          emptyMessage: 'No cancellations this week',
        },
        {
          title: 'Upcoming Renewals (Next 30 Days)',
          count: upcomingRenewals.length,
          color: '#eab308',
          headers: ['Member', 'MECA ID', 'Renewal Date'],
          rows: upcomingRenewals.slice(0, 15).map(m => [
            m.competitorName || `${m.user?.first_name || ''} ${m.user?.last_name || ''}`.trim() || 'N/A',
            String(m.mecaId || 'N/A'),
            m.endDate ? this.formatDate(m.endDate) : 'N/A',
          ]),
          emptyMessage: 'No upcoming renewals',
        },
        {
          title: 'Expiring Soon - No Auto-Renewal (Next 30 Days)',
          count: upcomingExpiring.length,
          color: '#ef4444',
          headers: ['Member', 'MECA ID', 'Expiry Date'],
          rows: upcomingExpiring.slice(0, 15).map(m => [
            m.competitorName || `${m.user?.first_name || ''} ${m.user?.last_name || ''}`.trim() || 'N/A',
            String(m.mecaId || 'N/A'),
            m.endDate ? this.formatDate(m.endDate) : 'N/A',
          ]),
          emptyMessage: 'No memberships expiring without renewal',
        },
      ],
    };
  }

  // ── Test Methods ───────────────────────────────────────────────────────────

  async sendTestEmails(overrideEmail?: string): Promise<{ sent: string[] }> {
    const sent: string[] = [];
    const targetEmails = overrideEmail ? [overrideEmail] : await this.getAdminEmails();

    if (targetEmails.length === 0) {
      this.logger.warn('No target emails for test');
      return { sent };
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';
    const dateStr = this.formatDate(new Date());

    const tests = [
      {
        title: '[TEST] New Membership: John Smith',
        subtitle: 'competitor - $75.00',
        fields: [
          { label: 'Member', value: 'John Smith' },
          { label: 'Email', value: 'john.smith@example.com' },
          { label: 'MECA ID', value: '100456' },
          { label: 'Type', value: 'Competitor Annual' },
          { label: 'Category', value: 'competitor' },
          { label: 'Amount Paid', value: '$75.00' },
          { label: 'Date', value: dateStr },
        ],
        dashboardPath: '/admin/members',
        dashboardLabel: 'View Members',
      },
      {
        title: '[TEST] New Shop Order #SHOP-2026-00042',
        subtitle: '$129.95',
        fields: [
          { label: 'Order #', value: 'SHOP-2026-00042' },
          { label: 'Customer', value: 'Jane Doe' },
          { label: 'Email', value: 'jane.doe@example.com' },
          { label: 'Items', value: '3' },
          { label: 'Total', value: '$129.95' },
          { label: 'Date', value: dateStr },
        ],
        dashboardPath: '/admin/shop/orders',
        dashboardLabel: 'View Orders',
      },
      {
        title: '[TEST] Subscription Renewed: Mike Johnson',
        subtitle: 'Extended to Apr 14, 2027',
        fields: [
          { label: 'Member', value: 'Mike Johnson' },
          { label: 'MECA ID', value: '100789' },
          { label: 'New End Date', value: 'Apr 14, 2027' },
          { label: 'Subscription ID', value: 'sub_1PxYz2AbCdEfGh' },
        ],
        dashboardPath: '/admin/members',
        dashboardLabel: 'View Members',
      },
      {
        title: '[TEST] Subscription Cancelled: Sarah Williams',
        subtitle: 'MECA ID: 100234',
        fields: [
          { label: 'Member', value: 'Sarah Williams' },
          { label: 'MECA ID', value: '100234' },
          { label: 'Date', value: dateStr },
        ],
        dashboardPath: '/admin/members',
        dashboardLabel: 'View Members',
      },
      {
        title: '[TEST] Membership Cancelled: Bob Anderson',
        subtitle: 'MECA ID: 100567',
        fields: [
          { label: 'Member', value: 'Bob Anderson' },
          { label: 'MECA ID', value: '100567' },
          { label: 'Reason', value: 'Requested refund - moving out of state' },
          { label: 'Date', value: dateStr },
        ],
        dashboardPath: '/admin/members',
        dashboardLabel: 'View Members',
      },
    ];

    for (const test of tests) {
      for (const email of targetEmails) {
        await this.emailService.sendAdminAlertEmail({
          to: email,
          title: test.title,
          subtitle: test.subtitle,
          fields: test.fields,
          dashboardUrl: `${baseUrl}${test.dashboardPath}`,
          dashboardLabel: test.dashboardLabel,
        });
      }
      sent.push(test.title);
    }

    this.logger.log(`Sent ${sent.length} test emails to ${targetEmails.join(', ')}`);
    return { sent };
  }

  async sendTestWeeklyDigest(overrideEmail?: string): Promise<void> {
    const digestData = await this.gatherWeeklyDigestData();
    const targetEmails = overrideEmail ? [overrideEmail] : await this.getAdminEmails();

    for (const email of targetEmails) {
      await this.emailService.sendAdminWeeklyDigestEmail({
        to: email,
        dateRange: `[TEST] ${digestData.dateRange}`,
        summaryCards: digestData.summaryCards,
        sections: digestData.sections,
      });
    }

    this.logger.log(`Test weekly digest sent to ${targetEmails.join(', ')}`);
  }
}
