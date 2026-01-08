import { supabase } from '@/lib/supabase';
import type {
  CreateJudgeApplicationDto,
  JudgeApplication,
  Judge,
  JudgeLevel,
  ApplicationStatus,
} from '@newmeca/shared';
import { EventAssignmentStatus, EventAssignmentRole, AssignmentRequestType } from '@/shared/enums';

// Re-export types for convenience
export type { JudgeApplication, Judge, JudgeLevel, ApplicationStatus };

// Re-export enums as values for runtime use
export { EventAssignmentStatus, EventAssignmentRole, AssignmentRequestType };

const API_BASE = '/api/judges';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

// =============================================================================
// Public Endpoints
// =============================================================================

export interface PublicJudge {
  id: string;
  name: string;
  avatar_url: string | null;
  level: JudgeLevel;
  specialty: string;
  state: string;
  city: string;
  total_events_judged: number;
  average_rating: number;
}

export async function getJudgesDirectory(filters?: {
  state?: string;
  specialty?: string;
}): Promise<PublicJudge[]> {
  const params = new URLSearchParams();
  if (filters?.state) params.set('state', filters.state);
  if (filters?.specialty) params.set('specialty', filters.specialty);

  const queryString = params.toString();
  const url = `${API_BASE}/directory${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch judges directory');
  }
  return response.json();
}

export interface PublicJudgeProfile extends PublicJudge {
  country: string;
  travel_radius: string;
  additional_regions: string[];
  sub_specialties: string[];
  certification_date: string;
  rating_count: number;
}

export async function getPublicJudgeProfile(id: string): Promise<PublicJudgeProfile> {
  const response = await fetch(`${API_BASE}/directory/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Judge not found');
    }
    throw new Error('Failed to fetch judge profile');
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

export async function createJudgeApplication(dto: CreateJudgeApplicationDto): Promise<JudgeApplication> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/applications`, {
    method: 'POST',
    headers,
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    // Format validation errors if present (now at root level)
    if (error.errors && Array.isArray(error.errors)) {
      const errorMessages = error.errors.map((e: { field: string; message: string }) =>
        `${e.field}: ${e.message}`
      ).join('\n');
      throw new Error(errorMessages || 'Validation failed');
    }
    throw new Error(error.message || 'Failed to submit application');
  }

  return response.json();
}

export async function getMyJudgeApplication(): Promise<JudgeApplication | null> {
  const headers = await getAuthHeaders();

  try {
    const response = await fetch(`${API_BASE}/applications/me`, { headers });

    if (!response.ok) {
      // Return null for expected "not found" cases - 404, 401 (not authenticated)
      if (response.status === 404 || response.status === 401) return null;
      // For other errors, log and return null to prevent UI from crashing
      console.warn('Failed to fetch judge application:', response.status);
      return null;
    }

    const result = await response.json();
    // Handle both wrapped { data: ... } and direct response formats
    return result?.data !== undefined ? result.data : result;
  } catch (error) {
    console.warn('Error fetching judge application:', error);
    return null;
  }
}

export async function getMyJudgeProfile(): Promise<Judge | null> {
  const headers = await getAuthHeaders();

  try {
    const response = await fetch(`${API_BASE}/me`, { headers });

    if (!response.ok) {
      // Return null for expected "not found" cases - 404, 401 (not authenticated)
      if (response.status === 404 || response.status === 401) return null;
      // For other errors, log and return null to prevent UI from crashing
      console.warn('Failed to fetch judge profile:', response.status);
      return null;
    }

    const result = await response.json();
    // Handle both wrapped { data: ... } and direct response formats
    return result?.data !== undefined ? result.data : result;
  } catch (error) {
    console.warn('Error fetching judge profile:', error);
    return null;
  }
}

// =============================================================================
// Admin Endpoints
// =============================================================================

export interface AdminQuickCreateJudgeApplicationDto {
  user_id: string;
  full_name: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  specialty: 'sql' | 'spl' | 'both';
  years_in_industry: number;
  travel_radius: string;
  admin_notes?: string;
}

export async function adminQuickCreateJudgeApplication(dto: AdminQuickCreateJudgeApplicationDto): Promise<JudgeApplication> {
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

export async function getAllJudgeApplications(filters?: {
  status?: ApplicationStatus;
  specialty?: string;
}): Promise<JudgeApplication[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.specialty) params.set('specialty', filters.specialty);

  const queryString = params.toString();
  const url = `${API_BASE}/applications${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch judge applications');
  }

  return response.json();
}

