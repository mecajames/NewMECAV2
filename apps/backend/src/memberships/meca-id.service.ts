import { Injectable, Inject, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Membership } from './memberships.entity';
import { MecaIdHistory } from './meca-id-history.entity';
import { Profile } from '../profiles/profiles.entity';
import { UserRole, MembershipCategory, PaymentStatus } from '@newmeca/shared';

/**
 * Service for managing MECA ID assignment and lifecycle.
 *
 * MECA IDs are unique identifiers assigned to:
 * 1. Memberships (competitors, retailers, manufacturers)
 * 2. Profiles with special roles (Event Directors, Judges)
 *
 * Rules:
 * - IDs start at 700500
 * - Each membership gets its own MECA ID
 * - A user can have multiple memberships, each with different MECA IDs
 * - Grace period reactivation window: Renewing within the grace period keeps the same ID
 * - After the grace period, a new MECA ID is assigned
 */
@Injectable()
export class MecaIdService {
  private readonly logger = new Logger(MecaIdService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager
  ) {}

  /**
   * Get the next available MECA ID atomically from the database.
   * Uses a database function for thread-safe ID generation.
   */
  async getNextMecaId(): Promise<number> {
    const em = this.em.fork();
    const connection = em.getConnection();
    const result = await connection.execute('SELECT get_next_meca_id() as get_next_meca_id');
    return result[0].get_next_meca_id;
  }

  // MECA ID grace tiers (see docs/features/MEMBERSHIP_LIFECYCLE.md §3)
  static readonly GRACE_SOFT_DAYS = 30;          // days 1-30  : silent reclaim
  static readonly GRACE_MEDIUM_DAYS = 37;        // days 31-37 : silent reclaim + internal flag
  static readonly GRACE_ADMIN_DAYS = 45;         // days 38-45 : no self reclaim; admin may reassign

  /**
   * Assign a MECA ID to a membership.
   * Handles tiered grace-period reactivation for renewals:
   *   - days 1-30  → silent reclaim
   *   - days 31-37 → silent reclaim, flagged on history
   *   - days 38+   → new ID issued (admin can reassign later)
   *
   * @param membership The membership to assign a MECA ID to
   * @param previousMembership Optional previous membership for renewal tracking
   * @param callerEm Optional EntityManager from the caller to ensure proper context
   * @returns The assigned MECA ID
   */
  async assignMecaIdToMembership(
    membership: Membership,
    previousMembership?: Membership,
    callerEm?: EntityManager
  ): Promise<number> {
    // Use caller's EM if provided, otherwise fork our own
    const em = callerEm || this.em.fork();

    if (previousMembership?.mecaId && previousMembership.endDate) {
      const daysSinceExpiry = this.getDaysSinceExpiry(previousMembership.endDate);

      // Reclaim only within soft + medium windows (1-37 days). The 38-45
      // admin-extension band still preserves history but does NOT reclaim
      // automatically — an admin must call reassignMecaId() to reattach.
      if (daysSinceExpiry <= MecaIdService.GRACE_MEDIUM_DAYS) {
        const mecaId = previousMembership.mecaId;
        membership.mecaId = mecaId;
        membership.cardCreatedAt = new Date();

        const tier = daysSinceExpiry <= MecaIdService.GRACE_SOFT_DAYS ? 'soft' : 'medium';
        await this.recordReactivation(mecaId, membership, previousMembership.endDate, em, tier);

        this.logger.log(
          `Reactivated MECA ID ${mecaId} for membership ${membership.id} (${daysSinceExpiry.toFixed(1)} days, ${tier} tier)`
        );

        return mecaId;
      }
    }

    // Assign new MECA ID
    this.logger.log(`Getting next MECA ID for membership ${membership.id}`);
    const newMecaId = await this.getNextMecaId();
    this.logger.log(`Got MECA ID ${newMecaId}, assigning to membership ${membership.id}`);
    membership.mecaId = newMecaId;

    // Auto-create membership card when MECA ID is assigned
    membership.cardCreatedAt = new Date();

    // Create history record
    this.logger.log(`Creating history record for MECA ID ${newMecaId}`);
    await this.createHistoryRecord(newMecaId, membership, em);

    this.logger.log(`Assigned new MECA ID ${newMecaId} to membership ${membership.id}`);

    return newMecaId;
  }

