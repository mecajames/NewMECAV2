import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Response } from 'express';
import { QuickBooksService } from './quickbooks.service';
import { QuickBooksCompanyInfo } from '@newmeca/shared';
import { Public } from '../auth/public.decorator';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

@Controller('api/quickbooks')
export class QuickBooksController {
  constructor(
    private readonly quickBooksService: QuickBooksService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  private async requireAdmin(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid authorization token');
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (!isAdminUser(profile)) throw new ForbiddenException('Admin access required');
  }

  /**
   * Get QuickBooks connection status
   */
  @Public()
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
  @Public()
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
   * Get available QuickBooks items (products/services).
   * Was @Public() — fixed 2026-05-14: leaks internal accounting catalog.
   * Now admin-only.
   */
  @Get('items')
  async getItems(@Headers('authorization') authHeader?: string): Promise<any[]> {
    await this.requireAdmin(authHeader);
    return this.quickBooksService.getItems();
  }

  /**
   * Get available QuickBooks bank accounts.
   * Was @Public() — fixed 2026-05-14: leaks bank account list.
   * Now admin-only.
   */
  @Get('accounts')
  async getAccounts(@Headers('authorization') authHeader?: string): Promise<any[]> {
    await this.requireAdmin(authHeader);
    return this.quickBooksService.getAccounts();
  }
}
