const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface GuestTicketComment {
  id: string;
  content: string;
  author_name: string;
  is_staff: boolean;
  created_at: string;
}

export interface GuestTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  guest_email: string;
  guest_name: string;
  access_token: string;
  created_at: string;
  updated_at: string;
  comments: GuestTicketComment[];
}

export interface RequestAccessResponse {
  message: string;
  expires_at: string;
  _dev_token?: string; // Only in development
}

export interface VerifyTokenResponse {
  valid: boolean;
  email: string;
  purpose: string;
}

export interface CreateGuestTicketData {
  token: string;
  title: string;
  description: string;
  category: string;
  priority?: string;
  guest_name: string;
  event_id?: string;
}

/**
 * Request a magic link to create a new support ticket.
 */
export async function requestAccess(email: string): Promise<RequestAccessResponse> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/guest/request-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Failed to request access');
  }

  return response.json();
}

/**
 * Verify a token and get the associated email.
 */
export async function verifyToken(token: string): Promise<VerifyTokenResponse> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/guest/verify/${token}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Invalid token' }));
    throw new Error(error.message || 'Token verification failed');
  }

  return response.json();
}

/**
 * Create a new guest ticket.
 */
export async function createGuestTicket(data: CreateGuestTicketData): Promise<GuestTicket> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/guest/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Creation failed' }));
    throw new Error(error.message || 'Failed to create ticket');
  }

  return response.json();
}

/**
 * View a guest ticket by access token.
 */
export async function viewGuestTicket(accessToken: string): Promise<GuestTicket> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/guest/view/${accessToken}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Ticket not found' }));
    throw new Error(error.message || 'Failed to fetch ticket');
  }

  return response.json();
}

/**
 * Add a comment to a guest ticket.
 */
export async function addGuestComment(
  accessToken: string,
  content: string,
): Promise<{ id: string; content: string; created_at: string }> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/guest/view/${accessToken}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to add comment' }));
    throw new Error(error.message || 'Failed to add comment');
  }

  return response.json();
}

/**
 * Request access to an existing ticket.
 */
export async function requestTicketAccess(
  email: string,
  ticketNumber: string,
): Promise<RequestAccessResponse> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/guest/request-ticket-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ticket_number: ticketNumber }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Failed to request ticket access');
  }

  return response.json();
}

/**
 * Get ticket access token from a view token.
 */
export async function getAccessFromToken(token: string): Promise<{ access_token: string }> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/guest/access/${token}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Invalid token' }));
    throw new Error(error.message || 'Failed to get access');
  }

  return response.json();
}