  /**
   * Assign a MECA ID to a profile (for role-based users like Event Directors, Judges).
   *
   * @param profile The profile to assign a MECA ID to
   * @returns The assigned MECA ID
   */
  async assignMecaIdToProfile(profile: Profile): Promise<number> {
    // Check if profile already has a MECA ID
    if (profile.meca_id) {
      const existingId = parseInt(profile.meca_id, 10);
      if (!isNaN(existingId)) {
        return existingId;
      }
    }

    // Only assign to special roles
    const specialRoles = [UserRole.EVENT_DIRECTOR, UserRole.JUDGE, UserRole.ADMIN];
    if (!profile.role || !specialRoles.includes(profile.role as UserRole)) {
      throw new Error(`Cannot assign MECA ID to profile with role: ${profile.role}`);
    }

    // Generate new MECA ID
    const newMecaId = await this.getNextMecaId();
    profile.meca_id = newMecaId.toString();

    // Create history record for profile
    const history = new MecaIdHistory();
    history.mecaId = newMecaId;
    history.profile = profile;
    history.assignedAt = new Date();
    history.notes = `Assigned to profile for role: ${profile.role}`;

    await this.em.persistAndFlush(history);

    this.logger.log(`Assigned MECA ID ${newMecaId} to profile ${profile.id} (role: ${profile.role})`);

    return newMecaId;
  }

  /**
   * Find a previous EXPIRED membership for the same user that could be renewed.
   * Used to check grace period reactivation window.
   *
   * @param userId The user's ID
   * @param category The membership category to look for
   * @returns The most recent expired membership, if any
   */
  async findPreviousMembership(
    userId: string,
    category: MembershipCategory
  ): Promise<Membership | null> {
    const em = this.em.fork();

    const memberships = await em.find(
      Membership,
      {
        user: userId,
        paymentStatus: PaymentStatus.PAID,
        membershipTypeConfig: { category },
        endDate: { $lt: new Date() }, // Expired
      },
      {
        populate: ['membershipTypeConfig'],
        orderBy: { endDate: 'DESC' },
        limit: 1,
      }
    );

    return memberships[0] || null;
  }

  /**
   * Find the most recent paid membership for a user in a category, whether
   * active or expired. Used to compute renewal date math which must
   * distinguish:
   *   - active early-renew  → extend from existing endDate
   *   - expired-in-grace    → extend from previous endDate
   *   - long-expired        → fresh 365-day term from renewal date
   */
  async findMostRecentMembership(
    userId: string,
    category: MembershipCategory,
  ): Promise<Membership | null> {
    const em = this.em.fork();
    const memberships = await em.find(
      Membership,
      {
        user: userId,
        paymentStatus: PaymentStatus.PAID,
        membershipTypeConfig: { category },
      },
      {
        populate: ['membershipTypeConfig'],
        orderBy: { endDate: 'DESC' },
        limit: 1,
      },
    );
    return memberships[0] || null;
  }

  /**
   * Authoritative renewal end_date computation per
   * docs/features/MEMBERSHIP_LIFECYCLE.md §2.
   *
   * @param previous The most recent membership in the same category (may be active or expired)
   * @returns The new membership's end_date
   */
  computeRenewalEndDate(previous?: Membership | null): Date {
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    if (!previous?.endDate) {
      return new Date(Date.now() + ONE_YEAR_MS);
    }
    const now = Date.now();
    const prevEnd = previous.endDate.getTime();

    // Active early-renew: previous still in term → extend from prev endDate
    if (prevEnd >= now) {
      return new Date(prevEnd + ONE_YEAR_MS);
    }

    // Expired: within MECA ID grace (1-45 days) → extend from prev endDate (A1)
    const daysSinceExpiry = (now - prevEnd) / (1000 * 60 * 60 * 24);
    if (daysSinceExpiry <= MecaIdService.GRACE_ADMIN_DAYS) {
      return new Date(prevEnd + ONE_YEAR_MS);
    }

    // Past 45-day grace → fresh 365-day term from renewal date
    return new Date(now + ONE_YEAR_MS);
  }

  /**
   * Get all MECA IDs for a user across all their memberships.
   *
   * @param userId The user's ID
   * @returns Array of membership info with MECA IDs
   */
  async getUserMecaIds(userId: string): Promise<
    Array<{
      mecaId: number;
      membershipId: string;
      category: MembershipCategory;
      competitorName: string;
      isActive: boolean;
      startDate: Date;
      endDate?: Date;
    }>
  > {
    const em = this.em.fork();

    const memberships = await em.find(
      Membership,
      {
        user: userId,
        mecaId: { $ne: null },
        paymentStatus: PaymentStatus.PAID,
      },
      {
        populate: ['membershipTypeConfig'],
        orderBy: { createdAt: 'ASC' },
      }
    );

    const now = new Date();

    return memberships.map((m) => ({
      mecaId: m.mecaId!,
      membershipId: m.id,
      category: m.membershipTypeConfig.category,
      competitorName: m.getCompetitorDisplayName(),
      isActive: !m.endDate || m.endDate > now,
      startDate: m.startDate,
      endDate: m.endDate,
    }));
  }

