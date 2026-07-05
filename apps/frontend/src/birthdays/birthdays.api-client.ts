import axios from '@/lib/axios';

export interface BirthdayEmailSettings {
  enabled: boolean;
  subject: string;
  /** HTML body — supports the {{first_name}} placeholder. */
  bodyHtml: string;
  imageUrl: string;
}

export interface UpcomingBirthdayRow {
  profileId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  mecaId: string | null;
  birthday: string;
  nextDate: string;
  daysUntil: number;
  lastStatus: 'sent' | 'failed' | 'pending' | null;
  sentAt: string | null;
  error: string | null;
}

export const birthdaysApi = {
  getSettings: async (): Promise<BirthdayEmailSettings> => {
    const response = await axios.get('/api/birthdays/admin/settings');
    return response.data;
  },

  updateSettings: async (data: Partial<BirthdayEmailSettings>): Promise<BirthdayEmailSettings> => {
    const response = await axios.put('/api/birthdays/admin/settings', data);
    return response.data;
  },

  getUpcoming: async (days = 60): Promise<UpcomingBirthdayRow[]> => {
    const response = await axios.get('/api/birthdays/admin/upcoming', { params: { days } });
    return response.data;
  },

  sendTest: async (to: string): Promise<{ success: boolean; error?: string }> => {
    const response = await axios.post('/api/birthdays/admin/test-email', { to });
    return response.data;
  },

  runNow: async (): Promise<{ sent: number; failed: number; skipped: number }> => {
    const response = await axios.post('/api/birthdays/admin/run-now');
    return response.data;
  },
};
