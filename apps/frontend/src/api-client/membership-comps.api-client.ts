import axios from '@/lib/axios';

export type MembershipCompType =
  | 'free_period'
  | 'free_secondary_slots'
  | 'renewal_discount_pct'
  | 'renewal_discount_fixed';

export type MembershipCompStatus =
  | 'active'
  | 'expired_unused'
  | 'consumed'
  | 'revoked';

export interface MembershipComp {
  id: string;
  membership_id: string;
  /** Populated only on member-scoped endpoints (`my/active`). */
  membership?: {
    id: string;
    membershipTypeConfig?: { id: string; name: string; category?: string };
    membership_type_config?: { id: string; name: string; category?: string };
  };
  comp_type: MembershipCompType;
  value: string;
  starts_at: string;
  ends_at?: string | null;
  max_uses?: number | null;
  uses_remaining?: number | null;
  status: MembershipCompStatus;
  granted_by_admin_id?: string | { id: string; first_name?: string; last_name?: string; email?: string } | null;
  granted_at: string;
  revoked_by_admin_id?: string | { id: string; first_name?: string; last_name?: string; email?: string } | null;
  revoked_at?: string | null;
  reason?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrantCompDto {
  membership_id: string;
  comp_type: MembershipCompType;
  value: number;
  ends_at?: string | null;
  indefinite?: boolean;
  max_uses?: number;
  reason?: string;
  notes?: string;
}

export const membershipCompsApi = {
  grant: async (dto: GrantCompDto): Promise<MembershipComp> => {
    const r = await axios.post('/api/membership-comps', dto);
    return r.data;
  },
  listForMembership: async (membershipId: string): Promise<MembershipComp[]> => {
    const r = await axios.get(`/api/membership-comps/membership/${membershipId}`);
    return r.data;
  },
  listActiveForMembership: async (membershipId: string): Promise<MembershipComp[]> => {
    const r = await axios.get(`/api/membership-comps/membership/${membershipId}/active`);
    return r.data;
  },
  revoke: async (id: string, reason?: string): Promise<MembershipComp> => {
    const r = await axios.post(`/api/membership-comps/${id}/revoke`, { reason });
    return r.data;
  },
  expireDue: async (): Promise<{ expired: number }> => {
    const r = await axios.post('/api/membership-comps/expire-due');
    return r.data;
  },
  /** Member-scoped: every active comp across all the caller's memberships. */
  listMyActive: async (): Promise<MembershipComp[]> => {
    const r = await axios.get('/api/membership-comps/my/active');
    return r.data;
  },
  /** Admin-scoped: active comps across all of a user's memberships. */
  listActiveForUser: async (userId: string): Promise<MembershipComp[]> => {
    const r = await axios.get(`/api/membership-comps/user/${userId}/active`);
    return r.data;
  },
};
