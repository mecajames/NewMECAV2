import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { WorldFinalsQualification } from './world-finals-qualification.entity';
import { Season } from '../seasons/seasons.entity';
import { Profile } from '../profiles/profiles.entity';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { Notification } from '../notifications/notifications.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class WorldFinalsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Check if a competitor has qualified for World Finals in a specific class
   * based on their accumulated points for that class in the season.
   * If they just crossed the threshold, create a qualification record and send notifications.
   */
  async checkAndUpdateQualification(
    mecaId: number,
    competitorName: string,
    userId: string | null,
    seasonId: string,
    competitionClass: string,
  ): Promise<WorldFinalsQualification | null> {
    const em = this.em.fork();

    // Get the season and check if it has a qualification threshold
    const season = await em.findOne(Season, { id: seasonId });
    if (!season || !season.qualificationPointsThreshold) {
      return null; // No threshold set for this season
    }

    const threshold = season.qualificationPointsThreshold;

    // Calculate total points for this competitor in this class for this season
    const results = await em.find(CompetitionResult, {
      mecaId: mecaId.toString(),
      season: seasonId,
      competitionClass: competitionClass,
    });

    const totalPoints = results.reduce((sum, r) => sum + (r.pointsEarned || 0), 0);

    // Check if they meet the threshold
    if (totalPoints < threshold) {
      return null; // Not qualified yet in this class
    }

    // Check if they already have a qualification record for this class
    const existingQualification = await em.findOne(WorldFinalsQualification, {
      season: seasonId,
      mecaId,
      competitionClass,
    });

    if (existingQualification) {
      // Update their total points
      existingQualification.totalPoints = totalPoints;
      await em.flush();
      return existingQualification;
    }

    // Create new qualification record - they just crossed the threshold in this class!
    const qualification = em.create(WorldFinalsQualification, {
      season: seasonId,
      mecaId,
      competitorName,
      competitionClass,
      user: userId || undefined,
      totalPoints,
      qualifiedAt: new Date(),
    } as any);

    em.persist(qualification);

    // Send in-app notification if we have a user ID
    if (userId) {
      await this.sendQualificationNotification(em, qualification, userId, season, competitionClass);
    }

    // Send email notification
    await this.sendQualificationEmail(em, qualification, season, competitionClass);

    await em.flush();

    return qualification;
  }

  /**
   * Send in-app notification when competitor qualifies in a class
   * @param em - The EntityManager to use (must be the same one managing qualification)
   */
  private async sendQualificationNotification(
    em: EntityManager,
    qualification: WorldFinalsQualification,
    userId: string,
    season: Season,
    competitionClass: string,
  ): Promise<void> {
    const notification = em.create(Notification, {
      user: userId,
      title: `Congratulations! You've Qualified for World Finals in ${competitionClass}!`,
      message: `You have earned ${qualification.totalPoints} points in ${competitionClass} during the ${season.name}, meeting the ${season.qualificationPointsThreshold}-point qualification threshold for MECA World Finals! Stay tuned for your exclusive pre-registration invitation.`,
      type: 'system',
      link: '/my-meca?tab=analytics',
    } as any);

    em.persist(notification);

    // Update qualification record (will be flushed by caller)
    qualification.notificationSent = true;
    qualification.notificationSentAt = new Date();
  }

  /**
   * Send email notification when competitor qualifies in a class
   * @param em - The EntityManager to use (must be the same one managing qualification)
   */
  private async sendQualificationEmail(
    em: EntityManager,
    qualification: WorldFinalsQualification,
    season: Season,
    competitionClass: string,
  ): Promise<void> {
    // Get user profile for email
    let email: string | undefined;
    let firstName: string | undefined;

    if (qualification.user) {
      const userId = (qualification.user as any).id || qualification.user;
      const profile = await em.findOne(Profile, { id: userId });
      if (profile) {
        email = profile.email;
        firstName = profile.first_name || qualification.competitorName.split(' ')[0];
      }
    }

    if (!email) {
      console.log(`[WorldFinals] No email found for MECA ID ${qualification.mecaId} - skipping email notification`);
      return;
    }

    try {
      await this.emailService.sendEmail({
        to: email,
        subject: `Congratulations! You've Qualified for MECA World Finals in ${competitionClass}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Congratulations, ${firstName}!</h1>

            <p style="font-size: 18px; color: #333;">
              You have officially qualified for the <strong>MECA World Finals</strong> in <strong>${competitionClass}</strong>!
            </p>

            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; color: white; margin: 20px 0;">
              <h2 style="margin: 0 0 10px 0;">Your Achievement</h2>
              <p style="margin: 0; font-size: 24px;"><strong>${qualification.totalPoints} Points</strong></p>
              <p style="margin: 5px 0 0 0;">in ${competitionClass}</p>
              <p style="margin: 5px 0 0 0; font-size: 14px;">${season.name}</p>
            </div>

            <p style="color: #333;">
              By earning ${qualification.totalPoints} points in ${competitionClass}, you have met the ${season.qualificationPointsThreshold}-point
              threshold required to compete at the highest level of car audio competition.
            </p>

            <h3 style="color: #1a1a2e;">What's Next?</h3>
            <ul style="color: #333;">
              <li>You will receive an exclusive pre-registration invitation for World Finals</li>
              <li>Pre-registration gives you priority access before general registration opens</li>
              <li>Keep competing to qualify in more classes!</li>
            </ul>

            <p style="color: #333;">
              View your competition stats and track your progress on your
              <a href="https://mecacaraudio.com/my-meca" style="color: #667eea;">MyMECA Dashboard</a>.
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="color: #666; font-size: 12px;">
              Mobile Electronics Competition Association<br>
              <a href="https://mecacaraudio.com" style="color: #667eea;">mecacaraudio.com</a>
            </p>
          </div>
        `,
      });

      // Update qualification record (will be flushed by caller)
      qualification.emailSent = true;
      qualification.emailSentAt = new Date();
    } catch (error) {
      console.error(`[WorldFinals] Failed to send qualification email to ${email}:`, error);
    }
  }

  /**
   * Get all qualifications for a season
   */
  async getSeasonQualifications(seasonId: string): Promise<WorldFinalsQualification[]> {
    const em = this.em.fork();
    return em.find(
      WorldFinalsQualification,
      { season: seasonId },
      {
        populate: ['user', 'season'],
        orderBy: { competitionClass: 'ASC', totalPoints: 'DESC' },
      }
    );
  }

  /**
   * Get all qualifications for the current season
   */
  async getCurrentSeasonQualifications(): Promise<WorldFinalsQualification[]> {
    const em = this.em.fork();

    const currentSeason = await em.findOne(Season, { isCurrent: true });
    if (!currentSeason) {
      return [];
    }

    return this.getSeasonQualifications(currentSeason.id);
  }

  /**
   * Check if a MECA ID is qualified for a season in a specific class
   */
  async isQualified(mecaId: number, seasonId: string, competitionClass?: string): Promise<boolean> {
    const em = this.em.fork();

    const criteria: any = {
      season: seasonId,
      mecaId,
    };

    if (competitionClass) {
      criteria.competitionClass = competitionClass;
    }

    const qualification = await em.findOne(WorldFinalsQualification, criteria);
    return !!qualification;
  }

  /**
   * Get qualification statuses for multiple MECA IDs (for leaderboard)
   * Returns a map of mecaId -> array of classes they're qualified in
   */
  async getQualificationStatuses(
    mecaIds: number[],
    seasonId: string
  ): Promise<Map<number, string[]>> {
    const em = this.em.fork();

    const qualifications = await em.find(WorldFinalsQualification, {
      season: seasonId,
      mecaId: { $in: mecaIds },
    });

    const statusMap = new Map<number, string[]>();
    mecaIds.forEach(id => statusMap.set(id, []));

    qualifications.forEach(q => {
      const existing = statusMap.get(q.mecaId) || [];
      existing.push(q.competitionClass);
      statusMap.set(q.mecaId, existing);
    });

    return statusMap;
  }

  /**
   * Send World Finals pre-registration invitation to a qualified competitor
   */
  async sendInvitation(qualificationId: string): Promise<WorldFinalsQualification> {
    const em = this.em.fork();

    const qualification = await em.findOne(WorldFinalsQualification, { id: qualificationId }, {
      populate: ['user', 'season'],
    });

    if (!qualification) {
      throw new NotFoundException(`Qualification with ID ${qualificationId} not found`);
    }

    // Generate unique invitation token
    const token = randomUUID();
    qualification.invitationToken = token;
    qualification.invitationSent = true;
    qualification.invitationSentAt = new Date();

    await em.flush();

    // Send invitation email
    await this.sendInvitationEmail(qualification);

    return qualification;
  }

  /**
   * Send invitation email with registration link
   */
  private async sendInvitationEmail(qualification: WorldFinalsQualification): Promise<void> {
    const em = this.em.fork();

    let email: string | undefined;
    let firstName: string | undefined;

    if (qualification.user) {
      const profile = await em.findOne(Profile, { id: (qualification.user as any).id || qualification.user });
      if (profile) {
        email = profile.email;
        firstName = profile.first_name || qualification.competitorName.split(' ')[0];
      }
    }

    if (!email) {
      console.log(`[WorldFinals] No email found for MECA ID ${qualification.mecaId} - skipping invitation email`);
      return;
    }

    const season = qualification.season;
    const registrationUrl = `https://mecacaraudio.com/world-finals/register?token=${qualification.invitationToken}`;

    try {
      await this.emailService.sendEmail({
        to: email,
        subject: `Your Exclusive MECA World Finals Pre-Registration Invitation - ${qualification.competitionClass}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Your World Finals Invitation</h1>

            <p style="font-size: 18px; color: #333;">
              Dear ${firstName},
            </p>

            <p style="color: #333;">
              As a qualified competitor with <strong>${qualification.totalPoints} points</strong> in
              <strong>${qualification.competitionClass}</strong> during the ${(season as Season).name},
              you are invited to pre-register for the MECA World Finals!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${registrationUrl}" style="
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 40px;
                text-decoration: none;
                border-radius: 8px;
                font-size: 18px;
                font-weight: bold;
              ">
                Pre-Register for ${qualification.competitionClass}
              </a>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1a1a2e;">Pre-Registration Benefits:</h3>
              <ul style="color: #333; margin: 0;">
                <li>Priority registration before general public</li>
                <li>Guaranteed competition spot in ${qualification.competitionClass}</li>
                <li>Early bird pricing (if applicable)</li>
              </ul>
            </div>

            <p style="color: #666; font-size: 14px;">
              This invitation is exclusive to you and cannot be transferred. If you have any questions,
              please contact us at support@mecacaraudio.com.
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="color: #666; font-size: 12px;">
              Mobile Electronics Competition Association<br>
              <a href="https://mecacaraudio.com" style="color: #667eea;">mecacaraudio.com</a>
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error(`[WorldFinals] Failed to send invitation email to ${email}:`, error);
    }
  }

  /**
   * Send invitations to all qualified competitors who haven't received one yet
   */
  async sendAllPendingInvitations(seasonId: string): Promise<{ sent: number; failed: number }> {
    const em = this.em.fork();

    const pendingQualifications = await em.find(WorldFinalsQualification, {
      season: seasonId,
      invitationSent: false,
    }, {
      populate: ['user', 'season'],
    });

    let sent = 0;
    let failed = 0;

    for (const qualification of pendingQualifications) {
      try {
        await this.sendInvitation(qualification.id);
        sent++;
      } catch (error) {
        console.error(`[WorldFinals] Failed to send invitation to MECA ID ${qualification.mecaId} for ${qualification.competitionClass}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Validate and redeem an invitation token
   */
  async redeemInvitation(token: string): Promise<WorldFinalsQualification | null> {
    const em = this.em.fork();

    const qualification = await em.findOne(WorldFinalsQualification, {
      invitationToken: token,
      invitationRedeemed: false,
    }, {
      populate: ['user', 'season'],
    });

    if (!qualification) {
      return null;
    }

    qualification.invitationRedeemed = true;
    qualification.invitationRedeemedAt = new Date();
    await em.flush();

    return qualification;
  }

  /**
   * Get statistics for admin dashboard
   */
  async getQualificationStats(seasonId?: string): Promise<{
    totalQualifications: number;
    uniqueCompetitors: number;
    classesByQualifications: { className: string; count: number }[];
    notificationsSent: number;
    emailsSent: number;
    invitationsSent: number;
    invitationsRedeemed: number;
    qualificationThreshold: number | null;
  }> {
    const em = this.em.fork();

    let season: Season | null = null;
    if (seasonId) {
      season = await em.findOne(Season, { id: seasonId });
    } else {
      season = await em.findOne(Season, { isCurrent: true });
    }

    if (!season) {
      return {
        totalQualifications: 0,
        uniqueCompetitors: 0,
        classesByQualifications: [],
        notificationsSent: 0,
        emailsSent: 0,
        invitationsSent: 0,
        invitationsRedeemed: 0,
        qualificationThreshold: null,
      };
    }

    const qualifications = await em.find(WorldFinalsQualification, { season: season.id });

    // Count unique competitors
    const uniqueMecaIds = new Set(qualifications.map(q => q.mecaId));

    // Group by class
    const classCounts = new Map<string, number>();
    qualifications.forEach(q => {
      const count = classCounts.get(q.competitionClass) || 0;
      classCounts.set(q.competitionClass, count + 1);
    });

    const classesByQualifications = Array.from(classCounts.entries())
      .map(([className, count]) => ({ className, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalQualifications: qualifications.length,
      uniqueCompetitors: uniqueMecaIds.size,
      classesByQualifications,
      notificationsSent: qualifications.filter(q => q.notificationSent).length,
      emailsSent: qualifications.filter(q => q.emailSent).length,
      invitationsSent: qualifications.filter(q => q.invitationSent).length,
      invitationsRedeemed: qualifications.filter(q => q.invitationRedeemed).length,
      qualificationThreshold: season.qualificationPointsThreshold || null,
    };
  }

  /**
   * Recalculate and update qualifications for all competitors in a season
   * Now tracks per class
   */
  async recalculateSeasonQualifications(seasonId: string): Promise<{
    newQualifications: number;
    updatedQualifications: number;
  }> {
    const em = this.em.fork();

    const season = await em.findOne(Season, { id: seasonId });
    if (!season || !season.qualificationPointsThreshold) {
      return { newQualifications: 0, updatedQualifications: 0 };
    }

    const threshold = season.qualificationPointsThreshold;

    // Get all competition results for this season
    const results = await em.find(CompetitionResult, { season: seasonId });

    // Aggregate points by MECA ID AND class
    const pointsByMecaIdAndClass = new Map<string, {
      total: number;
      name: string;
      userId: string | null;
      mecaId: string;
      className: string;
    }>();

    for (const result of results) {
      if (!result.mecaId || result.mecaId === '999999' || result.mecaId === '0') {
        continue; // Skip guests
      }

      const key = `${result.mecaId}:${result.competitionClass}`;
      const current = pointsByMecaIdAndClass.get(key) || {
        total: 0,
        name: result.competitorName,
        userId: result.competitorId || null, // Use competitorId field directly, not the relation
        mecaId: result.mecaId,
        className: result.competitionClass,
      };

      current.total += result.pointsEarned || 0;
      pointsByMecaIdAndClass.set(key, current);
    }

    let newQualifications = 0;
    let updatedQualifications = 0;

    // Check each competitor+class combination against the threshold
    for (const [key, data] of pointsByMecaIdAndClass) {
      if (data.total < threshold) continue;

      const mecaId = parseInt(data.mecaId, 10);
      if (isNaN(mecaId)) continue;

      const existingQualification = await em.findOne(WorldFinalsQualification, {
        season: seasonId,
        mecaId,
        competitionClass: data.className,
      });

      if (existingQualification) {
        if (existingQualification.totalPoints !== data.total) {
          existingQualification.totalPoints = data.total;
          updatedQualifications++;
        }
      } else {
        // New qualification
        const qualification = em.create(WorldFinalsQualification, {
          season: seasonId,
          mecaId,
          competitorName: data.name,
          competitionClass: data.className,
          user: data.userId || undefined,
          totalPoints: data.total,
          qualifiedAt: new Date(),
        } as any);
        em.persist(qualification);
        newQualifications++;

        // Send notifications for new qualifications
        if (data.userId) {
          await this.sendQualificationNotification(em, qualification, data.userId, season, data.className);
        }
        await this.sendQualificationEmail(em, qualification, season, data.className);
      }
    }

    await em.flush();

    return { newQualifications, updatedQualifications };
  }
}
