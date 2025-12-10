// Shared enums for the application
export enum UserRole {
  USER = 'user',
  EVENT_DIRECTOR = 'event_director',
  RETAILER = 'retailer',
  ADMIN = 'admin'
}

export enum MembershipStatus {
  NONE = 'none',
  ACTIVE = 'active',
  EXPIRED = 'expired'
}

// MembershipType enum removed - use membership_type_configs table instead
// Categories: competitor, team, retail, manufacturer

export enum EventStatus {
  PENDING = 'pending',  // For events created from hosting requests, awaiting admin approval
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NOT_PUBLIC = 'not_public'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded'
}

export enum RegistrationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled'
}

export enum EventHostingRequestStatus {
  PENDING = 'pending',
  ASSIGNED_TO_ED = 'assigned_to_ed',
  ED_REVIEWING = 'ed_reviewing',
  ED_ACCEPTED = 'ed_accepted',
  ED_REJECTED = 'ed_rejected',  // Back to admin for reassignment
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  APPROVED_PENDING_INFO = 'approved_pending_info',
  PENDING_INFO = 'pending_info',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

// Event Director Assignment Status (internal tracking)
export enum EDAssignmentStatus {
  PENDING_REVIEW = 'pending_review',
  ACCEPTED = 'accepted',
  REJECTED_TO_ADMIN = 'rejected_to_admin'
}

// Final Approval Status options for admin
export enum FinalApprovalStatus {
  APPROVED = 'approved',
  APPROVED_PENDING_INFO = 'approved_pending_info',
  REJECTED = 'rejected',
  PENDING_INFO = 'pending_info'
}

export enum EventTypeOption {
  ONE_X = '1x Event',
  TWO_X = '2x Event',
  THREE_X = '3x Event',
  FOUR_X = '4x Event',
  BRANDED = 'Branded Event',
  SPONSORED = 'Sponsored Event',
  OTHER = 'Other'
}

export enum EventType {
  STANDARD = 'standard',
  STATE_FINALS = 'state_finals',
  WORLD_FINALS = 'world_finals',
  JUDGES_POINT = 'judges_point'
}

export enum PaymentMethod {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  CREDIT_CARD = 'credit_card',
  MANUAL = 'manual',
  WORDPRESS_PMPRO = 'wordpress_pmpro'
}

export enum PaymentType {
  MEMBERSHIP = 'membership',
  EVENT_REGISTRATION = 'event_registration',
  OTHER = 'other'
}

export enum HostType {
  BUSINESS = 'business',
  INDIVIDUAL = 'individual',
  ORGANIZATION = 'organization',
  OTHER = 'other'
}

export enum IndoorOutdoor {
  INDOOR = 'indoor',
  OUTDOOR = 'outdoor',
  BOTH = 'both'
}
