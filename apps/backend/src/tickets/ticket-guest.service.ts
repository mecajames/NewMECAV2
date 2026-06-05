import { Injectable, Inject, NotFoundException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomBytes } from 'crypto';
import { TicketGuestToken, GuestTokenPurpose } from './entities/ticket-guest-token.entity';
import { Ticket } from './ticket.entity';
import { TicketComment } from './ticket-comment.entity';
import { Profile } from '../profiles/profiles.entity';
import { TicketCategory, TicketPriority, TicketStatus } from '@newmeca/shared';
import { TicketRoutingService } from './ticket-routing.service';
import { EmailService } from '../email/email.service';

export interface CreateGuestTicketData {
  title: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
  guest_name: string;
  event_id?: string;
}

export type EmailAccountStatus = 'no_account' | 'active' | 'expired';

export interface EmailClassification {
  status: EmailAccountStatus;
  first_name?: string;
  login_banned?: boolean;
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
  private readonly logger = new Logger(TicketGuestService.name);
  private readonly frontendUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';

  // Token validity duration (1 hour for creation, 30 days for access)
  private readonly CREATE_TOKEN_EXPIRY_HOURS = 1;
  private readonly ACCESS_TOKEN_EXPIRY_DAYS = 30;

  // Rate limiting: max requests per email per hour
  private readonly MAX_REQUESTS_PER_HOUR = 3;

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly routingService: TicketRoutingService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Classify an email address so the support entry flow can route the person
   * correctly WITHOUT issuing a magic link first:
   *  - no_account: no profile, or a profile that never held a membership
   *      -> full guest magic-link flow (any category)
   *  - active: has an active membership (or is staff/admin/ED/judge, or is
   *      hard-banned) -> should log in instead of using the guest flow
   *  - expired: had a membership that lapsed -> treated as a non-member and
   *      sent through the guest flow, but kept isolated from My MECA
   *
   * The response is intentionally minimal (status + first name) so we don't
   * leak membership details, MECA ID, or expiry dates.
   */
  async classifyEmail(email: string): Promise<EmailClassification> {
    const em = this.em.fork();
    const normalizedEmail = email.toLowerCase().trim();

    const profile = await em.findOne(Profile, { email: normalizedEmail });
    if (!profile) {
      return { status: 'no_account' };
    }

    // Hard-banned accounts must never be funnelled into the guest flow — send
    // them to login (where the ban is enforced) rather than handing out a
    // magic link that would let them sidestep it.
    if (profile.login_banned) {
      return { status: 'active', first_name: profile.first_name, login_banned: true };
    }

    // Staff / privileged roles are exempt from the membership-expiry gate, so
    // for support-routing purposes they always count as "active" (log in).
    const privilegedRoles = ['admin', 'event_director', 'judge'];
    if (profile.is_staff || (profile.role && privilegedRoles.includes(profile.role))) {
      return { status: 'active', first_name: profile.first_name };
    }

    if (profile.membership_status === 'active') {
      return { status: 'active', first_name: profile.first_name };
    }

    if (profile.membership_status === 'expired') {
      return { status: 'expired', first_name: profile.first_name };
    }

    // membership_status 'none' / null: a profile shell with no membership.
    // Treat as a guest so they can use the full magic-link flow.
    return { status: 'no_account' };
  }

