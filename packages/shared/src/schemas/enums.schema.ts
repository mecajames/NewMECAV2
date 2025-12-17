import { z } from 'zod';

// =============================================================================
// TypeScript Enums (Single Source of Truth)
// =============================================================================

export enum UserRole {
  USER = 'user',
  EVENT_DIRECTOR = 'event_director',
  RETAILER = 'retailer',
  ADMIN = 'admin',
}

export enum MembershipStatus {
  NONE = 'none',
  ACTIVE = 'active',
  EXPIRED = 'expired',
}

export enum MembershipType {
  DOMESTIC = 'domestic',
  INTERNATIONAL = 'international',
  TEAM = 'team',
  RETAILER = 'retailer',
  ANNUAL = 'annual',
  LIFETIME = 'lifetime',
}

export enum EventStatus {
  PENDING = 'pending',
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NOT_PUBLIC = 'not_public',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum RegistrationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum EventHostingRequestStatus {
  PENDING = 'pending',
  ASSIGNED_TO_ED = 'assigned_to_ed',
  ED_REVIEWING = 'ed_reviewing',
  ED_ACCEPTED = 'ed_accepted',
  ED_REJECTED = 'ed_rejected',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  APPROVED_PENDING_INFO = 'approved_pending_info',
  PENDING_INFO = 'pending_info',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum EDAssignmentStatus {
  PENDING_REVIEW = 'pending_review',
  ACCEPTED = 'accepted',
  REJECTED_TO_ADMIN = 'rejected_to_admin',
}

export enum FinalApprovalStatus {
  APPROVED = 'approved',
  APPROVED_PENDING_INFO = 'approved_pending_info',
  REJECTED = 'rejected',
  PENDING_INFO = 'pending_info',
}

export enum EventTypeOption {
  ONE_X = '1x Event',
  TWO_X = '2x Event',
  THREE_X = '3x Event',
  FOUR_X = '4x Event',
  BRANDED = 'Branded Event',
  SPONSORED = 'Sponsored Event',
  OTHER = 'Other',
}

export enum EventType {
  STANDARD = 'standard',
  STATE_FINALS = 'state_finals',
  WORLD_FINALS = 'world_finals',
  JUDGES_POINT = 'judges_point',
}

export enum PaymentMethod {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  CREDIT_CARD = 'credit_card',
  MANUAL = 'manual',
  WORDPRESS_PMPRO = 'wordpress_pmpro',
}

export enum PaymentType {
  MEMBERSHIP = 'membership',
  EVENT_REGISTRATION = 'event_registration',
  OTHER = 'other',
}

export enum HostType {
  BUSINESS = 'business',
  INDIVIDUAL = 'individual',
  ORGANIZATION = 'organization',
  OTHER = 'other',
}

export enum IndoorOutdoor {
  INDOOR = 'indoor',
  OUTDOOR = 'outdoor',
  BOTH = 'both',
}

export enum RulebookCategory {
  SPL_RULEBOOK = 'SPL Rulebook',
  SQL_RULEBOOK = 'SQL Rulebook',
  MECA_KIDS = 'MECA Kids',
  DUELING_DEMOS = 'Dueling Demos',
  SHOW_AND_SHINE = 'Show and Shine',
  RIDE_THE_LIGHT = 'Ride the Light',
}

export enum RulebookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVE = 'archive',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  PDF = 'pdf',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export enum SenderRole {
  REQUESTOR = 'requestor',
  EVENT_DIRECTOR = 'event_director',
  ADMIN = 'admin',
}

export enum RecipientType {
  REQUESTOR = 'requestor',
  EVENT_DIRECTOR = 'event_director',
  ADMIN = 'admin',
  ALL = 'all',
}

export enum EntryMethod {
  MANUAL = 'manual',
  EXCEL = 'excel',
  TERMLAB = 'termlab',
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum MembershipCategory {
  COMPETITOR = 'competitor',
  TEAM = 'team',
  RETAIL = 'retail',
  MANUFACTURER = 'manufacturer',
}

export enum ManufacturerTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
}

// =============================================================================
// Support Ticket Enums
// =============================================================================

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  AWAITING_RESPONSE = 'awaiting_response',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TicketCategory {
  GENERAL = 'general',
  MEMBERSHIP = 'membership',
  EVENT_REGISTRATION = 'event_registration',
  PAYMENT = 'payment',
  TECHNICAL = 'technical',
  COMPETITION_RESULTS = 'competition_results',
  EVENT_HOSTING = 'event_hosting',
  ACCOUNT = 'account',
  OTHER = 'other',
}

export enum TicketDepartment {
  GENERAL_SUPPORT = 'general_support',
  MEMBERSHIP_SERVICES = 'membership_services',
  EVENT_OPERATIONS = 'event_operations',
  TECHNICAL_SUPPORT = 'technical_support',
  BILLING = 'billing',
  ADMINISTRATION = 'administration',
}

// =============================================================================
// Zod Schemas (using z.nativeEnum for type safety)
// =============================================================================

export const UserRoleSchema = z.nativeEnum(UserRole);
export const MembershipStatusSchema = z.nativeEnum(MembershipStatus);
export const MembershipTypeSchema = z.nativeEnum(MembershipType);
export const EventStatusSchema = z.nativeEnum(EventStatus);
export const PaymentStatusSchema = z.nativeEnum(PaymentStatus);
export const RegistrationStatusSchema = z.nativeEnum(RegistrationStatus);
export const EventHostingRequestStatusSchema = z.nativeEnum(EventHostingRequestStatus);
export const EDAssignmentStatusSchema = z.nativeEnum(EDAssignmentStatus);
export const FinalApprovalStatusSchema = z.nativeEnum(FinalApprovalStatus);
export const EventTypeOptionSchema = z.nativeEnum(EventTypeOption);
export const EventTypeSchema = z.nativeEnum(EventType);
export const PaymentMethodSchema = z.nativeEnum(PaymentMethod);
export const PaymentTypeSchema = z.nativeEnum(PaymentType);
export const HostTypeSchema = z.nativeEnum(HostType);
export const IndoorOutdoorSchema = z.nativeEnum(IndoorOutdoor);
export const RulebookCategorySchema = z.nativeEnum(RulebookCategory);
export const RulebookStatusSchema = z.nativeEnum(RulebookStatus);
export const MediaTypeSchema = z.nativeEnum(MediaType);
export const SenderRoleSchema = z.nativeEnum(SenderRole);
export const RecipientTypeSchema = z.nativeEnum(RecipientType);
export const EntryMethodSchema = z.nativeEnum(EntryMethod);
export const AuditActionSchema = z.nativeEnum(AuditAction);
export const MembershipCategorySchema = z.nativeEnum(MembershipCategory);
export const ManufacturerTierSchema = z.nativeEnum(ManufacturerTier);

// Support Ticket Schemas
export const TicketStatusSchema = z.nativeEnum(TicketStatus);
export const TicketPrioritySchema = z.nativeEnum(TicketPriority);
export const TicketCategorySchema = z.nativeEnum(TicketCategory);
export const TicketDepartmentSchema = z.nativeEnum(TicketDepartment);
