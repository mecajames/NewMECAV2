import axios from '@/lib/axios';

// Helper to transform API response to ensure camelCase (handles MikroORM serialization)
function transformListing<T>(data: any): T {
  if (!data) return data;
  return {
    ...data,
    // Ensure camelCase for common fields that might come as snake_case
    coverImagePosition: data.coverImagePosition || data.cover_image_position,
    profileImageUrl: data.profileImageUrl || data.profile_image_url,
    businessName: data.businessName || data.business_name,
    businessEmail: data.businessEmail || data.business_email,
    businessPhone: data.businessPhone || data.business_phone,
    offerText: data.offerText || data.offer_text,
    storeType: data.storeType || data.store_type,
    streetAddress: data.streetAddress || data.street_address,
    postalCode: data.postalCode || data.postal_code,
    galleryImages: data.galleryImages || data.gallery_images,
    productCategories: data.productCategories || data.product_categories,
    isSponsor: data.isSponsor ?? data.is_sponsor,
    sponsorOrder: data.sponsorOrder ?? data.sponsor_order,
    isActive: data.isActive ?? data.is_active,
    isApproved: data.isApproved ?? data.is_approved,
    startDate: data.startDate || data.start_date,
    endDate: data.endDate || data.end_date,
    createdAt: data.createdAt || data.created_at,
    updatedAt: data.updatedAt || data.updated_at,
    userId: data.userId || data.user_id || data.user?.id,
  } as T;
}

export interface GalleryImage {
  url: string;
  caption?: string;
  productLink?: string;
}

