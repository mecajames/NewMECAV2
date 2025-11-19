import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { EventHostingRequest } from './event-hosting-requests.entity';
import { EventHostingRequestStatus } from '../types/enums';

@Injectable()
export class EventHostingRequestsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
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

    // Map snake_case to camelCase
    if ((data as any).first_name !== undefined) transformedData.firstName = (data as any).first_name;
    if ((data as any).last_name !== undefined) transformedData.lastName = (data as any).last_name;
    if ((data as any).business_name !== undefined) transformedData.businessName = (data as any).business_name;
    if ((data as any).event_name !== undefined) transformedData.eventName = (data as any).event_name;
    if ((data as any).event_type !== undefined) transformedData.eventType = (data as any).event_type;
    if ((data as any).event_type_other !== undefined) transformedData.eventTypeOther = (data as any).event_type_other;
    if ((data as any).event_description !== undefined) transformedData.eventDescription = (data as any).event_description;
    if ((data as any).event_start_date !== undefined) transformedData.eventStartDate = (data as any).event_start_date;
    if ((data as any).event_start_time !== undefined) transformedData.eventStartTime = (data as any).event_start_time;
    if ((data as any).event_end_date !== undefined) transformedData.eventEndDate = (data as any).event_end_date;
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
    if ((data as any).user_id !== undefined) transformedData.user = (data as any).user_id;

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

    // Transform snake_case API fields to camelCase entity properties
    const transformedData: any = {};

    // Map snake_case to camelCase
    if ((data as any).first_name !== undefined) transformedData.firstName = (data as any).first_name;
    if ((data as any).last_name !== undefined) transformedData.lastName = (data as any).last_name;
    if ((data as any).business_name !== undefined) transformedData.businessName = (data as any).business_name;
    if ((data as any).event_name !== undefined) transformedData.eventName = (data as any).event_name;
    if ((data as any).event_type !== undefined) transformedData.eventType = (data as any).event_type;
    if ((data as any).event_type_other !== undefined) transformedData.eventTypeOther = (data as any).event_type_other;
    if ((data as any).event_description !== undefined) transformedData.eventDescription = (data as any).event_description;
    if ((data as any).event_start_date !== undefined) transformedData.eventStartDate = (data as any).event_start_date;
    if ((data as any).event_start_time !== undefined) transformedData.eventStartTime = (data as any).event_start_time;
    if ((data as any).event_end_date !== undefined) transformedData.eventEndDate = (data as any).event_end_date;
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
    if ((data as any).admin_response_date !== undefined) transformedData.adminResponseDate = (data as any).admin_response_date;
    if ((data as any).admin_responder_id !== undefined) transformedData.adminResponder = (data as any).admin_responder_id;

    // Copy fields that don't need transformation
    if (data.email !== undefined) transformedData.email = data.email;
    if (data.phone !== undefined) transformedData.phone = data.phone;
    if (data.city !== undefined) transformedData.city = data.city;
    if (data.state !== undefined) transformedData.state = data.state;
    if (data.country !== undefined) transformedData.country = data.country;
    if (data.status !== undefined) transformedData.status = data.status;

    em.assign(request, transformedData);
    await em.flush();
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
}
