import {
  Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PaymentStatus, OrderStatus, OrderType, OrderItemType, InvoiceStatus } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { Membership } from '../memberships/memberships.entity';
import { MembershipTypeConfig } from '../membership-type-configs/membership-type-configs.entity';
import { MembershipsService } from '../memberships/memberships.service';
import { MecaIdService } from '../memberships/meca-id.service';
import { MembershipSyncService } from '../memberships/membership-sync.service';
import { Order } from '../orders/orders.entity';
import { OrderItem } from '../orders/order-items.entity';
import { Invoice } from '../invoices/invoices.entity';
import { InvoiceItem } from '../invoices/invoice-items.entity';
import { SiteSettingsService } from '../site-settings/site-settings.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { isProtectedAccount } from '../auth/is-admin.helper';
import { ProfilesService } from '../profiles/profiles.service';

const ENFORCE_MEMBERSHIP_KEY = 'enforce_membership_for_login';

export type ProvisionMode = 'active' | 'pay_to_activate' | 'inactive';
export type StaffRoleAssignment = 'admin' | 'event_director' | null;

export interface ProvisionOptions {
  mode: ProvisionMode;
  membershipTypeConfigId: string;
  durationMonths?: number;
  forcePasswordChange?: boolean;
  staffRole?: StaffRoleAssignment;
  note?: string;
}

export interface ProvisionResult {
  membershipId: string;
  mecaId?: number;
  invoiceId?: string;
  invoiceNumber?: string;
  mode: ProvisionMode;
  message: string;
}

export interface ProfileAuditRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  meca_id: string | null;
  account_type: string | null;
  role: string | null;
  is_staff: boolean;
  can_login: boolean;
  login_banned: boolean;
  membership_count: number;
  last_seen_at: Date | null;
  last_login_at: Date | null;
  restricted_to_billing: boolean;
  created_at: Date;
  classifications: string[];
}

export interface AuthOrphanRow {
  auth_user_id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export interface SecuritySummary {
  total_profiles: number;
  profiles_can_login: number;
  profiles_without_membership: number;
  staff_or_admin: number;
  staff_without_membership: number;
  banned: number;
  auth_orphans: number;
  enforce_membership_for_login: boolean;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly siteSettingsService: SiteSettingsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly membershipsService: MembershipsService,
    private readonly mecaIdService: MecaIdService,
    private readonly membershipSyncService: MembershipSyncService,
    private readonly profilesService: ProfilesService,
  ) {}

  async getProfilesAudit(): Promise<ProfileAuditRow[]> {
    const em = this.em.fork();
    const conn = em.getConnection();

    type Row = {
      id: string;
      email: string | null;
      first_name: string | null;
      last_name: string | null;
      full_name: string | null;
      meca_id: string | null;
      account_type: string | null;
      role: string | null;
      is_staff: boolean;
      can_login: boolean | null;
      login_banned: boolean;
      restricted_to_billing: boolean;
      membership_count: string;
      last_seen_at: Date | null;
      last_login_at: Date | null;
      created_at: Date;
    };
    const rows: Row[] = await conn.execute(
      `SELECT p."id", p."email", p."first_name", p."last_name", p."full_name",
              p."meca_id", p."account_type", p."role", p."is_staff",
              p."can_login", p."login_banned",
              COALESCE(p."restricted_to_billing", false) AS "restricted_to_billing",
              p."last_seen_at", p."created_at",
              COALESCE(m.cnt, 0)::text AS membership_count,
              ll.last_login_at
       FROM "public"."profiles" p
       LEFT JOIN (
         SELECT "user_id", COUNT(*)::int AS cnt
         FROM "public"."memberships"
         GROUP BY "user_id"
       ) m ON m."user_id" = p."id"
       LEFT JOIN (
         SELECT "user_id", MAX("created_at") AS last_login_at
         FROM "public"."login_audit_log"
         WHERE "action" = 'login' AND "user_id" IS NOT NULL
         GROUP BY "user_id"
       ) ll ON ll."user_id" = p."id"
       ORDER BY p."created_at" DESC`,
    );

    return rows.map((r: Row) => {
      const canLogin = r.can_login !== false;
      const membershipCount = parseInt(r.membership_count, 10);
      const isStaff = r.is_staff === true || r.role === 'admin' || r.account_type === 'admin';

      const classifications: string[] = [];
      if (membershipCount === 0) classifications.push('no_membership');
      if (isStaff) classifications.push('staff');
      if (r.login_banned) classifications.push('banned');
      if (!canLogin && !r.login_banned) classifications.push('login_disabled');
      if (membershipCount === 0 && canLogin && !r.login_banned) {
        classifications.push('invisible_login');
      }
      if (r.restricted_to_billing) classifications.push('billing_restricted');

      return {
        id: r.id,
        email: r.email,
        first_name: r.first_name,
        last_name: r.last_name,
        full_name: r.full_name,
        meca_id: r.meca_id,
        account_type: r.account_type,
        role: r.role,
        is_staff: isStaff,
        can_login: canLogin,
        login_banned: r.login_banned,
        membership_count: membershipCount,
        last_seen_at: r.last_seen_at,
        last_login_at: r.last_login_at,
        restricted_to_billing: r.restricted_to_billing,
        created_at: r.created_at,
        classifications,
      };
    });
  }

