import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import OAuthClient from 'intuit-oauth';
import QuickBooks from 'node-quickbooks';
import { QuickBooksConnection } from './quickbooks-connection.entity';
import { MembershipTypeConfig } from '../membership-type-configs/membership-type-configs.entity';
import { CreateSalesReceiptDto, QuickBooksCompanyInfo } from '@newmeca/shared';

@Injectable()
export class QuickBooksService {
  private oauthClient: OAuthClient | null = null;

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {
    this.initializeOAuthClient();
  }

  private initializeOAuthClient() {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;
    const environment = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox';

    if (!clientId || !clientSecret || !redirectUri) {
      console.warn('QuickBooks credentials not configured - QuickBooks integration will not work');
      return;
    }

    this.oauthClient = new OAuthClient({
      clientId,
      clientSecret,
      environment: environment as 'sandbox' | 'production',
      redirectUri,
    });
  }

  /**
   * Get the OAuth authorization URL for connecting QuickBooks
   */
  getAuthorizationUrl(): string {
    if (!this.oauthClient) {
      throw new BadRequestException('QuickBooks is not configured');
    }

    return this.oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: 'quickbooks-connect',
    });
  }

  /**
   * Handle the OAuth callback and store tokens
   */
  async handleOAuthCallback(url: string): Promise<QuickBooksConnection> {
    if (!this.oauthClient) {
      throw new BadRequestException('QuickBooks is not configured');
    }

    const em = this.em.fork();

    try {
      const authResponse = await this.oauthClient.createToken(url);
      const tokens = authResponse.getJson();

      // Get company info
      const companyInfo = await this.getCompanyInfo(tokens.realmId, tokens.access_token);

      // Check if connection already exists for this realm
      let connection = await em.findOne(QuickBooksConnection, { realmId: tokens.realmId });

      if (connection) {
        // Update existing connection
        connection.accessToken = tokens.access_token;
        connection.refreshToken = tokens.refresh_token;
        connection.accessTokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        connection.refreshTokenExpiresAt = new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000);
        connection.companyName = companyInfo?.CompanyName;
        connection.isActive = true;
      } else {
        // Create new connection
        connection = em.create(QuickBooksConnection, {
          realmId: tokens.realmId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          refreshTokenExpiresAt: new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000),
          companyName: companyInfo?.CompanyName,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await em.persistAndFlush(connection);
      return connection;
    } catch (error) {
      console.error('QuickBooks OAuth error:', error);
      throw new BadRequestException('Failed to connect QuickBooks account');
    }
  }

  /**
   * Get the active QuickBooks connection
   */
  async getActiveConnection(): Promise<QuickBooksConnection | null> {
    const em = this.em.fork();
    return em.findOne(QuickBooksConnection, { isActive: true });
  }

  /**
   * Get connection status for the admin UI
   */
  async getConnectionStatus(): Promise<QuickBooksCompanyInfo | null> {
    const connection = await this.getActiveConnection();

    if (!connection) {
      return null;
    }

    return {
      companyName: connection.companyName || 'Unknown Company',
      realmId: connection.realmId,
      isConnected: connection.isActive,
      lastSyncAt: connection.lastSyncAt,
    };
  }

  /**
   * Disconnect QuickBooks
   */
  async disconnect(): Promise<void> {
    const em = this.em.fork();
    const connection = await em.findOne(QuickBooksConnection, { isActive: true });

    if (connection) {
      connection.isActive = false;
      await em.flush();
    }
  }

  /**
   * Refresh the access token if needed
   */
  private async refreshTokenIfNeeded(connection: QuickBooksConnection): Promise<string> {
    if (!this.oauthClient) {
      throw new BadRequestException('QuickBooks is not configured');
    }

    // Check if access token is still valid (with 5 minute buffer)
    if (connection.accessTokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      return connection.accessToken;
    }

    // Check if refresh token is still valid
    if (connection.refreshTokenExpiresAt < new Date()) {
      throw new BadRequestException('QuickBooks refresh token has expired. Please reconnect.');
    }

    try {
      this.oauthClient.setToken({
        access_token: connection.accessToken,
        refresh_token: connection.refreshToken,
        token_type: 'bearer',
        expires_in: 0,
        x_refresh_token_expires_in: 0,
        realmId: connection.realmId,
      });

      const authResponse = await this.oauthClient.refresh();
      const tokens = authResponse.getJson();

      // Update stored tokens
      const em = this.em.fork();
      const conn = await em.findOne(QuickBooksConnection, { id: connection.id });
      if (conn) {
        conn.accessToken = tokens.access_token;
        conn.refreshToken = tokens.refresh_token;
        conn.accessTokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        conn.refreshTokenExpiresAt = new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000);
        await em.flush();
      }

      return tokens.access_token;
    } catch (error) {
      console.error('QuickBooks token refresh error:', error);
      throw new BadRequestException('Failed to refresh QuickBooks access token');
    }
  }

  /**
   * Get QuickBooks API client
   */
  private async getQuickBooksClient(): Promise<QuickBooks> {
    const connection = await this.getActiveConnection();
    if (!connection) {
      throw new BadRequestException('QuickBooks is not connected');
    }

    const accessToken = await this.refreshTokenIfNeeded(connection);
    const useSandbox = process.env.QUICKBOOKS_ENVIRONMENT !== 'production';

    return new QuickBooks(
      process.env.QUICKBOOKS_CLIENT_ID,
      process.env.QUICKBOOKS_CLIENT_SECRET,
      accessToken,
      false, // no OAuth1
      connection.realmId,
      useSandbox,
      false, // debug
      null, // minorversion
      '2.0', // OAuth version
      connection.refreshToken,
    );
  }

  /**
   * Get company info from QuickBooks
   */
  private async getCompanyInfo(realmId: string, accessToken: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const useSandbox = process.env.QUICKBOOKS_ENVIRONMENT !== 'production';

      const qbo = new QuickBooks(
        process.env.QUICKBOOKS_CLIENT_ID,
        process.env.QUICKBOOKS_CLIENT_SECRET,
        accessToken,
        false,
        realmId,
        useSandbox,
        false,
        null,
        '2.0',
        null,
      );

      qbo.getCompanyInfo(realmId, (err: any, companyInfo: any) => {
        if (err) {
          console.error('Error fetching company info:', err);
          resolve(null);
        } else {
          resolve(companyInfo);
        }
      });
    });
  }

  /**
   * Find or create a customer in QuickBooks
   */
  private async findOrCreateCustomer(
    qbo: QuickBooks,
    email: string,
    displayName: string,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // First try to find existing customer by email
      qbo.findCustomers({
        PrimaryEmailAddr: email,
        fetchAll: true,
      }, (err: any, customers: any) => {
        if (err) {
          console.error('Error finding customer:', err);
        }

        if (customers?.QueryResponse?.Customer?.length > 0) {
          resolve(customers.QueryResponse.Customer[0]);
          return;
        }

        // Create new customer
        qbo.createCustomer({
          DisplayName: displayName,
          PrimaryEmailAddr: { Address: email },
        }, (createErr: any, customer: any) => {
          if (createErr) {
            console.error('Error creating customer:', createErr);
            // If display name exists, try with a unique suffix
            if (createErr.Fault?.Error?.[0]?.code === '6240') {
              qbo.createCustomer({
                DisplayName: `${displayName} (${Date.now()})`,
                PrimaryEmailAddr: { Address: email },
              }, (retryErr: any, retryCustomer: any) => {
                if (retryErr) {
                  reject(retryErr);
                } else {
                  resolve(retryCustomer);
                }
              });
            } else {
              reject(createErr);
            }
          } else {
            resolve(customer);
          }
        });
      });
    });
  }

  /**
   * Create a sales receipt in QuickBooks for a membership payment
   */
  async createSalesReceipt(data: CreateSalesReceiptDto): Promise<any> {
    const em = this.em.fork();

    // Get the membership type config to find QuickBooks item ID
    const membershipConfig = await em.findOne(MembershipTypeConfig, {
      id: data.membershipTypeConfigId,
    });

    if (!membershipConfig) {
      throw new NotFoundException('Membership type config not found');
    }

    const qbo = await this.getQuickBooksClient();

    // Find or create customer
    const customer = await this.findOrCreateCustomer(
      qbo,
      data.customerEmail,
      data.customerName,
    );

    return new Promise((resolve, reject) => {
      const salesReceipt: any = {
        CustomerRef: {
          value: customer.Id,
          name: customer.DisplayName,
        },
        TxnDate: data.paymentDate.toISOString().split('T')[0],
        PrivateNote: `Stripe Payment: ${data.stripePaymentIntentId}`,
        Line: [
          {
            Amount: data.amount,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: membershipConfig.quickbooksItemId
                ? { value: membershipConfig.quickbooksItemId }
                : { value: '1', name: 'Services' }, // Default to Services if not configured
              Qty: 1,
              UnitPrice: data.amount,
            },
            Description: `${membershipConfig.name} Membership`,
          },
        ],
        CustomerMemo: {
          value: `Thank you for your ${membershipConfig.name} membership purchase!`,
        },
      };

      // Add billing address if provided
      if (data.billingAddress) {
        salesReceipt.BillAddr = {
          Line1: data.billingAddress.line1,
          City: data.billingAddress.city,
          CountrySubDivisionCode: data.billingAddress.state,
          PostalCode: data.billingAddress.postalCode,
          Country: data.billingAddress.country,
        };
      }

      // Set deposit account if configured
      if (membershipConfig.quickbooksAccountId) {
        salesReceipt.DepositToAccountRef = {
          value: membershipConfig.quickbooksAccountId,
        };
      }

      qbo.createSalesReceipt(salesReceipt, (err: any, receipt: any) => {
        if (err) {
          console.error('Error creating sales receipt:', err);
          reject(new BadRequestException('Failed to create QuickBooks sales receipt'));
        } else {
          // Update last sync time
          this.updateLastSyncTime();
          resolve(receipt);
        }
      });
    });
  }

  /**
   * Get list of items from QuickBooks (for mapping to membership types)
   */
  async getItems(): Promise<any[]> {
    const qbo = await this.getQuickBooksClient();

    return new Promise((resolve, reject) => {
      qbo.findItems({
        fetchAll: true,
      }, (err: any, items: any) => {
        if (err) {
          console.error('Error fetching items:', err);
          reject(new BadRequestException('Failed to fetch QuickBooks items'));
        } else {
          resolve(items?.QueryResponse?.Item || []);
        }
      });
    });
  }

  /**
   * Get list of accounts from QuickBooks (for deposit account mapping)
   */
  async getAccounts(): Promise<any[]> {
    const qbo = await this.getQuickBooksClient();

    return new Promise((resolve, reject) => {
      qbo.findAccounts({
        AccountType: 'Bank',
        fetchAll: true,
      }, (err: any, accounts: any) => {
        if (err) {
          console.error('Error fetching accounts:', err);
          reject(new BadRequestException('Failed to fetch QuickBooks accounts'));
        } else {
          resolve(accounts?.QueryResponse?.Account || []);
        }
      });
    });
  }

  /**
   * Update last sync timestamp
   */
  private async updateLastSyncTime(): Promise<void> {
    const em = this.em.fork();
    const connection = await em.findOne(QuickBooksConnection, { isActive: true });
    if (connection) {
      connection.lastSyncAt = new Date();
      await em.flush();
    }
  }
}
