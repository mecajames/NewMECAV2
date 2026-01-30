import { supabase } from '@/lib/supabase';
import type {
  CreateEventDirectorApplicationDto,
  ApplicationStatus,
} from '@newmeca/shared';
import { EventAssignmentStatus, AssignmentRequestType } from '@/shared/enums';

// Re-export enums as values for runtime use
export { EventAssignmentStatus, AssignmentRequestType };

const API_BASE = '/api/event-directors';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

// =============================================================================
// Types
// =============================================================================

export interface PublicEventDirector {
  id: string;
  name: string;
  avatar_url: string | null;
  state: string;
  city: string;
  regions_managed: string[];
  total_events_directed: number;
  average_rating: number;
}

export interface EventDirectorApplication {
  id: string;
  user_id: string;
  status: ApplicationStatus;
  application_date: string;
  full_name: string;
  preferred_name?: string;
  date_of_birth: string;
  phone: string;
  secondary_phone?: string;
  headshot_url?: string;
  country: string;
  state: string;
  city: string;
  zip: string;
  travel_radius: string;
  additional_regions: string[];
  weekend_availability: string;
  availability_notes?: string;
  years_in_industry: number;
  event_management_experience: string;
  team_management_experience: string;
  equipment_resources?: string;
  specialized_formats: string[];
  essay_why_ed: string;
  essay_qualifications: string;
  essay_additional?: string;
  ack_independent_contractor: boolean;
  ack_code_of_conduct: boolean;
  ack_background_check: boolean;
  ack_terms_conditions: boolean;
  admin_notes?: string;
  reviewed_date?: string;
  reviewed_by?: string;
  created_at?: string;
  updated_at?: string;
  references?: EventDirectorApplicationReference[];
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface EventDirectorApplicationReference {
  id: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  company_name?: string;
  email_verified: boolean;
  verification_response?: string;
  verified_at?: string;
}

export interface EventDirector {
  id: string;
  user_id: string;
  application_id?: string;
  headshot_url?: string;
  bio?: string;
  preferred_name?: string;
  country: string;
  state: string;
  city: string;
  specialized_formats: string[];
  is_active: boolean;
  approved_date?: string;
  total_events_directed: number;
  average_rating?: number;
  total_ratings: number;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

// =============================================================================
// Public Endpoints
// =============================================================================

export async function getEventDirectorsDirectory(filters?: {
  state?: string;
  region?: string;
}): Promise<PublicEventDirector[]> {
  const params = new URLSearchParams();
  if (filters?.state) params.set('state', filters.state);
  if (filters?.region) params.set('region', filters.region);

  const queryString = params.toString();
  const url = `${API_BASE}/directory${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch event directors directory');
  }
  return response.json();
}

export interface PublicEventDirectorProfile extends PublicEventDirector {
  country: string;
  travel_radius: string;
  additional_regions: string[];
  weekend_availability: string;
  certification_date: string;
  rating_count: number;
}

export async function getPublicEventDirectorProfile(id: string): Promise<PublicEventDirectorProfile> {
  const response = await fetch(`${API_BASE}/directory/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Event Director not found');
    }
    throw new Error('Failed to fetch event director profile');
  }
  return response.json();
}

export async function verifyReference(token: string, response: string): Promise<void> {
  const res = await fetch(`${API_BASE}/verify-reference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, response }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to verify reference');
  }
}

// =============================================================================
// User Endpoints (Authenticated)
// =============================================================================

export async function createEventDirectorApplication(
  dto: CreateEventDirectorApplicationDto
): Promise<EventDirectorApplication> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/applications`, {
    method: 'POST',
    headers,
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit application');
  }

  return response.json();
}

export async function getMyEventDirectorApplication(): Promise<EventDirectorApplication | null> {
  const headers = await getAuthHeaders();

  try {
    const response = await fetch(`${API_BASE}/applications/me`, { headers });

    if (!response.ok) {
      // Return null for expected "not found" cases - 404, 401 (not authenticated)
      if (response.status === 401 || response.status === 404) return null;
      // For other errors, log and return null to prevent UI from crashing
      console.warn('Failed to fetch event director application:', response.status);
      return null;
    }

    const result = await response.json();
    // Handle both wrapped { data: ... } and direct response formats
    return result?.data !== undefined ? result.data : result;
  } catch (error) {
    console.warn('Error fetching event director application:', error);
    return null;
  }
}

export async function getMyEventDirectorProfile(): Promise<EventDirector | null> {
  const headers = await getAuthHeaders();

  try {
    const response = await fetch(`${API_BASE}/me`, { headers });

    if (!response.ok) {
      // Return null for expected "not found" cases - 404, 401 (not authenticated)
      if (response.status === 401 || response.status === 404) return null;
      // For other errors, log and return null to prevent UI from crashing
      console.warn('Failed to fetch event director profile:', response.status);
      return null;
    }

    const result = await response.json();
    // Handle both wrapped { data: ... } and direct response formats
    return result?.data !== undefined ? result.data : result;
  } catch (error) {
    console.warn('Error fetching event director profile:', error);
    return null;
  }
}

// =============================================================================
// Admin Endpoints
// =============================================================================

export async function getAllEventDirectorApplications(filters?: {
  status?: ApplicationStatus;
  region?: string;
}): Promise<EventDirectorApplication[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.region) params.set('region', filters.region);

  const queryString = params.toString();
  const url = `${API_BASE}/applications${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch event director applications');
  }

  return response.json();
}

export interface AdminQuickCreateEventDirectorApplicationDto {
  user_id: string;
  full_name: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  years_in_industry: number;
  travel_radius: string;
  admin_notes?: string;
}

export async function adminQuickCreateEventDirectorApplication(dto: AdminQuickCreateEventDirectorApplicationDto): Promise<EventDirectorApplication> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/applications/admin/quick`, {
    method: 'POST',
    headers,
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create application');
  }

  return response.json();
}

