import axios from '@/lib/axios';

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
  const response = await axios.post('/api/tickets/guest/request-access', { email });
  return response.data;
}

/**
 * Verify a token and get the associated email.
 */
export async function verifyToken(token: string): Promise<VerifyTokenResponse> {
  const response = await axios.get(`/api/tickets/guest/verify/${token}`);
  return response.data;
}

/**
 * Create a new guest ticket.
 */
export async function createGuestTicket(data: CreateGuestTicketData): Promise<GuestTicket> {
  const response = await axios.post('/api/tickets/guest/create', data);
  return response.data;
}

/**
 * View a guest ticket by access token.
 */
export async function viewGuestTicket(accessToken: string): Promise<GuestTicket> {
  const response = await axios.get(`/api/tickets/guest/view/${accessToken}`);
  return response.data;
}

/**
 * Add a comment to a guest ticket.
 */
export async function addGuestComment(
  accessToken: string,
  content: string,
): Promise<{ id: string; content: string; created_at: string }> {
  const response = await axios.post(`/api/tickets/guest/view/${accessToken}/comment`, { content });
  return response.data;
}

/**
 * Request access to an existing ticket.
 */
export async function requestTicketAccess(
  email: string,
  ticketNumber: string,
): Promise<RequestAccessResponse> {
  const response = await axios.post('/api/tickets/guest/request-ticket-access', { email, ticket_number: ticketNumber });
  return response.data;
}

/**
 * Get ticket access token from a view token.
 */
export async function getAccessFromToken(token: string): Promise<{ access_token: string }> {
  const response = await axios.get(`/api/tickets/guest/access/${token}`);
  return response.data;
}
