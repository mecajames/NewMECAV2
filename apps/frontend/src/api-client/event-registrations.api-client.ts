const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  payment_status: string;
  status: string;
  created_at: string;
  updated_at: string;
  event?: any;
}

export const eventRegistrationsApi = {
  getAll: async (page: number = 1, limit: number = 100): Promise<EventRegistration[]> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch event registrations');
    return response.json();
  },

  getById: async (id: string): Promise<EventRegistration> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/${id}`);
    if (!response.ok) throw new Error('Failed to fetch event registration');
    return response.json();
  },

  create: async (data: Partial<EventRegistration>): Promise<EventRegistration> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create event registration');
    return response.json();
  },

  update: async (id: string, data: Partial<EventRegistration>): Promise<EventRegistration> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update event registration');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete event registration');
  },

  getStats: async (): Promise<{ totalRegistrations: number }> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/stats`);
    if (!response.ok) throw new Error('Failed to fetch registration stats');
    return response.json();
  },
};
