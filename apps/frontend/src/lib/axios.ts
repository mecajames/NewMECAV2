import axios from 'axios';
import { supabase } from './supabase';
import { emitActivitySignal, BACKGROUND_REQUEST_KEY } from './activitySignal';

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

// Signal activity on successful API responses (resets idle timer)
// Skip background requests (e.g., polling, heartbeats) — they should not keep sessions alive
axios.interceptors.response.use(
  (response) => {
    if (!response.config[BACKGROUND_REQUEST_KEY]) {
      emitActivitySignal();
    }
    return response;
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
