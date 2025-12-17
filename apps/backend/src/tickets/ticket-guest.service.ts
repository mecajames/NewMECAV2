import { Injectable, Inject, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomBytes } from 'crypto';
import { TicketGuestToken, GuestTokenPurpose } from './entities/ticket-guest-token.entity';
import { Ticket } from './ticket.entity';
import { TicketComment } from './ticket-comment.entity';
import { TicketCategory, TicketPriority, TicketStatus } from '@newmeca/shared';
import { TicketRoutingService } from './ticket-routing.service';

export interface CreateGuestTicketData {
  title: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  guest_name: string;
  event_id?: string;
}

export interface GuestTicketResponse {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  guest_email: string;
  guest_name: string;
  access_token: string;
  created_at: Date;
  updated_at: Date;
  comments: Array<{
    id: string;
    content: string;
    author_name: string;
    is_staff: boolean;
    created_at: Date;
  }>;
}

@Injectable()
export class TicketGuestService {
  // Token validity duration (1 hour for creation, 30 days for access)
  private readonly CREATE_TOKEN_EXPIRY_HOURS = 1;
  private readonly ACCESS_TOKEN_EXPIRY_DAYS = 30;

  // Rate limiting: max requests per email per hour
  private readonly MAX_REQUESTS_PER_HOUR = 3;

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly routingService: TicketRoutingService,
  ) {}

  /**
   * Request a magic link to create a ticket.
   * Returns the token (to be sent via email in production).
   */
  async requestAccess(
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const em = this.em.fork();

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting check
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await em.count(TicketGuestToken, {
      email: normalizedEmail,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentRequests >= this.MAX_REQUESTS_PER_HOUR) {
      throw new BadRequestException(
        'Too many requests. Please try again later.',
      );
    }

    // Generate secure token
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + this.CREATE_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Create token record
    const guestToken = em.create(TicketGuestToken, {
      email: normalizedEmail,
      token,
      purpose: 'create_ticket' as GuestTokenPurpose,
      expiresAt,
      ipAddress,
      userAgent,
    } as any);

    await em.persistAndFlush(guestToken);

    return { token, expiresAt };
  }

  /**
   * Verify a token and return the associated email if valid.
   */
  async verifyToken(token: string): Promise<{ email: string; purpose: GuestTokenPurpose }> {
    const em = this.em.fork();

    const guestToken = await em.findOne(TicketGuestToken, {
      token,
      usedAt: null,
      expiresAt: { $gte: new Date() },
    });

    if (!guestToken) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return {
      email: guestToken.email,
      purpose: guestToken.purpose,
    };
  }

  /**
   * Create a guest ticket using a verified token.
   */
  async createGuestTicket(
    token: string,
    data: CreateGuestTicketData,
  ): Promise<GuestTicketResponse> {
    const em = this.em.fork();

    // Verify token
    const guestToken = await em.findOne(TicketGuestToken, {
      token,
      purpose: 'create_ticket',
      usedAt: null,
      expiresAt: { $gte: new Date() },
    });

    if (!guestToken) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Mark token as used
    guestToken.usedAt = new Date();

    // Generate ticket number
    const ticketNumber = await this.generateTicketNumber(em);

    // Generate access token for future viewing
    const accessToken = this.generateSecureToken();

    // Execute routing rules to determine department assignment
    const routingResult = await this.routingService.executeRouting({
      title: data.title,
      description: data.description,
      category: data.category,
    });

    // Create the ticket
    const ticket = em.create(Ticket, {
      ticketNumber,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority || TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      guestEmail: guestToken.email,
      guestName: data.guest_name,
      accessToken,
      isGuestTicket: true,
      department: routingResult.departmentId ? undefined : 'general_support',
    } as any);

    // Set department if routing found one
    if (routingResult.departmentId) {
      const { TicketDepartment } = await import('./entities/ticket-department.entity');
      const dept = await em.findOne(TicketDepartment, { id: routingResult.departmentId });
      if (dept) {
        (ticket as any).departmentEntity = dept;
      }
    }

    // Set priority if routing specified one
    if (routingResult.priority) {
      ticket.priority = routingResult.priority as TicketPriority;
    }

    await em.persistAndFlush([guestToken, ticket]);

    return this.formatGuestTicketResponse(ticket, []);
  }

  /**
   * Get a guest ticket by access token.
   */
  async getGuestTicket(accessToken: string): Promise<GuestTicketResponse> {
    const em = this.em.fork();

    const ticket = await em.findOne(Ticket, {
      accessToken,
      isGuestTicket: true,
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Get comments (excluding internal ones)
    const comments = await em.find(
      TicketComment,
      {
        ticket: ticket.id,
        isInternal: false,
      },
      {
        populate: ['author'],
        orderBy: { createdAt: 'ASC' },
      },
    );

    return this.formatGuestTicketResponse(ticket, comments);
  }

  /**
   * Add a comment to a guest ticket.
   */
  async addGuestComment(
    accessToken: string,
    content: string,
  ): Promise<{ id: string; content: string; created_at: Date }> {
    const em = this.em.fork();

    const ticket = await em.findOne(Ticket, {
      accessToken,
      isGuestTicket: true,
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check if ticket is closed
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Cannot add comments to a closed ticket');
    }

    const comment = em.create(TicketComment, {
      ticket,
      content,
      guestAuthorName: ticket.guestName,
      isGuestComment: true,
      isInternal: false,
    } as any);

    // Update ticket status if it was resolved/waiting
    if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.AWAITING_RESPONSE) {
      ticket.status = TicketStatus.OPEN;
    }

    await em.persistAndFlush([comment, ticket]);

    return {
      id: comment.id,
      content: comment.content,
      created_at: comment.createdAt,
    };
  }

  /**
   * Request a new access link for an existing ticket.
   */
  async requestTicketAccess(
    email: string,
    ticketNumber: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ found: boolean; token?: string; expiresAt?: Date }> {
    const em = this.em.fork();

    const normalizedEmail = email.toLowerCase().trim();

    // Find the ticket
    const ticket = await em.findOne(Ticket, {
      ticketNumber,
      guestEmail: normalizedEmail,
      isGuestTicket: true,
    });

    if (!ticket) {
      // Don't reveal if ticket exists or not
      return { found: false };
    }

    // Generate a view token
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + this.ACCESS_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const guestToken = em.create(TicketGuestToken, {
      email: normalizedEmail,
      token,
      purpose: 'view_ticket' as GuestTokenPurpose,
      expiresAt,
      ipAddress,
      userAgent,
    } as any);

    await em.persistAndFlush(guestToken);

    return { found: true, token, expiresAt };
  }

  /**
   * Get ticket access token from a view token.
   */
  async getAccessFromViewToken(token: string): Promise<{ accessToken: string }> {
    const em = this.em.fork();

    const guestToken = await em.findOne(TicketGuestToken, {
      token,
      purpose: 'view_ticket',
      expiresAt: { $gte: new Date() },
    });

    if (!guestToken) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Find the ticket for this email
    const ticket = await em.findOne(Ticket, {
      guestEmail: guestToken.email,
      isGuestTicket: true,
    });

    if (!ticket || !ticket.accessToken) {
      throw new NotFoundException('Ticket not found');
    }

    // Mark token as used (view tokens can be used multiple times but track usage)
    guestToken.usedAt = new Date();
    await em.flush();

    return { accessToken: ticket.accessToken };
  }

  // ============ Private Helpers ============

  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async generateTicketNumber(em: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TKT-${year}-`;

    // Get the highest ticket number for this year
    const lastTicket = await em.findOne(
      Ticket,
      { ticketNumber: { $like: `${prefix}%` } },
      { orderBy: { ticketNumber: 'DESC' } },
    );

    let nextNum = 1;
    if (lastTicket) {
      const match = lastTicket.ticketNumber.match(/TKT-\d{4}-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${nextNum.toString().padStart(5, '0')}`;
  }

  private formatGuestTicketResponse(
    ticket: Ticket,
    comments: TicketComment[],
  ): GuestTicketResponse {
    return {
      id: ticket.id,
      ticket_number: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      guest_email: ticket.guestEmail || '',
      guest_name: ticket.guestName || '',
      access_token: ticket.accessToken || '',
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        author_name: c.isGuestComment
          ? c.guestAuthorName || 'Guest'
          : c.author?.first_name
            ? `${c.author.first_name} ${c.author.last_name || ''}`.trim()
            : 'Support Staff',
        is_staff: !c.isGuestComment,
        created_at: c.createdAt,
      })),
    };
  }
}
