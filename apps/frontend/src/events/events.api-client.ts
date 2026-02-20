import axios from '@/lib/axios';
import { uploadFile } from '@/api-client/uploads.api-client';

export type MultiDayResultsMode = 'separate' | 'combined_score' | 'combined_points';

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
  flyer_image_position?: { x: number; y: number };
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
  multi_day_results_mode?: MultiDayResultsMode;
  created_at: string;
  updated_at: string;
  event_director?: any;
  season?: any;
  result_count?: number;
}

export const eventsApi = {
  getAll: async (page: number = 1, limit: number = 100): Promise<Event[]> => {
    const response = await axios.get(`/api/events?page=${page}&limit=${limit}`);
    return response.data;
  },

  getAllBySeason: async (seasonId: string, page: number = 1, limit: number = 100): Promise<Event[]> => {
    const response = await axios.get(`/api/events?season_id=${seasonId}&page=${page}&limit=${limit}`);
    return response.data;
  },

  /**
   * Get public events with server-side filtering (excludes not_public)
   * Optimized endpoint that reduces client-side filtering
   */
  getPublicEvents: async (options?: {
    page?: number;
    limit?: number;
    seasonId?: string;
    status?: string;
  }): Promise<{ events: Event[]; total: number; page: number; limit: number }> => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.seasonId) params.append('season_id', options.seasonId);
    if (options?.status) params.append('status', options.status);

    const response = await axios.get(`/api/events/public?${params.toString()}`);
    return response.data;
  },

  /**
   * Get completed events with result counts - optimized for Results page
   */
  getCompletedEventsWithResults: async (options?: {
    page?: number;
    limit?: number;
    seasonId?: string;
  }): Promise<{ events: any[]; total: number }> => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.seasonId) params.append('season_id', options.seasonId);

    const response = await axios.get(`/api/events/completed-with-results?${params.toString()}`);
    return response.data;
  },

  getByDirector: async (directorId: string): Promise<Event[]> => {
    const response = await axios.get(`/api/events/by-director/${directorId}`);
    return response.data;
  },

  getById: async (id: string): Promise<Event> => {
    const response = await axios.get(`/api/events/${id}`);
    return response.data;
  },

  create: async (data: Partial<Event>): Promise<Event> => {
    try {
      const response = await axios.post(`/api/events`, data);
      return response.data;
    } catch (error: any) {
      console.error('Event creation failed:', error.response?.status, error.response?.data);
      throw new Error(`Failed to create event: ${error.response?.data?.message || error.message}`);
    }
  },

  update: async (id: string, data: Partial<Event>): Promise<Event> => {
    const response = await axios.put(`/api/events/${id}`, data);
    return response.data;
  },

  updateFlyerImagePosition: async (id: string, position: { x: number; y: number }): Promise<Event> => {
    const response = await axios.put(`/api/events/${id}`, { flyer_image_position: position });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/events/${id}`);
  },

  getStats: async (): Promise<{ totalEvents: number }> => {
    const response = await axios.get(`/api/events/stats`);
    return response.data;
  },

  createMultiDay: async (
    data: Partial<Event>,
    numberOfDays: number,
    dayDates: string[],
    dayMultipliers?: number[],
    multiDayResultsMode?: MultiDayResultsMode
  ): Promise<Event[]> => {
    try {
      const response = await axios.post(`/api/events/multi-day`, {
        data,
        numberOfDays,
        dayDates,
        dayMultipliers,
        multiDayResultsMode,
      });
      return response.data;
    } catch (error: any) {
      console.error('Multi-day event creation failed:', error.response?.status, error.response?.data);
      throw new Error(`Failed to create multi-day event: ${error.response?.data?.message || error.message}`);
    }
  },

  getByMultiDayGroup: async (groupId: string): Promise<Event[]> => {
    const response = await axios.get(`/api/events/multi-day-group/${groupId}`);
    return response.data;
  },

  sendRatingEmails: async (eventId: string): Promise<{ sent: number; failed: number; errors: string[] }> => {
    try {
      const response = await axios.post(`/api/events/${eventId}/send-rating-emails`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to send rating emails: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Upload an event flyer image through the backend
   * Returns the public URL of the uploaded image
   */
  uploadFlyerImage: async (file: File): Promise<string> => {
    const result = await uploadFile(file, 'event-images');
    return result.publicUrl;
  },

  /**
   * Delete an event flyer image via the backend
   */
  deleteFlyerImage: async (imageUrl: string): Promise<void> => {
    const match = imageUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) return;

    try {
      await axios.delete('/api/uploads', {
        data: { bucket: match[1], storagePath: match[2] },
      });
    } catch (error: any) {
      console.error('Failed to delete image:', error.message);
    }
  },
};
