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

export enum MembershipType {
  // New membership types based on membership type configs
  DOMESTIC = 'domestic',
  INTERNATIONAL = 'international',
  TEAM = 'team',
  RETAILER = 'retailer',
  // Legacy types for backward compatibility
  ANNUAL = 'annual',
  LIFETIME = 'lifetime'
}

export enum EventStatus {
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
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
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
