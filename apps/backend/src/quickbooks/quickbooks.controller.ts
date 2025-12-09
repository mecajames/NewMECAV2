import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { QuickBooksService, QuickBooksCompanyInfo } from './quickbooks.service';

@Controller('api/quickbooks')
export class QuickBooksController {
  constructor(private readonly quickBooksService: QuickBooksService) {}

  /**
   * Get QuickBooks connection status
   */
  @Get('status')
  async getConnectionStatus(): Promise<{ connected: boolean; company: QuickBooksCompanyInfo | null }> {
    const company = await this.quickBooksService.getConnectionStatus();
    return {
      connected: company !== null,
      company,
    };
  }

  /**
   * Start OAuth flow - redirects to QuickBooks authorization page
   */
  @Get('connect')
  async connect(@Res() res: Response): Promise<void> {
    const authUrl = this.quickBooksService.getAuthorizationUrl();
    res.redirect(authUrl);
  }

  /**
   * OAuth callback - handles the redirect from QuickBooks
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('realmId') realmId: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Reconstruct the full callback URL
      const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;
      const callbackUrl = `${redirectUri}?code=${code}&state=${state}&realmId=${realmId}`;

      await this.quickBooksService.handleOAuthCallback(callbackUrl);

      // Redirect to admin dashboard with success message
      const frontendUrl = process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/admin/settings?quickbooks=connected`);
    } catch (error) {
      console.error('QuickBooks callback error:', error);
      const frontendUrl = process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/admin/settings?quickbooks=error`);
    }
  }

  /**
   * Disconnect QuickBooks
   */
  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(): Promise<void> {
    await this.quickBooksService.disconnect();
  }

  /**
   * Get available QuickBooks items (products/services)
   * Used for mapping membership types to QuickBooks items
   */
  @Get('items')
  async getItems(): Promise<any[]> {
    return this.quickBooksService.getItems();
  }

  /**
   * Get available QuickBooks bank accounts
   * Used for configuring deposit accounts
   */
  @Get('accounts')
  async getAccounts(): Promise<any[]> {
    return this.quickBooksService.getAccounts();
  }
}
