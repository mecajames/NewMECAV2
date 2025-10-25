/**
 * Event Registrations API Client
 * Centralized HTTP request functions for Event Registration operations
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface EventRegistrationData {
  id?: string;
  eventId: string;
  userId: string;
  registeredAt?: string;
  status?: string;
  paymentStatus?: string;
  carInfo?: any;
}

export const eventRegistrationsApi = {
  getRegistrations: async (page: number = 1, limit: number = 10): Promise<EventRegistrationData[]> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch registrations');
    return response.json();
  },

  getRegistration: async (id: string): Promise<EventRegistrationData> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/${id}`);
    if (!response.ok) throw new Error('Failed to fetch registration');
    return response.json();
  },

  getRegistrationsByEvent: async (eventId: string): Promise<EventRegistrationData[]> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/event/${eventId}`);
    if (!response.ok) throw new Error('Failed to fetch event registrations');
    return response.json();
  },

  countRegistrationsByEvent: async (eventId: string): Promise<{ count: number }> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/event/${eventId}/count`);
    if (!response.ok) throw new Error('Failed to count registrations');
    return response.json();
  },

  getRegistrationsByUser: async (userId: string): Promise<EventRegistrationData[]> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/user/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user registrations');
    return response.json();
  },

  createRegistration: async (data: Partial<EventRegistrationData>): Promise<EventRegistrationData> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create registration');
    return response.json();
  },

  updateRegistration: async (id: string, data: Partial<EventRegistrationData>): Promise<EventRegistrationData> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update registration');
    return response.json();
  },

  deleteRegistration: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete registration');
  },
};
