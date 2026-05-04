import axios from '@/lib/axios';

export type ProvisionMode = 'active' | 'pay_to_activate' | 'inactive';
export type StaffRoleAssignment = 'admin' | 'event_director' | null;

export interface ProfileAuditRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  meca_id: string | null;
  account_type: string | null;
  role: string | null;
  is_staff: boolean;
  can_login: boolean;
  login_banned: boolean;
  membership_count: number;
  last_seen_at: string | null;
  last_login_at: string | null;
  restricted_to_billing: boolean;
  created_at: string;
  classifications: string[];
}

export interface AuthOrphanRow {
  auth_user_id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export interface SecuritySummary {
  total_profiles: number;
  profiles_can_login: number;
  profiles_without_membership: number;
  staff_or_admin: number;
  staff_without_membership: number;
  banned: number;
  auth_orphans: number;
  enforce_membership_for_login: boolean;
}

export interface ProvisionResult {
  membershipId: string;
  mecaId?: number;
  invoiceId?: string;
  invoiceNumber?: string;
  mode: ProvisionMode;
  message: string;
}

export interface ProvisionPayload {
  mode: ProvisionMode;
  membershipTypeConfigId: string;
  durationMonths?: number;
  forcePasswordChange?: boolean;
  staffRole?: StaffRoleAssignment;
  note?: string;
}

export const securityApi = {
  async getSummary(): Promise<SecuritySummary> {
    const { data } = await axios.get('/api/admin/security/summary');
    return data;
  },

  async getProfilesAudit(): Promise<ProfileAuditRow[]> {
    const { data } = await axios.get('/api/admin/security/profiles-audit');
    return data;
  },

  async getAuthOrphans(): Promise<AuthOrphanRow[]> {
    const { data } = await axios.get('/api/admin/security/auth-orphans');
    return data;
  },

  async provisionMembership(profileId: string, payload: ProvisionPayload): Promise<ProvisionResult> {
    const { data } = await axios.post(
      `/api/admin/security/profiles/${profileId}/provision-membership`,
      payload,
    );
    return data;
  },

  async setCanLogin(profileId: string, canLogin: boolean): Promise<{ success: boolean; canLogin: boolean }> {
    const { data } = await axios.post(`/api/admin/security/profiles/${profileId}/login`, { canLogin });
    return data;
  },

  async banProfile(profileId: string, reason?: string): Promise<{ success: boolean }> {
    const { data } = await axios.post(`/api/admin/security/profiles/${profileId}/ban`, { reason });
    return data;
  },

  async unbanProfile(profileId: string): Promise<{ success: boolean }> {
    const { data } = await axios.post(`/api/admin/security/profiles/${profileId}/unban`);
    return data;
  },

  async deleteProfile(profileId: string): Promise<{ success: boolean; message: string }> {
    const { data } = await axios.delete(`/api/admin/security/profiles/${profileId}`);
    return data;
  },

  async getEnforcement(): Promise<{ enabled: boolean }> {
    const { data } = await axios.get('/api/admin/security/enforcement');
    return data;
  },

  async setEnforcement(enabled: boolean): Promise<{ enabled: boolean }> {
    const { data } = await axios.post('/api/admin/security/enforcement', { enabled });
    return data;
  },
};
