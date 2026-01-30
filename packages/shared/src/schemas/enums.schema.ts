import { z } from 'zod';

// =============================================================================
// TypeScript Enums (Single Source of Truth)
// =============================================================================

export enum UserRole {
  USER = 'user',
  EVENT_DIRECTOR = 'event_director',
  JUDGE = 'judge',
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

// Multi-day event results mode
// - SEPARATE: Each day's results are calculated independently (default)
// - COMBINED_SCORE: Sum scores across days, determine placement from total, then calculate points
// - COMBINED_POINTS: Each day calculates points separately, total points are summed
export enum MultiDayResultsMode {
  SEPARATE = 'separate',
  COMBINED_SCORE = 'combined_score',
  COMBINED_POINTS = 'combined_points',
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

/**
 * Stripe-specific payment types used in webhook metadata routing.
 * These map to the `paymentType` field in Stripe PaymentIntent metadata.
 */
export enum StripePaymentType {
  MEMBERSHIP = 'membership',
  EVENT_REGISTRATION = 'event_registration',
  TEAM_UPGRADE = 'team_upgrade',
  INVOICE_PAYMENT = 'invoice_payment',
  SHOP = 'shop',
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

export enum AccountType {
  BASIC = 'basic',
  MEMBER = 'member',
}

// Master/Secondary Membership Account Type
// - INDEPENDENT: Default standalone membership with own billing
// - MASTER: Primary account that controls billing for linked secondaries
// - SECONDARY: Linked to a master, billing managed by master
export enum MembershipAccountType {
  INDEPENDENT = 'independent',
  MASTER = 'master',
  SECONDARY = 'secondary',
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
// Judge & Event Director System Enums
// =============================================================================

export enum ApplicationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum JudgeLevel {
  IN_TRAINING = 'in_training',
  CERTIFIED = 'certified',
  HEAD_JUDGE = 'head_judge',
  MASTER_JUDGE = 'master_judge',
}

export enum JudgeSpecialty {
  SQL = 'sql',
  SPL = 'spl',
  BOTH = 'both',
}

export enum SeasonQualificationStatus {
  QUALIFIED = 'qualified',
  PENDING = 'pending',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum EventAssignmentRole {
  PRIMARY = 'primary',
  SUPPORTING = 'supporting',
  TRAINEE = 'trainee',
}

export enum EventAssignmentStatus {
  REQUESTED = 'requested',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export enum AssignmentRequestType {
  ED_REQUEST = 'ed_request',
  JUDGE_VOLUNTEER = 'judge_volunteer',
  ADMIN_ASSIGN = 'admin_assign',
}

export enum RatingEntityType {
  JUDGE = 'judge',
  EVENT_DIRECTOR = 'event_director',
}

export enum ApplicationEntryMethod {
  SELF = 'self',
  ADMIN_APPLICATION = 'admin_application',
  ADMIN_DIRECT = 'admin_direct',
}

export enum VerificationPurpose {
  JUDGE_APPLICATION = 'judge_application',
  ED_APPLICATION = 'ed_application',
  OTHER = 'other',
}

export enum WeekendAvailability {
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
  BOTH = 'both',
}

// =============================================================================
// Training Records Enums
// =============================================================================

export enum TrainingType {
  SPL = 'spl',
  SQL = 'sql',
  BOTH = 'both',
}

export enum TraineeType {
  JUDGE = 'judge',
  EVENT_DIRECTOR = 'event_director',
}

export enum TrainingResult {
  PASS = 'pass',
  FAIL = 'fail',
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
export const StripePaymentTypeSchema = z.nativeEnum(StripePaymentType);
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
export const AccountTypeSchema = z.nativeEnum(AccountType);
export const MembershipAccountTypeSchema = z.nativeEnum(MembershipAccountType);

// Support Ticket Schemas
export const TicketStatusSchema = z.nativeEnum(TicketStatus);
export const TicketPrioritySchema = z.nativeEnum(TicketPriority);
export const TicketCategorySchema = z.nativeEnum(TicketCategory);
export const TicketDepartmentSchema = z.nativeEnum(TicketDepartment);

// Judge & Event Director Schemas
export const ApplicationStatusSchema = z.nativeEnum(ApplicationStatus);
export const JudgeLevelSchema = z.nativeEnum(JudgeLevel);
export const JudgeSpecialtySchema = z.nativeEnum(JudgeSpecialty);
export const SeasonQualificationStatusSchema = z.nativeEnum(SeasonQualificationStatus);
export const EventAssignmentRoleSchema = z.nativeEnum(EventAssignmentRole);
export const EventAssignmentStatusSchema = z.nativeEnum(EventAssignmentStatus);
export const AssignmentRequestTypeSchema = z.nativeEnum(AssignmentRequestType);
export const RatingEntityTypeSchema = z.nativeEnum(RatingEntityType);
export const ApplicationEntryMethodSchema = z.nativeEnum(ApplicationEntryMethod);
export const VerificationPurposeSchema = z.nativeEnum(VerificationPurpose);
export const WeekendAvailabilitySchema = z.nativeEnum(WeekendAvailability);

// Training Records Schemas
export const TrainingTypeSchema = z.nativeEnum(TrainingType);
export const TraineeTypeSchema = z.nativeEnum(TraineeType);
export const TrainingResultSchema = z.nativeEnum(TrainingResult);

// Multi-Day Event Schemas
export const MultiDayResultsModeSchema = z.nativeEnum(MultiDayResultsMode);
