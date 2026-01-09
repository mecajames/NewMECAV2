import axios from '@/lib/axios';
import {
  ShopProduct,
  ShopOrder,
  ShopOrderStatus,
  ShopProductCategory,
  ShopAddress,
  CreateShopProductDto,
  UpdateShopProductDto,
} from '@newmeca/shared';

// ==========================================
// Types
// ==========================================

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface StockCheckResult {
  available: boolean;
  unavailableItems: Array<{
    productId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
}

export interface CreatePaymentIntentDto {
  items: CartItem[];
  email: string;
  shippingAddress?: ShopAddress;
  billingAddress?: ShopAddress;
  userId?: string;
  shippingMethod?: 'standard' | 'priority';
  shippingAmount?: number;
}

export interface ShippingRate {
  method: 'standard' | 'priority';
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
}

export interface ShippingRateRequest {
  items: CartItem[];
  destinationZip: string;
  destinationCountry?: string;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  orderId: string;
}

export interface ShopStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  totalRevenue: number;
  ordersThisMonth: number;
  revenueThisMonth: number;
}

// ==========================================
// API Client
// ==========================================

export const shopApi = {
  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  /**
   * Get all active products
   */
  getProducts: async (category?: ShopProductCategory): Promise<ShopProduct[]> => {
    const params = category ? { category } : {};
    const response = await axios.get('/api/shop/products', { params });
    return response.data;
  },

  /**
   * Get featured products
   */
  getFeaturedProducts: async (): Promise<ShopProduct[]> => {
    const response = await axios.get('/api/shop/products/featured');
    return response.data;
  },

  /**
   * Get a single product by ID
   */
  getProduct: async (id: string): Promise<ShopProduct> => {
    const response = await axios.get(`/api/shop/products/${id}`);
    return response.data;
  },

  /**
   * Get all categories with counts
   */
  getCategories: async (): Promise<Array<{ category: string; count: number }>> => {
    const response = await axios.get('/api/shop/categories');
    return response.data;
  },

  /**
   * Check stock availability
   */
  checkAvailability: async (items: CartItem[]): Promise<StockCheckResult> => {
    const response = await axios.post('/api/shop/check-availability', { items });
    return response.data;
  },

  /**
   * Get shipping rates
   */
  getShippingRates: async (request: ShippingRateRequest): Promise<ShippingRate[]> => {
    const response = await axios.post('/api/shop/shipping-rates', request);
    return response.data;
  },

  // ==========================================
  // AUTHENTICATED ENDPOINTS
  // ==========================================

  /**
   * Get current user's orders
   */
  getMyOrders: async (): Promise<ShopOrder[]> => {
    const response = await axios.get('/api/shop/orders/my');
    return response.data;
  },

  /**
   * Get a specific order
   */
  getOrder: async (id: string): Promise<ShopOrder> => {
    const response = await axios.get(`/api/shop/orders/${id}`);
    return response.data;
  },

  /**
   * Create a payment intent for checkout
   */
  createPaymentIntent: async (dto: CreatePaymentIntentDto): Promise<PaymentIntentResult> => {
    const response = await axios.post('/api/stripe/create-shop-payment-intent', dto);
    return response.data;
  },

  // ==========================================
  // ADMIN ENDPOINTS
  // ==========================================

  /**
   * Get all products (admin)
   */
  adminGetProducts: async (filters?: {
    category?: ShopProductCategory;
    isActive?: boolean;
    isFeatured?: boolean;
  }): Promise<ShopProduct[]> => {
    const response = await axios.get('/api/shop/admin/products', { params: filters });
    return response.data;
  },

  /**
   * Create a product (admin)
   */
  adminCreateProduct: async (dto: CreateShopProductDto): Promise<ShopProduct> => {
    const response = await axios.post('/api/shop/admin/products', dto);
    return response.data;
  },

  /**
   * Update a product (admin)
   */
  adminUpdateProduct: async (id: string, dto: UpdateShopProductDto): Promise<ShopProduct> => {
    const response = await axios.put(`/api/shop/admin/products/${id}`, dto);
    return response.data;
  },

  /**
   * Delete a product (admin)
   */
  adminDeleteProduct: async (id: string): Promise<void> => {
    await axios.delete(`/api/shop/admin/products/${id}`);
  },

  /**
   * Get all orders (admin)
   */
  adminGetOrders: async (filters?: {
    status?: ShopOrderStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: ShopOrder[]; total: number }> => {
    const response = await axios.get('/api/shop/admin/orders', { params: filters });
    return response.data;
  },

  /**
   * Get a specific order (admin)
   */
  adminGetOrder: async (id: string): Promise<ShopOrder> => {
    const response = await axios.get(`/api/shop/admin/orders/${id}`);
    return response.data;
  },

  /**
   * Update order status (admin)
   */
  adminUpdateOrderStatus: async (id: string, status: ShopOrderStatus): Promise<ShopOrder> => {
    const response = await axios.put(`/api/shop/admin/orders/${id}/status`, { status });
    return response.data;
  },

  /**
   * Add tracking number (admin)
   */
  adminAddTrackingNumber: async (id: string, trackingNumber: string): Promise<ShopOrder> => {
    const response = await axios.put(`/api/shop/admin/orders/${id}/tracking`, { trackingNumber });
    return response.data;
  },

  /**
   * Update admin notes (admin)
   */
  adminUpdateNotes: async (id: string, adminNotes: string): Promise<ShopOrder> => {
    const response = await axios.put(`/api/shop/admin/orders/${id}/notes`, { adminNotes });
    return response.data;
  },

  /**
   * Get shop statistics (admin)
   */
  adminGetStats: async (): Promise<ShopStats> => {
    const response = await axios.get('/api/shop/admin/stats');
    return response.data;
  },

  /**
   * Refund an order (admin)
   */
  adminRefundOrder: async (id: string, reason?: string): Promise<ShopOrder> => {
    const response = await axios.put(`/api/shop/admin/orders/${id}/refund`, { reason });
    return response.data;
  },
};

export default shopApi;
