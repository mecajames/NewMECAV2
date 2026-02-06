import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

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

@Injectable()
export class ConstantContactService {
  private readonly logger = new Logger(ConstantContactService.name);
  private readonly apiBaseUrl = 'https://api.cc.email/v3';
  private accessToken: string;
  private refreshToken: string;

  constructor() {
    this.accessToken = process.env.CONSTANT_CONTACT_ACCESS_TOKEN || '';
    this.refreshToken = process.env.CONSTANT_CONTACT_REFRESH_TOKEN || '';
  }

  /**
   * Add a contact to the newsletter list(s)
   * Supports multiple lists via comma-separated CONSTANT_CONTACT_LIST_ID env var
   */
  async addContact(data: ContactCreateDto): Promise<ConstantContactResponse> {
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
      email_address: {
        address: data.email,
        permission_to_send: 'implicit', // or 'explicit' if you have double opt-in
      },
      first_name: data.firstName || '',
      last_name: data.lastName || '',
      list_memberships: listIds,
      create_source: 'Contact', // Indicates contact was created via API
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
        // Optionally update their list membership
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
    return this.makeApiRequest('/contact_lists', { method: 'GET' });
  }

  /**
   * Make an authenticated API request to Constant Contact
   */
  private async makeApiRequest(
    endpoint: string,
    options: { method: string; body?: string }
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

      // Handle token expiration
      if (response.status === 401) {
        await this.refreshAccessToken();
        // Retry the request with new token
        return this.makeApiRequest(endpoint, options);
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
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    const apiKey = process.env.CONSTANT_CONTACT_API_KEY;
    const clientSecret = process.env.CONSTANT_CONTACT_CLIENT_SECRET;

    if (!apiKey || !clientSecret || !this.refreshToken) {
      throw new HttpException(
        'Constant Contact credentials not configured',
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
        this.logger.error(`Token refresh failed: ${errorBody}`);
        throw new HttpException(
          'Failed to refresh Constant Contact token',
          HttpStatus.UNAUTHORIZED
        );
      }

      const data = await response.json() as { access_token: string; refresh_token?: string };
      this.accessToken = data.access_token;

      // If a new refresh token is provided, update it
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }

      this.logger.log('Constant Contact access token refreshed');
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
