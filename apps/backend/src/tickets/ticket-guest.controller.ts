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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { TicketGuestService, CreateGuestTicketData, GuestTicketResponse } from './ticket-guest.service';
import { TicketsService } from './tickets.service';
import { Public } from '../auth/public.decorator';

interface RequestAccessDto {
  email: string;
}

interface ClassifyEmailDto {
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
  constructor(
    private readonly guestService: TicketGuestService,
    private readonly ticketsService: TicketsService,
  ) {}

  /**
   * Step 0: Classify an email before issuing any magic link, so the frontend
   * can route account-holders to login and let guests/expired members through.
   * POST /api/tickets/guest/classify-email
   */
  @Public()
  @Post('classify-email')
  @HttpCode(HttpStatus.OK)
  async classifyEmail(
    @Body() body: ClassifyEmailDto,
  ): Promise<{ status: string; first_name?: string; login_banned?: boolean }> {
    return this.guestService.classifyEmail(body.email);
  }

  /**
   * Request an account-help magic link for a locked-out account holder. The
   * resulting ticket is forced to the Account category and linked to their
   * profile for staff context.
   * POST /api/tickets/guest/request-account-help
   */
  @Public()
  @Post('request-account-help')
  @HttpCode(HttpStatus.OK)
  async requestAccountHelp(
    @Body() body: RequestAccessDto,
    @Req() req: Request,
  ): Promise<{ message: string; expires_at: Date }> {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];

    const result = await this.guestService.requestAccess(
      body.email,
      ipAddress,
      userAgent,
      'account_help',
    );

    const isDevelopment = process.env.NODE_ENV !== 'production';

    return {
      message: isDevelopment
        ? `Account help link: /support/guest/verify/${result.token}`
        : 'If this email is valid, you will receive an account help link shortly.',
      expires_at: result.expiresAt,
      ...(isDevelopment && { _dev_token: result.token }),
    } as any;
  }

  /**
   * Step 1: Request a magic link to create a ticket.
   * POST /api/tickets/guest/request-access
   */
  @Public()
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
  @Public()
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
  @Public()
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Body() body: CreateGuestTicketDto,
    @Req() req: Request,
  ): Promise<GuestTicketResponse> {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];
    return this.guestService.createGuestTicket(body.token, {
      title: body.title,
      description: body.description,
      category: body.category as any,
      priority: body.priority as any,
      guest_name: body.guest_name,
      event_id: body.event_id,
    }, { ipAddress, userAgent });
  }

  /**
   * View a ticket using access token.
   * GET /api/tickets/guest/view/:accessToken
   */
  @Public()
  @Get('view/:accessToken')
  async viewTicket(
    @Param('accessToken') accessToken: string,
  ): Promise<GuestTicketResponse> {
    return this.guestService.getGuestTicket(accessToken);
  }

  /**
   * Download/stream an attachment on a guest ticket. Authorized purely by the
   * ticket's access token (the magic-link credential), so a guest can view
   * screenshots staff sent on THEIR ticket. Mirrors the authenticated
   * /api/tickets/:id/attachments/:id/download proxy.
   * GET /api/tickets/guest/view/:accessToken/attachments/:attachmentId
   */
  @Public()
  @Get('view/:accessToken/attachments/:attachmentId')
  async downloadGuestAttachment(
    @Param('accessToken') accessToken: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { data, mimeType, fileName } =
      await this.ticketsService.getAttachmentForGuestDownload(accessToken, attachmentId);

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(data);
  }

  /**
   * Upload a screenshot on a guest ticket (create-time ticket-level, or linked
   * to a comment via comment_id). Authorized by the ticket's access token.
   * POST /api/tickets/guest/view/:accessToken/attachments  (multipart/form-data)
   */
  @Public()
  @Post('view/:accessToken/attachments')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 15 * 1024 * 1024 }, // hard cap; service enforces the 10MB image limit
  }))
  async uploadGuestAttachment(
    @Param('accessToken') accessToken: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('comment_id') commentId?: string,
  ): Promise<{ id: string; file_name: string; mime_type: string; file_size: number }> {
    return this.guestService.addGuestAttachment(accessToken, file, commentId);
  }

  /**
   * Add a comment to a guest ticket.
   * POST /api/tickets/guest/view/:accessToken/comment
   */
  @Public()
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
  @Public()
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
  @Public()
  @Get('access/:token')
  async getAccessFromToken(
    @Param('token') token: string,
  ): Promise<{ access_token: string }> {
    const result = await this.guestService.getAccessFromViewToken(token);
    return { access_token: result.accessToken };
  }
}