  /**
   * Get MECA ID history for a specific MECA ID.
   *
   * @param mecaId The MECA ID to look up
   * @returns Array of history records
   */
  async getMecaIdHistory(mecaId: number): Promise<MecaIdHistory[]> {
    const em = this.em.fork();

    return em.find(
      MecaIdHistory,
      { mecaId },
      {
        populate: ['membership', 'profile'],
        orderBy: { assignedAt: 'DESC' },
      }
    );
  }

  /**
   * Get all MECA ID history for admin dashboard.
   *
   * @param limit Number of records to return
   * @param offset Offset for pagination
   * @returns Array of history records with related data
   */
  async getAllMecaIdHistory(
    limit: number = 50,
    offset: number = 0
  ): Promise<{ items: MecaIdHistory[]; total: number }> {
    const em = this.em.fork();

    const [items, total] = await em.findAndCount(
      MecaIdHistory,
      {},
      {
        populate: ['membership', 'membership.user', 'membership.membershipTypeConfig', 'profile'],
        orderBy: { assignedAt: 'DESC' },
        limit,
        offset,
      }
    );

    return { items, total };
  }

  /**
   * Tiered reclaim eligibility for a previous membership's MECA ID.
   *
   * Tiers:
   *   - 'active'           : membership not yet expired
   *   - 'soft' (1-30d)     : silent reclaim on renewal
   *   - 'medium' (31-37d)  : silent reclaim on renewal (internal flag)
   *   - 'admin' (38-45d)   : member is told they'll get a new ID; admin can reassign
   *   - 'expired' (46d+)   : MECA ID permanently retired
   *
   * `daysRemaining` is computed against the member-facing 30-day window so
   * any UI that surfaces this number always shows the same headline the
   * member sees in their renewal emails.
   */
  checkReactivationEligibility(membership: Membership): {
    tier: 'active' | 'soft' | 'medium' | 'admin' | 'expired';
    canSelfReclaim: boolean;
    canAdminReclaim: boolean;
    daysSinceExpiry: number;
    daysRemaining: number;
  } {
    if (!membership.endDate) {
      return { tier: 'active', canSelfReclaim: false, canAdminReclaim: false, daysSinceExpiry: 0, daysRemaining: 0 };
    }
    const daysSinceExpiry = this.getDaysSinceExpiry(membership.endDate);
    if (daysSinceExpiry <= 0) {
      return { tier: 'active', canSelfReclaim: true, canAdminReclaim: true, daysSinceExpiry: 0, daysRemaining: MecaIdService.GRACE_SOFT_DAYS };
    }
    const daysRemainingPublic = Math.max(0, Math.floor(MecaIdService.GRACE_SOFT_DAYS - daysSinceExpiry));
    if (daysSinceExpiry <= MecaIdService.GRACE_SOFT_DAYS) {
      return { tier: 'soft', canSelfReclaim: true, canAdminReclaim: true, daysSinceExpiry: Math.floor(daysSinceExpiry), daysRemaining: daysRemainingPublic };
    }
    if (daysSinceExpiry <= MecaIdService.GRACE_MEDIUM_DAYS) {
      return { tier: 'medium', canSelfReclaim: true, canAdminReclaim: true, daysSinceExpiry: Math.floor(daysSinceExpiry), daysRemaining: 0 };
    }
    if (daysSinceExpiry <= MecaIdService.GRACE_ADMIN_DAYS) {
      return { tier: 'admin', canSelfReclaim: false, canAdminReclaim: true, daysSinceExpiry: Math.floor(daysSinceExpiry), daysRemaining: 0 };
    }
    return { tier: 'expired', canSelfReclaim: false, canAdminReclaim: false, daysSinceExpiry: Math.floor(daysSinceExpiry), daysRemaining: 0 };
  }

