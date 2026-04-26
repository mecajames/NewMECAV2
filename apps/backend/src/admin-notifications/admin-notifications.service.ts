import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/core';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Profile } from '../profiles/profiles.entity';
import { Membership } from '../memberships/memberships.entity';
import { ShopOrder } from '../shop/entities/shop-order.entity';
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

      await this.notifyAllAdmins(
        'New Membership Purchased',
        `${memberName} purchased a ${membershipType} membership ($${amountPaid.toFixed(2)})`,
        '/admin/members',
      );

      await this.sendAlertToAllAdmins({
        title: `New Membership: ${memberName}`,
        subtitle: `${category} - $${amountPaid.toFixed(2)}`,
        fields: [
          { label: 'Member', value: memberName },
          { label: 'Email', value: memberEmail },
          { label: 'MECA ID', value: String(mecaId) },
          { label: 'Type', value: membershipType },
          { label: 'Category', value: category },
          { label: 'Amount Paid', value: `$${amountPaid.toFixed(2)}` },
          { label: 'Date', value: this.formatDate(new Date()) },
        ],
        dashboardPath: '/admin/members',
        dashboardLabel: 'View Members',
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
    info: { attemptCount: number; amountDueCents: number; hostedInvoiceUrl: string | null },
  ): Promise<void> {
    try {
      const memberName = membership.competitorName ||
        `${membership.user?.first_name || ''} ${membership.user?.last_name || ''}`.trim() ||
        'Unknown';
      const mecaId = membership.mecaId || 'N/A';
      const amount = (info.amountDueCents / 100).toFixed(2);

      await this.notifyAllAdmins(
        'Renewal Payment Failed',
        `${memberName} (MECA ID: ${mecaId}) renewal payment failed (attempt ${info.attemptCount}, $${amount})`,
        '/admin/members',
      );

      await this.sendAlertToAllAdmins({
        title: `Renewal Payment Failed: ${memberName}`,
        subtitle: `Attempt ${info.attemptCount} — $${amount} due`,
        fields: [
          { label: 'Member', value: memberName },
          { label: 'MECA ID', value: String(mecaId) },
          { label: 'Amount Due', value: `$${amount}` },
          { label: 'Attempt #', value: String(info.attemptCount) },
          { label: 'Subscription ID', value: membership.stripeSubscriptionId || 'N/A' },
          ...(info.hostedInvoiceUrl ? [{ label: 'Stripe Invoice', value: info.hostedInvoiceUrl }] : []),
        ],
        dashboardPath: '/admin/members',
        dashboardLabel: 'View Members',
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

      await this.notifyAllAdmins(
        'Subscription Renewed',
        `${memberName} (MECA ID: ${mecaId}) subscription renewed - extended to ${this.formatDate(newEndDate)}`,
        '/admin/members',
      );

      await this.sendAlertToAllAdmins({
        title: `Subscription Renewed: ${memberName}`,
        subtitle: `Extended to ${this.formatDate(newEndDate)}`,
        fields: [
          { label: 'Member', value: memberName },
          { label: 'MECA ID', value: String(mecaId) },
          { label: 'New End Date', value: this.formatDate(newEndDate) },
          { label: 'Subscription ID', value: membership.stripeSubscriptionId || 'N/A' },
        ],
        dashboardPath: '/admin/members',
        dashboardLabel: 'View Members',
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

      await this.notifyAllAdmins(
        'Subscription Cancelled',
        `${memberName} (MECA ID: ${mecaId}) subscription was cancelled`,
        '/admin/members',
      );

      await this.sendAlertToAllAdmins({
        title: `Subscription Cancelled: ${memberName}`,
        subtitle: `MECA ID: ${mecaId}`,
        fields: [
          { label: 'Member', value: memberName },
          { label: 'MECA ID', value: String(mecaId) },
          { label: 'Date', value: this.formatDate(new Date()) },
        ],
        dashboardPath: '/admin/members',
        dashboardLabel: 'View Members',
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

      await this.notifyAllAdmins(
        'Membership Cancelled',
        `${memberName} (MECA ID: ${mecaId}) membership was cancelled${reason ? `: ${reason}` : ''}`,
        '/admin/members',
      );

      const fields = [
        { label: 'Member', value: memberName },
        { label: 'MECA ID', value: String(mecaId) },
        { label: 'Date', value: this.formatDate(new Date()) },
      ];
      if (reason) fields.push({ label: 'Reason', value: reason });

      await this.sendAlertToAllAdmins({
        title: `Membership Cancelled: ${memberName}`,
        subtitle: `MECA ID: ${mecaId}`,
        fields,
        dashboardPath: '/admin/members',
        dashboardLabel: 'View Members',
      });
    } catch (error) {
      this.logger.error(`Failed to send membership cancellation admin notification: ${error}`);
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
