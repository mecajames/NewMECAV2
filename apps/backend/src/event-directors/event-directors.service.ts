import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { v4 as uuidv4 } from 'uuid';
import {
  ApplicationStatus,
  ApplicationEntryMethod,
  WeekendAvailability,
  CreateEventDirectorApplicationDto,
  AdminQuickCreateEventDirectorApplicationDto,
  AdminDirectCreateEventDirectorDto,
  ReviewEventDirectorApplicationDto,
  CreateEventDirectorAssignmentDto,
  UpdateEventDirectorAssignmentDto,
  EventAssignmentStatus,
  AssignmentRequestType,
  UserRole,
} from '@newmeca/shared';
import { EventDirectorApplication } from './event-director-application.entity';
import { EventDirectorApplicationReference } from './event-director-application-reference.entity';
import { EventDirector } from './event-director.entity';
import { EventDirectorAssignment } from './event-director-assignment.entity';
import { Profile } from '../profiles/profiles.entity';
import { Event } from '../events/events.entity';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { EmailService } from '../email/email.service';
import { EmailVerificationToken } from '../auth/email-verification-token.entity';

@Injectable()
export class EventDirectorsService {
  constructor(
    private readonly em: EntityManager,
    private readonly supabaseAdminService: SupabaseAdminService,
    private readonly emailService: EmailService,
  ) {}

  // =============================================================================
  // Public: Directory
  // =============================================================================

