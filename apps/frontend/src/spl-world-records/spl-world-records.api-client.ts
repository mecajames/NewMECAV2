import axios from '@/lib/axios';

export interface SplWorldRecord {
  id: string;
  class_id: string;
  class_name: string;
  event_id: string | null;
  event_name: string | null;
  season_id: string | null;
  competitor_name: string;
  meca_id: string | null;
  competitor_id: string | null;
  score: number;
  wattage: number | null;
  frequency: number | null;
  notes: string | null;
  record_date: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface SplWorldRecordHistory {
  id: string;
  record_id: string;
  class_id: string;
  class_name: string;
  event_id: string | null;
  event_name: string | null;
  season_id: string | null;
  competitor_name: string;
  meca_id: string | null;
  competitor_id: string | null;
  score: number;
  wattage: number | null;
  frequency: number | null;
  notes: string | null;
  record_date: string | null;
  replaced_at: string;
  created_at: string;
}

export interface CreateSplWorldRecordDto {
  class_id: string;
  class_name: string;
  event_id?: string | null;
  event_name?: string | null;
  season_id?: string | null;
  competitor_name: string;
  meca_id?: string | null;
  competitor_id?: string | null;
  score: number;
  wattage?: number | null;
  frequency?: number | null;
  notes?: string | null;
  record_date?: string | null;
}

export const splWorldRecordsApi = {
  getAll: async (): Promise<SplWorldRecord[]> => {
    const response = await axios.get('/api/spl-world-records');
    return response.data;
  },

  getById: async (id: string): Promise<SplWorldRecord> => {
    const response = await axios.get(`/api/spl-world-records/${id}`);
    return response.data;
  },

  getHistory: async (classId: string): Promise<SplWorldRecordHistory[]> => {
    const response = await axios.get(`/api/spl-world-records/history/${classId}`);
    return response.data;
  },

  create: async (data: CreateSplWorldRecordDto): Promise<SplWorldRecord> => {
    try {
      const response = await axios.post('/api/spl-world-records', data);
      return response.data;
    } catch (error: any) {
      console.error('World record creation failed:', error.response?.status, error.response?.data);
      throw new Error(`Failed to save world record: ${error.response?.data?.message || error.message}`);
    }
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/spl-world-records/${id}`);
  },
};
