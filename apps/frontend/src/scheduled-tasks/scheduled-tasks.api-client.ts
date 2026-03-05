import axios from '@/lib/axios';

export const scheduledTasksApi = {
  /**
   * Manually trigger membership expiration emails (admin only)
   */
  triggerMembershipExpiration: async (): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post('/api/scheduled-tasks/trigger-membership-expiration');
    return response.data;
  },

  /**
   * Manually trigger event reminder emails (admin only)
   */
  triggerEventReminders: async (): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post('/api/scheduled-tasks/trigger-event-reminders');
    return response.data;
  },

  /**
   * Send a test email to verify configuration (admin only)
   * Optionally specify a template key to test a specific branded template
   */
  sendTestEmail: async (email: string, template?: string): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post('/api/scheduled-tasks/send-test-email', { email, template });
    return response.data;
  },

  /**
   * Manually trigger event status updates (admin only)
   */
  triggerEventStatusUpdates: async (): Promise<{ success: boolean; message: string; updated: number }> => {
    const response = await axios.post('/api/scheduled-tasks/trigger-event-status-updates');
    return response.data;
  },

  /**
   * Manually trigger marking overdue invoices (admin only)
   */
  triggerMarkOverdue: async (): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post('/api/scheduled-tasks/trigger-mark-overdue');
    return response.data;
  },

  /**
   * Manually trigger invoice auto-cancellation (admin only)
   */
  triggerInvoiceAutoCancel: async (): Promise<{ success: boolean; message: string; cancelled: number }> => {
    const response = await axios.post('/api/scheduled-tasks/trigger-invoice-auto-cancel');
    return response.data;
  },
};
