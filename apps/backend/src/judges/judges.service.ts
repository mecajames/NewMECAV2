import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { JudgeApplication } from './judge-application.entity';
import { JudgeApplicationReference } from './judge-application-reference.entity';
import { Judge } from './judge.entity';
import { JudgeLevelHistory } from './judge-level-history.entity';
import { JudgeSeasonQualification } from './judge-season-qualification.entity';
import { EventJudgeAssignment } from './event-judge-assignment.entity';
import { EmailVerificationToken } from '../auth/email-verification-token.entity';
import { Profile } from '../profiles/profiles.entity';
import { Event } from '../events/events.entity';
import { Season } from '../seasons/seasons.entity';
import {
  CreateJudgeApplicationDto,
  AdminCreateJudgeApplicationDto,
  AdminQuickCreateJudgeApplicationDto,
  ReviewJudgeApplicationDto,
  UpdateJudgeDto,
  CreateEventJudgeAssignmentDto,
  UpdateEventJudgeAssignmentDto,
  ApplicationStatus,
  JudgeLevel,
  ApplicationEntryMethod,
  VerificationPurpose,
  UserRole,
  EventAssignmentStatus,
  EventAssignmentRole,
  AssignmentRequestType,
  WeekendAvailability,
} from '@newmeca/shared';
import { randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';

@Injectable()
export class JudgesService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
  ) {}

  // =============================================================================
  // Judge Applications
  // =============================================================================

  async createApplication(userId: string, dto: CreateJudgeApplicationDto): Promise<JudgeApplication> {
    const em = this.em.fork();
    // Check if user already has a pending or approved application
    const existingApplication = await em.findOne(JudgeApplication, {
      user: { id: userId },
      status: { $in: [ApplicationStatus.PENDING, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED] },
    });

    if (existingApplication) {
      throw new BadRequestException('You already have an active judge application');
    }

    // Check if user is already a judge
    const existingJudge = await em.findOne(Judge, { user: { id: userId } });
    if (existingJudge) {
      throw new BadRequestException('You are already a registered judge');
    }

    const user = await em.findOneOrFail(Profile, userId);

    // Create application using new instance
    const application = new JudgeApplication();
    Object.assign(application, {
      user,
      fullName: dto.full_name,
      preferredName: dto.preferred_name,
      dateOfBirth: new Date(dto.date_of_birth),
      phone: dto.phone,
      secondaryPhone: dto.secondary_phone,
      headshotUrl: dto.headshot_url,
      country: dto.country,
      state: dto.state,
      city: dto.city,
      zip: dto.zip,
      travelRadius: dto.travel_radius,
      additionalRegions: dto.additional_regions || [],
      weekendAvailability: dto.weekend_availability,
      availabilityNotes: dto.availability_notes,
      yearsInIndustry: dto.years_in_industry,
      industryPositions: dto.industry_positions,
      companyNames: dto.company_names,
      educationTraining: dto.education_training,
      competitionHistory: dto.competition_history,
      judgingExperience: dto.judging_experience,
      specialty: dto.specialty,
      subSpecialties: dto.sub_specialties || [],
      additionalSkills: dto.additional_skills,
      essayWhyJudge: dto.essay_why_judge,
      essayQualifications: dto.essay_qualifications,
      essayAdditional: dto.essay_additional,
      ackIndependentContractor: dto.ack_independent_contractor,
      ackCodeOfConduct: dto.ack_code_of_conduct,
      ackBackgroundCheck: dto.ack_background_check,
      ackTermsConditions: dto.ack_terms_conditions,
      entryMethod: ApplicationEntryMethod.SELF,
    });

    await em.persistAndFlush(application);

    // Create references
    for (const refDto of dto.references) {
      const reference = new JudgeApplicationReference();
      Object.assign(reference, {
        application,
        fullName: refDto.name,
        relationship: refDto.relationship,
        email: refDto.email,
        phone: refDto.phone,
        company: refDto.company_name,
      });
      em.persist(reference);
    }

    await em.flush();

    // Send verification emails to references
    await this.sendReferenceVerificationEmails(application);

    return application;
  }

  async adminCreateApplication(adminId: string, dto: AdminCreateJudgeApplicationDto): Promise<JudgeApplication> {
    const em = this.em.fork();
    const user = await em.findOneOrFail(Profile, dto.user_id);
    const admin = await em.findOneOrFail(Profile, adminId);

    // Check if user already has an application
    const existingApplication = await em.findOne(JudgeApplication, {
      user: { id: dto.user_id },
      status: { $in: [ApplicationStatus.PENDING, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED] },
    });

    if (existingApplication) {
      throw new BadRequestException('This user already has an active judge application');
    }

    const application = new JudgeApplication();
    Object.assign(application, {
      user,
      enteredBy: admin,
      fullName: dto.full_name,
      preferredName: dto.preferred_name,
      dateOfBirth: new Date(dto.date_of_birth),
      phone: dto.phone,
      secondaryPhone: dto.secondary_phone,
      headshotUrl: dto.headshot_url,
      country: dto.country,
      state: dto.state,
      city: dto.city,
      zip: dto.zip,
      travelRadius: dto.travel_radius,
      additionalRegions: dto.additional_regions || [],
      weekendAvailability: dto.weekend_availability,
      availabilityNotes: dto.availability_notes,
      yearsInIndustry: dto.years_in_industry,
      industryPositions: dto.industry_positions,
      companyNames: dto.company_names,
      educationTraining: dto.education_training,
      competitionHistory: dto.competition_history,
      judgingExperience: dto.judging_experience,
      specialty: dto.specialty,
      subSpecialties: dto.sub_specialties || [],
      additionalSkills: dto.additional_skills,
      essayWhyJudge: dto.essay_why_judge,
      essayQualifications: dto.essay_qualifications,
      essayAdditional: dto.essay_additional,
      ackIndependentContractor: dto.ack_independent_contractor,
      ackCodeOfConduct: dto.ack_code_of_conduct,
      ackBackgroundCheck: dto.ack_background_check,
      ackTermsConditions: dto.ack_terms_conditions,
      entryMethod: dto.entry_method || ApplicationEntryMethod.ADMIN_APPLICATION,
    });

    await em.persistAndFlush(application);

    // Create references
    for (const refDto of dto.references) {
      const reference = new JudgeApplicationReference();
      Object.assign(reference, {
        application,
        fullName: refDto.name,
        relationship: refDto.relationship,
        email: refDto.email,
        phone: refDto.phone,
        company: refDto.company_name,
      });
      em.persist(reference);
    }

    await em.flush();

    return application;
  }

  async adminQuickCreateApplication(adminId: string, dto: AdminQuickCreateJudgeApplicationDto): Promise<JudgeApplication> {
    const em = this.em.fork();
    const user = await em.findOneOrFail(Profile, dto.user_id);
    const admin = await em.findOneOrFail(Profile, adminId);

    // Check if user already has an application
    const existingApplication = await em.findOne(JudgeApplication, {
      user: { id: dto.user_id },
      status: { $in: [ApplicationStatus.PENDING, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED] },
    });

    if (existingApplication) {
      throw new BadRequestException('This user already has an active judge application');
    }

    const application = new JudgeApplication();
    Object.assign(application, {
      user,
      enteredBy: admin,
      fullName: dto.full_name,
      preferredName: null,
      dateOfBirth: new Date('1990-01-01'), // Default placeholder
      phone: dto.phone,
      secondaryPhone: null,
      headshotUrl: null,
      country: dto.country,
      state: dto.state,
      city: dto.city,
      zip: '00000', // Default placeholder
      travelRadius: dto.travel_radius,
      additionalRegions: [],
      weekendAvailability: WeekendAvailability.BOTH,
      availabilityNotes: null,
      yearsInIndustry: dto.years_in_industry,
      industryPositions: 'Admin quick entry',
      companyNames: null,
      educationTraining: null,
      competitionHistory: null,
      judgingExperience: null,
      specialty: dto.specialty,
      subSpecialties: [],
      additionalSkills: null,
      essayWhyJudge: 'Admin quick entry - no essay required',
      essayQualifications: 'Admin quick entry - no essay required',
      essayAdditional: null,
      ackIndependentContractor: true,
      ackCodeOfConduct: true,
      ackBackgroundCheck: true,
      ackTermsConditions: true,
      entryMethod: ApplicationEntryMethod.ADMIN_APPLICATION,
      adminNotes: dto.admin_notes,
    });

    await em.persistAndFlush(application);
    return application;
  }

  async getApplication(applicationId: string): Promise<JudgeApplication> {
    const em = this.em.fork();
    const application = await em.findOne(JudgeApplication, applicationId, {
      populate: ['user', 'references', 'reviewedBy', 'enteredBy'],
    });

    if (!application) {
      throw new NotFoundException('Judge application not found');
    }

    return application;
  }

  async getMyApplication(userId: string): Promise<JudgeApplication | null> {
    const em = this.em.fork();
    return em.findOne(JudgeApplication, { user: { id: userId } }, {
      populate: ['references'],
      orderBy: { applicationDate: 'DESC' },
    });
  }

  async getAllApplications(filters?: {
    status?: ApplicationStatus;
    specialty?: string;
  }): Promise<JudgeApplication[]> {
    const em = this.em.fork();
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.specialty) {
      where.specialty = filters.specialty;
    }

    return em.find(JudgeApplication, where, {
      populate: ['user', 'references'],
      orderBy: { applicationDate: 'DESC' },
    });
  }

  async reviewApplication(
    applicationId: string,
    reviewerId: string,
    dto: ReviewJudgeApplicationDto,
  ): Promise<JudgeApplication> {
    const em = this.em.fork();
    const application = await em.findOneOrFail(JudgeApplication, applicationId, {
      populate: ['user', 'references'],
    });
    const reviewer = await em.findOneOrFail(Profile, reviewerId);

    if (application.status === ApplicationStatus.APPROVED) {
      throw new BadRequestException('This application has already been approved');
    }

    application.status = dto.status;
    application.reviewedDate = new Date();
    application.reviewedBy = reviewer;

    if (dto.admin_notes) {
      application.adminNotes = dto.admin_notes;
    }

    // If approved, create the Judge record
    if (dto.status === ApplicationStatus.APPROVED) {
      await this.createJudgeFromApplication(em, application, dto.judge_level);

      // Update user role to include JUDGE
      if (application.user.role !== UserRole.ADMIN) {
        application.user.role = UserRole.JUDGE;
      }
    }

    await em.flush();

    // Send notification email to applicant
    await this.sendApplicationStatusEmail(application);

    return application;
  }

  private async createJudgeFromApplication(
    em: EntityManager,
    application: JudgeApplication,
    level?: JudgeLevel,
  ): Promise<Judge> {
    const judge = new Judge();
    Object.assign(judge, {
      user: application.user,
      application,
      level: level || JudgeLevel.IN_TRAINING,
      specialty: application.specialty,
      subSpecialties: application.subSpecialties || [],
      preferredName: application.preferredName,
      country: application.country,
      state: application.state,
      city: application.city,
      travelRadius: application.travelRadius,
      additionalRegions: application.additionalRegions || [],
      approvedDate: new Date(),
      creationMethod: application.entryMethod,
      isActive: true, // Explicitly set as active when approved
    });

    em.persist(judge);

    // Create initial season qualification for current season
    const currentSeason = await em.findOne(Season, { isCurrent: true });
    if (currentSeason) {
      const seasonQual = new JudgeSeasonQualification();
      Object.assign(seasonQual, {
        judge,
        season: currentSeason,
      });
      em.persist(seasonQual);
    }

    return judge;
  }

  // =============================================================================
  // Reference Verification
  // =============================================================================

  private async sendReferenceVerificationEmails(application: JudgeApplication): Promise<void> {
    const em = this.em.fork();
    await em.populate(application, ['references']);

    for (const reference of application.references) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14); // 2 weeks expiry

      const verificationToken = new EmailVerificationToken();
      Object.assign(verificationToken, {
        token,
        email: reference.email,
        purpose: VerificationPurpose.JUDGE_APPLICATION,
        relatedEntityId: reference.id,
        expiresAt,
      });

      em.persist(verificationToken);

      // Send verification email
      await this.emailService.sendReferenceVerificationEmail({
        referenceEmail: reference.email || '',
        referenceName: reference.fullName,
        applicantName: application.fullName,
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-reference?token=${token}`,
        applicationType: 'Judge',
      });
    }

    await em.flush();
  }

  async verifyReference(token: string, response: string): Promise<void> {
    const em = this.em.fork();
    const verificationToken = await em.findOne(EmailVerificationToken, { token });

    if (!verificationToken) {
      throw new NotFoundException('Invalid verification token');
    }

    if (verificationToken.isUsed) {
      throw new BadRequestException('This verification link has already been used');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('This verification link has expired');
    }

    // Mark token as used
    verificationToken.isUsed = true;
    verificationToken.usedAt = new Date();

    // Update the reference
    const reference = await em.findOneOrFail(JudgeApplicationReference, verificationToken.relatedEntityId);
    reference.referenceChecked = true;
    reference.checkedDate = new Date();
    reference.referenceNotes = response;

    await em.flush();
  }

  // =============================================================================
  // Judges (Active)
  // =============================================================================

  async getJudge(judgeId: string): Promise<Judge> {
    const em = this.em.fork();
    const judge = await em.findOne(Judge, judgeId, {
      populate: ['user', 'application', 'seasonQualifications'],
    });

    if (!judge) {
      throw new NotFoundException('Judge not found');
    }

    return judge;
  }

  async getJudgeByUserId(userId: string): Promise<Judge | null> {
    const em = this.em.fork();
    return em.findOne(Judge, { user: { id: userId } }, {
      populate: ['seasonQualifications'],
    });
  }

  async getAllJudges(filters?: {
    isActive?: boolean;
    level?: JudgeLevel;
    specialty?: string;
    state?: string;
  }): Promise<Judge[]> {
    const em = this.em.fork();
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.level) {
      where.level = filters.level;
    }
    if (filters?.specialty) {
      where.specialty = filters.specialty;
    }
    if (filters?.state) {
      where.state = filters.state;
    }

    return em.find(Judge, where, {
      populate: ['user'],
      orderBy: { createdAt: 'DESC' },
    });
  }

  async updateJudge(judgeId: string, dto: UpdateJudgeDto): Promise<Judge> {
    const em = this.em.fork();
    const judge = await em.findOneOrFail(Judge, judgeId);

    // Update fields
    if (dto.level !== undefined) judge.level = dto.level;
    if (dto.specialty !== undefined) judge.specialty = dto.specialty;
    if (dto.sub_specialties !== undefined) judge.subSpecialties = dto.sub_specialties;
    if (dto.is_active !== undefined) judge.isActive = dto.is_active;
    if (dto.travel_radius !== undefined) judge.travelRadius = dto.travel_radius;
    if (dto.additional_regions !== undefined) judge.additionalRegions = dto.additional_regions;
    if (dto.admin_notes !== undefined) judge.adminNotes = dto.admin_notes;
    if (dto.bio !== undefined) judge.bio = dto.bio;
    if (dto.headshot_url !== undefined) judge.headshotUrl = dto.headshot_url;

    await em.flush();
    return judge;
  }

  async recordLevelChange(
    judgeId: string,
    previousLevel: JudgeLevel,
    newLevel: JudgeLevel,
    changedById: string,
    reason?: string,
  ): Promise<void> {
    const em = this.em.fork();
    const judge = await em.findOneOrFail(Judge, judgeId);
    const changedBy = await em.findOneOrFail(Profile, changedById);

    const history = new JudgeLevelHistory();
    Object.assign(history, {
      judge,
      previousLevel,
      newLevel,
      reason,
      changedBy,
    });

    await em.persistAndFlush(history);
  }

  // =============================================================================
  // Email Notifications
  // =============================================================================

  private async sendApplicationStatusEmail(application: JudgeApplication): Promise<void> {
    const statusMessages: Record<ApplicationStatus, string> = {
      [ApplicationStatus.PENDING]: 'Your application is pending review.',
      [ApplicationStatus.UNDER_REVIEW]: 'Your application is now under review by our team.',
      [ApplicationStatus.APPROVED]: 'Congratulations! Your judge application has been approved. Welcome to the MECA Judge team!',
      [ApplicationStatus.REJECTED]: 'We regret to inform you that your judge application was not approved at this time.',
    };

    if (!application.user.email) return;

    await this.emailService.sendEmail({
      to: application.user.email,
      subject: `MECA Judge Application - ${application.status.charAt(0).toUpperCase() + application.status.slice(1)}`,
      html: `<p>Dear ${application.fullName},</p><p>${statusMessages[application.status]}</p><p>Thank you for your interest in MECA.</p><p>Best regards,<br/>MECA Team</p>`,
      text: `Dear ${application.fullName},\n\n${statusMessages[application.status]}\n\nThank you for your interest in MECA.\n\nBest regards,\nMECA Team`,
    });
  }

  // =============================================================================
  // Event Assignments
  // =============================================================================

  async createAssignment(
    dto: CreateEventJudgeAssignmentDto,
    requestedById?: string,
  ): Promise<EventJudgeAssignment> {
    const em = this.em.fork();
    const event = await em.findOne(Event, dto.event_id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const judge = await em.findOne(Judge, dto.judge_id, { populate: ['user'] });
    if (!judge) {
      throw new NotFoundException('Judge not found');
    }

    if (!judge.isActive) {
      throw new BadRequestException('Cannot assign inactive judge to event');
    }

    // Check if assignment already exists
    const existingAssignment = await em.findOne(EventJudgeAssignment, {
      event: { id: dto.event_id },
      judge: { id: dto.judge_id },
    });

    if (existingAssignment) {
      throw new BadRequestException('This judge is already assigned to this event');
    }

    const assignment = new EventJudgeAssignment();
    assignment.event = event;
    assignment.judge = judge;
    assignment.role = dto.role || EventAssignmentRole.SUPPORTING;
    assignment.requestType = dto.request_type;
    assignment.status = EventAssignmentStatus.REQUESTED;

    if (requestedById) {
      const requestedBy = await em.findOne(Profile, requestedById);
      if (requestedBy) {
        assignment.requestedBy = requestedBy;
      }
    }

    await em.persistAndFlush(assignment);

    // Send notification email to judge
    await this.sendAssignmentNotification(assignment, 'new');

    return assignment;
  }

  async getAssignment(assignmentId: string): Promise<EventJudgeAssignment> {
    const em = this.em.fork();
    const assignment = await em.findOne(EventJudgeAssignment, assignmentId, {
      populate: ['event', 'judge', 'judge.user', 'requestedBy'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  async getEventAssignments(eventId: string): Promise<EventJudgeAssignment[]> {
    const em = this.em.fork();
    return em.find(EventJudgeAssignment, { event: { id: eventId } }, {
      populate: ['judge', 'judge.user', 'requestedBy'],
      orderBy: { role: 'ASC', createdAt: 'ASC' },
    });
  }

  async getJudgeAssignments(
    judgeId: string,
    filters?: {
      status?: EventAssignmentStatus;
      upcoming?: boolean;
    }
  ): Promise<EventJudgeAssignment[]> {
    const em = this.em.fork();
    const where: any = { judge: { id: judgeId } };

    if (filters?.status) {
      where.status = filters.status;
    }

    const assignments = await em.find(EventJudgeAssignment, where, {
      populate: ['event', 'requestedBy'],
      orderBy: { createdAt: 'DESC' },
    });

    // Filter for upcoming events if requested
    if (filters?.upcoming) {
      const now = new Date();
      return assignments.filter(a => a.event.eventDate && new Date(a.event.eventDate) >= now);
    }

    return assignments;
  }

  async getMyAssignments(
    userId: string,
    filters?: {
      status?: EventAssignmentStatus;
      upcoming?: boolean;
    }
  ): Promise<EventJudgeAssignment[]> {
    const em = this.em.fork();
    const judge = await em.findOne(Judge, { user: { id: userId } });
    if (!judge) {
      return [];
    }

    return this.getJudgeAssignments(judge.id, filters);
  }

  async respondToAssignment(
    assignmentId: string,
    userId: string,
    accept: boolean,
    declineReason?: string,
  ): Promise<EventJudgeAssignment> {
    const em = this.em.fork();
    const assignment = await em.findOne(EventJudgeAssignment, assignmentId, {
      populate: ['judge', 'judge.user', 'event'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Verify the user is the assigned judge
    if (assignment.judge.user.id !== userId) {
      throw new ForbiddenException('You can only respond to your own assignments');
    }

    if (assignment.status !== EventAssignmentStatus.REQUESTED) {
      throw new BadRequestException('This assignment has already been responded to');
    }

    assignment.status = accept ? EventAssignmentStatus.ACCEPTED : EventAssignmentStatus.DECLINED;
    assignment.respondedAt = new Date();

    if (!accept && declineReason) {
      assignment.notes = declineReason;
    }

    await em.flush();

    // Send notification about the response
    await this.sendAssignmentNotification(assignment, accept ? 'accepted' : 'declined');

    return assignment;
  }

  async updateAssignment(
    assignmentId: string,
    dto: UpdateEventJudgeAssignmentDto,
  ): Promise<EventJudgeAssignment> {
    const em = this.em.fork();
    const assignment = await em.findOneOrFail(EventJudgeAssignment, assignmentId, {
      populate: ['judge', 'judge.user', 'event'],
    });

    if (dto.role !== undefined) assignment.role = dto.role;
    if (dto.status !== undefined) {
      const oldStatus = assignment.status;
      assignment.status = dto.status;

      // If status changed to confirmed, accepted, etc. - send notification
      if (oldStatus !== dto.status) {
        await this.sendAssignmentNotification(assignment, 'updated');
      }
    }
    if (dto.admin_notes !== undefined) assignment.notes = dto.admin_notes;

    await em.flush();
    return assignment;
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    const em = this.em.fork();
    const assignment = await em.findOneOrFail(EventJudgeAssignment, assignmentId, {
      populate: ['judge', 'judge.user', 'event'],
    });

    // Send cancellation notification
    await this.sendAssignmentNotification(assignment, 'cancelled');

    await em.removeAndFlush(assignment);
  }

  private async sendAssignmentNotification(
    assignment: EventJudgeAssignment,
    type: 'new' | 'accepted' | 'declined' | 'updated' | 'cancelled',
  ): Promise<void> {
    const em = this.em.fork();
    await em.populate(assignment, ['judge.user', 'event']);

    const judgeEmail = assignment.judge.user?.email;
    if (!judgeEmail) return;

    const judgeName = assignment.judge.user?.first_name || 'Judge';
    const eventName = assignment.event.title || 'Event';
    const eventDate = assignment.event.eventDate
      ? new Date(assignment.event.eventDate).toLocaleDateString()
      : 'TBD';

    const subjects: Record<string, string> = {
      new: `MECA Event Assignment Request - ${eventName}`,
      accepted: `Assignment Confirmed - ${eventName}`,
      declined: `Assignment Response Received - ${eventName}`,
      updated: `Assignment Update - ${eventName}`,
      cancelled: `Assignment Cancelled - ${eventName}`,
    };

    const messages: Record<string, string> = {
      new: `You have been requested to judge at ${eventName} on ${eventDate}. Please log in to your dashboard to accept or decline this assignment.`,
      accepted: `Thank you for accepting the assignment to judge at ${eventName} on ${eventDate}. We look forward to seeing you there!`,
      declined: `Your response to the assignment request for ${eventName} has been recorded.`,
      updated: `Your assignment for ${eventName} has been updated. Please check your dashboard for details.`,
      cancelled: `Your assignment for ${eventName} on ${eventDate} has been cancelled.`,
    };

    await this.emailService.sendEmail({
      to: judgeEmail,
      subject: subjects[type],
      html: `<p>Dear ${judgeName},</p><p>${messages[type]}</p><p>Best regards,<br/>MECA Team</p>`,
      text: `Dear ${judgeName},\n\n${messages[type]}\n\nBest regards,\nMECA Team`,
    });
  }
}
