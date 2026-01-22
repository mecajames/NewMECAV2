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

    const result = {
      activated: activateResult.affectedRows || 0,
      expired: expireResult.affectedRows || 0,
    };

    this.logger.log(`Manual sync complete: ${result.activated} activated, ${result.expired} expired`);
    return result;
  }
}
