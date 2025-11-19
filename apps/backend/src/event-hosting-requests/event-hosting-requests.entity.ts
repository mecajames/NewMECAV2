import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { EventHostingRequestStatus, EventTypeOption } from '../types/enums';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'event_hosting_requests', schema: 'public' })
export class EventHostingRequest {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  // Requester Information
  @Property({ type: 'text', fieldName: 'first_name', serializedName: 'first_name' })
  firstName!: string;

  @Property({ type: 'text', fieldName: 'last_name', serializedName: 'last_name' })
  lastName!: string;

  @Property({ type: 'text' })
  email!: string;

  @Property({ type: 'text', nullable: true })
  phone?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'business_name', serializedName: 'business_name' })
  businessName?: string;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'user_id', serializedName: 'user_id' })
  user?: Profile;

  // Event Information
  @Property({ type: 'text', fieldName: 'event_name', serializedName: 'event_name' })
  eventName!: string;

  @Enum(() => EventTypeOption)
  eventType!: EventTypeOption;

  @Property({ type: 'text', nullable: true, fieldName: 'event_type_other', serializedName: 'event_type_other' })
  eventTypeOther?: string;

  @Property({ type: 'text', fieldName: 'event_description', serializedName: 'event_description' })
  eventDescription!: string;

  // Event Dates
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'event_start_date', serializedName: 'event_start_date' })
  eventStartDate?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'event_start_time', serializedName: 'event_start_time' })
  eventStartTime?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'event_end_date', serializedName: 'event_end_date' })
  eventEndDate?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'event_end_time', serializedName: 'event_end_time' })
  eventEndTime?: string;

  // Location Information
  @Property({ type: 'text', nullable: true, fieldName: 'address_line_1', serializedName: 'address_line_1' })
  addressLine1?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'address_line_2', serializedName: 'address_line_2' })
  addressLine2?: string;

  @Property({ type: 'text', nullable: true })
  city?: string;

  @Property({ type: 'text', nullable: true })
  state?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'postal_code', serializedName: 'postal_code' })
  postalCode?: string;

  @Property({ type: 'text', nullable: true, default: 'United States' })
  country?: string;

  // Venue Information
  @Property({ type: 'text', nullable: true, fieldName: 'venue_type', serializedName: 'venue_type' })
  venueType?: string;

  @Property({ type: 'integer', nullable: true, fieldName: 'expected_participants', serializedName: 'expected_participants' })
  expectedParticipants?: number;

  @Property({ type: 'boolean', nullable: true, fieldName: 'has_hosted_before', serializedName: 'has_hosted_before' })
  hasHostedBefore?: boolean;

  // Additional Services
  @Property({ type: 'json', nullable: true, fieldName: 'additional_services', serializedName: 'additional_services' })
  additionalServices?: string[];

  @Property({ type: 'text', nullable: true, fieldName: 'other_services_details', serializedName: 'other_services_details' })
  otherServicesDetails?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'other_requests', serializedName: 'other_requests' })
  otherRequests?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'additional_info', serializedName: 'additional_info' })
  additionalInfo?: string;

  // Budget and Status
  @Property({ type: 'text', nullable: true, fieldName: 'estimated_budget', serializedName: 'estimated_budget' })
  estimatedBudget?: string;

  @Enum(() => EventHostingRequestStatus)
  status: EventHostingRequestStatus = EventHostingRequestStatus.PENDING;

  // Admin Response
  @Property({ type: 'text', nullable: true, fieldName: 'admin_response', serializedName: 'admin_response' })
  adminResponse?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'admin_response_date', serializedName: 'admin_response_date' })
  adminResponseDate?: Date;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'admin_responder_id', serializedName: 'admin_responder_id' })
  adminResponder?: Profile;

  // Timestamps
  @Property({ onCreate: () => new Date(), serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
