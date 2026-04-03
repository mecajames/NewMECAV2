import axios from '@/lib/axios';

export interface PayPalClientConfig {
  clientId: string;
  sandbox: boolean;
}

export interface CreateOrderResponse {
  paypalOrderId: string;
  orderId?: string; // Shop orders include this
}

export interface CaptureOrderResponse {
  success: boolean;
  captureId?: string;
}

export const paypalApi = {
  /**
   * Get PayPal client configuration (clientId + sandbox mode).
   * Returns null if PayPal is not enabled.
   */
  async getClientConfig(): Promise<PayPalClientConfig | null> {
    try {
      const response = await axios.get('/api/paypal/client-config');
      if (response.data.enabled === false) return null;
      return response.data;
    } catch {
      return null;
    }
  },

  /**
   * Create a PayPal order for membership purchase.
   */
  async createMembershipOrder(data: {
    membershipTypeConfigId: string;
    email: string;
    billingFirstName?: string;
    billingLastName?: string;
    billingPhone?: string;
    billingAddress?: string;
    billingCity?: string;
    billingState?: string;
    billingPostalCode?: string;
    billingCountry?: string;
    teamName?: string;
    teamDescription?: string;
    businessName?: string;
    businessWebsite?: string;
    userId?: string;
  }): Promise<CreateOrderResponse> {
    const response = await axios.post('/api/paypal/create-order', data);
    return response.data;
  },

  /**
   * Create a PayPal order for event registration.
   */
  async createEventRegistrationOrder(data: {
    eventId: string;
    registrationId: string;
    email: string;
    userId?: string;
    mecaId?: number;
    includeMembership?: boolean;
    membershipTypeConfigId?: string;
  }): Promise<CreateOrderResponse> {
    const response = await axios.post('/api/paypal/create-event-registration-order', data);
    return response.data;
  },

  /**
   * Create a PayPal order for invoice payment.
   */
  async createInvoiceOrder(data: {
    invoiceId: string;
  }): Promise<CreateOrderResponse> {
    const response = await axios.post('/api/paypal/create-invoice-order', data);
    return response.data;
  },

  /**
   * Create a PayPal order for shop purchase.
   */
  async createShopOrder(data: {
    items: Array<{ productId: string; quantity: number }>;
    email: string;
    shippingAddress?: any;
    billingAddress?: any;
    userId?: string;
  }): Promise<CreateOrderResponse> {
    const response = await axios.post('/api/paypal/create-shop-order', data);
    return response.data;
  },

  /**
   * Capture a PayPal order after buyer approval.
   */
  async captureOrder(data: {
    paypalOrderId: string;
    paymentType: string;
    metadata?: Record<string, string>;
  }): Promise<CaptureOrderResponse> {
    const response = await axios.post('/api/paypal/capture-order', data);
    return response.data;
  },
};
