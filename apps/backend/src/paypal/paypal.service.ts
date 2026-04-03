import { Injectable, BadRequestException, Logger, Inject, Optional } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { SiteSettingsService } from '../site-settings/site-settings.service';

interface PayPalAccessToken {
  token: string;
  expiresAt: number;
}

interface CreatePayPalOrderParams {
  amount: number; // in dollars (e.g. 49.99)
  currency?: string;
  description: string;
  metadata?: Record<string, string>;
  returnUrl?: string;
  cancelUrl?: string;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
}

interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: { currency_code: string; value: string };
      }>;
    };
  }>;
  payer?: {
    email_address?: string;
    payer_id?: string;
  };
}

@Injectable()
export class PayPalService {
  private readonly logger = new Logger(PayPalService.name);
  private accessToken: PayPalAccessToken | null = null;

  // Cache for settings
  private settingsCache: Map<string, { value: string | undefined; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(
    @Optional() @Inject(SiteSettingsService)
    private readonly siteSettingsService?: SiteSettingsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Setting helpers
  // ---------------------------------------------------------------------------

  private async getSetting(key: string): Promise<string | undefined> {
    if (!this.siteSettingsService) return undefined;

    const cached = this.settingsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.value;
    }

    try {
      const setting = await this.siteSettingsService.findByKey(key);
      const value = setting?.setting_value;
      this.settingsCache.set(key, { value, timestamp: Date.now() });
      return value;
    } catch (error) {
      this.logger.warn(`Failed to fetch setting ${key}: ${error}`);
      return undefined;
    }
  }

  private async isPayPalEnabled(): Promise<boolean> {
    return (await this.getSetting('paypal_enabled')) === 'true';
  }

  private async isSandboxMode(): Promise<boolean> {
    return (await this.getSetting('paypal_sandbox_mode')) === 'true';
  }

  private async getBaseUrl(): Promise<string> {
    const sandbox = await this.isSandboxMode();
    return sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  }

  private async getClientId(): Promise<string> {
    const clientId = await this.getSetting('paypal_client_id');
    if (!clientId) throw new BadRequestException('PayPal client ID is not configured');
    return clientId;
  }

  private async getClientSecret(): Promise<string> {
    const secret = await this.getSetting('paypal_client_secret');
    if (!secret) throw new BadRequestException('PayPal client secret is not configured');
    return secret;
  }

  /**
   * Check if staging mode payments should be blocked (mirrors StripeService pattern).
   */
  private async checkBlockPayments(): Promise<boolean> {
    const stagingEnabled = (await this.getSetting('staging_mode_enabled')) === 'true';
    if (!stagingEnabled) return false;

    const blockPayments = await this.getSetting('staging_mode_block_payments');
    return blockPayments !== 'false'; // Default true when staging enabled
  }

  // ---------------------------------------------------------------------------
  // OAuth2 Access Token
  // ---------------------------------------------------------------------------

  async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 60000) {
      return this.accessToken.token;
    }

    const baseUrl = await this.getBaseUrl();
    const clientId = await this.getClientId();
    const clientSecret = await this.getClientSecret();