export interface AdminDirectCreateEventDirectorDto {
  user_id: string;
  state: string;
  city: string;
  country?: string;
  travel_radius?: string;
  additional_regions?: string[];
  admin_notes?: string;
  enable_permission?: boolean; // If true, enable canApplyEventDirector on profile
}

export async function createEventDirectorDirectly(dto: AdminDirectCreateEventDirectorDto): Promise<EventDirector> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/direct`, {
    method: 'POST',
    headers,
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create event director');
  }

  return response.json();
}

export async function getEventDirectorApplication(id: string): Promise<EventDirectorApplication> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/applications/${id}`, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch event director application');
  }

  return response.json();
}

export async function reviewEventDirectorApplication(
  id: string,
  review: {
    status: ApplicationStatus;
    admin_notes?: string;
  }
): Promise<EventDirectorApplication> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/applications/${id}/review`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(review),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to review application');
  }

  return response.json();
}

export async function getAllEventDirectors(filters?: {
  isActive?: boolean;
  state?: string;
  region?: string;
}): Promise<EventDirector[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters?.state) params.set('state', filters.state);
  if (filters?.region) params.set('region', filters.region);

  const queryString = params.toString();
  const url = `${API_BASE}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch event directors');
  }

  return response.json();
}

export async function getEventDirector(id: string): Promise<EventDirector> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/${id}`, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch event director');
  }

  return response.json();
}

export async function updateEventDirector(
  id: string,
  updates: Partial<{
    is_active: boolean;
    bio: string;
    headshot_url: string;
    preferred_name: string;
    specialized_formats: string[];
    admin_notes: string;
  }>
): Promise<EventDirector> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update event director');
  }

  return response.json();
}

// =============================================================================
// Event Assignment Endpoints
// =============================================================================

export interface EventDirectorAssignment {
  id: string;
  event_id: string;
  event_director_id: string;
  status: EventAssignmentStatus;
  request_type: AssignmentRequestType;
  requested_by: string | null;
  requested_at: string;
  responded_at: string | null;
  decline_reason: string | null;
  admin_notes: string | null;
  event?: {
    id: string;
    title: string;
    event_date: string;
    venue_city: string;
    venue_state: string;
  };
  eventDirector?: {
    id: string;
    user?: {
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    };
  };
}

export async function getMyEDAssignments(filters?: {
  status?: EventAssignmentStatus;
  upcoming?: boolean;
}): Promise<EventDirectorAssignment[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.upcoming) params.set('upcoming', 'true');

  const queryString = params.toString();
  const url = `${API_BASE}/assignments/me${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch your assignments');
  }

  return response.json();
}

export async function getEDAssignment(id: string): Promise<EventDirectorAssignment> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/assignments/${id}`, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch assignment');
  }

  return response.json();
}

export async function respondToEDAssignment(
  id: string,
  accept: boolean,
  declineReason?: string
): Promise<EventDirectorAssignment> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/assignments/${id}/respond`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ accept, decline_reason: declineReason }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to respond to assignment');
  }

  return response.json();
}

// Admin functions
export async function createEDAssignment(dto: {
  event_id: string;
  event_director_id: string;
  request_type: AssignmentRequestType;
}): Promise<EventDirectorAssignment> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/assignments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create assignment');
  }

  return response.json();
}

export async function updateEDAssignment(
  id: string,
  updates: Partial<{
    status: EventAssignmentStatus;
    admin_notes: string;
  }>
): Promise<EventDirectorAssignment> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/assignments/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update assignment');
  }

  return response.json();
}

export async function deleteEDAssignment(id: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/assignments/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete assignment');
  }
}

export async function getEventEDAssignments(eventId: string): Promise<EventDirectorAssignment[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/events/${eventId}/assignments`, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch event assignments');
  }

  return response.json();
}

export async function getEDAssignmentsForDirector(
  edId: string,
  filters?: {
    status?: EventAssignmentStatus;
    upcoming?: boolean;
  }
): Promise<EventDirectorAssignment[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.upcoming) params.set('upcoming', 'true');

  const queryString = params.toString();
  const url = `${API_BASE}/${edId}/assignments${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch event director assignments');
  }

  return response.json();
}
