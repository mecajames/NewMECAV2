import axios from '@/lib/axios';

export interface AuditLogEntry {
  id: string;
  email: string;
  user_id: string | null;
  action: 'login' | 'logout' | 'failed_attempt';
  ip_address: string | null;
  user_agent: string | null;
  error_message: string | null;
  session_id: string | null;
  logout_reason: string | null;
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

export interface SessionEntry {
  session_id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  login_time: string;
  logout_time: string | null;
  logout_reason: string | null;
  duration_seconds: number | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface SessionsResponse {
  items: SessionEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SessionStats {
  totalSessions: number;
  avgDurationSeconds: number | null;
  activeSessions: number;
  manualLogouts: number;
  timeoutLogouts: number;
  failedAttempts24h: number;
  uniqueFailedIps24h: number;
}

export interface AdminAuditEntry {
  id: string;
  admin_user_id: string;
  admin_name: string | null;
  admin_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  description: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AdminAuditResponse {
  items: AdminAuditEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export const userActivityApi = {
  /** Record a successful login. Returns sessionId for session tracking. */
  recordLogin: async (email: string): Promise<string | null> => {
    try {
      const { data } = await axios.post<{ sessionId: string | null }>('/api/user-activity/login', { email });
      return data?.sessionId ?? null;
    } catch {
      return null;
    }
  },

  /** Record a logout with optional sessionId and reason */
  recordLogout: async (email: string, sessionId?: string, reason?: string): Promise<void> => {
    try {
      await axios.post('/api/user-activity/logout', { email, sessionId, reason });
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

  /** Get paginated sessions view (admin) */
  getSessions: async (params: {
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<SessionsResponse> => {
    const { data } = await axios.get<SessionsResponse>('/api/user-activity/sessions', { params });
    return data;
  },

  /** Get session statistics (admin) */
  getSessionStats: async (): Promise<SessionStats> => {
    const { data } = await axios.get<SessionStats>('/api/user-activity/session-stats');
    return data;
  },

  /** Get paginated admin audit log (admin) */
  getAdminAuditLog: async (params: {
    action?: string;
    resourceType?: string;
    adminUserId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminAuditResponse> => {
    const { data } = await axios.get<AdminAuditResponse>('/api/user-activity/admin-audit-log', { params });
    return data;
  },
};
