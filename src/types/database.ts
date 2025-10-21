// Database Types
export type UserRole = 'user' | 'event_director' | 'retailer' | 'admin';
export type MembershipStatus = 'none' | 'active' | 'expired';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled';

// Profile Interface
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  membership_status: MembershipStatus;
  membership_expiry?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

// Event Interface
export interface Event {
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
  status: EventStatus;
  max_participants?: number;
  registration_fee: number;
  created_at: string;
  updated_at: string;
  event_director?: Profile;
}

// Event Registration Interface
export interface EventRegistration {
  id: string;
  event_id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  vehicle_info?: string;
  competition_class?: string;
  registration_date: string;
  payment_status: PaymentStatus;
  status: RegistrationStatus;
  event?: Event;
}

// Competition Result Interface
export interface CompetitionResult {
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
  event?: Event;
  competitor?: Profile;
}