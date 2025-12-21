const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  const response = await fetch(`${API_BASE_URL}/api/business-listings/retailers`);
  if (!response.ok) throw new Error('Failed to fetch retailers');
  const data = await response.json();
  return data.map((item: any) => transformListing<RetailerListing>(item));
}

export async function getRetailerById(id: string): Promise<RetailerListing> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/retailers/${id}`);
  if (!response.ok) throw new Error('Failed to fetch retailer');
  const data = await response.json();
  return transformListing<RetailerListing>(data);
}

export async function getAllManufacturers(): Promise<ManufacturerListing[]> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/manufacturers`);
  if (!response.ok) throw new Error('Failed to fetch manufacturers');
  const data = await response.json();
  return data.map((item: any) => transformListing<ManufacturerListing>(item));
}

export async function getManufacturerById(id: string): Promise<ManufacturerListing> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/manufacturers/${id}`);
  if (!response.ok) throw new Error('Failed to fetch manufacturer');
  const data = await response.json();
  return transformListing<ManufacturerListing>(data);
}

export async function getAllSponsors(): Promise<{ retailers: RetailerListing[]; manufacturers: ManufacturerListing[] }> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/sponsors`);
  if (!response.ok) throw new Error('Failed to fetch sponsors');
  const data = await response.json();
  return {
    retailers: data.retailers.map((item: any) => transformListing<RetailerListing>(item)),
    manufacturers: data.manufacturers.map((item: any) => transformListing<ManufacturerListing>(item)),
  };
}

// ============================================
// USER ENDPOINTS
// ============================================

export async function getMyRetailerListing(userId: string): Promise<RetailerListing | null> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/my/retailer`, {
    headers: { 'x-user-id': userId },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch your retailer listing');
  const data = await response.json();
  return transformListing<RetailerListing>(data);
}

export async function createMyRetailerListing(userId: string, data: CreateRetailerDto): Promise<RetailerListing> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/my/retailer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create retailer listing');
  const result = await response.json();
  return transformListing<RetailerListing>(result);
}

export async function updateMyRetailerListing(userId: string, data: Partial<CreateRetailerDto> & { cover_image_position?: { x: number; y: number } }): Promise<RetailerListing> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/my/retailer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update retailer listing');
  const result = await response.json();
  return transformListing<RetailerListing>(result);
}

export async function getMyManufacturerListing(userId: string): Promise<ManufacturerListing | null> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/my/manufacturer`, {
    headers: { 'x-user-id': userId },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch your manufacturer listing');
  const data = await response.json();
  return transformListing<ManufacturerListing>(data);
}

export async function createMyManufacturerListing(userId: string, data: CreateManufacturerDto): Promise<ManufacturerListing> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/my/manufacturer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create manufacturer listing');
  const result = await response.json();
  return transformListing<ManufacturerListing>(result);
}

export async function updateMyManufacturerListing(userId: string, data: Partial<CreateManufacturerDto> & { cover_image_position?: { x: number; y: number } }): Promise<ManufacturerListing> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/my/manufacturer`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update manufacturer listing');
  const result = await response.json();
  return transformListing<ManufacturerListing>(result);
}

// ============================================
// ADMIN ENDPOINTS
// ============================================

export async function adminGetAllRetailers(userId: string, includeInactive = true): Promise<RetailerListing[]> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/admin/retailers?includeInactive=${includeInactive}`, {
    headers: { 'x-user-id': userId },
  });
  if (!response.ok) throw new Error('Failed to fetch retailers');
  const data = await response.json();
  return data.map((item: any) => transformListing<RetailerListing>(item));
}

export async function adminCreateRetailer(userId: string, data: CreateRetailerDto & { user_id: string; is_approved?: boolean }): Promise<RetailerListing> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/admin/retailers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create retailer');
  const result = await response.json();
  return transformListing<RetailerListing>(result);
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
  const response = await fetch(`${API_BASE_URL}/api/business-listings/admin/retailers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update retailer');
  const result = await response.json();
  return transformListing<RetailerListing>(result);
}

export async function adminApproveRetailer(userId: string, id: string): Promise<RetailerListing> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/admin/retailers/${id}/approve`, {
    method: 'PUT',
    headers: { 'x-user-id': userId },
  });
  if (!response.ok) throw new Error('Failed to approve retailer');
  const result = await response.json();
  return transformListing<RetailerListing>(result);
}

export async function adminDeleteRetailer(userId: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/admin/retailers/${id}`, {
    method: 'DELETE',
    headers: { 'x-user-id': userId },
  });
  if (!response.ok) throw new Error('Failed to delete retailer');
}

export async function adminGetAllManufacturers(userId: string, includeInactive = true): Promise<ManufacturerListing[]> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/admin/manufacturers?includeInactive=${includeInactive}`, {
    headers: { 'x-user-id': userId },
  });
  if (!response.ok) throw new Error('Failed to fetch manufacturers');
  const data = await response.json();
  return data.map((item: any) => transformListing<ManufacturerListing>(item));
}

export async function adminCreateManufacturer(userId: string, data: CreateManufacturerDto & { user_id: string; is_approved?: boolean }): Promise<ManufacturerListing> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/admin/manufacturers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create manufacturer');
  const result = await response.json();
  return transformListing<ManufacturerListing>(result);
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
  const response = await fetch(`${API_BASE_URL}/api/business-listings/admin/manufacturers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update manufacturer');
  const result = await response.json();
  return transformListing<ManufacturerListing>(result);
}

export async function adminApproveManufacturer(userId: string, id: string): Promise<ManufacturerListing> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/admin/manufacturers/${id}/approve`, {
    method: 'PUT',
    headers: { 'x-user-id': userId },
  });
  if (!response.ok) throw new Error('Failed to approve manufacturer');
  const result = await response.json();
  return transformListing<ManufacturerListing>(result);
}

export async function adminDeleteManufacturer(userId: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/business-listings/admin/manufacturers/${id}`, {
    method: 'DELETE',
    headers: { 'x-user-id': userId },
  });
  if (!response.ok) throw new Error('Failed to delete manufacturer');
}
