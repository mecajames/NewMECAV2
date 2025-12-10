import axios from 'axios';

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
    const response = await axios.get(`/api/membership-type-configs?${params}`);
    return response.data;
  },

  /**
   * Get active membership type configurations
   */
  getActive: async (): Promise<MembershipTypeConfig[]> => {
    const response = await axios.get('/api/membership-type-configs/active');
    return response.data;
  },

  /**
   * Get featured membership type configurations
   */
  getFeatured: async (): Promise<MembershipTypeConfig[]> => {
    const response = await axios.get('/api/membership-type-configs/featured');
    return response.data;
  },

  /**
   * Get memberships visible on the public website
   * Excludes manufacturer memberships (showOnPublicSite = false)
   */
  getPublic: async (): Promise<MembershipTypeConfig[]> => {
    const response = await axios.get('/api/membership-type-configs/public');
    return response.data;
  },

  /**
   * Get membership type configurations by category
   */
  getByCategory: async (category: MembershipCategory): Promise<MembershipTypeConfig[]> => {
    const response = await axios.get(`/api/membership-type-configs/category/${category}`);
    return response.data;
  },

  /**
   * Get membership type configuration by ID
   */
  getById: async (id: string): Promise<MembershipTypeConfig> => {
    const response = await axios.get(`/api/membership-type-configs/${id}`);
    return response.data;
  },

  /**
   * Create a new membership type configuration
   */
  create: async (data: CreateMembershipTypeConfigDto): Promise<MembershipTypeConfig> => {
    const response = await axios.post('/api/membership-type-configs', data);
    return response.data;
  },

  /**
   * Update a membership type configuration
   */
  update: async (id: string, data: UpdateMembershipTypeConfigDto): Promise<MembershipTypeConfig> => {
    const response = await axios.put(`/api/membership-type-configs/${id}`, data);
    return response.data;
  },

  /**
   * Delete a membership type configuration
   */
  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/membership-type-configs/${id}`);
  },

  /**
   * Toggle active status of a membership type configuration
   */
  toggleActive: async (id: string): Promise<MembershipTypeConfig> => {
    const response = await axios.post(`/api/membership-type-configs/${id}/toggle-active`);
    return response.data;
  },

  /**
   * Update display order of membership type configurations
   */
  updateDisplayOrder: async (updates: Array<{ id: string; displayOrder: number }>): Promise<void> => {
    await axios.put('/api/membership-type-configs/display-order', updates);
  },
};