  /**
   * Request a magic link to create a ticket.
   * Returns the token (to be sent via email in production).
   *
   * `purpose` defaults to 'create_ticket'. Pass 'account_help' for a
   * locked-out account holder — the resulting ticket is forced to the Account
   * category and linked to their profile (see createGuestTicket).
   */
  async requestAccess(
    email: string,
    ipAddress?: string,
    userAgent?: string,
    purpose: GuestTokenPurpose = 'create_ticket',
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
      purpose,
      expiresAt,
      ipAddress,
      userAgent,
    } as any);

    await em.persistAndFlush(guestToken);

    // Send magic link email. Both create_ticket and account_help land on the
    // same /verify page (the create form), which adapts based on the verified
    // token's purpose.
    const isAccountHelp = purpose === 'account_help';
    const magicLinkUrl = `${this.frontendUrl}/support/guest/verify/${token}`;
    this.emailService.sendTicketGuestVerificationEmail({
      to: normalizedEmail,
      magicLinkUrl,
      expiresInHours: this.CREATE_TOKEN_EXPIRY_HOURS,
      isNewTicket: true,
      isAccountHelp,
    }).catch(err => {
      this.logger.error(`Failed to send guest verification email: ${err.message}`);
    });

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

    // Verify token. Both create_ticket and account_help tokens land here.
    const guestToken = await em.findOne(TicketGuestToken, {
      token,
      purpose: { $in: ['create_ticket', 'account_help'] },
      usedAt: null,
      expiresAt: { $gte: new Date() },
    });

    if (!guestToken) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Mark token as used
    guestToken.usedAt = new Date();

    const isAccountHelp = guestToken.purpose === 'account_help';

    // Look up any profile behind this email so we can attach staff context.
    const profile = await em.findOne(Profile, { email: guestToken.email });

    // For account-help tickets the category is forced to ACCOUNT server-side —
    // a tampered payload can't widen this path to general support. For normal
    // guest tickets we honour the submitted category.
    const effectiveCategory = isAccountHelp ? TicketCategory.ACCOUNT : data.category;

    // Decide how the ticket relates to the profile:
    //  - account_help: a known active member who can't log in. Safe to link as
    //    reporter (they still hold no session, so no dashboard access) — gives
    //    staff full context and continuity once login is restored.
    //  - expired member via the normal guest flow: must stay isolated from My
    //    MECA, so DON'T set reporter; record linked_profile_hint for staff only.
    let reporter: Profile | undefined;
    let linkedProfileHint: string | undefined;
    if (isAccountHelp) {
      reporter = profile ?? undefined;
    } else if (profile && profile.membership_status === 'expired') {
      linkedProfileHint = profile.id;
    }

    // Generate ticket number
    const ticketNumber = await this.generateTicketNumber(em);

    // Generate access token for future viewing
    const accessToken = this.generateSecureToken();

    // Execute routing rules to determine department assignment
    const routingResult = await this.routingService.executeRouting({
      title: data.title,
      description: data.description,
      category: effectiveCategory,
    });

    // Create the ticket
    const ticket = em.create(Ticket, {
      ticketNumber,
      title: data.title,
      description: data.description,
      category: effectiveCategory,
      priority: data.priority || TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      guestEmail: guestToken.email,
      guestName: data.guest_name,
      accessToken,
      isGuestTicket: true,
      reporter,
      linkedProfileHint,
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

    // Send confirmation email to guest
    const viewTicketUrl = `${this.frontendUrl}/support/guest/ticket/${accessToken}`;
    this.emailService.sendTicketCreatedEmail({
      to: guestToken.email,
      firstName: data.guest_name.split(' ')[0] || undefined,
      ticketNumber: ticket.ticketNumber,
      ticketTitle: ticket.title,
      ticketDescription: ticket.description,
      category: ticket.category,
      viewTicketUrl,
    }).catch(err => {
      this.logger.error(`Failed to send guest ticket confirmation email: ${err.message}`);
    });

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
    }, { populate: ['assignedTo'] });

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

    // Guest reply = customer reply → ball is back in support's court.
    // Mirror the authenticated createComment behavior.
    if (ticket.status === TicketStatus.AWAITING_RESPONSE) {
      ticket.status = ticket.assignedTo
        ? TicketStatus.IN_PROGRESS
        : TicketStatus.OPEN;
    } else if (ticket.status === TicketStatus.RESOLVED) {
      // Guest commented on a resolved ticket — surface as Reopened so admins
      // can see recidivism (same status the explicit Reopen button uses).
      ticket.status = TicketStatus.REOPENED;
      ticket.resolvedAt = undefined;
    }
    // ESCALATED / PENDING_INTERNAL_REVIEW / ON_HOLD are explicit staff states
    // and are intentionally not auto-transitioned by guest comments.

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

    // Send magic link email for existing ticket access
    const magicLinkUrl = `${this.frontendUrl}/support/guest/access/${token}`;
    this.emailService.sendTicketGuestVerificationEmail({
      to: normalizedEmail,
      magicLinkUrl,
      expiresInHours: this.ACCESS_TOKEN_EXPIRY_DAYS * 24, // Convert days to hours
      isNewTicket: false,
      ticketNumber: ticket.ticketNumber,
    }).catch(err => {
      this.logger.error(`Failed to send guest ticket access email: ${err.message}`);
    });

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
