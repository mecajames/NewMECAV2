import axios from 'axios';

// Store for the current user ID
let currentUserId: string | null = null;

// Set up axios interceptor to add x-user-id header
axios.interceptors.request.use(
  (config) => {
    if (currentUserId) {
      config.headers['x-user-id'] = currentUserId;
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
