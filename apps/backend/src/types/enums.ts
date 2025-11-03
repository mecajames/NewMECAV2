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
