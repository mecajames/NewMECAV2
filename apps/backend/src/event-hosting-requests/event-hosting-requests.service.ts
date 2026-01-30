import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { EventHostingRequest } from './event-hosting-requests.entity';
import { EventHostingRequestMessage } from './event-hosting-request-message.entity';
import { EventHostingRequestStatus, EDAssignmentStatus, FinalApprovalStatus, EventStatus, EventTypeOption, SenderRole, RecipientType, UserRole } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { Event } from '../events/events.entity';
import { EventDirector } from '../event-directors/event-director.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class EventHostingRequestsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly notificationsService: NotificationsService,
    private readonly eventsService: EventsService,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: EventHostingRequestStatus,
    search?: string,
  ): Promise<{ data: EventHostingRequest[]; total: number }> {
    const em = this.em.fork();
    const offset = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.$or = [
        { firstName: { $ilike: `%${search}%` } },
        { lastName: { $ilike: `%${search}%` } },
        { email: { $ilike: `%${search}%` } },
        { eventName: { $ilike: `%${search}%` } },
        { businessName: { $ilike: `%${search}%` } },
      ];
    }

    const [data, total] = await em.findAndCount(
      EventHostingRequest,
      where,
      {
        limit,
        offset,
        orderBy: { createdAt: 'DESC' },
        populate: ['user', 'adminResponder'],
      }
    );

    return { data, total };
  }

  async findById(id: string): Promise<EventHostingRequest> {
    const em = this.em.fork();
    const request = await em.findOne(
      EventHostingRequest,
      { id },
      { populate: ['user', 'adminResponder'] }
    );
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${id} not found`);
    }
    return request;
  }

  async findByUserId(userId: string): Promise<EventHostingRequest[]> {
    const em = this.em.fork();
    return em.find(
      EventHostingRequest,
      { user: userId },
      {
        orderBy: { createdAt: 'DESC' },
        populate: ['adminResponder'],
      }
    );
  }

  async create(data: Partial<EventHostingRequest>): Promise<EventHostingRequest> {
    const em = this.em.fork();

    // Transform snake_case API fields to camelCase entity properties
    const transformedData: any = {
      status: EventHostingRequestStatus.PENDING,
    };

    // Map snake_case to camelCase - Basic Info
    if ((data as any).first_name !== undefined) transformedData.firstName = (data as any).first_name;
    if ((data as any).last_name !== undefined) transformedData.lastName = (data as any).last_name;
    if ((data as any).business_name !== undefined) transformedData.businessName = (data as any).business_name;
    if ((data as any).host_type !== undefined) transformedData.hostType = (data as any).host_type;
    if ((data as any).user_id !== undefined) transformedData.user = (data as any).user_id;

    // Venue Information
    if ((data as any).venue_name !== undefined) transformedData.venueName = (data as any).venue_name;
    if ((data as any).venue_type !== undefined) transformedData.venueType = (data as any).venue_type;
    if ((data as any).indoor_outdoor !== undefined) transformedData.indoorOutdoor = (data as any).indoor_outdoor;
    if ((data as any).power_available !== undefined) transformedData.powerAvailable = (data as any).power_available;

    // Event Information
    if ((data as any).event_name !== undefined) transformedData.eventName = (data as any).event_name;
    if ((data as any).event_type !== undefined) transformedData.eventType = (data as any).event_type;
    if ((data as any).event_type_other !== undefined) transformedData.eventTypeOther = (data as any).event_type_other;
    if ((data as any).event_description !== undefined) transformedData.eventDescription = (data as any).event_description;

    // Event Dates
    if ((data as any).event_start_date !== undefined) transformedData.eventStartDate = (data as any).event_start_date;
    if ((data as any).event_start_time !== undefined) transformedData.eventStartTime = (data as any).event_start_time;
    if ((data as any).event_end_date !== undefined) transformedData.eventEndDate = (data as any).event_end_date;
    if ((data as any).event_end_time !== undefined) transformedData.eventEndTime = (data as any).event_end_time;

    // Multi-Day Support
    if ((data as any).is_multi_day !== undefined) transformedData.isMultiDay = (data as any).is_multi_day;
    if ((data as any).day_2_date !== undefined) transformedData.day2Date = (data as any).day_2_date;
    if ((data as any).day_2_start_time !== undefined) transformedData.day2StartTime = (data as any).day_2_start_time;
    if ((data as any).day_2_end_time !== undefined) transformedData.day2EndTime = (data as any).day_2_end_time;
    if ((data as any).day_3_date !== undefined) transformedData.day3Date = (data as any).day_3_date;
    if ((data as any).day_3_start_time !== undefined) transformedData.day3StartTime = (data as any).day_3_start_time;
    if ((data as any).day_3_end_time !== undefined) transformedData.day3EndTime = (data as any).day_3_end_time;

    // Competition Formats
    if ((data as any).competition_formats !== undefined) transformedData.competitionFormats = (data as any).competition_formats;

    // Location
    if ((data as any).address_line_1 !== undefined) transformedData.addressLine1 = (data as any).address_line_1;
    if ((data as any).address_line_2 !== undefined) transformedData.addressLine2 = (data as any).address_line_2;
    if ((data as any).postal_code !== undefined) transformedData.postalCode = (data as any).postal_code;

    // Additional Info
    if ((data as any).expected_participants !== undefined) transformedData.expectedParticipants = (data as any).expected_participants;
    if ((data as any).has_hosted_before !== undefined) transformedData.hasHostedBefore = (data as any).has_hosted_before;
    if ((data as any).estimated_budget !== undefined) transformedData.estimatedBudget = (data as any).estimated_budget;

    // Registration & Fees
    if ((data as any).has_registration_fee !== undefined) transformedData.hasRegistrationFee = (data as any).has_registration_fee;
    if ((data as any).estimated_entry_fee !== undefined) transformedData.estimatedEntryFee = (data as any).estimated_entry_fee;
    if ((data as any).member_entry_fee !== undefined) transformedData.memberEntryFee = (data as any).member_entry_fee;
    if ((data as any).non_member_entry_fee !== undefined) transformedData.nonMemberEntryFee = (data as any).non_member_entry_fee;
    if ((data as any).has_gate_fee !== undefined) transformedData.hasGateFee = (data as any).has_gate_fee;
    if ((data as any).gate_fee !== undefined) transformedData.gateFee = (data as any).gate_fee;
    if ((data as any).pre_registration_available !== undefined) transformedData.preRegistrationAvailable = (data as any).pre_registration_available;

    // Additional Services
    if ((data as any).additional_services !== undefined) transformedData.additionalServices = (data as any).additional_services;
    if ((data as any).other_services_details !== undefined) transformedData.otherServicesDetails = (data as any).other_services_details;
    if ((data as any).other_requests !== undefined) transformedData.otherRequests = (data as any).other_requests;
    if ((data as any).additional_info !== undefined) transformedData.additionalInfo = (data as any).additional_info;

    // Copy fields that don't need transformation
    if (data.email !== undefined) transformedData.email = data.email;
    if (data.phone !== undefined) transformedData.phone = data.phone;
    if (data.city !== undefined) transformedData.city = data.city;
    if (data.state !== undefined) transformedData.state = data.state;
    if (data.country !== undefined) transformedData.country = data.country;

    const request = em.create(EventHostingRequest, transformedData);
    await em.persistAndFlush(request);
    return request;
  }

  async update(id: string, data: Partial<EventHostingRequest>): Promise<EventHostingRequest> {
    const em = this.em.fork();
    const request = await em.findOne(EventHostingRequest, { id });
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${id} not found`);
    }

    // Helper function to sanitize date fields (convert empty strings to null)
    const sanitizeDate = (value: any): Date | null | undefined => {
      if (value === undefined) return undefined;
      if (value === '' || value === null) return null;
      return value;
    };

    // Transform snake_case API fields to camelCase entity properties
    const transformedData: any = {};

    // Map snake_case to camelCase
    if ((data as any).first_name !== undefined) transformedData.firstName = (data as any).first_name;
    if ((data as any).last_name !== undefined) transformedData.lastName = (data as any).last_name;
    if ((data as any).business_name !== undefined) transformedData.businessName = (data as any).business_name;
    if ((data as any).event_name !== undefined) transformedData.eventName = (data as any).event_name;
    // Only set eventType if it's a valid enum value
    if ((data as any).event_type !== undefined && (data as any).event_type !== '') {
      const validEventTypes = Object.values(EventTypeOption);
      if (validEventTypes.includes((data as any).event_type)) {
        transformedData.eventType = (data as any).event_type;
      }
    }
    if ((data as any).event_type_other !== undefined) transformedData.eventTypeOther = (data as any).event_type_other;
    if ((data as any).event_description !== undefined) transformedData.eventDescription = (data as any).event_description;
    // Date fields - sanitize empty strings to null
    if ((data as any).event_start_date !== undefined) transformedData.eventStartDate = sanitizeDate((data as any).event_start_date);
    if ((data as any).event_start_time !== undefined) transformedData.eventStartTime = (data as any).event_start_time;
    if ((data as any).event_end_date !== undefined) transformedData.eventEndDate = sanitizeDate((data as any).event_end_date);
    if ((data as any).event_end_time !== undefined) transformedData.eventEndTime = (data as any).event_end_time;
    if ((data as any).address_line_1 !== undefined) transformedData.addressLine1 = (data as any).address_line_1;
    if ((data as any).address_line_2 !== undefined) transformedData.addressLine2 = (data as any).address_line_2;
    if ((data as any).postal_code !== undefined) transformedData.postalCode = (data as any).postal_code;
    if ((data as any).venue_type !== undefined) transformedData.venueType = (data as any).venue_type;
    if ((data as any).expected_participants !== undefined) transformedData.expectedParticipants = (data as any).expected_participants;
    if ((data as any).has_hosted_before !== undefined) transformedData.hasHostedBefore = (data as any).has_hosted_before;
    if ((data as any).additional_services !== undefined) transformedData.additionalServices = (data as any).additional_services;
    if ((data as any).other_services_details !== undefined) transformedData.otherServicesDetails = (data as any).other_services_details;
    if ((data as any).other_requests !== undefined) transformedData.otherRequests = (data as any).other_requests;
    if ((data as any).additional_info !== undefined) transformedData.additionalInfo = (data as any).additional_info;
    if ((data as any).estimated_budget !== undefined) transformedData.estimatedBudget = (data as any).estimated_budget;
    if ((data as any).admin_response !== undefined) transformedData.adminResponse = (data as any).admin_response;
    if ((data as any).admin_response_date !== undefined) transformedData.adminResponseDate = sanitizeDate((data as any).admin_response_date);
    if ((data as any).admin_responder_id !== undefined) transformedData.adminResponder = (data as any).admin_responder_id;

    // Additional fields
    if ((data as any).host_type !== undefined) transformedData.hostType = (data as any).host_type;
    if ((data as any).venue_name !== undefined) transformedData.venueName = (data as any).venue_name;
    if ((data as any).indoor_outdoor !== undefined) transformedData.indoorOutdoor = (data as any).indoor_outdoor;
    if ((data as any).power_available !== undefined) transformedData.powerAvailable = (data as any).power_available;
    if ((data as any).is_multi_day !== undefined) transformedData.isMultiDay = (data as any).is_multi_day;
    // Multi-day date fields - sanitize empty strings to null
    if ((data as any).day_2_date !== undefined) transformedData.day2Date = sanitizeDate((data as any).day_2_date);
    if ((data as any).day_2_start_time !== undefined) transformedData.day2StartTime = (data as any).day_2_start_time;
    if ((data as any).day_2_end_time !== undefined) transformedData.day2EndTime = (data as any).day_2_end_time;
    if ((data as any).day_3_date !== undefined) transformedData.day3Date = sanitizeDate((data as any).day_3_date);
    if ((data as any).day_3_start_time !== undefined) transformedData.day3StartTime = (data as any).day_3_start_time;
    if ((data as any).day_3_end_time !== undefined) transformedData.day3EndTime = (data as any).day_3_end_time;
    if ((data as any).has_registration_fee !== undefined) transformedData.hasRegistrationFee = (data as any).has_registration_fee;
    if ((data as any).estimated_entry_fee !== undefined) transformedData.estimatedEntryFee = (data as any).estimated_entry_fee;
    if ((data as any).member_entry_fee !== undefined) transformedData.memberEntryFee = (data as any).member_entry_fee;
    if ((data as any).non_member_entry_fee !== undefined) transformedData.nonMemberEntryFee = (data as any).non_member_entry_fee;
    if ((data as any).has_gate_fee !== undefined) transformedData.hasGateFee = (data as any).has_gate_fee;
    if ((data as any).gate_fee !== undefined) transformedData.gateFee = (data as any).gate_fee;
    if ((data as any).pre_registration_available !== undefined) transformedData.preRegistrationAvailable = (data as any).pre_registration_available;
    if ((data as any).competition_formats !== undefined) transformedData.competitionFormats = (data as any).competition_formats;

    // Copy fields that don't need transformation
    if (data.email !== undefined) transformedData.email = data.email;
    if (data.phone !== undefined) transformedData.phone = data.phone;
    if (data.city !== undefined) transformedData.city = data.city;
    if (data.state !== undefined) transformedData.state = data.state;
    if (data.country !== undefined) transformedData.country = data.country;
    if (data.status !== undefined) transformedData.status = data.status;

    em.assign(request, transformedData);
    try {
      await em.flush();
    } catch (error) {
      console.error('Error updating event hosting request:', error);
      console.error('Transformed data:', JSON.stringify(transformedData, null, 2));
      throw new BadRequestException(`Failed to update request: ${(error as Error).message}`);
    }
    return request;
  }

  async respondToRequest(
    id: string,
    response: string,
    status: EventHostingRequestStatus,
    adminId: string,
  ): Promise<EventHostingRequest> {
    const em = this.em.fork();
    const request = await em.findOne(EventHostingRequest, { id });
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${id} not found`);
    }

    request.adminResponse = response;
    request.adminResponseDate = new Date();
    request.adminResponder = em.getReference('Profile', adminId) as any;
    request.status = status;

    await em.flush();
    return request;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const request = await em.findOne(EventHostingRequest, { id });
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${id} not found`);
    }
    await em.removeAndFlush(request);
  }

  async getStats(): Promise<{
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
  }> {
    const em = this.em.fork();
    const [total, pending, underReview, approved, rejected] = await Promise.all([
      em.count(EventHostingRequest, {}),
      em.count(EventHostingRequest, { status: EventHostingRequestStatus.PENDING }),
      em.count(EventHostingRequest, { status: EventHostingRequestStatus.UNDER_REVIEW }),
      em.count(EventHostingRequest, { status: EventHostingRequestStatus.APPROVED }),
      em.count(EventHostingRequest, { status: EventHostingRequestStatus.REJECTED }),
    ]);

    return { total, pending, underReview, approved, rejected };
  }

  // ==================== ASSIGNMENT METHODS ====================

  /**
   * Assign a request to an Event Director
   */
  async assignToEventDirector(
    requestId: string,
    eventDirectorId: string,
    adminId: string,
    notes?: string,
  ): Promise<EventHostingRequest> {
    const em = this.em.fork();
    const request = await em.findOne(EventHostingRequest, { id: requestId });
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${requestId} not found`);
    }

    // Verify ED exists and has event_director role
    const eventDirector = await em.findOne(Profile, { id: eventDirectorId });
    if (!eventDirector) {
      throw new NotFoundException(`Event Director with ID ${eventDirectorId} not found`);
    }

    // Update request
    request.assignedEventDirector = Reference.createFromPK(Profile, eventDirectorId) as any;
    request.assignedAt = new Date();
    request.assignmentNotes = notes;
    request.edStatus = EDAssignmentStatus.PENDING_REVIEW;
    request.status = EventHostingRequestStatus.ASSIGNED_TO_ED;

    await em.flush();

    // Send notification to Event Director
    await this.notificationsService.create({
      user: eventDirectorId,
      fromUser: adminId,
      title: 'New Event Hosting Request Assigned',
      message: `You have been assigned to review: ${request.eventName}`,
      type: 'alert',
      link: `dashboard?tab=hosting-requests&id=${requestId}`,
    } as any);

    return request;
  }

  /**
   * Reassign a request to a different Event Director
   */
  async reassignEventDirector(
    requestId: string,
    newEventDirectorId: string,
    adminId: string,
    notes?: string,
  ): Promise<EventHostingRequest> {
    const em = this.em.fork();
    const request = await em.findOne(EventHostingRequest, { id: requestId });
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${requestId} not found`);
    }

    const previousEdId = request.assignedEventDirectorId;

    // Verify new ED exists
    const newEventDirector = await em.findOne(Profile, { id: newEventDirectorId });
    if (!newEventDirector) {
      throw new NotFoundException(`Event Director with ID ${newEventDirectorId} not found`);
    }

    // Update request
    request.assignedEventDirector = Reference.createFromPK(Profile, newEventDirectorId) as any;
    request.assignedAt = new Date();
    request.assignmentNotes = notes;
    request.edStatus = EDAssignmentStatus.PENDING_REVIEW;
    request.edRejectionReason = undefined;
    request.status = EventHostingRequestStatus.ASSIGNED_TO_ED;

    await em.flush();

    // Notify new ED
    await this.notificationsService.create({
      user: newEventDirectorId,
      fromUser: adminId,
      title: 'New Event Hosting Request Assigned',
      message: `You have been assigned to review: ${request.eventName}`,
      type: 'alert',
      link: `dashboard?tab=hosting-requests&id=${requestId}`,
    } as any);

    return request;
  }

  /**
   * Admin revokes/unassigns an Event Director from a request
   */
  async revokeEDAssignment(
    requestId: string,
    adminId: string,
    reason?: string,
  ): Promise<EventHostingRequest> {
    const em = this.em.fork();
    const request = await em.findOne(EventHostingRequest, { id: requestId });
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${requestId} not found`);
    }

    const previousEdId = request.assignedEventDirectorId;
    if (!previousEdId) {
      throw new BadRequestException('This request is not assigned to any Event Director');
    }

    // Clear ED assignment
    request.assignedEventDirector = undefined as any;
    request.assignedAt = undefined;
    request.assignmentNotes = undefined;
    request.edStatus = undefined;
    request.edResponseDate = undefined;
    request.edRejectionReason = undefined;
    request.status = EventHostingRequestStatus.UNDER_REVIEW;

    await em.flush();

    // Add a message noting the revocation
    if (reason) {
      await this.addMessage(
        requestId,
        adminId,
        SenderRole.ADMIN,
        `Assignment revoked: ${reason}`,
        true, // Private message (ED/Admin only)
        RecipientType.EVENT_DIRECTOR,
      );
    }

    // Notify the ED that assignment was revoked
    await this.notificationsService.create({
      user: previousEdId,
      fromUser: adminId,
      title: 'Event Request Assignment Revoked',
      message: `Your assignment to "${request.eventName}" has been revoked by admin.`,
      type: 'alert',
      link: `dashboard?tab=hosting-requests`,
    } as any);

    return request;
  }

  // ==================== EVENT DIRECTOR ACTIONS ====================

  /**
   * Event Director accepts the assignment
   * Note: eventDirectorId is the ID from the event_directors table,
   * but assigned_event_director_id in hosting requests stores the user's profile ID
   */
  async edAcceptAssignment(
    requestId: string,
    eventDirectorId: string,
  ): Promise<EventHostingRequest> {
    const em = this.em.fork();

    // Look up the EventDirector to get the user_id (profile ID)
    const eventDirector = await em.findOne(EventDirector, { id: eventDirectorId }, { populate: ['user'] });
    if (!eventDirector) {
      throw new BadRequestException('Event Director not found');
    }
    const profileId = eventDirector.user.id;

    const request = await em.findOne(EventHostingRequest, { id: requestId });
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${requestId} not found`);
    }

    // Verify this ED is assigned to this request (compare with profile ID)
    if (request.assignedEventDirectorId !== profileId) {
      throw new BadRequestException('You are not assigned to this request');
    }

    request.edStatus = EDAssignmentStatus.ACCEPTED;
    request.edResponseDate = new Date();
    request.status = EventHostingRequestStatus.ED_ACCEPTED;

    await em.flush();

    // Notify admins
    const admins = await em.find(Profile, { role: UserRole.ADMIN });
    for (const admin of admins) {
      await this.notificationsService.create({
        user: admin.id,
        fromUser: profileId,
        title: 'Event Director Accepted Request',
        message: `Event Director has accepted to manage: ${request.eventName}`,
        type: 'info',
        link: `admin/hosting-requests?id=${requestId}`,
      } as any);
    }

    return request;
  }

  /**
   * Event Director rejects the assignment (back to admin)
   * Note: eventDirectorId is the ID from the event_directors table,
   * but assigned_event_director_id in hosting requests stores the user's profile ID
   */
  async edRejectAssignment(
    requestId: string,
    eventDirectorId: string,
    reason: string,
  ): Promise<EventHostingRequest> {
    const em = this.em.fork();

    // Look up the EventDirector to get the user_id (profile ID)
    const eventDirector = await em.findOne(EventDirector, { id: eventDirectorId }, { populate: ['user'] });
    if (!eventDirector) {
      throw new BadRequestException('Event Director not found');
    }
    const profileId = eventDirector.user.id;

    const request = await em.findOne(EventHostingRequest, { id: requestId });
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${requestId} not found`);
    }

    // Verify this ED is assigned to this request (compare with profile ID)
    if (request.assignedEventDirectorId !== profileId) {
      throw new BadRequestException('You are not assigned to this request');
    }

    request.edStatus = EDAssignmentStatus.REJECTED_TO_ADMIN;
    request.edResponseDate = new Date();
    request.edRejectionReason = reason;
    request.status = EventHostingRequestStatus.ED_REJECTED;

    await em.flush();

    // Notify admins (but NOT the requestor)
    const admins = await em.find(Profile, { role: UserRole.ADMIN });
    for (const admin of admins) {
      await this.notificationsService.create({
        user: admin.id,
        fromUser: profileId,
        title: 'Event Director Declined Request',
        message: `Event Director has declined to manage: ${request.eventName}. Reason: ${reason}`,
        type: 'alert',
        link: `admin/hosting-requests?id=${requestId}`,
      } as any);
    }

    return request;
  }

  // ==================== MESSAGING METHODS ====================

  /**
   * Add a message to the request thread
   */
  async addMessage(
    requestId: string,
    senderId: string,
    senderRole: SenderRole,
    messageText: string,
    isPrivate: boolean = false,
    recipientType?: RecipientType,
  ): Promise<EventHostingRequestMessage> {
    const em = this.em.fork();

    // Verify request exists
    const request = await em.findOne(EventHostingRequest, { id: requestId });
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${requestId} not found`);
    }

    // Create message
    const message = em.create(EventHostingRequestMessage, {
      request: Reference.createFromPK(EventHostingRequest, requestId),
      sender: Reference.createFromPK(Profile, senderId),
      senderRole,
      message: messageText,
      isPrivate,
      recipientType,
    } as any);

    await em.persistAndFlush(message);

    // Send notifications based on recipient type and privacy
    if (!isPrivate) {
      // Notify requestor if message is for them
      if (request.user && (recipientType === 'requestor' || recipientType === 'all')) {
        await this.notificationsService.create({
          user: (request.user as any).id || request.user,
          fromUser: senderId,
          title: 'New Message on Your Event Request',
          message: `You have a new message regarding: ${request.eventName}`,
          type: 'message',
          link: `my-hosting-requests?id=${requestId}`,
        } as any);
      }
    }

    // Notify ED if message is for them
    if (request.assignedEventDirectorId && (recipientType === 'event_director' || recipientType === 'all')) {
      await this.notificationsService.create({
        user: request.assignedEventDirectorId,
        fromUser: senderId,
        title: 'New Message on Assigned Request',
        message: `New message on: ${request.eventName}`,
        type: 'message',
        link: `dashboard?tab=hosting-requests&id=${requestId}`,
      } as any);
    }

    // Notify admins if message is for them
    if (recipientType === RecipientType.ADMIN || recipientType === RecipientType.ALL) {
      const admins = await em.find(Profile, { role: UserRole.ADMIN });
      for (const admin of admins) {
        if (admin.id !== senderId) {
          await this.notificationsService.create({
            user: admin.id,
            fromUser: senderId,
            title: 'New Message on Hosting Request',
            message: `New ${isPrivate ? 'private ' : ''}message on: ${request.eventName}`,
            type: 'message',
            link: `admin/hosting-requests?id=${requestId}`,
          } as any);
        }
      }
    }

    return message;
  }

  /**
   * Get messages for a request, filtered by viewer role
   */
  async getMessages(
    requestId: string,
    viewerRole: SenderRole,
  ): Promise<EventHostingRequestMessage[]> {
    const em = this.em.fork();

    const where: any = { request: requestId };

    // Requestors can only see non-private messages
    if (viewerRole === SenderRole.REQUESTOR) {
      where.isPrivate = false;
    }

    return em.find(EventHostingRequestMessage, where, {
      orderBy: { createdAt: 'ASC' },
      populate: ['sender'],
    });
  }

  // ==================== FINAL APPROVAL METHODS ====================

  /**
   * Admin sets final approval status
   */
  async setFinalApproval(
    requestId: string,
    adminId: string,
    finalStatus: FinalApprovalStatus,
    reason?: string,
  ): Promise<EventHostingRequest> {
    const em = this.em.fork();
    const request = await em.findOne(EventHostingRequest, { id: requestId });
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${requestId} not found`);
    }

    request.finalStatus = finalStatus;
    request.finalStatusReason = reason;
    request.adminResponder = Reference.createFromPK(Profile, adminId) as any;
    request.adminResponseDate = new Date();

    // Update main status based on final status
    switch (finalStatus) {
      case FinalApprovalStatus.APPROVED:
        request.status = EventHostingRequestStatus.APPROVED;
        request.awaitingRequestorResponse = false;
        break;
      case FinalApprovalStatus.APPROVED_PENDING_INFO:
        request.status = EventHostingRequestStatus.APPROVED_PENDING_INFO;
        request.awaitingRequestorResponse = true;
        break;
      case FinalApprovalStatus.REJECTED:
        request.status = EventHostingRequestStatus.REJECTED;
        request.awaitingRequestorResponse = false;
        break;
      case FinalApprovalStatus.PENDING_INFO:
        request.status = EventHostingRequestStatus.PENDING_INFO;
        request.awaitingRequestorResponse = true;
        break;
    }

    await em.flush();

    // If approved, create the event
    let createdEvent: Event | null = null;
    if (finalStatus === FinalApprovalStatus.APPROVED || finalStatus === FinalApprovalStatus.APPROVED_PENDING_INFO) {
      createdEvent = await this.createEventFromRequest(requestId);
    }

    // Notify requestor
    if (request.user) {
      const statusMessage = this.getFinalStatusMessage(finalStatus, reason);
      await this.notificationsService.create({
        user: (request.user as any).id || request.user,
        fromUser: adminId,
        title: 'Event Hosting Request Update',
        message: statusMessage,
        type: finalStatus === FinalApprovalStatus.APPROVED ? 'info' : 'alert',
        link: `my-hosting-requests?id=${requestId}`,
      } as any);
    }

    return request;
  }

  private getFinalStatusMessage(status: FinalApprovalStatus, reason?: string): string {
    switch (status) {
      case FinalApprovalStatus.APPROVED:
        return 'Your event hosting request has been approved!';
      case FinalApprovalStatus.APPROVED_PENDING_INFO:
        return `Your event hosting request has been approved pending further information. ${reason || ''}`;
      case FinalApprovalStatus.REJECTED:
        return `Your event hosting request has been rejected. ${reason || ''}`;
      case FinalApprovalStatus.PENDING_INFO:
        return `Additional information is required for your event hosting request. ${reason || ''}`;
      default:
        return 'Your event hosting request status has been updated.';
    }
  }

  /**
   * Request further information from requestor
   */
  async requestFurtherInfo(
    requestId: string,
    senderId: string,
    senderRole: SenderRole,
    messageText: string,
  ): Promise<EventHostingRequest> {
    const em = this.em.fork();
    const request = await em.findOne(EventHostingRequest, { id: requestId });
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${requestId} not found`);
    }

    request.awaitingRequestorResponse = true;
    if (request.status === EventHostingRequestStatus.PENDING || request.status === EventHostingRequestStatus.UNDER_REVIEW) {
      request.status = EventHostingRequestStatus.PENDING_INFO;
    }

    await em.flush();

    // Add message
    await this.addMessage(requestId, senderId, senderRole, messageText, false, RecipientType.REQUESTOR);

    return request;
  }

  // ==================== REQUESTOR RESPONSE ====================

  /**
   * Requestor responds to a request for information
   */
  async requestorRespond(
    requestId: string,
    requestorId: string,
    messageText: string,
  ): Promise<EventHostingRequestMessage> {
    const em = this.em.fork();
    const request = await em.findOne(EventHostingRequest, { id: requestId });
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${requestId} not found`);
    }

    // Verify requestor owns this request
    const requestUserId = (request.user as any)?.id || request.user;
    if (requestUserId !== requestorId) {
      throw new BadRequestException('You are not authorized to respond to this request');
    }

    // Verify request is awaiting response
    if (!request.awaitingRequestorResponse) {
      throw new BadRequestException('This request is not awaiting a response');
    }

    // Clear awaiting flag
    request.awaitingRequestorResponse = false;
    await em.flush();

    // Add message and notify appropriate parties
    const recipientType: RecipientType = request.assignedEventDirectorId ? RecipientType.ALL : RecipientType.ADMIN;
    return this.addMessage(requestId, requestorId, SenderRole.REQUESTOR, messageText, false, recipientType);
  }

  // ==================== EVENT DIRECTOR QUERIES ====================

  /**
   * Find requests assigned to an Event Director
   * Note: eventDirectorId is the ID from the event_directors table,
   * but assigned_event_director_id in hosting requests stores the user's profile ID
   */
  async findByEventDirector(
    eventDirectorId: string,
    status?: EventHostingRequestStatus,
  ): Promise<EventHostingRequest[]> {
    const em = this.em.fork();

    // Look up the EventDirector to get the user_id (profile ID)
    const eventDirector = await em.findOne(EventDirector, { id: eventDirectorId }, { populate: ['user'] });
    if (!eventDirector) {
      // If no EventDirector found, return empty array
      return [];
    }

    // Use the user_id (profile ID) to query hosting requests
    const profileId = eventDirector.user.id;
    const where: any = { assignedEventDirector: profileId };
    if (status) {
      where.status = status;
    }

    return em.find(EventHostingRequest, where, {
      orderBy: { createdAt: 'DESC' },
      populate: ['user', 'adminResponder'],
    });
  }

  /**
   * Get stats for Event Director dashboard
   * Note: eventDirectorId is the ID from the event_directors table,
   * but assigned_event_director_id in hosting requests stores the user's profile ID
   */
  async getEventDirectorStats(eventDirectorId: string): Promise<{
    assigned: number;
    pendingReview: number;
    accepted: number;
  }> {
    const em = this.em.fork();

    // Look up the EventDirector to get the user_id (profile ID)
    const eventDirector = await em.findOne(EventDirector, { id: eventDirectorId }, { populate: ['user'] });
    if (!eventDirector) {
      return { assigned: 0, pendingReview: 0, accepted: 0 };
    }

    const profileId = eventDirector.user.id;
    const [assigned, pendingReview, accepted] = await Promise.all([
      em.count(EventHostingRequest, { assignedEventDirector: profileId }),
      em.count(EventHostingRequest, {
        assignedEventDirector: profileId,
        edStatus: EDAssignmentStatus.PENDING_REVIEW,
      }),
      em.count(EventHostingRequest, {
        assignedEventDirector: profileId,
        edStatus: EDAssignmentStatus.ACCEPTED,
      }),
    ]);

    return { assigned, pendingReview, accepted };
  }

  // ==================== AUTO-CREATE EVENT ====================

  /**
   * Create an event from an approved hosting request
   */
  async createEventFromRequest(requestId: string): Promise<Event> {
    const em = this.em.fork();
    const request = await em.findOne(EventHostingRequest, { id: requestId });
    if (!request) {
      throw new NotFoundException(`Event hosting request with ID ${requestId} not found`);
    }

    // Build event data from request
    const eventData: any = {
      title: request.eventName,
      description: request.eventDescription,
      event_date: request.eventStartDate,
      venue_name: request.businessName || 'TBD',
      venue_address: [request.addressLine1, request.addressLine2].filter(Boolean).join(', ') || 'TBD',
      venue_city: request.city,
      venue_state: request.state,
      venue_postal_code: request.postalCode,
      venue_country: request.country || 'United States',
      max_participants: request.expectedParticipants,
      status: EventStatus.PENDING, // Event starts in pending status
    };

    // If an Event Director was assigned, set them as the event director
    if (request.assignedEventDirectorId) {
      eventData.event_director_id = request.assignedEventDirectorId;
    }

    // Create the event using EventsService
    const event = await this.eventsService.create(eventData);

    // Link the event back to the hosting request
    request.createdEvent = Reference.createFromPK(Event, event.id) as any;
    await em.flush();

    // Notify admins about the created event
    const admins = await em.find(Profile, { role: UserRole.ADMIN });
    for (const admin of admins) {
      await this.notificationsService.create({
        user: admin.id,
        title: 'Event Created from Hosting Request',
        message: `Event "${event.title}" has been created and is pending approval.`,
        type: 'info',
        link: `admin/events?id=${event.id}`,
      } as any);
    }

    return event;
  }

  // ==================== AVAILABLE EVENT DIRECTORS ====================

  /**
   * Get list of available Event Directors for assignment
   */
  async getAvailableEventDirectors(): Promise<Profile[]> {
    const em = this.em.fork();
    return em.find(Profile, {
      $or: [
        { role: UserRole.EVENT_DIRECTOR },
        { role: UserRole.ADMIN },
      ],
    }, {
      orderBy: { last_name: 'ASC', first_name: 'ASC' },
    });
  }
}
