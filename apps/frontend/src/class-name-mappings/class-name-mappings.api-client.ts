const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

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
    const response = await fetch(`${API_BASE_URL}/api/class-name-mappings`);
    if (!response.ok) throw new Error('Failed to fetch class name mappings');
    return response.json();
  },

  getActive: async (): Promise<ClassNameMapping[]> => {
    const response = await fetch(`${API_BASE_URL}/api/class-name-mappings/active`);
    if (!response.ok) throw new Error('Failed to fetch active class name mappings');
    return response.json();
  },

  getUnmapped: async (): Promise<UnmappedClass[]> => {
    const response = await fetch(`${API_BASE_URL}/api/class-name-mappings/unmapped`);
    if (!response.ok) throw new Error('Failed to fetch unmapped classes');
    return response.json();
  },

  getById: async (id: string): Promise<ClassNameMapping> => {
    const response = await fetch(`${API_BASE_URL}/api/class-name-mappings/${id}`);
    if (!response.ok) throw new Error('Failed to fetch class name mapping');
    return response.json();
  },

  create: async (data: {
    sourceName: string;
    targetClassId?: string;
    sourceSystem?: string;
    isActive?: boolean;
    notes?: string;
  }): Promise<ClassNameMapping> => {
    const response = await fetch(`${API_BASE_URL}/api/class-name-mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to create class name mapping');
    }
    return response.json();
  },

  bulkCreate: async (mappings: {
    sourceName: string;
    targetClassId?: string;
    sourceSystem?: string;
    notes?: string;
  }[]): Promise<{ created: number; errors: string[] }> => {
    const response = await fetch(`${API_BASE_URL}/api/class-name-mappings/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to bulk create mappings');
    }
    return response.json();
  },

  update: async (id: string, data: {
    sourceName?: string;
    targetClassId?: string | null;
    sourceSystem?: string;
    isActive?: boolean;
    notes?: string;
  }): Promise<ClassNameMapping> => {
    const response = await fetch(`${API_BASE_URL}/api/class-name-mappings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to update class name mapping');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/class-name-mappings/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete class name mapping');
  },
};
