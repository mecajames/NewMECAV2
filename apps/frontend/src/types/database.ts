// Database Types
export type UserRole = 'user' | 'event_director' | 'retailer' | 'admin';
export type MembershipStatus = 'none' | 'active' | 'expired' | 'pending' | 'inactive';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'not_public';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'unpaid' | 'partially_paid';
export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled';
export type RulebookCategory = 'SPL Rulebook' | 'SQL Rulebook' | 'MECA Kids' | 'Dueling Demos' | 'Show and Shine' | 'Ride the Light';
export type RulebookStatus = 'active' | 'inactive' | 'archive';
export type MediaType = 'image' | 'video' | 'pdf' | 'document' | 'other';
export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due';
export type CommunicationType = 'email' | 'sms' | 'system_message';
export type TeamRole = 'owner' | 'manager' | 'member';
export type NotificationType = 'message' | 'system' | 'alert' | 'info';
export type CompetitionFormat = 'SPL' | 'SQL' | 'Show and Shine' | 'Ride the Light';

// Profile Interface (Updated with new fields)
export interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: UserRole | string;
  membership_status: MembershipStatus | string;
  membership_expiry?: string;
  meca_id?: string;
  profile_picture_url?: string;
  profile_images?: string[];
  // Primary address fields
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  // Billing address fields
  billing_street?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_country?: string;
  // Shipping address fields
  shipping_street?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  use_billing_for_shipping?: boolean;
  avatar_url?: string;
  bio?: string;
  // Public profile fields
  is_public?: boolean;
  vehicle_info?: string;
  car_audio_system?: string;
  // Computed field (from AuthContext)
  full_name?: string;
  // Permission fields
  is_trainer?: boolean;
  can_apply_judge?: boolean;
  can_apply_event_director?: boolean;
  judge_permission_granted_at?: string;
  judge_permission_granted_by?: string;
  ed_permission_granted_at?: string;
  ed_permission_granted_by?: string;
  judge_certification_expires?: string;
  ed_certification_expires?: string;
  force_password_change?: boolean;
  cover_image_position?: { x: number; y: number };
  member_since: string;
  created_at: string;
  updated_at: string;
}

// Season Interface
export interface Season {
  id: string;
  year: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_next: boolean;
  created_at: string;
  updated_at: string;
}

// Competition Class Interface
export interface CompetitionClass {
  id: string;
  name: string;
  abbreviation: string;
  format: CompetitionFormat;
  season_id: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  season?: Season;
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
  venue_city?: string;
  venue_state?: string;
  venue_postal_code?: string;
  venue_country?: string;
  latitude?: number;
  longitude?: number;
  flyer_url?: string;
  event_director_id?: string;
  status: EventStatus;
  max_participants?: number;
  registration_fee: number;
  season_id?: string;
  format?: CompetitionFormat;
  created_at: string;
  updated_at: string;
  event_director?: Profile;
  season?: Season;
}

// Event Registration Interface
export interface EventRegistration {
  id: string;
  event_id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
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
  wattage?: number;
  frequency?: number;
  notes?: string;
  created_by: string;
  season_id?: string;
  class_id?: string;
  created_at: string;
  event?: Event;
  competitor?: Profile;
  season?: Season;
  class?: CompetitionClass;
}

// Rulebook Interface
export interface Rulebook {
  id: string;
  title: string;
  category: RulebookCategory;
  season: string;
  pdfUrl: string;
  status: RulebookStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Media File Interface
export interface MediaFile {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: MediaType;
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

// Permission Interface
export interface Permission {
  id: string;
  name: string;
  description?: string;
  category: string;
  created_at: string;
}

// Role Permission Interface
export interface RolePermission {
  id: string;
  role: UserRole;
  permission_id: string;
  created_at: string;
  permission?: Permission;
}

// User Permission Override Interface
export interface UserPermissionOverride {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  created_at: string;
  permission?: Permission;
}

// Membership Type Interface
export interface MembershipType {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration_months: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Order Interface
export interface Order {
  id: string;
  order_number: string;
  member_id: string;
  order_type: string;
  total_amount: number;
  status: OrderStatus;
  payment_method?: string;
  payment_status: PaymentStatus;
  payment_intent_id?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  member?: Profile;
  items?: OrderItem[];
}

// Order Item Interface
export interface OrderItem {
  id: string;
  order_id: string;
  item_type: string;
  item_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

// Invoice Interface
export interface Invoice {
  id: string;
  invoice_number: string;
  member_id: string;
  order_id?: string;
  amount: number;
  status: InvoiceStatus;
  due_date?: string;
  sent_at?: string;
  paid_at?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  member?: Profile;
  items?: InvoiceItem[];
}

// Invoice Item Interface
export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

// Membership Interface
export interface Membership {
  id: string;
  member_id: string;
  membership_type_id?: string;
  membership_type_name: string;
  start_date: string;
  expiration_date: string;
  renewal_date?: string;
  status: string;
  auto_renew: boolean;
  order_id?: string;
  created_at: string;
  updated_at: string;
  member?: Profile;
  membership_type?: MembershipType;
}

// Subscription Interface
export interface Subscription {
  id: string;
  member_id: string;
  subscription_type: string;
  status: SubscriptionStatus;
  billing_cycle: string;
  amount: number;
  currency: string;
  next_billing_date?: string;
  auto_renew: boolean;
  stripe_subscription_id?: string;
  paypal_subscription_id?: string;
  started_at: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  member?: Profile;
}

// Team Interface
export interface Team {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  owner?: Profile;
  members?: TeamMember[];
}

// Team Member Interface
export interface TeamMember {
  id: string;
  team_id: string;
  member_id: string;
  role: TeamRole;
  joined_at: string;
  team?: Team;
  member?: Profile;
}

// Member Gallery Image Interface
export interface MemberGalleryImage {
  id: string;
  member_id: string;
  image_url: string;
  caption?: string;
  sort_order: number;
  is_public: boolean;
  uploaded_at: string;
  created_at: string;
}

// Message Interface
export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  subject?: string;
  body: string;
  is_read: boolean;
  read_at?: string;
  parent_message_id?: string;
  created_at: string;
  from_user?: Profile;
  to_user?: Profile;
}

// Communication Log Interface
export interface CommunicationLog {
  id: string;
  member_id: string;
  communication_type: CommunicationType;
  subject?: string;
  body?: string;
  status: string;
  recipient?: string;
  sent_by?: string;
  sent_at: string;
  created_at: string;
  member?: Profile;
  sender?: Profile;
}

// Notification Interface
export interface Notification {
  id: string;
  user_id: string;
  from_user_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  created_at: string;
  read_at?: string;
  from_user?: Profile;
}