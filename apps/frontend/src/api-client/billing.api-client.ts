import axios from 'axios';
import {
  OrderStatus,
  OrderType,
  InvoiceStatus,
  BillingAddress,
} from '../admin/billing/billing.types';

// ==========================================
// Types
// ==========================================

export interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  itemType: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface Order {
  id: string;
  orderNumber: string;
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    meca_id?: string;
  };
  status: OrderStatus;
  orderType: OrderType;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  currency: string;
  notes?: string;
  billingAddress?: BillingAddress;
  items: OrderItem[];
  payment?: {
    id: string;
    stripePaymentIntentId?: string;
  };
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  itemType: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    meca_id?: string;
  };
  order?: {
    id: string;
    orderNumber: string;
  };
  status: InvoiceStatus;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  currency: string;
  dueDate: string;
  sentAt?: string;
  paidAt?: string;
  notes?: string;
  billingAddress?: BillingAddress;
  companyInfo?: {
    name: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  orderType?: OrderType;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  overdue?: boolean;
}

export interface BillingDashboardStats {
  orders: {
    counts: Record<OrderStatus, number>;
    total: number;
  };
  invoices: {
    counts: Record<InvoiceStatus, number>;
    total: number;
    unpaid: {
      count: number;
      total: string;
    };
  };
  revenue: {
    total: string;
    currency: string;
  };
  recent: {
    orders: Order[];
    invoices: Invoice[];
  };
}

export interface RevenueStats {
  period: {
    start: string;
    end: string;
  };
  orders: {
    count: number;
    revenue: string;
  };
  invoices: {
    count: number;
    revenue: string;
  };
  total: {
    revenue: string;
    currency: string;
  };
}

export interface CreateOrderDto {
  userId?: string;
  orderType: OrderType;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: string;
    itemType: string;
    referenceId?: string;
    metadata?: Record<string, unknown>;
  }>;
  billingAddress?: BillingAddress;
  notes?: string;
  currency?: string;
}

export interface CreateInvoiceDto {
  userId?: string;
  dueDate?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: string;
    itemType: string;
    referenceId?: string;
    metadata?: Record<string, unknown>;
  }>;
  billingAddress?: BillingAddress;
  notes?: string;
  currency?: string;
}

// ==========================================
// API Client
// ==========================================

