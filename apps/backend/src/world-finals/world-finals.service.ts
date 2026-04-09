import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { WorldFinalsQualification } from './world-finals-qualification.entity';
import { FinalsRegistration } from './finals-registration.entity';
import { FinalsVote } from './finals-vote.entity';
import { WorldFinalsPackage } from './world-finals-package.entity';
import { WorldFinalsPackageClass } from './world-finals-package-class.entity';
import { WorldFinalsAddonItem } from './world-finals-addon-item.entity';
import { WorldFinalsRegistrationConfig } from './world-finals-registration-config.entity';
import { Event } from '../events/events.entity';
import { Season } from '../seasons/seasons.entity';
import { Profile } from '../profiles/profiles.entity';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { Notification } from '../notifications/notifications.entity';
import { EmailService } from '../email/email.service';

// Only load the Profile fields we actually need (avoids failures when DB is missing newer columns)
const PROFILE_FIELDS = ['id', 'email', 'meca_id', 'first_name', 'last_name', 'full_name'] as const;

// DTOs for registration and voting
export interface CreateFinalsRegistrationDto {
  seasonId: string;
  division?: string;
  competitionClass?: string;
}

export interface UpdateFinalsRegistrationDto {
  division?: string;
  competitionClass?: string;
}

export interface CreateFinalsVoteDto {
  category: string;
  voteValue: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class WorldFinalsService {
  private readonly logger = new Logger(WorldFinalsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
  ) {}

  private async loadProfile(em: EntityManager, profileId: string): Promise<Profile | null> {
    return em.findOne(Profile, { id: profileId }, { fields: [...PROFILE_FIELDS] as any });
  }

  private async loadProfiles(em: EntityManager, profileIds: string[]): Promise<Map<string, Profile>> {
    if (profileIds.length === 0) return new Map();
    const profiles = await em.find(Profile, { id: { $in: profileIds } }, { fields: [...PROFILE_FIELDS] as any });
    return new Map(profiles.map(p => [p.id, p]));
  }

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

    // Create in-app notification only — email is sent via "Send Invite" / "Send All Pending"
    if (userId) {
      await this.sendQualificationNotification(em, qualification, userId, season, competitionClass);
    }

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
      const profile = await this.loadProfile(em, userId);
      if (profile) {
        email = profile.email;
        firstName = profile.first_name || qualification.competitorName.split(' ')[0];
      }
    }

    if (!email) {
      this.logger.log(`No email found for MECA ID ${qualification.mecaId} - skipping email notification`);
      return;
    }

