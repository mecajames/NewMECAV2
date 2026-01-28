import axios from '@/lib/axios';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';

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
}

export const eventsApi = {
  getAll: async (page: number = 1, limit: number = 100): Promise<Event[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/events?page=${page}&limit=${limit}`);
    return response.data;
  },

  getAllBySeason: async (seasonId: string, page: number = 1, limit: number = 100): Promise<Event[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/events?season_id=${seasonId}&page=${page}&limit=${limit}`);
    return response.data;
  },

  getById: async (id: string): Promise<Event> => {
    const response = await axios.get(`${API_BASE_URL}/api/events/${id}`);
    return response.data;
  },

  create: async (data: Partial<Event>): Promise<Event> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/events`, data);
      return response.data;
    } catch (error: any) {
      console.error('Event creation failed:', error.response?.status, error.response?.data);
      throw new Error(`Failed to create event: ${error.response?.data?.message || error.message}`);
    }
  },

  update: async (id: string, data: Partial<Event>): Promise<Event> => {
    const response = await axios.put(`${API_BASE_URL}/api/events/${id}`, data);
    return response.data;
  },

  updateFlyerImagePosition: async (id: string, position: { x: number; y: number }): Promise<Event> => {
    const response = await axios.put(`${API_BASE_URL}/api/events/${id}`, { flyer_image_position: position });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/api/events/${id}`);
  },

  getStats: async (): Promise<{ totalEvents: number }> => {
    const response = await axios.get(`${API_BASE_URL}/api/events/stats`);
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
      const response = await axios.post(`${API_BASE_URL}/api/events/multi-day`, {
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
    const response = await axios.get(`${API_BASE_URL}/api/events/multi-day-group/${groupId}`);
    return response.data;
  },

  sendRatingEmails: async (eventId: string): Promise<{ sent: number; failed: number; errors: string[] }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/events/${eventId}/send-rating-emails`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to send rating emails: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Upload an event flyer image to Supabase storage
   * Returns the public URL of the uploaded image
   */
  uploadFlyerImage: async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `flyers/${fileName}`;

    const { error } = await supabase.storage
      .from('event-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Return the public URL
    return `${SUPABASE_URL}/storage/v1/object/public/event-images/${filePath}`;
  },

  /**
   * Delete an event flyer image from Supabase storage
   */
  deleteFlyerImage: async (imageUrl: string): Promise<void> => {
    // Extract the path from the URL
    const match = imageUrl.match(/event-images\/(.+)$/);
    if (!match) return;

    const filePath = match[1];
    const { error } = await supabase.storage
      .from('event-images')
      .remove([filePath]);

    if (error) {
      console.error('Failed to delete image:', error.message);
    }
  },
};
