import axios from '@/lib/axios';

export interface AuditLogEntry {
  id: string;
  email: string;
  user_id: string | null;
  action: 'login' | 'logout' | 'failed_attempt';
  ip_address: string | null;
  user_agent: string | null;
  error_message: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
}

export interface AuditLogResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export const userActivityApi = {
  /** Record a successful login */
  recordLogin: async (email: string): Promise<void> => {
    try {
      await axios.post('/api/user-activity/login', { email });
    } catch {
      // Fire-and-forget
    }
  },

  /** Record a logout */
  recordLogout: async (email: string): Promise<void> => {
    try {
      await axios.post('/api/user-activity/logout', { email });
    } catch {
      // Fire-and-forget
    }
  },

  /** Record a failed login attempt */
  recordFailedAttempt: async (email: string, error?: string): Promise<void> => {
    try {
      await axios.post('/api/user-activity/failed-attempt', { email, error });
    } catch {
      // Fire-and-forget
    }
  },

  /** Get count of online users (admin) */
  getOnlineCount: async (): Promise<number> => {
    const { data } = await axios.get<{ count: number }>('/api/user-activity/online-count');
    return data.count;
  },

  /** Get list of online user IDs (admin) */
  getOnlineUsers: async (): Promise<string[]> => {
    const { data } = await axios.get<{ userIds: string[] }>('/api/user-activity/online-users');
    return data.userIds;
  },

  /** Get paginated audit log (admin) */
  getAuditLog: async (params: {
    action?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<AuditLogResponse> => {
    const { data } = await axios.get<AuditLogResponse>('/api/user-activity/audit-log', { params });
    return data;
  },
};
