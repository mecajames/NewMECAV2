import axios from '@/lib/axios';

export interface HallOfFameInductee {
  id: string;
  category: string;
  induction_year: number;
  name: string;
  state: string | null;
  team_affiliation: string | null;
  location: string | null;
  bio: string | null;
  image_url: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateHallOfFameInducteeDto {
  category: string;
  induction_year: number;
  name: string;
  state?: string | null;
  team_affiliation?: string | null;
  location?: string | null;
  bio?: string | null;
  image_url?: string | null;
}

export const hallOfFameApi = {
  getAll: async (category?: string, year?: number): Promise<HallOfFameInductee[]> => {
    const params: any = {};
    if (category) params.category = category;
    if (year) params.year = year;
    const response = await axios.get('/api/hall-of-fame', { params });
    return response.data;
  },

  getById: async (id: string): Promise<HallOfFameInductee> => {
    const response = await axios.get(`/api/hall-of-fame/${id}`);
    return response.data;
  },

  getYears: async (): Promise<number[]> => {
    const response = await axios.get('/api/hall-of-fame/years');
    return response.data;
  },

  create: async (data: CreateHallOfFameInducteeDto): Promise<HallOfFameInductee> => {
    const response = await axios.post('/api/hall-of-fame', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateHallOfFameInducteeDto>): Promise<HallOfFameInductee> => {
    const response = await axios.put(`/api/hall-of-fame/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/hall-of-fame/${id}`);
  },
};