export const billingApi = {
  // ==========================================
  // ORDERS
  // ==========================================

  /**
   * Get all orders with filters (admin)
   */
  getOrders: async (params: OrderListParams = {}): Promise<PaginatedResponse<Order>> => {
    const response = await axios.get('/api/billing/orders', { params });
    return response.data;
  },

  /**
   * Get order by ID
   */
  getOrder: async (id: string): Promise<Order> => {
    const response = await axios.get(`/api/billing/orders/${id}`);
    return response.data;
  },

  /**
   * Create a new order (admin)
   */
  createOrder: async (data: CreateOrderDto): Promise<Order> => {
    const response = await axios.post('/api/billing/orders', data);
    return response.data;
  },

  // ==========================================
  // INVOICES
  // ==========================================

  /**
   * Get all invoices with filters (admin)
   */
  getInvoices: async (params: InvoiceListParams = {}): Promise<PaginatedResponse<Invoice>> => {
    const response = await axios.get('/api/billing/invoices', { params });
    return response.data;
  },

  /**
   * Get invoice by ID
   */
  getInvoice: async (id: string): Promise<Invoice> => {
    const response = await axios.get(`/api/billing/invoices/${id}`);
    return response.data;
  },

  /**
   * Get invoice PDF URL
   */
  getInvoicePdfUrl: (id: string): string => {
    return `/api/billing/invoices/${id}/pdf`;
  },

  /**
   * Open invoice PDF in new tab
   */
  viewInvoicePdf: (id: string): void => {
    window.open(`/api/billing/invoices/${id}/pdf`, '_blank');
  },

  /**
   * Create a new invoice (admin)
   */
  createInvoice: async (data: CreateInvoiceDto): Promise<Invoice> => {
    const response = await axios.post('/api/billing/invoices', data);
    return response.data;
  },

  /**
   * Send invoice email
   */
  sendInvoice: async (id: string): Promise<{ success: boolean; invoice: Invoice; error?: string }> => {
    const response = await axios.post(`/api/billing/invoices/${id}/send`);
    return response.data;
  },

  // ==========================================
  // MY BILLING (User's own data)
  // ==========================================

  /**
   * Get current user's orders (userId is determined from auth token)
   */
  getMyOrders: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<{ data: Order[]; total: number }> => {
    const response = await axios.get('/api/billing/my/orders', {
      params,
    });
    return response.data;
  },

  /**
   * Get current user's invoices (userId is determined from auth token)
   */
  getMyInvoices: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<{ data: Invoice[]; total: number }> => {
    const response = await axios.get('/api/billing/my/invoices', {
      params,
    });
    return response.data;
  },

  /**
   * View user's invoice PDF in new tab (with auth)
   */
  viewMyInvoicePdf: async (id: string): Promise<void> => {
    const response = await axios.get(`/api/billing/my/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Clean up the URL after a delay to allow the new tab to load
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },

  /**
   * Download user's invoice PDF (with auth)
   */
  downloadMyInvoicePdf: async (id: string, invoiceNumber?: string): Promise<void> => {
    const response = await axios.get(`/api/billing/my/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoiceNumber || id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // ==========================================
  // STATS & DASHBOARD
  // ==========================================

  /**
   * Get billing dashboard statistics
   */
  getDashboardStats: async (): Promise<BillingDashboardStats> => {
    const response = await axios.get('/api/billing/stats/dashboard');
    return response.data;
  },

  /**
   * Get order statistics
   */
  getOrderStats: async (): Promise<{
    counts: Record<OrderStatus, number>;
    total: number;
    recent: Order[];
  }> => {
    const response = await axios.get('/api/billing/stats/orders');
    return response.data;
  },

  /**
   * Get invoice statistics
   */
  getInvoiceStats: async (): Promise<{
    counts: Record<InvoiceStatus, number>;
    total: number;
    unpaid: { count: number; total: string };
    recent: Invoice[];
  }> => {
    const response = await axios.get('/api/billing/stats/invoices');
    return response.data;
  },

  /**
   * Get revenue statistics
   */
  getRevenueStats: async (startDate?: string, endDate?: string): Promise<RevenueStats> => {
    const response = await axios.get('/api/billing/stats/revenue', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // ==========================================
  // SYNC OPERATIONS
  // ==========================================

  /**
   * Sync all paid registrations to create missing orders/invoices
   */
  syncRegistrations: async (): Promise<{
    totalPaidRegistrations: number;
    existingOrders: number;
    toSync: number;
    synced: number;
    failed: number;
    errors: string[];
  }> => {
    const response = await axios.post('/api/billing/sync/registrations');
    return response.data;
  },

  /**
   * Sync a single registration to create order/invoice
   */
  syncSingleRegistration: async (registrationId: string): Promise<{
    success: boolean;
    order: { id: string; orderNumber: string; total: string };
    invoice: { id: string; invoiceNumber: string; total: string };
  }> => {
    const response = await axios.post(`/api/billing/sync/registrations/${registrationId}`);
    return response.data;
  },

  // ==========================================
  // EXPORT OPERATIONS
  // ==========================================

  /**
   * Export orders as CSV - returns download URL
   */
  getOrdersExportUrl: (params: {
    startDate?: string;
    endDate?: string;
    status?: OrderStatus;
  } = {}): string => {
    const searchParams = new URLSearchParams();
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return `/api/billing/export/orders${query ? `?${query}` : ''}`;
  },

  /**
   * Export invoices as CSV - returns download URL
   */
  getInvoicesExportUrl: (params: {
    startDate?: string;
    endDate?: string;
    status?: InvoiceStatus;
  } = {}): string => {
    const searchParams = new URLSearchParams();
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return `/api/billing/export/invoices${query ? `?${query}` : ''}`;
  },

  /**
   * Export revenue report as CSV - returns download URL
   */
  getRevenueExportUrl: (params: {
    startDate?: string;
    endDate?: string;
  } = {}): string => {
    const searchParams = new URLSearchParams();
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    const query = searchParams.toString();
    return `/api/billing/export/revenue${query ? `?${query}` : ''}`;
  },

  /**
   * Download orders export
   */
  downloadOrdersExport: (params: {
    startDate?: string;
    endDate?: string;
    status?: OrderStatus;
  } = {}): void => {
    window.location.href = billingApi.getOrdersExportUrl(params);
  },

  /**
   * Download invoices export
   */
  downloadInvoicesExport: (params: {
    startDate?: string;
    endDate?: string;
    status?: InvoiceStatus;
  } = {}): void => {
    window.location.href = billingApi.getInvoicesExportUrl(params);
  },

  /**
   * Download revenue export
   */
  downloadRevenueExport: (params: {
    startDate?: string;
    endDate?: string;
  } = {}): void => {
    window.location.href = billingApi.getRevenueExportUrl(params);
  },
};

// ==========================================
// Direct API exports (non-aggregated endpoints)
// ==========================================

export const ordersApi = {
  /**
   * Get all orders with filters
   */
  findAll: async (params: OrderListParams = {}): Promise<PaginatedResponse<Order>> => {
    const response = await axios.get('/api/orders', { params });
    return response.data;
  },

  /**
   * Get order by ID
   */
  findById: async (id: string): Promise<Order> => {
    const response = await axios.get(`/api/orders/${id}`);
    return response.data;
  },

  /**
   * Get orders by user ID
   */
  findByUser: async (
    userId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<{ data: Order[]; total: number }> => {
    const response = await axios.get(`/api/orders/user/${userId}`, { params });
    return response.data;
  },

  /**
   * Update order status
   */
  updateStatus: async (
    id: string,
    data: { status: OrderStatus; notes?: string },
  ): Promise<Order> => {
    const response = await axios.put(`/api/orders/${id}/status`, data);
    return response.data;
  },

  /**
   * Cancel an order
   */
  cancel: async (id: string, reason?: string): Promise<Order> => {
    const response = await axios.post(`/api/orders/${id}/cancel`, { reason });
    return response.data;
  },

  /**
   * Get order status counts
   */
  getStatusCounts: async (): Promise<Record<OrderStatus, number>> => {
    const response = await axios.get('/api/orders/stats/counts');
    return response.data;
  },

  /**
   * Get recent orders
   */
  getRecentOrders: async (limit: number = 5): Promise<Order[]> => {
    const response = await axios.get('/api/orders/stats/recent', { params: { limit } });
    return response.data;
  },
};

// Type for public invoice payment response
export interface InvoiceForPayment {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  currency: string;
  dueDate: string;
  items: InvoiceItem[];
  billingAddress?: BillingAddress;
  companyInfo?: {
    name: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  user?: {
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
}

export const invoicesApi = {
  /**
   * Get invoice for public payment page (no auth required)
   */
  getForPayment: async (id: string): Promise<InvoiceForPayment> => {
    const response = await axios.get(`/api/invoices/pay/${id}`);
    return response.data;
  },

  /**
   * Create payment intent for invoice
   */
  createPaymentIntent: async (invoiceId: string): Promise<{ clientSecret: string }> => {
    const response = await axios.post(`/api/stripe/create-invoice-payment-intent`, {
      invoiceId,
    });
    return response.data;
  },

  /**
   * Get all invoices with filters
   */
  findAll: async (params: InvoiceListParams = {}): Promise<PaginatedResponse<Invoice>> => {
    const response = await axios.get('/api/invoices', { params });
    return response.data;
  },

  /**
   * Find invoice by ID
   */
  findById: async (id: string): Promise<Invoice> => {
    const response = await axios.get(`/api/invoices/${id}`);
    return response.data;
  },

  /**
   * Get invoices by user ID
   */
  findByUser: async (
    userId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<{ data: Invoice[]; total: number }> => {
    const response = await axios.get(`/api/invoices/user/${userId}`, { params });
    return response.data;
  },

  /**
   * Update invoice status
   */
  updateStatus: async (
    id: string,
    data: { status: InvoiceStatus; notes?: string },
  ): Promise<Invoice> => {
    const response = await axios.put(`/api/invoices/${id}/status`, data);
    return response.data;
  },

  /**
   * Mark invoice as sent (sends email)
   */
  markAsSent: async (id: string): Promise<{ success: boolean; invoice: Invoice; error?: string }> => {
    const response = await axios.post(`/api/invoices/${id}/send`);
    return response.data;
  },

  /**
   * Resend invoice email (for already sent invoices)
   */
  resend: async (id: string): Promise<{ success: boolean; invoice: Invoice; error?: string }> => {
    const response = await axios.post(`/api/invoices/${id}/resend`);
    return response.data;
  },

  /**
   * Mark invoice as paid
   */
  markAsPaid: async (id: string): Promise<Invoice> => {
    const response = await axios.post(`/api/invoices/${id}/paid`);
    return response.data;
  },

  /**
   * Cancel an invoice
   */
  cancel: async (id: string, reason?: string): Promise<Invoice> => {
    const response = await axios.post(`/api/invoices/${id}/cancel`, { reason });
    return response.data;
  },

  /**
   * Create invoice from order
   */
  createFromOrder: async (orderId: string): Promise<Invoice> => {
    const response = await axios.post(`/api/invoices/from-order/${orderId}`);
    return response.data;
  },

  /**
   * Get invoice status counts
   */
  getStatusCounts: async (): Promise<Record<InvoiceStatus, number>> => {
    const response = await axios.get('/api/invoices/stats/counts');
    return response.data;
  },

  /**
   * Get recent invoices
   */
  getRecentInvoices: async (limit: number = 5): Promise<Invoice[]> => {
    const response = await axios.get('/api/invoices/stats/recent', { params: { limit } });
    return response.data;
  },

  /**
   * Get unpaid total
   */
  getUnpaidTotal: async (): Promise<{ count: number; total: string }> => {
    const response = await axios.get('/api/invoices/stats/unpaid');
    return response.data;
  },

  /**
   * Mark overdue invoices (admin/cron)
   */
  markOverdueInvoices: async (): Promise<{ markedOverdue: number }> => {
    const response = await axios.post('/api/invoices/batch/mark-overdue');
    return response.data;
  },
};
