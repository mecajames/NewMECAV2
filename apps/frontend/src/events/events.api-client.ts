const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  status: string;
  max_participants?: number;
  registration_fee: number;
  // Entry fees (per class)
  member_entry_fee?: number;
  non_member_entry_fee?: number;
  // Gate fee
  has_gate_fee?: boolean;
  gate_fee?: number;
  season_id?: string;
  points_multiplier?: number;
  format?: string;
  formats?: string[];
  event_type?: string;
  multi_day_group_id?: string;
  day_number?: number;
  created_at: string;
  updated_at: string;
  event_director?: any;
  season?: any;
}

export const eventsApi = {
  getAll: async (page: number = 1, limit: number = 100): Promise<Event[]> => {
    const response = await fetch(`${API_BASE_URL}/api/events?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  getAllBySeason: async (seasonId: string, page: number = 1, limit: number = 100): Promise<Event[]> => {
    const response = await fetch(`${API_BASE_URL}/api/events?season_id=${seasonId}&page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch events by season');
    return response.json();
  },

  getById: async (id: string): Promise<Event> => {
    const response = await fetch(`${API_BASE_URL}/api/events/${id}`);
    if (!response.ok) throw new Error('Failed to fetch event');
    return response.json();
  },

  create: async (data: Partial<Event>): Promise<Event> => {
    const response = await fetch(`${API_BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Event creation failed:', response.status, errorBody);
      throw new Error(`Failed to create event: ${errorBody}`);
    }
    return response.json();
  },

  update: async (id: string, data: Partial<Event>): Promise<Event> => {
    const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update event');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/events/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete event');
  },

  getStats: async (): Promise<{ totalEvents: number }> => {
    const response = await fetch(`${API_BASE_URL}/api/events/stats`);
    if (!response.ok) throw new Error('Failed to fetch event stats');
    return response.json();
  },

  createMultiDay: async (
    data: Partial<Event>,
    numberOfDays: number,
    dayDates: string[]
  ): Promise<Event[]> => {
    const response = await fetch(`${API_BASE_URL}/api/events/multi-day`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, numberOfDays, dayDates }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Multi-day event creation failed:', response.status, errorBody);
      throw new Error(`Failed to create multi-day event: ${errorBody}`);
    }
    return response.json();
  },

  getByMultiDayGroup: async (groupId: string): Promise<Event[]> => {
    const response = await fetch(`${API_BASE_URL}/api/events/multi-day-group/${groupId}`);
    if (!response.ok) throw new Error('Failed to fetch events by multi-day group');
    return response.json();
  },
};
