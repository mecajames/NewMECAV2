import axios from 'axios';
import { supabase } from './supabase';

// Store for the current user ID
let currentUserId: string | null = null;

// Set up axios interceptor to add x-user-id and Authorization headers
axios.interceptors.request.use(
  async (config) => {
    if (currentUserId) {
      config.headers['x-user-id'] = currentUserId;
    }

    // Get current session and add Authorization header
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      // Silently fail - request will proceed without auth header
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Function to update the current user ID (called by AuthContext)
export function setAxiosUserId(userId: string | null) {
  currentUserId = userId;
}

export default axios;
