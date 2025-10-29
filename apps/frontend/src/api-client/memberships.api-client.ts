/**
 * Memberships API Client
 * Centralized HTTP request functions for Membership operations
 */

import { authenticatedFetch } from './api-helpers';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface MembershipData {
  id?: string;
  userId: string;
  membershipType: string;
  startDate: string;
  endDate?: string;
  amountPaid: number;
  paymentStatus: string;
  transactionId?: string;
}

export const membershipsApi = {
  getMemberships: async (page: number = 1, limit: number = 10): Promise<MembershipData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/memberships?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch memberships');
    return response.json();
  },

  getMembership: async (id: string): Promise<MembershipData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/memberships/${id}`);
    if (!response.ok) throw new Error('Failed to fetch membership');
    return response.json();
  },

  getMembershipsByUser: async (userId: string): Promise<MembershipData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/memberships/user/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch user memberships');
    return response.json();
  },

  getActiveMembership: async (userId: string): Promise<MembershipData | null> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/memberships/user/${userId}/active`);
    if (!response.ok) return null;
    return response.json();
  },

  renewMembership: async (userId: string, membershipType: string): Promise<MembershipData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/memberships/user/${userId}/renew`, {
      method: 'POST',
            body: JSON.stringify({ membershipType }),
    });
    if (!response.ok) throw new Error('Failed to renew membership');
    return response.json();
  },

  createMembership: async (data: Partial<MembershipData>): Promise<MembershipData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/memberships`, {
      method: 'POST',
            body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create membership');
    return response.json();
  },

  updateMembership: async (id: string, data: Partial<MembershipData>): Promise<MembershipData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/memberships/${id}`, {
      method: 'PUT',
            body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update membership');
    return response.json();
  },

  deleteMembership: async (id: string): Promise<void> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/memberships/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete membership');
  },
};
