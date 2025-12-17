import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TicketGuestService, CreateGuestTicketData, GuestTicketResponse } from './ticket-guest.service';

interface RequestAccessDto {
  email: string;
}

interface CreateGuestTicketDto {
  token: string;
  title: string;
  description: string;
  category: string;
  priority?: string;
  guest_name: string;
  event_id?: string;
}

interface AddCommentDto {
  content: string;
}

interface RequestTicketAccessDto {
  email: string;
  ticket_number: string;
}

@Controller('api/tickets/guest')
export class TicketGuestController {
  constructor(private readonly guestService: TicketGuestService) {}

  /**
   * Step 1: Request a magic link to create a ticket.
   * POST /api/tickets/guest/request-access
   */
  @Post('request-access')
  @HttpCode(HttpStatus.OK)
  async requestAccess(
    @Body() body: RequestAccessDto,
    @Req() req: Request,
  ): Promise<{ message: string; expires_at: Date }> {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];

    const result = await this.guestService.requestAccess(
      body.email,
      ipAddress,
      userAgent,
    );

    // In production, this would send an email instead of returning the token
    // For development, we return the token directly
    const isDevelopment = process.env.NODE_ENV !== 'production';

    return {
      message: isDevelopment
        ? `Verification link: /support/guest/verify/${result.token}`
        : 'If this email is valid, you will receive a verification link shortly.',
      expires_at: result.expiresAt,
      ...(isDevelopment && { _dev_token: result.token }),
    } as any;
  }

  /**
   * Step 2: Verify token and get email (frontend redirects here).
   * GET /api/tickets/guest/verify/:token
   */
  @Get('verify/:token')
  async verifyToken(
    @Param('token') token: string,
  ): Promise<{ valid: boolean; email: string; purpose: string }> {
    const result = await this.guestService.verifyToken(token);
    return {
      valid: true,
      email: result.email,
      purpose: result.purpose,
    };
  }

  /**
   * Step 3: Create a ticket with verified token.
   * POST /api/tickets/guest/create
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Body() body: CreateGuestTicketDto,
  ): Promise<GuestTicketResponse> {
    return this.guestService.createGuestTicket(body.token, {
      title: body.title,
      description: body.description,
      category: body.category as any,
      priority: body.priority as any,
      guest_name: body.guest_name,
      event_id: body.event_id,
    });
  }

  /**
   * View a ticket using access token.
   * GET /api/tickets/guest/view/:accessToken
   */
  @Get('view/:accessToken')
  async viewTicket(
    @Param('accessToken') accessToken: string,
  ): Promise<GuestTicketResponse> {
    return this.guestService.getGuestTicket(accessToken);
  }

  /**
   * Add a comment to a guest ticket.
   * POST /api/tickets/guest/view/:accessToken/comment
   */
  @Post('view/:accessToken/comment')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('accessToken') accessToken: string,
    @Body() body: AddCommentDto,
  ): Promise<{ id: string; content: string; created_at: Date }> {
    return this.guestService.addGuestComment(accessToken, body.content);
  }

  /**
   * Request access to an existing ticket (sends magic link to email).
   * POST /api/tickets/guest/request-ticket-access
   */
  @Post('request-ticket-access')
  @HttpCode(HttpStatus.OK)
  async requestTicketAccess(
    @Body() body: RequestTicketAccessDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];

    const result = await this.guestService.requestTicketAccess(
      body.email,
      body.ticket_number,
      ipAddress,
      userAgent,
    );

    // Always return same message to prevent ticket enumeration
    const isDevelopment = process.env.NODE_ENV !== 'production';

    return {
      message: isDevelopment && result.found
        ? `Access link: /support/guest/access/${result.token}`
        : 'If a ticket exists with this email and number, you will receive an access link.',
      ...(isDevelopment && result.found && { _dev_token: result.token }),
    } as any;
  }

  /**
   * Get ticket access token from view token.
   * GET /api/tickets/guest/access/:token
   */
  @Get('access/:token')
  async getAccessFromToken(
    @Param('token') token: string,
  ): Promise<{ access_token: string }> {
    const result = await this.guestService.getAccessFromViewToken(token);
    return { access_token: result.accessToken };
  }
}
