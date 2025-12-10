// Legacy Types (snake_case format for API/Database compatibility)
// These are kept for backward compatibility with existing code
// New code should prefer the Zod schemas from ./schemas

// Legacy Database Types - use schema types for new code
export type LegacyUserRole = 'user' | 'event_director' | 'retailer' | 'admin';
export type LegacyMembershipStatus = 'none' | 'active' | 'expired';
export type LegacyEventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type LegacyPaymentStatus = 'pending' | 'paid' | 'refunded';
export type LegacyRegistrationStatus = 'pending' | 'confirmed' | 'cancelled';
export type LegacyRulebookCategory = 'SPL Rulebook' | 'SQL Rulebook' | 'MECA Kids' | 'Dueling Demos' | 'Show and Shine' | 'Ride the Light';
export type LegacyRulebookStatus = 'active' | 'inactive' | 'archive';
export type LegacyMediaType = 'image' | 'video' | 'pdf' | 'document' | 'other';

// Legacy Profile Interface (snake_case)
export interface LegacyProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: LegacyUserRole;
  membership_status: LegacyMembershipStatus;
  membership_expiry?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

// Legacy Event Interface (snake_case)
export interface LegacyEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  registration_deadline?: string;
  venue_name: string;
  venue_address: string;
  latitude?: number;
  longitude?: number;
  flyer_url?: string;
  event_director_id?: string;
  status: LegacyEventStatus;
  max_participants?: number;
  registration_fee: number;
  created_at: string;
  updated_at: string;
  event_director?: LegacyProfile;
}

// Legacy Event Registration Interface (snake_case)
export interface LegacyEventRegistration {
  id: string;
  event_id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  vehicle_info?: string;
  competition_class?: string;
  registration_date: string;
  payment_status: LegacyPaymentStatus;
  status: LegacyRegistrationStatus;
  event?: LegacyEvent;
}

// Legacy Competition Result Interface (snake_case)
export interface LegacyCompetitionResult {
  id: string;
  event_id: string;
  competitor_id?: string;
  competitor_name: string;
  competition_class: string;
  score: number;
  placement: number;
  points_earned: number;
  vehicle_info?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  event?: LegacyEvent;
  competitor?: LegacyProfile;
}

// Rulebook Interface
export interface Rulebook {
  id: string;
  title: string;
  category: LegacyRulebookCategory;
  season: string;
  pdf_url: string;
  status: LegacyRulebookStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Media File Interface
export interface MediaFile {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: LegacyMediaType;
  file_size: number;
  mime_type: string;
  dimensions?: string;
  is_external: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Site Settings Interface
export interface SiteSettings {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description?: string;
  updated_at: string;
  updated_by: string;
}