export interface RetailerListing {
  id: string;
  userId: string;
  businessName: string;
  description?: string;
  offerText?: string; // Special offer/discount/coupon text for MECA members
  businessEmail?: string;
  businessPhone?: string;
  website?: string;
  storeType: 'brick_and_mortar' | 'online' | 'both';
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  profileImageUrl?: string;
  galleryImages?: GalleryImage[];
  coverImagePosition?: { x: number; y: number };
  isSponsor: boolean;
  sponsorOrder?: number;
  isActive: boolean;
  isApproved: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

export interface ManufacturerListing {
  id: string;
  userId: string;
  businessName: string;
  description?: string;
  businessEmail?: string;
  businessPhone?: string;
  website?: string;
  productCategories?: string[];
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  profileImageUrl?: string;
  galleryImages?: GalleryImage[];
  coverImagePosition?: { x: number; y: number };
  isSponsor: boolean;
  sponsorOrder?: number;
  isActive: boolean;
  isApproved: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

export interface CreateRetailerDto {
  business_name: string;
  description?: string;
  offer_text?: string; // Special offer/discount/coupon text for MECA members
  business_email?: string;
  business_phone?: string;
  website?: string;
  store_type?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  profile_image_url?: string;
  gallery_images?: GalleryImage[];
}

export interface CreateManufacturerDto {
  business_name: string;
  description?: string;
  business_email?: string;
  business_phone?: string;
  website?: string;
  product_categories?: string[];
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  profile_image_url?: string;
  gallery_images?: GalleryImage[];
}

// ============================================
// PUBLIC ENDPOINTS
// ============================================

export async function getAllRetailers(): Promise<RetailerListing[]> {
  const response = await axios.get(`/api/business-listings/retailers`);
  return response.data.map((item: any) => transformListing<RetailerListing>(item));
}

export async function getRetailerById(id: string): Promise<RetailerListing> {
  const response = await axios.get(`/api/business-listings/retailers/${id}`);
  return transformListing<RetailerListing>(response.data);
}

export async function getAllManufacturers(): Promise<ManufacturerListing[]> {
  const response = await axios.get(`/api/business-listings/manufacturers`);
  return response.data.map((item: any) => transformListing<ManufacturerListing>(item));
}

export async function getManufacturerById(id: string): Promise<ManufacturerListing> {
  const response = await axios.get(`/api/business-listings/manufacturers/${id}`);
  return transformListing<ManufacturerListing>(response.data);
}

export async function getAllSponsors(): Promise<{ retailers: RetailerListing[]; manufacturers: ManufacturerListing[] }> {
  const response = await axios.get(`/api/business-listings/sponsors`);
  const data = response.data;
  return {
    retailers: data.retailers.map((item: any) => transformListing<RetailerListing>(item)),
    manufacturers: data.manufacturers.map((item: any) => transformListing<ManufacturerListing>(item)),
  };
}

// ============================================
// USER ENDPOINTS
// ============================================

export async function getMyRetailerListing(userId: string): Promise<RetailerListing | null> {
  const response = await axios.get(`/api/business-listings/my/retailer`, {
    headers: { 'x-user-id': userId },
    validateStatus: (status) => status < 500,
  });
  if (response.status === 404) return null;
  if (response.status >= 400) throw new Error('Failed to fetch your retailer listing');
  const data = response.data;
  if (!data || data === 'null') return null;
  return data ? transformListing<RetailerListing>(data) : null;
}

export async function createMyRetailerListing(userId: string, data: CreateRetailerDto): Promise<RetailerListing> {
  const response = await axios.post(`/api/business-listings/my/retailer`, data, {
    headers: { 'x-user-id': userId },
  });
  return transformListing<RetailerListing>(response.data);
}

export async function updateMyRetailerListing(userId: string, data: Partial<CreateRetailerDto> & { cover_image_position?: { x: number; y: number } }): Promise<RetailerListing> {
  const response = await axios.put(`/api/business-listings/my/retailer`, data, {
    headers: { 'x-user-id': userId },
  });
  return transformListing<RetailerListing>(response.data);
}

export async function getMyManufacturerListing(userId: string): Promise<ManufacturerListing | null> {
  const response = await axios.get(`/api/business-listings/my/manufacturer`, {
    headers: { 'x-user-id': userId },
    validateStatus: (status) => status < 500,
  });
  if (response.status === 404) return null;
  if (response.status >= 400) throw new Error('Failed to fetch your manufacturer listing');
  const data = response.data;
  if (!data || data === 'null') return null;
  return data ? transformListing<ManufacturerListing>(data) : null;
}

export async function createMyManufacturerListing(userId: string, data: CreateManufacturerDto): Promise<ManufacturerListing> {
  const response = await axios.post(`/api/business-listings/my/manufacturer`, data, {
    headers: { 'x-user-id': userId },
  });
  return transformListing<ManufacturerListing>(response.data);
}

export async function updateMyManufacturerListing(userId: string, data: Partial<CreateManufacturerDto> & { cover_image_position?: { x: number; y: number } }): Promise<ManufacturerListing> {
  const response = await axios.put(`/api/business-listings/my/manufacturer`, data, {
    headers: { 'x-user-id': userId },
  });
  return transformListing<ManufacturerListing>(response.data);
}

// ============================================
// ADMIN ENDPOINTS
// ============================================

export async function adminGetAllRetailers(userId: string, includeInactive = true): Promise<RetailerListing[]> {
  const response = await axios.get(`/api/business-listings/admin/retailers`, {
    params: { includeInactive },
    headers: { 'x-user-id': userId },
  });
  return response.data.map((item: any) => transformListing<RetailerListing>(item));
}

export async function adminCreateRetailer(userId: string, data: CreateRetailerDto & { user_id: string; is_approved?: boolean }): Promise<RetailerListing> {
  const response = await axios.post(`/api/business-listings/admin/retailers`, data, {
    headers: { 'x-user-id': userId },
  });
  return transformListing<RetailerListing>(response.data);
}

// Get a specific user's retailer listing (admin only)
export async function adminGetRetailerByUserId(adminUserId: string, targetUserId: string): Promise<RetailerListing | null> {
  const response = await axios.get(`/api/business-listings/admin/retailers/user/${targetUserId}`, {
    headers: { 'x-user-id': adminUserId },
    validateStatus: (status) => status < 500,
  });
  if (response.status === 404) return null;
  if (response.status >= 400) throw new Error('Failed to fetch retailer listing');
  const data = response.data;
  if (!data || data === 'null') return null;
  return data ? transformListing<RetailerListing>(data) : null;
}

// Get a specific user's manufacturer listing (admin only)
export async function adminGetManufacturerByUserId(adminUserId: string, targetUserId: string): Promise<ManufacturerListing | null> {
  const response = await axios.get(`/api/business-listings/admin/manufacturers/user/${targetUserId}`, {
    headers: { 'x-user-id': adminUserId },
    validateStatus: (status) => status < 500,
  });
  if (response.status === 404) return null;
  if (response.status >= 400) throw new Error('Failed to fetch manufacturer listing');
  const data = response.data;
  if (!data || data === 'null') return null;
  return data ? transformListing<ManufacturerListing>(data) : null;
}

export async function adminUpdateRetailer(userId: string, id: string, data: Partial<CreateRetailerDto> & {
  cover_image_position?: { x: number; y: number };
  is_sponsor?: boolean;
  sponsor_order?: number;
  is_active?: boolean;
  is_approved?: boolean;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}): Promise<RetailerListing> {
  const response = await axios.put(`/api/business-listings/admin/retailers/${id}`, data, {
    headers: { 'x-user-id': userId },
  });
  return transformListing<RetailerListing>(response.data);
}

export async function adminApproveRetailer(userId: string, id: string): Promise<RetailerListing> {
  const response = await axios.put(`/api/business-listings/admin/retailers/${id}/approve`, null, {
    headers: { 'x-user-id': userId },
  });
  return transformListing<RetailerListing>(response.data);
}

export async function adminDeleteRetailer(userId: string, id: string): Promise<void> {
  await axios.delete(`/api/business-listings/admin/retailers/${id}`, {
    headers: { 'x-user-id': userId },
  });
}

export async function adminGetAllManufacturers(userId: string, includeInactive = true): Promise<ManufacturerListing[]> {
  const response = await axios.get(`/api/business-listings/admin/manufacturers`, {
    params: { includeInactive },
    headers: { 'x-user-id': userId },
  });
  return response.data.map((item: any) => transformListing<ManufacturerListing>(item));
}

export async function adminCreateManufacturer(userId: string, data: CreateManufacturerDto & { user_id: string; is_approved?: boolean }): Promise<ManufacturerListing> {
  const response = await axios.post(`/api/business-listings/admin/manufacturers`, data, {
    headers: { 'x-user-id': userId },
  });
  return transformListing<ManufacturerListing>(response.data);
}

export async function adminUpdateManufacturer(userId: string, id: string, data: Partial<CreateManufacturerDto> & {
  cover_image_position?: { x: number; y: number };
  is_sponsor?: boolean;
  sponsor_order?: number;
  is_active?: boolean;
  is_approved?: boolean;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}): Promise<ManufacturerListing> {
  const response = await axios.put(`/api/business-listings/admin/manufacturers/${id}`, data, {
    headers: { 'x-user-id': userId },
  });
  return transformListing<ManufacturerListing>(response.data);
}

export async function adminApproveManufacturer(userId: string, id: string): Promise<ManufacturerListing> {
  const response = await axios.put(`/api/business-listings/admin/manufacturers/${id}/approve`, null, {
    headers: { 'x-user-id': userId },
  });
  return transformListing<ManufacturerListing>(response.data);
}

export async function adminDeleteManufacturer(userId: string, id: string): Promise<void> {
  await axios.delete(`/api/business-listings/admin/manufacturers/${id}`, {
    headers: { 'x-user-id': userId },
  });
}
