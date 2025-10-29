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
  CANCELLED = 'cancelled'
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

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

export enum CompetitionFormat {
  SPL = 'SPL',
  SQL = 'SQL',
  SHOW_AND_SHINE = 'Show and Shine',
  RIDE_THE_LIGHT = 'Ride the Light',
}
