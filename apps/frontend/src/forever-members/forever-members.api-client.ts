import axios from '@/lib/axios';

export interface ForeverMemberStats {
  totalEvents: number;
  totalPoints: number;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  bestScoresByFormat: { format: string; bestScore: number }[];
  formatsCompeted: string[];
  yearsActive: { first: number; last: number } | null;
}

export interface ForeverMember {
  id: string;
  meca_id: string;
  full_name: string;
  photo_url?: string;
  bio?: string;
  quote?: string;
  date_of_birth?: string;
  date_of_passing?: string;
  member_since?: string;
  display_order: number;
  is_published: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  stats?: ForeverMemberStats;
}

export const foreverMembersApi = {
  getAll: async (): Promise<ForeverMember[]> => {
    const response = await axios.get('/api/forever-members');
    return response.data;
  },

  getById: async (id: string): Promise<ForeverMember> => {
    const response = await axios.get(`/api/forever-members/${id}`);
    return response.data;
  },

  getAllAdmin: async (): Promise<ForeverMember[]> => {
    const response = await axios.get('/api/forever-members/admin/all');
    return response.data;
  },

  create: async (data: Partial<ForeverMember>): Promise<ForeverMember> => {
    const response = await axios.post('/api/forever-members', data);
    return response.data;
  },

  update: async (id: string, data: Partial<ForeverMember>): Promise<ForeverMember> => {
    const response = await axios.put(`/api/forever-members/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/forever-members/${id}`);
  },
};