    try {
      const response = await axios.post(
        `${baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          auth: { username: clientId, password: clientSecret },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      this.accessToken = {
        token: response.data.access_token,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
      };

      return this.accessToken.token;
    } catch (error: any) {
      this.logger.error(`PayPal OAuth2 token request failed: ${error.response?.data?.error_description || error.message}`);
      throw new BadRequestException('Failed to authenticate with PayPal');
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // ---------------------------------------------------------------------------
  // Order CRUD
  // ---------------------------------------------------------------------------

  /**
   * Create a PayPal order. Returns the order ID that the frontend uses for approval.
   */
  async createOrder(params: CreatePayPalOrderParams): Promise<PayPalOrderResponse> {
    if (!(await this.isPayPalEnabled())) {
      throw new BadRequestException('PayPal is not enabled');
    }

    if (await this.checkBlockPayments()) {
      this.logger.warn('[STAGING MODE] PayPal payment blocked');
      throw new BadRequestException('Payments are blocked in staging mode');
    }

    const baseUrl = await this.getBaseUrl();
    const headers = await this.getAuthHeaders();

    const orderPayload: any = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: params.currency?.toUpperCase() || 'USD',
            value: params.amount.toFixed(2),
          },
          description: params.description.substring(0, 127), // PayPal limit
        },
      ],
    };

    // Attach custom_id for metadata (PayPal supports up to 127 chars)
    if (params.metadata) {
      orderPayload.purchase_units[0].custom_id = JSON.stringify(params.metadata).substring(0, 127);
    }

    try {
      const response = await axios.post(`${baseUrl}/v2/checkout/orders`, orderPayload, { headers });
      this.logger.log(`PayPal order created: ${response.data.id}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`PayPal create order failed: ${JSON.stringify(error.response?.data || error.message)}`);
      throw new BadRequestException('Failed to create PayPal order');
    }
  }

  /**
   * Capture a PayPal order after buyer approval.
   */
  async captureOrder(orderId: string): Promise<PayPalCaptureResponse> {
    const baseUrl = await this.getBaseUrl();
    const headers = await this.getAuthHeaders();

    try {
      const response = await axios.post(
        `${baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        { headers },
      );
      this.logger.log(`PayPal order captured: ${orderId}, status: ${response.data.status}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`PayPal capture order failed: ${JSON.stringify(error.response?.data || error.message)}`);
      throw new BadRequestException('Failed to capture PayPal order');
    }
  }

  /**
   * Get a PayPal order by ID.
   */
  async getOrder(orderId: string): Promise<any> {
    const baseUrl = await this.getBaseUrl();
    const headers = await this.getAuthHeaders();

    try {
      const response = await axios.get(`${baseUrl}/v2/checkout/orders/${orderId}`, { headers });
      return response.data;
    } catch (error: any) {
      this.logger.error(`PayPal get order failed: ${JSON.stringify(error.response?.data || error.message)}`);
      throw new BadRequestException('Failed to get PayPal order');
    }
  }

  /**
   * Refund a captured PayPal payment.
   */
  async refundCapture(captureId: string, amount?: number, currency: string = 'USD'): Promise<any> {
    const baseUrl = await this.getBaseUrl();
    const headers = await this.getAuthHeaders();

    const body: any = {};
    if (amount !== undefined) {
      body.amount = {
        value: amount.toFixed(2),
        currency_code: currency,
      };
    }

    try {
      const response = await axios.post(
        `${baseUrl}/v2/payments/captures/${captureId}/refund`,
        body,
        { headers },
      );
      this.logger.log(`PayPal refund issued for capture ${captureId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`PayPal refund failed: ${JSON.stringify(error.response?.data || error.message)}`);
      throw new BadRequestException('Failed to refund PayPal capture');
    }
  }

  /**
   * Verify a PayPal webhook signature.
   */
  async verifyWebhookSignature(
    headers: Record<string, string>,
    body: string,
    webhookId: string,
  ): Promise<boolean> {
    const baseUrl = await this.getBaseUrl();
    const authHeaders = await this.getAuthHeaders();

    try {
      const response = await axios.post(
        `${baseUrl}/v1/notifications/verify-webhook-signature`,
        {
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: JSON.parse(body),
        },
        { headers: authHeaders },
      );

      return response.data.verification_status === 'SUCCESS';
    } catch (error: any) {
      this.logger.error(`PayPal webhook verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get PayPal client config for frontend (public info only).
   */
  async getClientConfig(): Promise<{ clientId: string; sandbox: boolean } | null> {
    const enabled = await this.isPayPalEnabled();
    if (!enabled) return null;

    try {
      const clientId = await this.getClientId();
      const sandbox = await this.isSandboxMode();
      return { clientId, sandbox };
    } catch {
      return null;
    }
  }
}