  async getDirectory(filters?: { state?: string; region?: string }) {
    const qb = this.em.createQueryBuilder(EventDirector, 'ed')
      .select([
        'ed.id',
        'p.first_name as firstName',
        'p.last_name as lastName',
        'p.avatar_url as avatarUrl',
        'ed.location_state as state',
        'ed.location_city as city',
        'ed.total_events_directed as totalEventsDirected',
        'ed.average_rating as averageRating',
      ])
      .leftJoin('ed.user', 'p')
      .where({ isActive: true });

    if (filters?.state) {
      qb.andWhere({ state: filters.state });
    }

    const results = await qb.execute();
    return results.map((r: any) => ({
      id: r.id,
      name: `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Unknown',
      avatar_url: r.avatarUrl,
      state: r.state,
      city: r.city,
      regions_managed: [],
      total_events_directed: r.totalEventsDirected || 0,
      average_rating: r.averageRating || 0,
    }));
  }

  // =============================================================================
  // User: Applications
  // =============================================================================

  async createApplication(userId: string, dto: CreateEventDirectorApplicationDto): Promise<EventDirectorApplication> {
    // Check if user already has an application
    const existing = await this.em.findOne(EventDirectorApplication, { user: userId });
    if (existing) {
      throw new BadRequestException('You have already submitted an Event Director application');
    }

    // Check if user is already an ED
    const existingED = await this.em.findOne(EventDirector, { user: userId });
    if (existingED) {
      throw new BadRequestException('You are already registered as an Event Director');
    }

    // Create application
    const application = new EventDirectorApplication();
    application.user = this.em.getReference(Profile, userId);
    application.status = ApplicationStatus.PENDING;
    application.applicationDate = new Date();
    application.fullName = dto.full_name;
    application.preferredName = dto.preferred_name;
    application.dateOfBirth = new Date(dto.date_of_birth);
    application.phone = dto.phone;
    application.secondaryPhone = dto.secondary_phone;
    application.headshotUrl = dto.headshot_url;
    application.country = dto.country;
    application.state = dto.state;
    application.city = dto.city;
    application.zip = dto.zip;
    application.travelRadius = dto.travel_radius;
    application.additionalRegions = dto.additional_regions || [];
    application.weekendAvailability = dto.weekend_availability;
    application.availabilityNotes = dto.availability_notes;
    application.yearsInIndustry = dto.years_in_industry;
    application.eventManagementExperience = dto.event_management_experience;
    application.teamManagementExperience = dto.team_management_experience;
    application.equipmentResources = dto.equipment_resources;
    application.specializedFormats = dto.specialized_formats || [];
    application.essayWhyEd = dto.essay_why_ed;
    application.essayQualifications = dto.essay_qualifications;
    application.essayAdditional = dto.essay_additional;
    application.ackIndependentContractor = dto.ack_independent_contractor;
    application.ackCodeOfConduct = dto.ack_code_of_conduct;
    application.ackBackgroundCheck = dto.ack_background_check;
    application.ackTermsConditions = dto.ack_terms_conditions;

    await this.em.persistAndFlush(application);

    // Create references
    if (dto.references && dto.references.length > 0) {
      for (const ref of dto.references) {
        const reference = new EventDirectorApplicationReference();
        reference.application = application;
        reference.fullName = ref.name;
        reference.relationship = ref.relationship;
        reference.email = ref.email;
        reference.phone = ref.phone;
        reference.company = ref.company_name;
        this.em.persist(reference);

        // Send reference verification email
        await this.sendReferenceVerificationEmail(reference, application.fullName);
      }
      await this.em.flush();
    }

    return application;
  }

  async adminQuickCreateApplication(adminId: string, dto: AdminQuickCreateEventDirectorApplicationDto): Promise<EventDirectorApplication> {
    const user = await this.em.findOneOrFail(Profile, dto.user_id);
    const admin = await this.em.findOneOrFail(Profile, adminId);

    // Check if user already has an application
    const existingApplication = await this.em.findOne(EventDirectorApplication, {
      user: { id: dto.user_id },
      status: { $in: [ApplicationStatus.PENDING, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED] },
    });

    if (existingApplication) {
      throw new BadRequestException('This user already has an active event director application');
    }

    const application = new EventDirectorApplication();
    application.user = user;
    application.enteredBy = admin;
    application.status = ApplicationStatus.PENDING;
    application.applicationDate = new Date();
    application.fullName = dto.full_name;
    application.preferredName = undefined;
    application.dateOfBirth = new Date('1990-01-01'); // Default placeholder
    application.phone = dto.phone;
    application.secondaryPhone = undefined;
    application.headshotUrl = undefined;
    application.country = dto.country;
    application.state = dto.state;
    application.city = dto.city;
    application.zip = '00000'; // Default placeholder
    application.travelRadius = dto.travel_radius;
    application.additionalRegions = [];
    application.weekendAvailability = WeekendAvailability.BOTH;
    application.availabilityNotes = undefined;
    application.yearsInIndustry = dto.years_in_industry;
    application.eventManagementExperience = 'Admin quick entry';
    application.teamManagementExperience = 'Admin quick entry';
    application.equipmentResources = undefined;
    application.specializedFormats = [];
    application.essayWhyEd = 'Admin quick entry - no essay required';
    application.essayQualifications = 'Admin quick entry - no essay required';
    application.essayAdditional = undefined;
    application.ackIndependentContractor = true;
    application.ackCodeOfConduct = true;
    application.ackBackgroundCheck = true;
    application.ackTermsConditions = true;
    application.entryMethod = ApplicationEntryMethod.ADMIN_APPLICATION;
    application.adminNotes = dto.admin_notes;

    await this.em.persistAndFlush(application);
    return application;
  }

  private async sendReferenceVerificationEmail(reference: EventDirectorApplicationReference, applicantName: string) {
    if (!reference.email) {
      console.warn('No email provided for reference, skipping verification email');
      return;
    }

    // Create verification token
    const token = new EmailVerificationToken();
    token.token = uuidv4();
    token.email = reference.email;
    token.purpose = 'ed_application' as any; // ED application verification
    token.relatedEntityId = reference.id; // Link to the reference being verified
    token.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.em.persistAndFlush(token);

    // Build verification URL
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-reference?token=${token.token}`;

    // Send email
    try {
      await this.emailService.sendReferenceVerificationEmail({
        referenceEmail: reference.email || '',
        referenceName: reference.fullName,
        applicantName: applicantName,
        verificationUrl: verificationUrl,
        applicationType: 'Event Director',
      });
    } catch (error) {
      console.error('Failed to send reference verification email:', error);
    }
  }

  async getMyApplication(userId: string): Promise<EventDirectorApplication | null> {
    const application = await this.em.findOne(EventDirectorApplication, { user: userId }, {
      populate: ['references'],
    });
    return application;
  }

  async getMyProfile(userId: string): Promise<EventDirector | null> {
    return this.em.findOne(EventDirector, { user: userId });
  }

  // =============================================================================
  // Admin: Applications
  // =============================================================================

  async getAllApplications(filters?: { status?: ApplicationStatus; region?: string }): Promise<EventDirectorApplication[]> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;

    return this.em.find(EventDirectorApplication, where, {
      orderBy: { applicationDate: 'DESC' },
      populate: ['references'],
    });
  }

  async getApplication(id: string): Promise<EventDirectorApplication> {
    const application = await this.em.findOne(EventDirectorApplication, id, {
      populate: ['references', 'user'],
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
  }

  async reviewApplication(
    applicationId: string,
    reviewerId: string,
    dto: ReviewEventDirectorApplicationDto,
  ): Promise<EventDirectorApplication> {
    const application = await this.getApplication(applicationId);

    application.status = dto.status;
    application.adminNotes = dto.admin_notes;
    application.reviewedBy = this.em.getReference(Profile, reviewerId);
    application.reviewedDate = new Date();
    application.updatedAt = new Date();

    if (dto.status === ApplicationStatus.APPROVED) {
      // Create EventDirector record
      await this.createEventDirectorFromApplication(application);

      // Auto-enable canApplyEventDirector permission on approval
      const user = await this.em.findOneOrFail(Profile, application.user.id);
      user.canApplyEventDirector = true;
      user.edPermissionGrantedAt = new Date();
      user.edPermissionGrantedBy = application.reviewedBy;
    }

    await this.em.flush();
    return application;
  }

  private async createEventDirectorFromApplication(
    application: EventDirectorApplication,
  ): Promise<EventDirector> {
    const eventDirector = new EventDirector();
    eventDirector.user = application.user;
    eventDirector.application = application;
    eventDirector.isActive = true;
    eventDirector.state = application.state;
    eventDirector.city = application.city;
    eventDirector.country = application.country;
    eventDirector.headshotUrl = application.headshotUrl;
    eventDirector.preferredName = application.preferredName;
    eventDirector.totalEventsDirected = 0;
    eventDirector.totalRatings = 0;
    eventDirector.approvedDate = new Date();

    await this.em.persistAndFlush(eventDirector);
    return eventDirector;
  }

  // =============================================================================
  // Admin: Event Directors
  // =============================================================================

  async getAllEventDirectors(filters?: {
    isActive?: boolean;
    state?: string;
    region?: string;
  }): Promise<EventDirector[]> {
    const where: any = {};
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.state) where.state = filters.state;

    return this.em.find(EventDirector, where, {
      populate: ['user'],
      orderBy: { createdAt: 'DESC' },
    });
  }

  async createEventDirectorDirectly(
    adminId: string,
    dto: AdminDirectCreateEventDirectorDto,
  ): Promise<EventDirector> {
    const user = await this.em.findOneOrFail(Profile, dto.user_id);
    const admin = await this.em.findOneOrFail(Profile, adminId);

    // Check if user is already an event director
    const existingED = await this.em.findOne(EventDirector, { user: { id: dto.user_id } });
    if (existingED) {
      throw new BadRequestException('This user is already a registered event director');
    }

    // Create the event director record directly without application
    const eventDirector = new EventDirector();
    eventDirector.user = user;
    eventDirector.application = null as any; // No application - created directly by admin
    eventDirector.isActive = true;
    eventDirector.state = dto.state;
    eventDirector.city = dto.city;
    eventDirector.country = dto.country || 'USA';
    eventDirector.totalEventsDirected = 0;
    eventDirector.totalRatings = 0;
    eventDirector.approvedDate = new Date();
    eventDirector.adminNotes = dto.admin_notes;

    await this.em.persistAndFlush(eventDirector);

    // Only enable permission if explicitly requested
    if (dto.enable_permission) {
      user.canApplyEventDirector = true;
      user.edPermissionGrantedAt = new Date();
      user.edPermissionGrantedBy = admin;

      // Update user role to EVENT_DIRECTOR if not already admin
      if (user.role !== UserRole.ADMIN) {
        user.role = UserRole.EVENT_DIRECTOR;
      }

      await this.em.flush();
    }

    return eventDirector;
  }

  async getEventDirector(id: string): Promise<EventDirector> {
    const ed = await this.em.findOne(EventDirector, id, {
      populate: ['user', 'application'],
    });
    if (!ed) {
      throw new NotFoundException('Event Director not found');
    }
    return ed;
  }

  async updateEventDirector(id: string, updates: Partial<EventDirector>): Promise<EventDirector> {
    const ed = await this.getEventDirector(id);

    // Map snake_case updates to camelCase (matching actual database columns)
    const fieldMap: Record<string, string> = {
      is_active: 'isActive',
      admin_notes: 'adminNotes',
      headshot_url: 'headshotUrl',
      preferred_name: 'preferredName',
      specialized_formats: 'specializedFormats',
    };

    for (const [snakeKey, camelKey] of Object.entries(fieldMap)) {
      if ((updates as any)[snakeKey] !== undefined) {
        (ed as any)[camelKey] = (updates as any)[snakeKey];
      }
    }

    // Direct camelCase properties
    if (updates.isActive !== undefined) ed.isActive = updates.isActive;
    if (updates.bio !== undefined) ed.bio = updates.bio;

    ed.updatedAt = new Date();
    await this.em.flush();
    return ed;
  }

  // =============================================================================
  // Reference Verification
  // =============================================================================

  async verifyReference(tokenValue: string, response: string): Promise<void> {
    // Find the verification token
    const token = await this.em.findOne(EmailVerificationToken, {
      token: tokenValue,
      purpose: 'ed_application' as any,
    });

    if (!token || token.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Find the reference by email
    const reference = await this.em.findOne(EventDirectorApplicationReference, {
      email: token.email,
      referenceChecked: false,
    });

    if (!reference) {
      throw new BadRequestException('Reference not found or already verified');
    }

    reference.referenceChecked = true;
    reference.referenceNotes = response;
    reference.checkedDate = new Date();

    // Mark token as used
    token.usedAt = new Date();

    await this.em.flush();
  }

  // =============================================================================
  // Event Assignments
  // =============================================================================

  async createAssignment(
    dto: CreateEventDirectorAssignmentDto,
    requestedById?: string,
  ): Promise<EventDirectorAssignment> {
    const event = await this.em.findOne(Event, dto.event_id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const eventDirector = await this.em.findOne(EventDirector, dto.event_director_id, { populate: ['user'] });
    if (!eventDirector) {
      throw new NotFoundException('Event Director not found');
    }

    if (!eventDirector.isActive) {
      throw new BadRequestException('Cannot assign inactive event director to event');
    }

    // Check if ED has permission enabled on their profile
    if (!eventDirector.user.canApplyEventDirector) {
      throw new BadRequestException('Cannot assign event director - event director permission is not enabled on their profile');
    }

    // Check if assignment already exists
    const existingAssignment = await this.em.findOne(EventDirectorAssignment, {
      event: { id: dto.event_id },
      eventDirector: { id: dto.event_director_id },
    });

    if (existingAssignment) {
      throw new BadRequestException('This event director is already assigned to this event');
    }

    const assignment = new EventDirectorAssignment();
    assignment.event = event;
    assignment.eventDirector = eventDirector;
    assignment.requestType = dto.request_type;
    assignment.status = EventAssignmentStatus.REQUESTED;

    if (requestedById) {
      const requestedBy = await this.em.findOne(Profile, requestedById);
      if (requestedBy) {
        assignment.requestedBy = requestedBy;
      }
    }

    await this.em.persistAndFlush(assignment);

    // Send notification email
    await this.sendAssignmentNotification(assignment, 'new');

    return assignment;
  }

  async getAssignment(assignmentId: string): Promise<EventDirectorAssignment> {
    const assignment = await this.em.findOne(EventDirectorAssignment, assignmentId, {
      populate: ['event', 'eventDirector', 'eventDirector.user', 'requestedBy'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  async getEventAssignments(eventId: string): Promise<EventDirectorAssignment[]> {
    return this.em.find(EventDirectorAssignment, { event: { id: eventId } }, {
      populate: ['eventDirector', 'eventDirector.user', 'requestedBy'],
      orderBy: { createdAt: 'ASC' },
    });
  }

  async getEventDirectorAssignments(
    eventDirectorId: string,
    filters?: {
      status?: EventAssignmentStatus;
      upcoming?: boolean;
    }
  ): Promise<EventDirectorAssignment[]> {
    const where: any = { eventDirector: { id: eventDirectorId } };

    if (filters?.status) {
      where.status = filters.status;
    }

    const assignments = await this.em.find(EventDirectorAssignment, where, {
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
  ): Promise<EventDirectorAssignment[]> {
    const eventDirector = await this.em.findOne(EventDirector, { user: { id: userId } });
    if (!eventDirector) {
      return [];
    }

    return this.getEventDirectorAssignments(eventDirector.id, filters);
  }

  async respondToAssignment(
    assignmentId: string,
    userId: string,
    accept: boolean,
    declineReason?: string,
  ): Promise<EventDirectorAssignment> {
    const assignment = await this.em.findOne(EventDirectorAssignment, assignmentId, {
      populate: ['eventDirector', 'eventDirector.user', 'event'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Verify the user is the assigned event director
    if (assignment.eventDirector.user.id !== userId) {
      throw new ForbiddenException('You can only respond to your own assignments');
    }

    if (assignment.status !== EventAssignmentStatus.REQUESTED) {
      throw new BadRequestException('This assignment has already been responded to');
    }

    assignment.status = accept ? EventAssignmentStatus.ACCEPTED : EventAssignmentStatus.DECLINED;
    assignment.respondedAt = new Date();

    if (!accept && declineReason) {
      assignment.declineReason = declineReason;
    }

    await this.em.flush();

    // Send notification about the response
    await this.sendAssignmentNotification(assignment, accept ? 'accepted' : 'declined');

    return assignment;
  }

  async updateAssignment(
    assignmentId: string,
    dto: UpdateEventDirectorAssignmentDto,
  ): Promise<EventDirectorAssignment> {
    const assignment = await this.em.findOneOrFail(EventDirectorAssignment, assignmentId, {
      populate: ['eventDirector', 'eventDirector.user', 'event'],
    });

    if (dto.status !== undefined) {
      const oldStatus = assignment.status;
      assignment.status = dto.status;

      // Update totalEventsDirected counter when status changes to/from COMPLETED
      if (oldStatus !== dto.status) {
        const wasCompleted = oldStatus === EventAssignmentStatus.COMPLETED;
        const isNowCompleted = dto.status === EventAssignmentStatus.COMPLETED;

        if (!wasCompleted && isNowCompleted) {
          // Status changed TO completed - increment counter
          assignment.eventDirector.totalEventsDirected = (assignment.eventDirector.totalEventsDirected || 0) + 1;
        } else if (wasCompleted && !isNowCompleted) {
          // Status changed FROM completed - decrement counter (min 0)
          assignment.eventDirector.totalEventsDirected = Math.max(0, (assignment.eventDirector.totalEventsDirected || 0) - 1);
        }

        // Send notification for status changes
        await this.sendAssignmentNotification(assignment, 'updated');
      }
    }
    if (dto.admin_notes !== undefined) assignment.adminNotes = dto.admin_notes;

    await this.em.flush();
    return assignment;
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    const assignment = await this.em.findOneOrFail(EventDirectorAssignment, assignmentId, {
      populate: ['eventDirector', 'eventDirector.user', 'event'],
    });

    // Send cancellation notification
    await this.sendAssignmentNotification(assignment, 'cancelled');

    await this.em.removeAndFlush(assignment);
  }

  private async sendAssignmentNotification(
    assignment: EventDirectorAssignment,
    type: 'new' | 'accepted' | 'declined' | 'updated' | 'cancelled',
  ): Promise<void> {
    await this.em.populate(assignment, ['eventDirector.user', 'event']);

    const edEmail = assignment.eventDirector.user?.email;
    if (!edEmail) return;

    const edName = assignment.eventDirector.user?.first_name || 'Event Director';
    const eventName = assignment.event.title || 'Event';
    const eventDate = assignment.event.eventDate
      ? new Date(assignment.event.eventDate).toLocaleDateString()
      : 'TBD';

    const subjects: Record<string, string> = {
      new: `MECA Event Director Assignment Request - ${eventName}`,
      accepted: `Assignment Confirmed - ${eventName}`,
      declined: `Assignment Response Received - ${eventName}`,
      updated: `Assignment Update - ${eventName}`,
      cancelled: `Assignment Cancelled - ${eventName}`,
    };

    const messages: Record<string, string> = {
      new: `You have been requested to direct at ${eventName} on ${eventDate}. Please log in to your dashboard to accept or decline this assignment.`,
      accepted: `Thank you for accepting the assignment to direct at ${eventName} on ${eventDate}. We look forward to seeing you there!`,
      declined: `Your response to the assignment request for ${eventName} has been recorded.`,
      updated: `Your assignment for ${eventName} has been updated. Please check your dashboard for details.`,
      cancelled: `Your assignment for ${eventName} on ${eventDate} has been cancelled.`,
    };

    await this.emailService.sendEmail({
      to: edEmail,
      subject: subjects[type],
      html: `<p>Dear ${edName},</p><p>${messages[type]}</p><p>Best regards,<br/>MECA Team</p>`,
      text: `Dear ${edName},\n\n${messages[type]}\n\nBest regards,\nMECA Team`,
    });
  }
}
