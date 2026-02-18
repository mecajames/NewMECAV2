import axios from '@/lib/axios';

export interface ClassNameMapping {
  id: string;
  sourceName: string;
  source_name?: string;
  targetClassId?: string;
  target_class_id?: string;
  targetClass?: {
    id: string;
    name: string;
    format: string;
  };
  sourceSystem: string;
  source_system?: string;
  isActive: boolean;
  is_active?: boolean;
  notes?: string;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}

export interface UnmappedClass {
  className: string;
  count: number;
  format: string | null;
}

export const classNameMappingsApi = {
  getAll: async (): Promise<ClassNameMapping[]> => {
    const response = await axios.get('/api/class-name-mappings');
    return response.data;
  },

  getActive: async (): Promise<ClassNameMapping[]> => {
    const response = await axios.get('/api/class-name-mappings/active');
    return response.data;
  },

  getUnmapped: async (): Promise<UnmappedClass[]> => {
    const response = await axios.get('/api/class-name-mappings/unmapped');
    return response.data;
  },

  getById: async (id: string): Promise<ClassNameMapping> => {
    const response = await axios.get(`/api/class-name-mappings/${id}`);
    return response.data;
  },

  create: async (data: {
    sourceName: string;
    targetClassId?: string;
    sourceSystem?: string;
    isActive?: boolean;
    notes?: string;
  }): Promise<ClassNameMapping> => {
    const response = await axios.post('/api/class-name-mappings', data);
    return response.data;
  },

  bulkCreate: async (mappings: {
    sourceName: string;
    targetClassId?: string;
    sourceSystem?: string;
    notes?: string;
  }[]): Promise<{ created: number; errors: string[] }> => {
    const response = await axios.post('/api/class-name-mappings/bulk', { mappings });
    return response.data;
  },

  update: async (id: string, data: {
    sourceName?: string;
    targetClassId?: string | null;
    sourceSystem?: string;
    isActive?: boolean;
    notes?: string;
  }): Promise<ClassNameMapping> => {
    const response = await axios.put(`/api/class-name-mappings/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/class-name-mappings/${id}`);
  },
};
