import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { EventHostingRequestStatus, EventTypeOption, EDAssignmentStatus, FinalApprovalStatus, HostType, IndoorOutdoor } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { Event } from '../events/events.entity';

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

  @Property({ type: 'text', nullable: true, fieldName: 'host_type', serializedName: 'host_type' })
  hostType?: string;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'user_id', serializedName: 'user_id' })
  user?: Profile;

  // Venue Information
  @Property({ type: 'text', nullable: true, fieldName: 'venue_name', serializedName: 'venue_name' })
  venueName?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'indoor_outdoor', serializedName: 'indoor_outdoor' })
  indoorOutdoor?: string;

  @Property({ type: 'boolean', nullable: true, fieldName: 'power_available', serializedName: 'power_available' })
  powerAvailable?: boolean;

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

  // Competition Formats
  @Property({ type: 'json', nullable: true, fieldName: 'competition_formats', serializedName: 'competition_formats' })
  competitionFormats?: string[];

  // Multi-Day Event Support
  @Property({ type: 'boolean', nullable: true, default: false, fieldName: 'is_multi_day', serializedName: 'is_multi_day' })
  isMultiDay?: boolean;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'day_2_date', serializedName: 'day_2_date' })
  day2Date?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'day_2_start_time', serializedName: 'day_2_start_time' })
  day2StartTime?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'day_2_end_time', serializedName: 'day_2_end_time' })
  day2EndTime?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'day_3_date', serializedName: 'day_3_date' })
  day3Date?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'day_3_start_time', serializedName: 'day_3_start_time' })
  day3StartTime?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'day_3_end_time', serializedName: 'day_3_end_time' })
  day3EndTime?: string;

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

  // Registration Information
  @Property({ type: 'boolean', nullable: true, fieldName: 'has_registration_fee', serializedName: 'has_registration_fee' })
  hasRegistrationFee?: boolean;

  @Property({ type: 'text', nullable: true, fieldName: 'estimated_entry_fee', serializedName: 'estimated_entry_fee' })
  estimatedEntryFee?: string;

  @Property({ type: 'boolean', nullable: true, fieldName: 'pre_registration_available', serializedName: 'pre_registration_available' })
  preRegistrationAvailable?: boolean;

  // Entry Fees (per class/format)
  @Property({ type: 'text', nullable: true, fieldName: 'member_entry_fee', serializedName: 'member_entry_fee' })
  memberEntryFee?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'non_member_entry_fee', serializedName: 'non_member_entry_fee' })
  nonMemberEntryFee?: string;

  // Gate Fee
  @Property({ type: 'boolean', nullable: true, fieldName: 'has_gate_fee', serializedName: 'has_gate_fee' })
  hasGateFee?: boolean;

  @Property({ type: 'text', nullable: true, fieldName: 'gate_fee', serializedName: 'gate_fee' })
  gateFee?: string;

  @Enum(() => EventHostingRequestStatus)
  status: EventHostingRequestStatus = EventHostingRequestStatus.PENDING;

  // Admin Response
  @Property({ type: 'text', nullable: true, fieldName: 'admin_response', serializedName: 'admin_response' })
  adminResponse?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'admin_response_date', serializedName: 'admin_response_date' })
  adminResponseDate?: Date;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'admin_responder_id', serializedName: 'admin_responder_id' })
  adminResponder?: Profile;

  // Event Director Assignment
  @Property({ type: 'uuid', fieldName: 'assigned_event_director_id', serializedName: 'assigned_event_director_id', persist: false, nullable: true })
  assignedEventDirectorId?: string;

  @ManyToOne(() => Profile, { fieldName: 'assigned_event_director_id', nullable: true, hidden: true })
  assignedEventDirector?: Profile;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'assigned_at', serializedName: 'assigned_at' })
  assignedAt?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'assignment_notes', serializedName: 'assignment_notes' })
  assignmentNotes?: string;

  // ED Status
  @Property({ type: 'text', nullable: true, fieldName: 'ed_status', serializedName: 'ed_status' })
  edStatus?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'ed_response_date', serializedName: 'ed_response_date' })
  edResponseDate?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'ed_rejection_reason', serializedName: 'ed_rejection_reason' })
  edRejectionReason?: string;

  // Final Status
  @Property({ type: 'text', nullable: true, fieldName: 'final_status', serializedName: 'final_status' })
  finalStatus?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'final_status_reason', serializedName: 'final_status_reason' })
  finalStatusReason?: string;

  @Property({ type: 'boolean', default: false, fieldName: 'awaiting_requestor_response', serializedName: 'awaiting_requestor_response' })
  awaitingRequestorResponse: boolean = false;

  // Link to Created Event
  @Property({ type: 'uuid', fieldName: 'created_event_id', serializedName: 'created_event_id', persist: false, nullable: true })
  createdEventId?: string;

  @ManyToOne(() => Event, { fieldName: 'created_event_id', nullable: true, hidden: true })
  createdEvent?: Event;

  // Timestamps
  @Property({ onCreate: () => new Date(), serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
