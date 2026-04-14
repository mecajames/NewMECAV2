import axios from '@/lib/axios';

export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  discountType?: 'percentage' | 'fixed_amount';
  discountValue?: number;
  discountAmount?: number;
  message: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  scope: string;
  applicable_product_ids: string[] | null;
  applicable_membership_type_config_ids: string[] | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  new_members_only: boolean;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  times_used: number;
  created_at: string;
  updated_at: string;
  // Stats (from detail endpoint)
  totalUses?: number;
  uniqueUsers?: number;
  totalDiscountGiven?: number;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  user_id: string | null;
  guest_email: string | null;
  order_id: string | null;
  shop_order_id: string | null;
  membership_id: string | null;
  discount_applied: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

export const couponsApi = {
  // ── Public ───────────────────────────────────────────────────────────────

  validate: async (data: {
    code: string;
    scope: 'membership' | 'shop' | 'all';
    subtotal: number;
    productIds?: string[];
    membershipTypeConfigId?: string;
    userId?: string;
    email?: string;
  }): Promise<CouponValidationResult> => {
    const response = await axios.post('/api/coupons/validate', data);
    return response.data;
  },

  // ── Admin ────────────────────────────────────────────────────────────────

  list: async (filters?: {
    status?: string;
    scope?: string;
    search?: string;
  }): Promise<Coupon[]> => {
    const response = await axios.get('/api/coupons', { params: filters });
    return response.data;
  },

  get: async (id: string): Promise<Coupon> => {
    const response = await axios.get(`/api/coupons/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<Coupon> => {
    const response = await axios.post('/api/coupons', data);
    return response.data;
  },

  createBatch: async (quantity: number, couponData: any): Promise<{ created: number; coupons: Coupon[] }> => {
    const response = await axios.post('/api/coupons/batch', { quantity, coupon: couponData });
    return response.data;
  },

  update: async (id: string, data: any): Promise<Coupon> => {
    const response = await axios.put(`/api/coupons/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string): Promise<void> => {
    await axios.delete(`/api/coupons/${id}`);
  },

  getUsages: async (id: string): Promise<CouponUsage[]> => {
    const response = await axios.get(`/api/coupons/${id}/usages`);
    return response.data;
  },

  generatePreview: async (data: {
    prefix?: string;
    suffix?: string;
    length?: number;
  }): Promise<{ code: string }> => {
    const response = await axios.post('/api/coupons/generate-preview', data);
    return response.data;
  },
};
