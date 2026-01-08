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
 * - 90-day reactivation window: Renewing within 90 days keeps the same ID
 * - After 90 days, a new MECA ID is assigned
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

  /**
   * Assign a MECA ID to a membership.
   * Handles 90-day reactivation window for renewals.
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

    // Check if this is a renewal within 90-day window
    if (previousMembership?.mecaId && previousMembership.endDate) {
      const daysSinceExpiry = this.getDaysSinceExpiry(previousMembership.endDate);

      if (daysSinceExpiry <= 90) {
        // Reactivate the same MECA ID
        const mecaId = previousMembership.mecaId;
        membership.mecaId = mecaId;

        // Update history to mark reactivation
        await this.recordReactivation(mecaId, membership, previousMembership.endDate, em);

        this.logger.log(
          `Reactivated MECA ID ${mecaId} for membership ${membership.id} (${daysSinceExpiry.toFixed(1)} days since expiry)`
        );

        return mecaId;
      }
    }

    // Assign new MECA ID
    this.logger.log(`Getting next MECA ID for membership ${membership.id}`);
    const newMecaId = await this.getNextMecaId();
    this.logger.log(`Got MECA ID ${newMecaId}, assigning to membership ${membership.id}`);
    membership.mecaId = newMecaId;

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
   * Find a previous membership for the same user that could be renewed.
   * Used to check 90-day reactivation window.
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
   * Check if a membership's MECA ID can be reactivated.
   *
   * @param membership The membership to check
   * @returns Object with canReactivate flag and days since expiry
   */
  checkReactivationEligibility(membership: Membership): {
    canReactivate: boolean;
    daysSinceExpiry: number;
    daysRemaining: number;
  } {
    if (!membership.endDate) {
      return { canReactivate: false, daysSinceExpiry: 0, daysRemaining: 0 };
    }

    const daysSinceExpiry = this.getDaysSinceExpiry(membership.endDate);
    const daysRemaining = Math.max(0, 90 - daysSinceExpiry);

    return {
      canReactivate: daysSinceExpiry <= 90,
      daysSinceExpiry: Math.floor(daysSinceExpiry),
      daysRemaining: Math.floor(daysRemaining),
    };
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
    em: EntityManager
  ): Promise<void> {
    // Update existing history record or create new one
    const existingHistory = await em.findOne(MecaIdHistory, {
      mecaId,
      membership: { user: membership.user },
    });

    if (existingHistory) {
      existingHistory.reactivatedAt = new Date();
      existingHistory.previousEndDate = previousEndDate;
      existingHistory.notes = `Reactivated within 90-day window (previous end: ${previousEndDate.toISOString().split('T')[0]})`;
      await em.flush();
    } else {
      // Create new history record for reactivation
      const history = new MecaIdHistory();
      history.mecaId = mecaId;
      // Use the membership object directly since it's managed by the same EM
      history.membership = membership;
      history.assignedAt = new Date();
      history.reactivatedAt = new Date();
      history.previousEndDate = previousEndDate;
      history.notes = 'Reactivated MECA ID within 90-day window';

      // Just persist, don't flush - let the caller control when to flush
      em.persist(history);
    }
  }
}