    try {
      await this.emailService.sendWorldFinalsQualificationEmail({
        to: email,
        firstName: firstName || qualification.competitorName.split(' ')[0],
        competitorName: qualification.competitorName,
        competitionClass,
        totalPoints: qualification.totalPoints,
        qualificationThreshold: season.qualificationPointsThreshold || 0,
        seasonName: season.name,
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
  async getSeasonQualifications(seasonId: string): Promise<any[]> {
    const em = this.em.fork();
    const qualifications = await em.find(
      WorldFinalsQualification,
      { season: seasonId },
      {
        populate: ['season'],
        orderBy: { competitionClass: 'ASC', totalPoints: 'DESC' },
      }
    );

    // Load user profiles separately with only needed fields
    const userIds = [...new Set(qualifications.map(q => (q.user as any)?.id || q.user).filter(Boolean))] as string[];
    const profileMap = await this.loadProfiles(em, userIds);

    return qualifications.map(q => {
      const userId = (q.user as any)?.id || q.user;
      const profile = userId ? profileMap.get(userId) : null;
      const obj = (q as any).toJSON ? (q as any).toJSON() : { ...q };
      if (profile) {
        obj.user = {
          id: profile.id,
          email: profile.email,
          meca_id: profile.meca_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: profile.full_name,
        };
      }
      return obj;
    });
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
      populate: ['season'],
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
      const profile = await this.loadProfile(em, (qualification.user as any).id || qualification.user);
      if (profile) {
        email = profile.email;
        firstName = profile.first_name || qualification.competitorName.split(' ')[0];
      }
    }

    if (!email) {
      this.logger.log(`No email found for MECA ID ${qualification.mecaId} - skipping invitation email`);
      return;
    }

    const season = qualification.season;
    const registrationUrl = `https://mecacaraudio.com/world-finals/register?token=${qualification.invitationToken}`;

    try {
      await this.emailService.sendWorldFinalsInvitationEmail({
        to: email,
        firstName: firstName || qualification.competitorName.split(' ')[0],
        competitionClass: qualification.competitionClass,
        totalPoints: qualification.totalPoints,
        seasonName: (season as Season).name,
        registrationUrl,
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
      populate: ['season'],
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
      populate: ['season'],
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

        // Create in-app notification only — email is sent via "Send Invite" / "Send All Pending"
        if (data.userId) {
          await this.sendQualificationNotification(em, qualification, data.userId, season, data.className);
        }
      }
    }

    await em.flush();

    return { newQualifications, updatedQualifications };
  }

  // ============================================
  // FINALS REGISTRATION METHODS
  // ============================================

  /**
   * Create a finals registration for a user
   */
  async createRegistration(
    userId: string,
    data: CreateFinalsRegistrationDto,
  ): Promise<FinalsRegistration> {
    const em = this.em.fork();

    // Verify season exists
    const season = await em.findOne(Season, { id: data.seasonId });
    if (!season) {
      throw new NotFoundException(`Season with ID ${data.seasonId} not found`);
    }

    // Check if user already has a registration for this season and class
    const existing = await em.findOne(FinalsRegistration, {
      user: userId,
      season: data.seasonId,
      competitionClass: data.competitionClass || null,
    });

    if (existing) {
      throw new BadRequestException('You already have a registration for this season and class');
    }

    const registration = em.create(FinalsRegistration, {
      id: randomUUID(),
      user: userId,
      season: data.seasonId,
      division: data.division,
      competitionClass: data.competitionClass,
      registeredAt: new Date(),
    } as any);

    await em.persistAndFlush(registration);
    return registration;
  }

  /**
   * Get all registrations for a season, optionally filtered by class
   */
  async getRegistrationsBySeasonAndClass(
    seasonId: string,
    competitionClass?: string,
  ): Promise<FinalsRegistration[]> {
    const em = this.em.fork();

    const criteria: any = { season: seasonId };
    if (competitionClass) {
      criteria.competitionClass = competitionClass;
    }

    const registrations = await em.find(FinalsRegistration, criteria, {
      populate: ['season'],
      orderBy: { registeredAt: 'ASC' },
    });

    // Load user profiles separately with only needed fields
    const userIds = [...new Set(registrations.map(r => (r.user as any)?.id || r.user).filter(Boolean))] as string[];
    const profileMap = await this.loadProfiles(em, userIds);

    return registrations.map(r => {
      const userId = (r.user as any)?.id || r.user;
      const profile = userId ? profileMap.get(userId) : null;
      const obj = (r as any).toJSON ? (r as any).toJSON() : { ...r };
      if (profile) {
        obj.user = {
          id: profile.id,
          email: profile.email,
          meca_id: profile.meca_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: profile.full_name,
        };
      }
      return obj;
    });
  }

  /**
   * Get a user's registration for a specific season
   */
  async getMyRegistration(userId: string, seasonId: string): Promise<FinalsRegistration | null> {
    const em = this.em.fork();
    return em.findOne(FinalsRegistration, {
      user: userId,
      season: seasonId,
    }, {
      populate: ['season'],
    });
  }

  /**
   * Get all registrations for a user
   */
  async getMyRegistrations(userId: string): Promise<FinalsRegistration[]> {
    const em = this.em.fork();
    return em.find(FinalsRegistration, { user: userId }, {
      populate: ['season'],
      orderBy: { registeredAt: 'DESC' },
    });
  }

  /**
   * Update a registration
   */
  async updateRegistration(
    id: string,
    userId: string,
    data: UpdateFinalsRegistrationDto,
  ): Promise<FinalsRegistration> {
    const em = this.em.fork();

    const registration = await em.findOne(FinalsRegistration, { id });
    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    // Verify ownership
    const registrationUserId = (registration.user as any)?.id || registration.user;
    if (registrationUserId !== userId) {
      throw new ForbiddenException('You can only update your own registrations');
    }

    em.assign(registration, {
      division: data.division !== undefined ? data.division : registration.division,
      competitionClass: data.competitionClass !== undefined ? data.competitionClass : registration.competitionClass,
    });

    await em.flush();
    return registration;
  }

  /**
   * Delete a registration
   */
  async deleteRegistration(id: string, userId: string): Promise<void> {
    const em = this.em.fork();

    const registration = await em.findOne(FinalsRegistration, { id });
    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    // Verify ownership
    const registrationUserId = (registration.user as any)?.id || registration.user;
    if (registrationUserId !== userId) {
      throw new ForbiddenException('You can only delete your own registrations');
    }

    await em.removeAndFlush(registration);
  }

  /**
   * Get registration statistics for a season
   */
  async getRegistrationStats(seasonId: string): Promise<{
    totalRegistrations: number;
    byDivision: { division: string; count: number }[];
    byClass: { competitionClass: string; count: number }[];
  }> {
    const em = this.em.fork();

    const registrations = await em.find(FinalsRegistration, { season: seasonId });

    // Group by division
    const divisionCounts = new Map<string, number>();
    const classCounts = new Map<string, number>();

    for (const reg of registrations) {
      if (reg.division) {
        divisionCounts.set(reg.division, (divisionCounts.get(reg.division) || 0) + 1);
      }
      if (reg.competitionClass) {
        classCounts.set(reg.competitionClass, (classCounts.get(reg.competitionClass) || 0) + 1);
      }
    }

    return {
      totalRegistrations: registrations.length,
      byDivision: Array.from(divisionCounts.entries())
        .map(([division, count]) => ({ division, count }))
        .sort((a, b) => b.count - a.count),
      byClass: Array.from(classCounts.entries())
        .map(([competitionClass, count]) => ({ competitionClass, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  // ============================================
  // FINALS VOTING METHODS
  // ============================================

  /**
   * Submit a vote
   */
  async submitVote(voterId: string, data: CreateFinalsVoteDto): Promise<FinalsVote> {
    const em = this.em.fork();

    // Check if user has already voted in this category
    const existing = await em.findOne(FinalsVote, {
      voter: voterId,
      category: data.category,
    });

    if (existing) {
      throw new BadRequestException(`You have already voted in the "${data.category}" category`);
    }

    const vote = em.create(FinalsVote, {
      id: randomUUID(),
      voter: voterId,
      category: data.category,
      voteValue: data.voteValue,
      details: data.details,
    } as any);

    await em.persistAndFlush(vote);
    return vote;
  }

  /**
   * Check if a user has voted in a category
   */
  async hasUserVoted(userId: string, category: string): Promise<boolean> {
    const em = this.em.fork();
    const vote = await em.findOne(FinalsVote, { voter: userId, category });
    return !!vote;
  }

  /**
   * Get a user's votes
   */
  async getMyVotes(userId: string): Promise<FinalsVote[]> {
    const em = this.em.fork();
    return em.find(FinalsVote, { voter: userId }, {
      orderBy: { createdAt: 'DESC' },
    });
  }

  /**
   * Get votes by category (admin only)
   */
  async getVotesByCategory(category: string): Promise<FinalsVote[]> {
    const em = this.em.fork();
    const votes = await em.find(FinalsVote, { category }, {
      orderBy: { createdAt: 'DESC' },
    });

    // Load voter profiles separately with only needed fields
    const voterIds = [...new Set(votes.map(v => (v.voter as any)?.id || v.voter).filter(Boolean))] as string[];
    const profileMap = await this.loadProfiles(em, voterIds);

    return votes.map(v => {
      const voterId = (v.voter as any)?.id || v.voter;
      const profile = voterId ? profileMap.get(voterId) : null;
      const obj = (v as any).toJSON ? (v as any).toJSON() : { ...v };
      if (profile) {
        obj.voter = {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: profile.full_name,
        };
      }
      return obj;
    });
  }

  /**
   * Get vote summary for all categories
   */
  async getVoteSummary(): Promise<{
    totalVotes: number;
    byCategory: { category: string; count: number; topChoice: string | null }[];
  }> {
    const em = this.em.fork();

    const votes = await em.find(FinalsVote, {});

    // Group by category
    const categoryCounts = new Map<string, { count: number; values: Map<string, number> }>();

    for (const vote of votes) {
      const categoryData = categoryCounts.get(vote.category) || {
        count: 0,
        values: new Map<string, number>(),
      };

      categoryData.count++;
      categoryData.values.set(vote.voteValue, (categoryData.values.get(vote.voteValue) || 0) + 1);
      categoryCounts.set(vote.category, categoryData);
    }

    const byCategory = Array.from(categoryCounts.entries()).map(([category, data]) => {
      // Find top choice
      let topChoice: string | null = null;
      let maxVotes = 0;
      for (const [value, count] of data.values) {
        if (count > maxVotes) {
          maxVotes = count;
          topChoice = value;
        }
      }

      return { category, count: data.count, topChoice };
    }).sort((a, b) => b.count - a.count);

    return {
      totalVotes: votes.length,
      byCategory,
    };
  }

  // =============================================
  // World Finals Pre-Registration (Multi-Package)
  // =============================================

  // --- Registration Config (season-level dates/toggles) ---

  async getRegistrationConfig(seasonId: string): Promise<WorldFinalsRegistrationConfig | null> {
    const em = this.em.fork();
    return em.findOne(WorldFinalsRegistrationConfig, { seasonId });
  }

  async upsertRegistrationConfig(seasonId: string, data: Record<string, any>): Promise<WorldFinalsRegistrationConfig> {
    const em = this.em.fork();
    let config = await em.findOne(WorldFinalsRegistrationConfig, { seasonId });
    if (!config) {
      config = new WorldFinalsRegistrationConfig();
      config.seasonId = seasonId;
      em.persist(config);
    }
    // Set properties explicitly — em.assign() can mismap when serializedName differs from property name
    if (data.collectTshirtSize !== undefined) config.collectTshirtSize = data.collectTshirtSize;
    if (data.collectRingSize !== undefined) config.collectRingSize = data.collectRingSize;
    if (data.collectHotelInfo !== undefined) config.collectHotelInfo = data.collectHotelInfo;
    if (data.collectGuestCount !== undefined) config.collectGuestCount = data.collectGuestCount;
    if (data.customMessage !== undefined) config.customMessage = data.customMessage;
    if (data.isActive !== undefined) config.isActive = data.isActive;
    if (data.registrationMode !== undefined) config.registrationMode = data.registrationMode;
    if (data.registrationOpenDate !== undefined) config.registrationOpenDate = new Date(data.registrationOpenDate);
    if (data.earlyBirdDeadline !== undefined) config.earlyBirdDeadline = new Date(data.earlyBirdDeadline);
    if (data.registrationCloseDate !== undefined) config.registrationCloseDate = new Date(data.registrationCloseDate);
    if (data.availableTshirtSizes !== undefined) config.availableTshirtSizes = data.availableTshirtSizes;
    if (data.availableRingSizes !== undefined) config.availableRingSizes = data.availableRingSizes;
    if (data.collectExtraTshirts !== undefined) config.collectExtraTshirts = data.collectExtraTshirts;
    if (data.extraTshirtPrice !== undefined) config.extraTshirtPrice = Number(data.extraTshirtPrice);
    if (data.maxExtraTshirts !== undefined) config.maxExtraTshirts = Number(data.maxExtraTshirts);
    if (data.tshirtFieldLabel !== undefined) config.tshirtFieldLabel = data.tshirtFieldLabel || undefined;
    if (data.ringFieldLabel !== undefined) config.ringFieldLabel = data.ringFieldLabel || undefined;
    if (data.hotelFieldLabel !== undefined) config.hotelFieldLabel = data.hotelFieldLabel || undefined;
    if (data.guestCountFieldLabel !== undefined) config.guestCountFieldLabel = data.guestCountFieldLabel || undefined;
    if (data.extraTshirtFieldLabel !== undefined) config.extraTshirtFieldLabel = data.extraTshirtFieldLabel || undefined;
    if (data.hotelInfoText !== undefined) config.hotelInfoText = data.hotelInfoText || undefined;
    if (data.registrationImageUrl !== undefined) config.registrationImageUrl = data.registrationImageUrl || undefined;
    await em.flush();
    return config;
  }

  // --- World Finals Events (from events table, event_type = 'world_finals') ---

  async getWorldFinalsEvents(seasonId: string): Promise<Event[]> {
    const em = this.em.fork();
    return em.find(Event, { season: seasonId, eventType: 'world_finals' as any }, { orderBy: { eventDate: 'ASC' } });
  }

  // --- Packages (multiple per event) ---

  async getPackages(seasonId: string, eventId?: string): Promise<WorldFinalsPackage[]> {
    const em = this.em.fork();
    const filter: any = { seasonId };
    if (eventId) filter.wfEventId = eventId;
    return em.find(WorldFinalsPackage, filter, { orderBy: { displayOrder: 'ASC' } });
  }

  async getPackageWithClasses(packageId: string) {
    const em = this.em.fork();
    const pkg = await em.findOne(WorldFinalsPackage, { id: packageId });
    if (!pkg) throw new NotFoundException('Package not found');
    const classes = await em.find(WorldFinalsPackageClass, { packageId }, { orderBy: { className: 'ASC' } });
    return { ...JSON.parse(JSON.stringify(pkg)), classes: JSON.parse(JSON.stringify(classes)) };
  }

  async createPackage(data: any): Promise<WorldFinalsPackage> {
    const em = this.em.fork();
    const pkg = new WorldFinalsPackage();
    em.assign(pkg, {
      seasonId: data.seasonId,
      wfEventId: data.wfEventId,
      name: data.name,
      description: data.description,
      basePriceEarly: data.basePriceEarly,
      basePriceRegular: data.basePriceRegular,
      includedClasses: data.includedClasses,
      additionalClassPriceEarly: data.additionalClassPriceEarly,
      additionalClassPriceRegular: data.additionalClassPriceRegular,
      displayOrder: data.displayOrder || 0,
      isActive: data.isActive ?? true,
    });
    await em.persistAndFlush(pkg);

    // Save eligible classes
    if (data.classes && Array.isArray(data.classes)) {
      for (const cls of data.classes) {
        const pc = new WorldFinalsPackageClass();
        pc.packageId = pkg.id;
        pc.className = cls.className;
        pc.format = cls.format;
        pc.isPremium = cls.isPremium || false;
        pc.premiumPrice = cls.premiumPrice;
        em.persist(pc);
      }
      await em.flush();
    }

    return pkg;
  }

  async updatePackage(packageId: string, data: any): Promise<WorldFinalsPackage> {
    const em = this.em.fork();
    const pkg = await em.findOne(WorldFinalsPackage, { id: packageId });
    if (!pkg) throw new NotFoundException('Package not found');

    em.assign(pkg, {
      name: data.name ?? pkg.name,
      description: data.description ?? pkg.description,
      basePriceEarly: data.basePriceEarly ?? pkg.basePriceEarly,
      basePriceRegular: data.basePriceRegular ?? pkg.basePriceRegular,
      includedClasses: data.includedClasses ?? pkg.includedClasses,
      additionalClassPriceEarly: data.additionalClassPriceEarly ?? pkg.additionalClassPriceEarly,
      additionalClassPriceRegular: data.additionalClassPriceRegular ?? pkg.additionalClassPriceRegular,
      displayOrder: data.displayOrder ?? pkg.displayOrder,
      isActive: data.isActive ?? pkg.isActive,
    });

    // Replace eligible classes if provided
    if (data.classes && Array.isArray(data.classes)) {
      const existing = await em.find(WorldFinalsPackageClass, { packageId });
      for (const e of existing) em.remove(e);
      await em.flush();

      for (const cls of data.classes) {
        const pc = new WorldFinalsPackageClass();
        pc.packageId = packageId;
        pc.className = cls.className;
        pc.format = cls.format;
        pc.isPremium = cls.isPremium || false;
        pc.premiumPrice = cls.premiumPrice;
        em.persist(pc);
      }
    }

    await em.flush();
    return pkg;
  }

  async deletePackage(packageId: string): Promise<void> {
    const em = this.em.fork();
    const pkg = await em.findOne(WorldFinalsPackage, { id: packageId });
    if (!pkg) throw new NotFoundException('Package not found');
    // Cascade deletes package_classes via FK
    await em.removeAndFlush(pkg);
  }

  // --- Add-on Items ---

  async getAddonItems(seasonId: string, eventId?: string): Promise<WorldFinalsAddonItem[]> {
    const em = this.em.fork();
    const filter: any = { seasonId };
    if (eventId) filter.wfEventId = eventId;
    return em.find(WorldFinalsAddonItem, filter, { orderBy: { displayOrder: 'ASC' } });
  }

  async createAddonItem(data: Partial<WorldFinalsAddonItem>): Promise<WorldFinalsAddonItem> {
    const em = this.em.fork();
    const item = new WorldFinalsAddonItem();
    em.assign(item, data);
    await em.persistAndFlush(item);
    return item;
  }

  async updateAddonItem(id: string, data: Partial<WorldFinalsAddonItem>): Promise<WorldFinalsAddonItem> {
    const em = this.em.fork();
    const item = await em.findOne(WorldFinalsAddonItem, { id });
    if (!item) throw new NotFoundException('Add-on item not found');
    em.assign(item, data);
    await em.flush();
    return item;
  }

  async deleteAddonItem(id: string): Promise<void> {
    const em = this.em.fork();
    const item = await em.findOne(WorldFinalsAddonItem, { id });
    if (!item) throw new NotFoundException('Add-on item not found');
    await em.removeAndFlush(item);
  }

  // --- Token Validation ---

  async validatePreRegistrationToken(token: string) {
    const em = this.em.fork();

    const qualification = await em.findOne(WorldFinalsQualification, { invitationToken: token });
    if (!qualification) {
      throw new BadRequestException('Invalid or expired registration link');
    }

    const seasonId = typeof qualification.season === 'string'
      ? qualification.season : (qualification.season as any)?.id;

    // Load registration config (master switch + toggles)
    const config = await em.findOne(WorldFinalsRegistrationConfig, { seasonId, isActive: true });
    if (!config) {
      throw new BadRequestException('World Finals pre-registration is not currently open');
    }

    const now = new Date();

    // Get all qualified classes for this competitor
    const allQualifications = await em.find(WorldFinalsQualification, {
      mecaId: qualification.mecaId, season: seasonId,
    });
    const qualifiedClassNames = allQualifications.map(q => q.competitionClass);

    // Load profile
    const profile = qualification.user
      ? await this.loadProfile(em, typeof qualification.user === 'string' ? qualification.user : (qualification.user as any).id)
      : null;

    // Check registration window from config
    if (now < config.registrationOpenDate) throw new BadRequestException('Pre-registration has not opened yet. Please check back later.');
    if (now > config.registrationCloseDate) throw new BadRequestException('The pre-registration period has ended. You can still register on-site at day-of-event pricing.');

    const pricingTier = now < config.earlyBirdDeadline ? 'early_bird' : 'regular';

    // Load World Finals events for this season from the events table
    const allEvents = await em.find(Event, {
      season: seasonId,
      eventType: 'world_finals' as any,
    }, { orderBy: { eventDate: 'ASC' } });

    if (allEvents.length === 0) {
      throw new BadRequestException('No World Finals events found for this season');
    }

    // Build event data with packages and addons
    const eventsData = await Promise.all(allEvents.map(async (evt) => {

      // Load packages for this event
      const packages = await em.find(WorldFinalsPackage, { wfEventId: evt.id, isActive: true }, { orderBy: { displayOrder: 'ASC' } });

      const packagesWithClasses = await Promise.all(packages.map(async (pkg) => {
        const allPkgClasses = await em.find(WorldFinalsPackageClass, { packageId: pkg.id });
        const eligibleClasses = allPkgClasses.filter(pc => qualifiedClassNames.includes(pc.className));

        const existingReg = await em.findOne(FinalsRegistration, {
          mecaId: String(qualification.mecaId), season: seasonId, packageId: pkg.id,
          registrationStatus: { $ne: 'cancelled' },
        });

        return {
          ...JSON.parse(JSON.stringify(pkg)),
          eligibleClasses: JSON.parse(JSON.stringify(eligibleClasses)),
          alreadyRegistered: !!existingReg,
        };
      }));

      // Load addon items for this event
      const addonItems = await em.find(WorldFinalsAddonItem, { wfEventId: evt.id, isActive: true }, { orderBy: { displayOrder: 'ASC' } });

      return {
        ...JSON.parse(JSON.stringify(evt)),
        pricingTier,
        packages: packagesWithClasses,
        addonItems: JSON.parse(JSON.stringify(addonItems)),
      };
    }));

    // Group events by multi_day_group_id for combined checkout
    const groupMap = new Map<string, any[]>();
    for (const evt of eventsData) {
      const key = evt.multi_day_group_id || `_standalone_${evt.id}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(evt);
    }

    const eventGroups = Array.from(groupMap.entries()).map(([groupKey, events]) => {
      // Deduplicate addon items by name across grouped events
      const allAddons: any[] = [];
      const seenNames = new Set<string>();
      for (const evt of events) {
        for (const addon of evt.addonItems) {
          if (!seenNames.has(addon.name)) {
            seenNames.add(addon.name);
            allAddons.push(addon);
          }
        }
      }

      return {
        groupKey: groupKey.startsWith('_standalone_') ? null : groupKey,
        events: events.map(({ addonItems, ...rest }: any) => rest),
        addonItems: allAddons,
      };
    });

    return {
      competitor: {
        mecaId: String(qualification.mecaId),
        name: qualification.competitorName,
        email: profile?.email || '',
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
      },
      qualifiedClasses: allQualifications.map(q => ({ className: q.competitionClass, totalPoints: q.totalPoints })),
      config: JSON.parse(JSON.stringify(config)),
      pricingTier,
      earlyBirdDeadline: config.earlyBirdDeadline,
      registrationCloseDate: config.registrationCloseDate,
      eventGroups,
    };
  }

  /**
   * Preview mode: returns real season config/packages/events with a mock competitor.
   * All classes shown as eligible (no qualification filter).
   */
  async getPreRegistrationPreview(seasonId: string, eventId?: string) {
    const em = this.em.fork();

    const config = await em.findOne(WorldFinalsRegistrationConfig, { seasonId });
    if (!config) return null;

    const now = new Date();
    const pricingTier = config.earlyBirdDeadline && now < config.earlyBirdDeadline ? 'early_bird' : 'regular';

    // Load WF events, optionally filtered
    let wfEvents: Event[];
    if (eventId) {
      const evt = await em.findOne(Event, { id: eventId });
      wfEvents = evt ? [evt] : [];
    } else {
      wfEvents = await em.find(Event, { season: seasonId, eventType: 'world_finals' as any }, { orderBy: { eventDate: 'ASC' } });
    }

    const eventsData = await Promise.all(wfEvents.map(async (evt) => {
      const packages = await em.find(WorldFinalsPackage, { wfEventId: evt.id, isActive: true }, { orderBy: { displayOrder: 'ASC' } });
      const packagesWithClasses = await Promise.all(packages.map(async (pkg) => {
        const classes = await em.find(WorldFinalsPackageClass, { packageId: pkg.id }, { orderBy: { className: 'ASC' } });
        return {
          ...JSON.parse(JSON.stringify(pkg)),
          eligibleClasses: JSON.parse(JSON.stringify(classes)),
          alreadyRegistered: false,
        };
      }));
      const addonItems = await em.find(WorldFinalsAddonItem, { wfEventId: evt.id, isActive: true }, { orderBy: { displayOrder: 'ASC' } });
      return {
        ...JSON.parse(JSON.stringify(evt)),
        pricingTier,
        packages: packagesWithClasses,
        addonItems: JSON.parse(JSON.stringify(addonItems)),
      };
    }));

    // Also include packages/addons not assigned to any event
    const unassignedPkgs = await em.find(WorldFinalsPackage, { seasonId, wfEventId: null, isActive: true }, { orderBy: { displayOrder: 'ASC' } });
    if (unassignedPkgs.length > 0 && !eventId) {
      const pkgsWithClasses = await Promise.all(unassignedPkgs.map(async (pkg) => {
        const classes = await em.find(WorldFinalsPackageClass, { packageId: pkg.id }, { orderBy: { className: 'ASC' } });
        return { ...JSON.parse(JSON.stringify(pkg)), eligibleClasses: JSON.parse(JSON.stringify(classes)), alreadyRegistered: false };
      }));
      const unassignedAddons = await em.find(WorldFinalsAddonItem, { seasonId, wfEventId: null, isActive: true }, { orderBy: { displayOrder: 'ASC' } });
      eventsData.push({
        id: '_unassigned', title: 'Unassigned Packages', event_date: null, venue_name: null, venue_city: null, venue_state: null,
        formats: [], multi_day_group_id: null, pricingTier, packages: pkgsWithClasses,
        addonItems: JSON.parse(JSON.stringify(unassignedAddons)),
      } as any);
    }

    // Group by multi_day_group_id
    const groupMap = new Map<string, any[]>();
    for (const evt of eventsData) {
      const key = evt.multi_day_group_id || `_standalone_${evt.id}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(evt);
    }
    const eventGroups = Array.from(groupMap.entries()).map(([groupKey, events]) => {
      const allAddons: any[] = [];
      const seenNames = new Set<string>();
      for (const evt of events) {
        for (const addon of (evt.addonItems || [])) {
          if (!seenNames.has(addon.name)) { seenNames.add(addon.name); allAddons.push(addon); }
        }
      }
      return {
        groupKey: groupKey.startsWith('_standalone_') ? null : groupKey,
        events: events.map(({ addonItems, ...rest }: any) => rest),
        addonItems: allAddons,
      };
    });

    return {
      competitor: { mecaId: '00000', name: 'Preview Competitor', email: 'preview@example.com', firstName: 'Preview', lastName: 'Competitor' },
      qualifiedClasses: [],
      config: JSON.parse(JSON.stringify(config)),
      pricingTier,
      earlyBirdDeadline: config.earlyBirdDeadline,
      registrationCloseDate: config.registrationCloseDate,
      eventGroups,
      isPreview: true,
    };
  }

  // --- Pricing Calculation ---

  calculatePreRegistrationPricing(
    pkg: any,
    pricingTier: string,
    standardClassCount: number,
    premiumSelections: { className: string; price: number }[],
    addonSelections: { itemId: string; price: number; quantity: number }[],
    extraTshirts?: { size: string; quantity: number }[],
    extraTshirtPrice?: number,
  ) {
    const basePrice = pricingTier === 'early_bird'
      ? Number(pkg.base_price_early || pkg.basePriceEarly) : Number(pkg.base_price_regular || pkg.basePriceRegular);
    const additionalPrice = pricingTier === 'early_bird'
      ? Number(pkg.additional_class_price_early || pkg.additionalClassPriceEarly)
      : Number(pkg.additional_class_price_regular || pkg.additionalClassPriceRegular);
    const includedClasses = Number(pkg.included_classes || pkg.includedClasses);

    const extraClasses = Math.max(0, standardClassCount - includedClasses);
    const classTotal = standardClassCount > 0 ? basePrice + (extraClasses * additionalPrice) : 0;
    const premiumTotal = premiumSelections.reduce((sum, p) => sum + Number(p.price), 0);
    const addonsTotal = addonSelections.reduce((sum, a) => sum + (Number(a.price) * a.quantity), 0);
    const extraTshirtTotal = (extraTshirts || []).reduce((sum, t) => sum + (t.quantity * Number(extraTshirtPrice || 0)), 0);

    return {
      basePrice, additionalPrice, includedClasses,
      standardClassCount, extraClasses, classTotal,
      premiumTotal, addonsTotal, extraTshirtTotal,
      total: classTotal + premiumTotal + addonsTotal + extraTshirtTotal,
      pricingTier,
    };
  }

  // --- Registration ---

  async createPreRegistration(data: {
    token: string;
    packageId: string;
    wfEventId?: string;
    seasonId: string;
    mecaId: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    classes: any[];
    addonItems: any[];
    tshirtSize?: string;
    ringSize?: string;
    hotelNeeded?: boolean;
    hotelNotes?: string;
    guestCount?: number;
    pricingTier: string;
    baseAmount: number;
    addonsAmount: number;
    totalAmount: number;
    extraTshirts?: { size: string; quantity: number }[];
    notes?: string;
    userId?: string;
  }): Promise<FinalsRegistration> {
    const em = this.em.fork();

    const registration = new FinalsRegistration();
    registration.mecaId = data.mecaId;
    registration.email = data.email;
    registration.firstName = data.firstName;
    registration.lastName = data.lastName;
    registration.phone = data.phone;
    registration.packageId = data.packageId;
    registration.wfEventId = data.wfEventId;
    registration.classes = data.classes;
    registration.addonItems = data.addonItems;
    registration.tshirtSize = data.tshirtSize;
    registration.ringSize = data.ringSize;
    registration.extraTshirts = data.extraTshirts;
    registration.hotelNeeded = data.hotelNeeded;
    registration.hotelNotes = data.hotelNotes;
    registration.guestCount = data.guestCount || 0;
    registration.pricingTier = data.pricingTier;
    registration.baseAmount = data.baseAmount;
    registration.addonsAmount = data.addonsAmount;
    registration.totalAmount = data.totalAmount;
    registration.notes = data.notes;
    registration.registeredAt = new Date();
    registration.paymentStatus = 'pending';
    registration.registrationStatus = 'pending';

    if (data.userId) registration.user = em.getReference(Profile, data.userId);
    if (data.seasonId) registration.season = em.getReference(Season, data.seasonId);

    await em.persistAndFlush(registration);
    return registration;
  }

  async markPreRegistrationPaid(registrationId: string, paymentIntentId: string): Promise<FinalsRegistration> {
    const em = this.em.fork();
    const reg = await em.findOne(FinalsRegistration, { id: registrationId });
    if (!reg) throw new NotFoundException('Registration not found');
    reg.paymentStatus = 'paid';
    reg.registrationStatus = 'confirmed';
    reg.stripePaymentIntentId = paymentIntentId;
    await em.flush();
    return reg;
  }

  // --- Stats ---

  async getPreRegistrationStats(seasonId: string, eventId?: string) {
    const em = this.em.fork();
    const conn = em.getConnection();

    const whereClause = eventId
      ? 'season_id = ? AND wf_event_id = ? AND registration_status != \'cancelled\''
      : 'season_id = ? AND registration_status != \'cancelled\'';
    const paidWhereClause = eventId
      ? 'season_id = ? AND wf_event_id = ? AND payment_status = \'paid\''
      : 'season_id = ? AND payment_status = \'paid\'';
    const params = eventId ? [seasonId, eventId] : [seasonId];

    const [stats] = await conn.execute(
      `SELECT
        COUNT(*) as total_registrations,
        COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_registrations,
        COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_registrations,
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0) as total_revenue,
        COALESCE(AVG(total_amount) FILTER (WHERE payment_status = 'paid'), 0) as avg_amount
      FROM finals_registrations
      WHERE ${whereClause}`,
      params
    );

    const classBreakdown = await conn.execute(
      `SELECT cls->>'className' as class_name, COUNT(*) as count
      FROM finals_registrations, jsonb_array_elements(classes) as cls
      WHERE ${paidWhereClause}
      GROUP BY cls->>'className' ORDER BY count DESC`,
      params
    );

    const addonBreakdown = await conn.execute(
      `SELECT item->>'name' as addon_name,
        SUM((item->>'quantity')::int) as total_quantity,
        SUM((item->>'price')::numeric * (item->>'quantity')::int) as total_revenue
      FROM finals_registrations, jsonb_array_elements(addon_items) as item
      WHERE ${paidWhereClause}
      GROUP BY item->>'name' ORDER BY total_quantity DESC`,
      params
    );

    const packageBreakdown = await conn.execute(
      `SELECT fr.package_id, p.name as package_name, COUNT(*) as count,
        COALESCE(SUM(fr.total_amount) FILTER (WHERE fr.payment_status = 'paid'), 0) as revenue
      FROM finals_registrations fr
      LEFT JOIN world_finals_packages p ON p.id = fr.package_id
      WHERE fr.${whereClause}
      GROUP BY fr.package_id, p.name ORDER BY count DESC`,
      params
    );

    // Per-event breakdown (wf_event_id references the events table)
    const eventBreakdown = await conn.execute(
      `SELECT fr.wf_event_id, e.title as event_name, COUNT(*) as count,
        COALESCE(SUM(fr.total_amount) FILTER (WHERE fr.payment_status = 'paid'), 0) as revenue
      FROM finals_registrations fr
      LEFT JOIN events e ON e.id = fr.wf_event_id
      WHERE fr.season_id = ? AND fr.registration_status != 'cancelled'
      GROUP BY fr.wf_event_id, e.title ORDER BY count DESC`,
      [seasonId]
    );

    return {
      totalRegistrations: Number(stats?.total_registrations || 0),
      paidRegistrations: Number(stats?.paid_registrations || 0),
      pendingRegistrations: Number(stats?.pending_registrations || 0),
      totalRevenue: Number(stats?.total_revenue || 0),
      avgAmount: Number(stats?.avg_amount || 0),
      classBreakdown: classBreakdown.map((r: any) => ({ className: r.class_name, count: Number(r.count) })),
      addonBreakdown: addonBreakdown.map((r: any) => ({ name: r.addon_name, quantity: Number(r.total_quantity), revenue: Number(r.total_revenue) })),
      packageBreakdown: packageBreakdown.map((r: any) => ({ packageId: r.package_id, packageName: r.package_name, count: Number(r.count), revenue: Number(r.revenue) })),
      eventBreakdown: eventBreakdown.map((r: any) => ({ eventId: r.wf_event_id, eventName: r.event_name, count: Number(r.count), revenue: Number(r.revenue) })),
    };
  }
}
