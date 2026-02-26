import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { SiteSettings } from '../site-settings/site-settings.entity';

interface ContactCreateDto {
  email: string;
  firstName?: string;
  lastName?: string;
}

interface ConstantContactResponse {
  contact_id: string;
  email_address: {
    address: string;
  };
}

// site_settings keys for persisted tokens
const CC_TOKEN_KEY = 'cc_access_token';
const CC_REFRESH_KEY = 'cc_refresh_token';

@Injectable()
export class ConstantContactService {
  private readonly logger = new Logger(ConstantContactService.name);
  private readonly apiBaseUrl = 'https://api.cc.email/v3';
  private accessToken: string;
  private refreshToken: string;
  private tokensLoaded = false;

  constructor(private readonly em: EntityManager) {
    // Load initial tokens from env vars (DB tokens will override on first request)
    this.accessToken = process.env.CONSTANT_CONTACT_ACCESS_TOKEN || '';
    this.refreshToken = process.env.CONSTANT_CONTACT_REFRESH_TOKEN || '';
  }

  /**
   * Load persisted tokens from DB if available (overrides .env values)
   */
  private async loadPersistedTokens(): Promise<void> {
    if (this.tokensLoaded) return;
    this.tokensLoaded = true;

    try {
      const em = this.em.fork();
      const rows = await em.find(SiteSettings, {
        setting_key: { $in: [CC_TOKEN_KEY, CC_REFRESH_KEY] },
      });

      for (const row of rows) {
        if (row.setting_key === CC_TOKEN_KEY && row.setting_value) {
          this.accessToken = row.setting_value;
          this.logger.log('Loaded persisted CC access token from DB');
        }
        if (row.setting_key === CC_REFRESH_KEY && row.setting_value) {
          this.refreshToken = row.setting_value;
          this.logger.log('Loaded persisted CC refresh token from DB');
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not load CC tokens from DB, using .env values: ${err.message}`);
    }
  }

  /**
   * Persist refreshed tokens to DB so they survive server restarts
   */
  private async persistTokens(): Promise<void> {
    try {
      const em = this.em.fork();

      for (const [key, value] of [
        [CC_TOKEN_KEY, this.accessToken],
        [CC_REFRESH_KEY, this.refreshToken],
      ] as const) {
        const existing = await em.findOne(SiteSettings, { setting_key: key });
        if (existing) {
          existing.setting_value = value;
          existing.updated_at = new Date();
        } else {
          em.create(SiteSettings, {
            setting_key: key,
            setting_value: value,
            setting_type: 'secret',
            description: `Constant Contact ${key === CC_TOKEN_KEY ? 'access' : 'refresh'} token (auto-managed)`,
            updated_by: 'system',
            updated_at: new Date(),
          });
        }
      }

      await em.flush();
      this.logger.log('Persisted refreshed CC tokens to DB');
    } catch (err: any) {
      this.logger.warn(`Could not persist CC tokens to DB: ${err.message}`);
    }
  }

  /**
   * Add a contact to the newsletter list(s)
   * Supports multiple lists via comma-separated CONSTANT_CONTACT_LIST_ID env var
   */
  async addContact(data: ContactCreateDto): Promise<ConstantContactResponse> {
    await this.loadPersistedTokens();

    const listIdEnv = process.env.CONSTANT_CONTACT_LIST_ID;

    if (!listIdEnv) {
      throw new HttpException(
        'Constant Contact list ID not configured',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Support multiple list IDs (comma-separated)
    const listIds = listIdEnv.split(',').map(id => id.trim()).filter(id => id);

    const contactPayload = {
      email_address: data.email,
      first_name: data.firstName || '',
      last_name: data.lastName || '',
      list_memberships: listIds,
      create_source: 'Contact',
    };

    try {
      const response = await this.makeApiRequest('/contacts/sign_up_form', {
        method: 'POST',
        body: JSON.stringify(contactPayload),
      });

      this.logger.log(`Contact added successfully: ${data.email}`);
      return response;
    } catch (error: any) {
      // Handle duplicate contact (409 Conflict)
      if (error.status === 409) {
        this.logger.log(`Contact already exists: ${data.email}`);
        return this.updateContactListMembership(data.email, listIds);
      }
      throw error;
    }
  }

  /**
   * Update existing contact's list membership
   */
  private async updateContactListMembership(
    email: string,
    listIds: string[]
  ): Promise<ConstantContactResponse> {
    // First, find the contact by email
    const searchResponse = await this.makeApiRequest(
      `/contacts?email=${encodeURIComponent(email)}&include=list_memberships`,
      { method: 'GET' }
    );

    if (!searchResponse.contacts || searchResponse.contacts.length === 0) {
      throw new HttpException('Contact not found', HttpStatus.NOT_FOUND);
    }

    const contact = searchResponse.contacts[0];
    const existingLists: string[] = contact.list_memberships || [];

    // Check which lists need to be added
    const listsToAdd = listIds.filter(id => !existingLists.includes(id));

    // If already on all lists, return the contact
    if (listsToAdd.length === 0) {
      return contact;
    }

    // Add to the new lists
    const updatePayload = {
      list_memberships: [...existingLists, ...listsToAdd],
    };

    return this.makeApiRequest(`/contacts/${contact.contact_id}`, {
      method: 'PUT',
      body: JSON.stringify(updatePayload),
    });
  }

  /**
   * Get all contact lists (useful for finding your list ID)
   */
  async getLists(): Promise<any> {
    await this.loadPersistedTokens();
    return this.makeApiRequest('/contact_lists', { method: 'GET' });
  }

  /**
   * Make an authenticated API request to Constant Contact.
   * Automatically handles token refresh on 401 with a single retry.
   */
  private async makeApiRequest(
    endpoint: string,
    options: { method: string; body?: string },
    isRetry = false,
  ): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: options.body,
      });

      // Handle token expiration — refresh and retry ONCE
      if (response.status === 401 && !isRetry) {
        this.logger.warn('CC access token expired, refreshing...');
        await this.refreshAccessToken();
        return this.makeApiRequest(endpoint, options, true);
      }

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Constant Contact API error: ${response.status} - ${errorBody}`);
        throw new HttpException(
          {
            message: 'Failed to communicate with Constant Contact',
            details: errorBody,
          },
          response.status
        );
      }

      // Handle empty responses (some endpoints return 204)
      if (response.status === 204) {
        return { success: true };
      }

      return response.json();
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Constant Contact API request failed: ${error.message}`);
      throw new HttpException(
        'Failed to connect to Constant Contact',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Refresh the access token using the refresh token.
   * Persists the new tokens to the database.
   */
  private async refreshAccessToken(): Promise<void> {
    const apiKey = process.env.CONSTANT_CONTACT_API_KEY;
    const clientSecret = process.env.CONSTANT_CONTACT_CLIENT_SECRET;

    if (!apiKey || !clientSecret || !this.refreshToken) {
      throw new HttpException(
        'Constant Contact credentials not configured. Set CONSTANT_CONTACT_API_KEY, CONSTANT_CONTACT_CLIENT_SECRET, and CONSTANT_CONTACT_REFRESH_TOKEN.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    const tokenUrl = 'https://authz.constantcontact.com/oauth2/default/v1/token';
    const credentials = Buffer.from(`${apiKey}:${clientSecret}`).toString('base64');

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`CC token refresh failed (${response.status}): ${errorBody}`);
        throw new HttpException(
          `Failed to refresh Constant Contact token: ${errorBody}`,
          HttpStatus.UNAUTHORIZED
        );
      }

      const data = await response.json() as { access_token: string; refresh_token?: string };
      this.accessToken = data.access_token;

      // Constant Contact may issue a new refresh token — always update it
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }

      this.logger.log('Constant Contact access token refreshed successfully');

      // Persist to DB so the new tokens survive server restarts
      await this.persistTokens();
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Token refresh error: ${error.message}`);
      throw new HttpException(
        'Failed to refresh authentication',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