  async getAuthOrphans(): Promise<AuthOrphanRow[]> {
    let allUsers: Array<{ id: string; email?: string; created_at?: string; last_sign_in_at?: string | null }> = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await this.supabaseAdmin
        .getClient()
        .auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(`Failed to list auth users: ${error.message}`);
      if (!data?.users?.length) break;
      allUsers = allUsers.concat(data.users as any);
      if (data.users.length < perPage) break;
      page++;
      if (page > 20) break;
    }

    if (allUsers.length === 0) return [];

    const em = this.em.fork();
    const conn = em.getConnection();
    const ids = allUsers.map(u => u.id);

    const placeholders = ids.map(() => '?').join(',');
    const existingRows: Array<{ id: string }> = await conn.execute(
      `SELECT "id" FROM "public"."profiles" WHERE "id" IN (${placeholders})`,
      ids,
    );
    const existingIds = new Set(existingRows.map((r: { id: string }) => r.id));

    return allUsers
      .filter(u => !existingIds.has(u.id))
      .map(u => ({
        auth_user_id: u.id,
        email: u.email ?? null,
        created_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
      }));
  }

  async getSummary(): Promise<SecuritySummary> {
    const profiles = await this.getProfilesAudit();
    const orphans = await this.getAuthOrphans().catch(() => []);
    const enforceSetting = await this.siteSettingsService.findByKey(ENFORCE_MEMBERSHIP_KEY);

    return {
      total_profiles: profiles.length,
      profiles_can_login: profiles.filter(p => p.can_login && !p.login_banned).length,
      profiles_without_membership: profiles.filter(p => p.membership_count === 0).length,
      staff_or_admin: profiles.filter(p => p.is_staff).length,
      staff_without_membership: profiles.filter(p => p.is_staff && p.membership_count === 0).length,
      banned: profiles.filter(p => p.login_banned).length,
      auth_orphans: orphans.length,
      enforce_membership_for_login: enforceSetting?.setting_value === 'true',
    };
  }

  /**
   * Provision a profile that has zero memberships into one of three states.
   * The audit page already filters down to that case before calling this, but
   * we re-check here so direct API calls can't bypass it.
   */
  async provisionMembership(
    profileId: string,
    opts: ProvisionOptions,
    actingAdminProfileId: string,
  ): Promise<ProvisionResult> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: profileId });
    if (!profile) {
      throw new NotFoundException(`Profile ${profileId} not found`);
    }

    const existingCount = await em.count(Membership, { user: profileId });
    if (existingCount > 0) {
      throw new BadRequestException(
        `Profile already has ${existingCount} membership(s). Use the regular Members admin tools to add another.`,
      );
    }

    const config = await em.findOne(MembershipTypeConfig, { id: opts.membershipTypeConfigId });
    if (!config) {
      throw new NotFoundException(`Membership type config ${opts.membershipTypeConfigId} not found`);
    }

    // Staff role assignment is gated to protected (super-admin) accounts so
    // that a regular admin cannot use this page to escalate someone else.
    if (opts.staffRole) {
      const actingAdmin = await em.findOne(Profile, { id: actingAdminProfileId });
      if (!isProtectedAccount(actingAdmin)) {
        throw new ForbiddenException(
          'Only protected super-admin accounts can assign staff roles via the security audit page.',
        );
      }
    }

    let result: ProvisionResult;

    switch (opts.mode) {
      case 'active':
        result = await this.provisionActive(em, profile, config, opts);
        break;
      case 'pay_to_activate':
        result = await this.provisionPayToActivate(em, profile, config, opts);
        break;
      case 'inactive':
        result = await this.provisionInactive(em, profile, config, opts);
        break;
      default:
        throw new BadRequestException(`Unknown provision mode: ${opts.mode}`);
    }

    // Apply common profile-level changes after the membership row exists.
    profile.provisioned_by = actingAdminProfileId;
    profile.provisioned_at = new Date();
    if (opts.forcePasswordChange) {
      profile.force_password_change = true;
    }
    if (opts.staffRole === 'admin') {
      profile.is_staff = true;
      profile.role = 'admin' as any;
    } else if (opts.staffRole === 'event_director') {
      profile.role = 'event_director' as any;
      profile.can_apply_event_director = true;
    }
    await em.flush();

    return result;
  }

  /** Mode A — full active membership. Reuses adminAssignMembership. */
  private async provisionActive(
    _em: EntityManager,
    profile: Profile,
    config: MembershipTypeConfig,
    opts: ProvisionOptions,
  ): Promise<ProvisionResult> {
    const membership = await this.membershipsService.adminAssignMembership({
      userId: profile.id,
      membershipTypeConfigId: config.id,
      durationMonths: opts.durationMonths ?? 12,
    });
    return {
      membershipId: membership.id,
      mecaId: membership.mecaId ?? undefined,
      mode: 'active',
      message: `Active membership created. MECA ID ${membership.mecaId ?? '(pending)'}.`,
    };
  }

  /**
   * Mode B — membership exists with PENDING status, an Order + DRAFT Invoice
   * are generated, and the profile is pinned to the billing routes via
   * `restricted_to_billing` until payment clears.
   */
  private async provisionPayToActivate(
    em: EntityManager,
    profile: Profile,
    config: MembershipTypeConfig,
    opts: ProvisionOptions,
  ): Promise<ProvisionResult> {
    const months = opts.durationMonths ?? 12;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    const membership = em.create(Membership, {
      user: em.getReference(Profile, profile.id),
      membershipTypeConfig: config,
      startDate,
      endDate,
      amountPaid: 0,
      paymentStatus: PaymentStatus.PENDING,
      transactionId: `ADMIN-PROV-PEND-${Date.now()}`,
    } as any);
    await em.persistAndFlush(membership);

    // Reuse normal MECA-ID logic so grace-period rules apply (keep old ID if
    // within window, else issue new). The membership is PENDING so the
    // member can't transact yet, but their MECA ID slot is reserved.
    const previousMembership = await this.mecaIdService.findPreviousMembership(
      profile.id, config.category,
    );
    await this.mecaIdService.assignMecaIdToMembership(membership, previousMembership || undefined, em);
    await em.flush();

    const totalAmount = Number(config.price);
    const orderNumber = `ORD-${new Date().getFullYear()}-PROV-${Date.now().toString().slice(-6)}`;
    const order = em.create(Order, {
      orderNumber,
      member: profile,
      status: OrderStatus.PENDING,
      orderType: OrderType.MEMBERSHIP,
      subtotal: totalAmount.toFixed(2),
      tax: '0.00',
      discount: '0.00',
      total: totalAmount.toFixed(2),
      currency: 'USD',
      notes: opts.note,
    });
    const orderItem = em.create(OrderItem, {
      order,
      description: `${config.name} Membership`,
      quantity: 1,
      unitPrice: config.price.toString(),
      total: config.price.toString(),
      itemType: OrderItemType.MEMBERSHIP,
      referenceId: membership.id,
    });
    order.items.add(orderItem);
    await em.persistAndFlush(order);

    const invoiceNumber = `INV-${new Date().getFullYear()}-PROV-${Date.now().toString().slice(-6)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const invoice = em.create(Invoice, {
      invoiceNumber,
      user: profile,
      order,
      status: InvoiceStatus.DRAFT,
      subtotal: totalAmount.toFixed(2),
      tax: '0.00',
      discount: '0.00',
      total: totalAmount.toFixed(2),
      currency: 'USD',
      dueDate,
      notes: opts.note,
    } as any);
    const invItem = em.create(InvoiceItem, {
      invoice,
      description: `${config.name} Membership`,
      quantity: 1,
      unitPrice: config.price.toString(),
      total: config.price.toString(),
      itemType: 'membership' as any,
      referenceId: membership.id,
    } as any);
    invoice.items.add(invItem);
    await em.persistAndFlush(invoice);

    profile.restricted_to_billing = true;
    await em.flush();

    this.logger.log(
      `Provisioned pay-to-activate membership ${membership.id} for profile ${profile.id} ` +
      `(invoice ${invoiceNumber}, total $${totalAmount.toFixed(2)})`,
    );

    return {
      membershipId: membership.id,
      mecaId: membership.mecaId ?? undefined,
      invoiceId: invoice.id,
      invoiceNumber,
      mode: 'pay_to_activate',
      message:
        `Pay-to-activate membership created. ` +
        `Invoice ${invoiceNumber} for $${totalAmount.toFixed(2)} due ${dueDate.toLocaleDateString()}. ` +
        `User is restricted to /billing on next login until paid.`,
    };
  }

  /**
   * Mode C — membership row exists with INACTIVE payment status, profile is
   * locked from logging in. MECA ID is NOT assigned now; if the user later
   * purchases a real membership, the existing meca_id_history grace logic
   * will keep their old ID or issue a new one.
   */
  private async provisionInactive(
    em: EntityManager,
    profile: Profile,
    config: MembershipTypeConfig,
    opts: ProvisionOptions,
  ): Promise<ProvisionResult> {
    const months = opts.durationMonths ?? 12;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    const membership = em.create(Membership, {
      user: em.getReference(Profile, profile.id),
      membershipTypeConfig: config,
      startDate,
      endDate,
      amountPaid: 0,
      paymentStatus: PaymentStatus.INACTIVE,
      transactionId: `ADMIN-PROV-INACT-${Date.now()}`,
    } as any);
    await em.persistAndFlush(membership);

    profile.can_login = false;
    profile.membership_status = 'inactive';
    await em.flush();

    this.logger.log(
      `Provisioned inactive membership ${membership.id} for profile ${profile.id} ` +
      `(can_login=false, no MECA ID assigned)`,
    );

    return {
      membershipId: membership.id,
      mode: 'inactive',
      message:
        `Inactive membership recorded. Profile login disabled. ` +
        `On next purchase, MECA ID grace rules will keep their old ID or assign a new one.`,
    };
  }

  /**
   * Called from the payment fulfillment pipeline when an Invoice transitions
   * to PAID. If the user was provisioned in pay_to_activate mode, this clears
   * the billing-only restriction and bumps the membership to PAID so they
   * regain full access.
   */
  async onInvoicePaid(invoiceId: string): Promise<void> {
    const em = this.em.fork();
    const invoice = await em.findOne(Invoice, { id: invoiceId }, { populate: ['user', 'order'] as any });
    if (!invoice?.user) return;

    const userProfile = invoice.user as any as Profile;
    if (!userProfile.restricted_to_billing) return;

    // Find any pending membership tied to this user and lift it to PAID.
    const pending = await em.find(Membership, {
      user: userProfile.id,
      paymentStatus: PaymentStatus.PENDING,
    });
    for (const m of pending) {
      m.paymentStatus = PaymentStatus.PAID;
      m.amountPaid = Number(invoice.total);
    }

    userProfile.restricted_to_billing = false;
    await em.flush();

    if (pending.length > 0) {
      await this.membershipSyncService.setProfileActive(userProfile.id);
      this.logger.log(
        `Cleared restricted_to_billing and activated ${pending.length} pending membership(s) ` +
        `for user ${userProfile.id} after invoice ${invoice.invoiceNumber} paid.`,
      );
    }
  }

  /**
   * Toggle profiles.can_login. Distinct from ban — used as a softer "we're
   * not letting them in right now" lever, e.g. for Mode-C inactive provisions
   * or accounts on hold pending review.
   */
  async setCanLogin(profileId: string, canLogin: boolean): Promise<void> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: profileId });
    if (!profile) throw new NotFoundException(`Profile ${profileId} not found`);
    profile.can_login = canLogin;
    await em.flush();
  }

  async banProfile(profileId: string, actingAdminProfileId: string, reason?: string): Promise<void> {
    await this.profilesService.bulkLoginControl(actingAdminProfileId, {
      profileIds: [profileId],
      action: 'ban',
      reason,
    });
  }

  async unbanProfile(profileId: string, actingAdminProfileId: string): Promise<void> {
    await this.profilesService.bulkLoginControl(actingAdminProfileId, {
      profileIds: [profileId],
      action: 'unban',
    });
  }

  async deleteProfile(profileId: string): Promise<{ success: boolean; message: string }> {
    return this.profilesService.deleteUserCompletelyById(profileId);
  }

  async isEnforcementEnabled(): Promise<boolean> {
    const setting = await this.siteSettingsService.findByKey(ENFORCE_MEMBERSHIP_KEY);
    return setting?.setting_value === 'true';
  }

  async setEnforcement(enabled: boolean, updatedBy: string): Promise<{ enabled: boolean }> {
    await this.siteSettingsService.upsert(
      ENFORCE_MEMBERSHIP_KEY,
      enabled ? 'true' : 'false',
      'boolean',
      'When true, login is rejected for any profile with zero memberships',
      updatedBy,
    );
    return { enabled };
  }

  async profileHasMembership(profileId: string): Promise<boolean> {
    const em = this.em.fork();
    const count = await em.count(Membership, { user: profileId });
    return count > 0;
  }
}
