/**
 * Events API Client
 * Centralized HTTP request functions for Event operations
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface EventData {
  id?: string;
  title: string;
  description?: string;
  eventDate: string;
  registrationDeadline?: string;
  venueName: string;
  venueAddress?: string;
  latitude?: number;
  longitude?: number;
  flyerUrl?: string;
  eventDirectorId?: string;
  status?: string;
  maxParticipants?: number;
  registrationFee?: number;
}

export const eventsApi = {
  getEvents: async (page: number = 1, limit: number = 10): Promise<EventData[]> => {
    const response = await fetch(`${API_BASE_URL}/api/events?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  getEvent: async (id: string): Promise<EventData> => {
    const response = await fetch(`${API_BASE_URL}/api/events/${id}`);
    if (!response.ok) throw new Error('Failed to fetch event');
    return response.json();
  },

  getUpcomingEvents: async (): Promise<EventData[]> => {
    const response = await fetch(`${API_BASE_URL}/api/events/upcoming`);
    if (!response.ok) throw new Error('Failed to fetch upcoming events');
    return response.json();
  },

  getEventsByStatus: async (status: string): Promise<EventData[]> => {
    const response = await fetch(`${API_BASE_URL}/api/events/status/${status}`);
    if (!response.ok) throw new Error('Failed to fetch events by status');
    return response.json();
  },

  getEventsByDirector: async (directorId: string): Promise<EventData[]> => {
    const response = await fetch(`${API_BASE_URL}/api/events/director/${directorId}`);
    if (!response.ok) throw new Error('Failed to fetch events by director');
    return response.json();
  },

  createEvent: async (data: Partial<EventData>): Promise<EventData> => {
    const response = await fetch(`${API_BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  },

  updateEvent: async (id: string, data: Partial<EventData>): Promise<EventData> => {
    const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update event');
    return response.json();
  },

  deleteEvent: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete event');
  },
};