export async function getJudgeApplication(id: string): Promise<JudgeApplication> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/applications/${id}`, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch judge application');
  }

  return response.json();
}

export async function reviewJudgeApplication(
  id: string,
  review: {
    status: ApplicationStatus;
    admin_notes?: string;
    judge_level?: JudgeLevel;
  }
): Promise<JudgeApplication> {
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

export async function getAllJudges(filters?: {
  isActive?: boolean;
  level?: JudgeLevel;
  specialty?: string;
  state?: string;
}): Promise<Judge[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters?.level) params.set('level', filters.level);
  if (filters?.specialty) params.set('specialty', filters.specialty);
  if (filters?.state) params.set('state', filters.state);

  const queryString = params.toString();
  const url = `${API_BASE}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch judges');
  }

  return response.json();
}

export async function getJudge(id: string): Promise<Judge> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/${id}`, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch judge');
  }

  return response.json();
}

export async function updateJudge(
  id: string,
  updates: Partial<{
    level: JudgeLevel;
    specialty: string;
    sub_specialties: string[];
    is_active: boolean;
    travel_radius: string;
    additional_regions: string[];
    admin_notes: string;
    bio: string;
    headshot_url: string;
  }>
): Promise<Judge> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update judge');
  }

  return response.json();
}

// =============================================================================
// Event Assignment Endpoints
// =============================================================================

export interface EventJudgeAssignment {
  id: string;
  event_id: string;
  judge_id: string;
  role: EventAssignmentRole;
  status: EventAssignmentStatus;
  request_type: AssignmentRequestType;
  requested_by: string | null;
  requested_at: string;
  responded_at: string | null;
  decline_reason: string | null;
  admin_notes: string | null;
  event?: {
    id: string;
    eventName: string;
    eventDate: string;
    city: string;
    state: string;
  };
  judge?: {
    id: string;
    level: JudgeLevel;
    specialty: string;
    user?: {
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    };
  };
}

export async function getMyAssignments(filters?: {
  status?: EventAssignmentStatus;
  upcoming?: boolean;
}): Promise<EventJudgeAssignment[]> {
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

export async function getAssignment(id: string): Promise<EventJudgeAssignment> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/assignments/${id}`, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch assignment');
  }

  return response.json();
}

export async function respondToAssignment(
  id: string,
  accept: boolean,
  declineReason?: string
): Promise<EventJudgeAssignment> {
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
export async function createAssignment(dto: {
  event_id: string;
  judge_id: string;
  role?: EventAssignmentRole;
  request_type: AssignmentRequestType;
}): Promise<EventJudgeAssignment> {
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

export async function updateAssignment(
  id: string,
  updates: Partial<{
    role: EventAssignmentRole;
    status: EventAssignmentStatus;
    admin_notes: string;
  }>
): Promise<EventJudgeAssignment> {
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

export async function deleteAssignment(id: string): Promise<void> {
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

export async function getEventAssignments(eventId: string): Promise<EventJudgeAssignment[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/events/${eventId}/assignments`, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch event assignments');
  }

  return response.json();
}

export async function getJudgeAssignments(
  judgeId: string,
  filters?: {
    status?: EventAssignmentStatus;
    upcoming?: boolean;
  }
): Promise<EventJudgeAssignment[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.upcoming) params.set('upcoming', 'true');

  const queryString = params.toString();
  const url = `${API_BASE}/${judgeId}/assignments${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch judge assignments');
  }

  return response.json();
}
