import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/core';
import { MembershipStatus, PaymentStatus } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { Membership } from './memberships.entity';

/**
 * Service responsible for keeping profile.membership_status in sync with actual membership data.
 *
 * The memberships table is the source of truth for membership expiration dates.
 * This service ensures the denormalized profile.membership_status field stays accurate.
 */
@Injectable()
export class MembershipSyncService {
  private readonly logger = new Logger(MembershipSyncService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Update a profile's membership_status to ACTIVE.
   * Called when a membership is created or payment is completed.
   */
  async setProfileActive(userId: string): Promise<void> {
    const em = this.em.fork();

    try {
      const profile = await em.findOne(Profile, { id: userId });
      if (profile && profile.membership_status !== MembershipStatus.ACTIVE) {
        profile.membership_status = MembershipStatus.ACTIVE;
        await em.flush();
        this.logger.log(`Set profile ${userId} membership_status to ACTIVE`);
      }
    } catch (error) {
      this.logger.error(`Failed to set profile ${userId} to ACTIVE:`, error);
    }
  }

  /**
   * Update a profile's membership_status based on their actual memberships.
   * Sets to ACTIVE if they have any active (non-expired, paid) membership.
   * Sets to EXPIRED if all their memberships have expired.
   * Leaves as NONE if they have no memberships.
   */
  async syncProfileMembershipStatus(userId: string): Promise<void> {
    const em = this.em.fork();

    try {
      const profile = await em.findOne(Profile, { id: userId });
      if (!profile) return;

      // Check if user has any active membership
      const activeMembership = await em.findOne(Membership, {
        user: userId,
        paymentStatus: PaymentStatus.PAID,
        $or: [
          { endDate: { $gte: new Date() } },
          { endDate: null },
        ],
      });

      if (activeMembership) {
        if (profile.membership_status !== MembershipStatus.ACTIVE) {
          profile.membership_status = MembershipStatus.ACTIVE;
          await em.flush();
          this.logger.log(`Synced profile ${userId} to ACTIVE`);
        }
      } else {
        // Check if they have any memberships at all (to distinguish EXPIRED from NONE)
        const anyMembership = await em.findOne(Membership, { user: userId });

        const newStatus = anyMembership ? MembershipStatus.EXPIRED : MembershipStatus.NONE;
        if (profile.membership_status !== newStatus) {
          profile.membership_status = newStatus;
          await em.flush();
          this.logger.log(`Synced profile ${userId} to ${newStatus}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to sync profile ${userId} membership status:`, error);
    }
  }

  /**
   * Scheduled job to sync all membership statuses.
   * Runs daily at 1:00 AM to catch expired memberships.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async syncAllMembershipStatuses(): Promise<void> {
    this.logger.log('Starting daily membership status sync...');

    try {
      const result = await this.triggerDailySync();
      this.logger.log(`Daily sync complete: ${result.activated} activated, ${result.expired} expired`);
    } catch (error) {
      this.logger.error('Daily membership sync failed:', error);
    }
  }

  /**
   * Manual trigger for the daily sync (for testing or admin use).
   */
  async triggerDailySync(): Promise<{ activated: number; expired: number }> {
    this.logger.log('Manual membership status sync triggered');
    const em = this.em.fork();
    const connection = em.getConnection();

    // Update to ACTIVE
    const activateResult = await connection.execute(`
      UPDATE profiles p
      SET
        membership_status = 'active',
        updated_at = NOW()
      WHERE p.membership_status != 'active'
        AND EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.user_id = p.id
            AND m.payment_status = 'paid'
            AND (m.end_date >= CURRENT_DATE OR m.end_date IS NULL)
        )
    `);

    // Update to EXPIRED
    const expireResult = await connection.execute(`
      UPDATE profiles p
      SET
        membership_status = 'expired',
        updated_at = NOW()
      WHERE p.membership_status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.user_id = p.id
            AND m.payment_status = 'paid'
            AND (m.end_date >= CURRENT_DATE OR m.end_date IS NULL)
        )
        AND EXISTS (
          SELECT 1 FROM memberships m WHERE m.user_id = p.id
        )
    `);

    // Invalidate MECA IDs for memberships expired > 45 days (hard cutoff)
    // The MECA ID stays on the profile for historical reference but is marked as invalidated
    const invalidateResult = await connection.execute(`
      UPDATE profiles p
      SET
        meca_id_invalidated_at = NOW(),
        updated_at = NOW()
      WHERE p.meca_id IS NOT NULL
        AND p.meca_id_invalidated_at IS NULL
        AND p.membership_status = 'expired'
        AND NOT EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.user_id = p.id
            AND m.payment_status = 'paid'
            AND (m.end_date >= CURRENT_DATE OR m.end_date IS NULL)
        )
        AND EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.user_id = p.id
            AND m.payment_status = 'paid'
            AND m.end_date < CURRENT_DATE - INTERVAL '45 days'
        )
        AND NOT EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.user_id = p.id
            AND m.payment_status = 'paid'
            AND m.end_date >= CURRENT_DATE - INTERVAL '45 days'
        )
    `);

    const invalidated = invalidateResult.affectedRows || 0;
    if (invalidated > 0) {
      this.logger.warn(`MECA ID INVALIDATION: ${invalidated} MECA IDs permanently invalidated (expired > 45 days)`);
    }

    // For results that were held for renewal and the grace period has passed (45+ days),
    // permanently strip the MECA ID from those results (results stay visible, just no ID or points)
    const stripResult = await connection.execute(`
      UPDATE competition_results cr
      SET
        meca_id = NULL,
        points_earned = 0,
        points_held_for_renewal = false,
        notes = COALESCE(notes, '') || ' | Grace period expired: MECA ID removed'
      WHERE cr.points_held_for_renewal = true
        AND cr.held_at IS NOT NULL
        AND cr.held_at < CURRENT_DATE - INTERVAL '45 days'
    `);

    const stripped = stripResult.affectedRows || 0;
    if (stripped > 0) {
      this.logger.warn(`HELD RESULTS EXPIRED: ${stripped} held results had MECA ID permanently removed (grace period expired)`);
    }

    const result = {
      activated: activateResult.affectedRows || 0,
      expired: expireResult.affectedRows || 0,
      invalidated,
      heldResultsExpired: stripped,
    };

    this.logger.log(`Manual sync complete: ${result.activated} activated, ${result.expired} expired, ${result.invalidated} MECA IDs invalidated, ${result.heldResultsExpired} held results expired`);
    return result;
  }
}
