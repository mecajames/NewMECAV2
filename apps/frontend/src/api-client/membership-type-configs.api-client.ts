const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export enum MembershipCategory {
  COMPETITOR = 'competitor',
  TEAM = 'team',
  RETAIL = 'retail',
  MANUFACTURER = 'manufacturer',
}

// Manufacturer tiers for tiered pricing
export enum ManufacturerTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
}

export interface MembershipTypeConfig {
  id: string;
  name: string;
  description?: string;
  category: MembershipCategory;
  tier?: ManufacturerTier; // Only for manufacturer memberships
  price: number;
  currency?: string;
  benefits?: string[];
  requiredFields?: string[];
  optionalFields?: string[];
  isActive: boolean;
  isFeatured: boolean;
  showOnPublicSite: boolean; // False for manufacturer memberships
  displayOrder: number;
  stripePriceId?: string;
  stripeProductId?: string;
  quickbooksItemId?: string;
  quickbooksAccountId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMembershipTypeConfigDto {
  name: string;
  description?: string;
  category: MembershipCategory;
  tier?: ManufacturerTier;
  price: number;
  currency?: string;
  benefits?: string[];
  requiredFields?: string[];
  optionalFields?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  showOnPublicSite?: boolean;
  displayOrder?: number;
  stripePriceId?: string;
  stripeProductId?: string;
  quickbooksItemId?: string;
  quickbooksAccountId?: string;
}

export interface UpdateMembershipTypeConfigDto {
  name?: string;
  description?: string;
  tier?: ManufacturerTier;
  price?: number;
  currency?: string;
  benefits?: string[];
  requiredFields?: string[];
  optionalFields?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  showOnPublicSite?: boolean;
  displayOrder?: number;
  stripePriceId?: string;
  stripeProductId?: string;
  quickbooksItemId?: string;
  quickbooksAccountId?: string;
}

export const membershipTypeConfigsApi = {
  /**
   * Get all membership type configurations
   */
  getAll: async (includeInactive: boolean = false): Promise<MembershipTypeConfig[]> => {
    const params = new URLSearchParams();
    if (includeInactive) {
      params.append('includeInactive', 'true');
    }
    const response = await fetch(`${API_BASE_URL}/api/membership-type-configs?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch membership type configs');
    }
    return response.json();
  },

  /**
   * Get active membership type configurations
   */
  getActive: async (): Promise<MembershipTypeConfig[]> => {
    const response = await fetch(`${API_BASE_URL}/api/membership-type-configs/active`);
    if (!response.ok) {
      throw new Error('Failed to fetch active membership type configs');
    }
    return response.json();
  },

  /**
   * Get featured membership type configurations
   */
  getFeatured: async (): Promise<MembershipTypeConfig[]> => {
    const response = await fetch(`${API_BASE_URL}/api/membership-type-configs/featured`);
    if (!response.ok) {
      throw new Error('Failed to fetch featured membership type configs');
    }
    return response.json();
  },

  /**
   * Get memberships visible on the public website
   * Excludes manufacturer memberships (showOnPublicSite = false)
   */
  getPublic: async (): Promise<MembershipTypeConfig[]> => {
    const response = await fetch(`${API_BASE_URL}/api/membership-type-configs/public`);
    if (!response.ok) {
      throw new Error('Failed to fetch public membership type configs');
    }
    return response.json();
  },

  /**
   * Get membership type configurations by category
   */
  getByCategory: async (category: MembershipCategory): Promise<MembershipTypeConfig[]> => {
    const response = await fetch(`${API_BASE_URL}/api/membership-type-configs/category/${category}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch membership type configs for category ${category}`);
    }
    return response.json();
  },

  /**
   * Get membership type configuration by ID
   */
  getById: async (id: string): Promise<MembershipTypeConfig> => {
    const response = await fetch(`${API_BASE_URL}/api/membership-type-configs/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch membership type config ${id}`);
    }
    return response.json();
  },

  /**
   * Create a new membership type configuration
   */
  create: async (data: CreateMembershipTypeConfigDto): Promise<MembershipTypeConfig> => {
    const response = await fetch(`${API_BASE_URL}/api/membership-type-configs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create membership type config');
    }
    return response.json();
  },

  /**
   * Update a membership type configuration
   */
  update: async (id: string, data: UpdateMembershipTypeConfigDto): Promise<MembershipTypeConfig> => {
    const response = await fetch(`${API_BASE_URL}/api/membership-type-configs/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update membership type config ${id}`);
    }
    return response.json();
  },

  /**
   * Delete a membership type configuration
   */
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/membership-type-configs/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete membership type config ${id}`);
    }
  },

  /**
   * Toggle active status of a membership type configuration
   */
  toggleActive: async (id: string): Promise<MembershipTypeConfig> => {
    const response = await fetch(`${API_BASE_URL}/api/membership-type-configs/${id}/toggle-active`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to toggle active status for membership type config ${id}`);
    }
    return response.json();
  },

  /**
   * Update display order of membership type configurations
   */
  updateDisplayOrder: async (updates: Array<{ id: string; displayOrder: number }>): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/membership-type-configs/display-order`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error('Failed to update display order');
    }
  },
};