  /**
   * Admin-only manual MECA ID reassignment (days 38+ scenarios, support cases).
   *
   * Reassigns a historical MECA ID to a target membership. Required when:
   *   - Member renewed in the 38-45 day window and was issued a new ID, but
   *     James/Mick decide to restore their original.
   *   - Other support edge cases (data merges, etc.).
   *
   * Logs the operation to MecaIdHistory with the supplied reason.
   */
  async reassignMecaId(
    mecaId: number,
    targetMembershipId: string,
    adminId: string,
    reason: string,
  ): Promise<void> {
    if (!reason || !reason.trim()) {
      throw new Error('A reason is required for admin MECA ID reassignment');
    }
    const em = this.em.fork();
    const target = await em.findOneOrFail(Membership, { id: targetMembershipId });
    const previousIdOnTarget = target.mecaId;
    target.mecaId = mecaId;
    target.cardCreatedAt = new Date();

    const history = new MecaIdHistory();
    history.mecaId = mecaId;
    history.membership = target;
    history.assignedAt = new Date();
    history.reactivatedAt = new Date();
    history.notes = `Admin reassignment by ${adminId}. Previous ID on this membership: ${previousIdOnTarget ?? 'none'}. Reason: ${reason.trim()}`;
    em.persist(history);

    await em.flush();
    this.logger.log(`Admin ${adminId} reassigned MECA ID ${mecaId} → membership ${targetMembershipId}`);
  }

  /**
   * Mark a MECA ID as expired in history.
   *
   * @param membership The membership whose MECA ID expired
   */
  async markMecaIdExpired(membership: Membership): Promise<void> {
    if (!membership.mecaId) return;

    const em = this.em.fork();

    // Find the active history record
    const history = await em.findOne(MecaIdHistory, {
      mecaId: membership.mecaId,
      membership: membership.id,
      expiredAt: null,
    });

    if (history) {
      history.expiredAt = new Date();
      await em.flush();

      this.logger.log(`Marked MECA ID ${membership.mecaId} as expired for membership ${membership.id}`);
    }
  }

  /**
   * Get points-eligible MECA IDs for a user.
   * Only Competitor, Retailer, and Manufacturer memberships are eligible for points.
   *
   * @param userId The user's ID
   * @returns Array of active MECA IDs eligible for points
   */
  async getPointsEligibleMecaIds(userId: string): Promise<number[]> {
    const em = this.em.fork();

    const now = new Date();
    const pointsEligibleCategories = [
      MembershipCategory.COMPETITOR,
      MembershipCategory.RETAIL,
      MembershipCategory.MANUFACTURER,
    ];

    const memberships = await em.find(
      Membership,
      {
        user: userId,
        mecaId: { $ne: null },
        paymentStatus: PaymentStatus.PAID,
        membershipTypeConfig: { category: { $in: pointsEligibleCategories } },
        $or: [{ endDate: null }, { endDate: { $gt: now } }],
      },
      {
        populate: ['membershipTypeConfig'],
      }
    );

    return memberships.map((m) => m.mecaId!);
  }

  // Private helper methods

  private getDaysSinceExpiry(endDate: Date): number {
    const now = new Date();
    return (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);
  }

  private async createHistoryRecord(mecaId: number, membership: Membership, em: EntityManager): Promise<void> {
    try {
      this.logger.log(`Creating history record for MECA ID ${mecaId}, membership ${membership.id}`);
      const history = new MecaIdHistory();
      history.mecaId = mecaId;
      // Use the membership object directly since it's managed by the same EM
      history.membership = membership;
      history.assignedAt = new Date();
      history.notes = 'New MECA ID assigned';

      // Just persist, don't flush - let the caller control when to flush
      em.persist(history);
      this.logger.log(`History record created successfully for MECA ID ${mecaId}`);
    } catch (error) {
      this.logger.error(`Failed to create history record for MECA ID ${mecaId}:`, error);
      throw error;
    }
  }

  private async recordReactivation(
    mecaId: number,
    membership: Membership,
    previousEndDate: Date,
    em: EntityManager,
    tier: 'soft' | 'medium' = 'soft',
  ): Promise<void> {
    const tierNote = `tier=${tier} (prev end ${previousEndDate.toISOString().split('T')[0]})`;
    const existingHistory = await em.findOne(MecaIdHistory, {
      mecaId,
      membership: { user: membership.user },
    });

    if (existingHistory) {
      existingHistory.reactivatedAt = new Date();
      existingHistory.previousEndDate = previousEndDate;
      existingHistory.notes = `Reactivated within grace period — ${tierNote}`;
      await em.flush();
    } else {
      const history = new MecaIdHistory();
      history.mecaId = mecaId;
      history.membership = membership;
      history.assignedAt = new Date();
      history.reactivatedAt = new Date();
      history.previousEndDate = previousEndDate;
      history.notes = `Reactivated MECA ID within grace period — ${tierNote}`;
      em.persist(history);
    }
  }
}
