import axios from '@/lib/axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const scheduledTasksApi = {
  /**
   * Manually trigger membership expiration emails (admin only)
   */
  triggerMembershipExpiration: async (): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post(`${API_BASE_URL}/api/scheduled-tasks/trigger-membership-expiration`);
    return response.data;
  },

  /**
   * Manually trigger event reminder emails (admin only)
   */
  triggerEventReminders: async (): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post(`${API_BASE_URL}/api/scheduled-tasks/trigger-event-reminders`);
    return response.data;
  },

  /**
   * Send a test email to verify configuration (admin only)
   */
  sendTestEmail: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post(`${API_BASE_URL}/api/scheduled-tasks/send-test-email`, { email });
    return response.data;
  },

  /**
   * Manually trigger event status updates (admin only)
   */
  triggerEventStatusUpdates: async (): Promise<{ success: boolean; message: string; updated: number }> => {
    const response = await axios.post(`${API_BASE_URL}/api/scheduled-tasks/trigger-event-status-updates`);
    return response.data;
  },
};
