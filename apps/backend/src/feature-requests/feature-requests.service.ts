import { Injectable, Inject, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager, Reference, wrap } from '@mikro-orm/core';
import {
  FeatureRequestStatus,
  FeatureRequestVote,
  CreateFeatureRequestDto,
  CastFeatureVoteDto,
  ConvertTicketToFeatureDto,
  TicketStatus,
  FEATURE_REQUEST_MAX_OPEN_PER_MEMBER,
  FEATURE_REQUEST_VOTING_WINDOW_DAYS,
  FEATURE_REQUEST_DESCRIPTION_MIN,
  FEATURE_REQUEST_DETAILS_DEADLINE_SETTING,
  FEATURE_REQUEST_DETAILS_DEADLINE_DEFAULT_DAYS,
} from '@newmeca/shared';
import { FeatureRequest, FeatureRequestVoteEntity, FeatureRequestMessage } from './feature-requests.entity';
import { Profile } from '../profiles/profiles.entity';
import { SiteSettings } from '../site-settings/site-settings.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { Ticket } from '../tickets/ticket.entity';
import { TicketComment } from '../tickets/ticket-comment.entity';

// Statuses that count against the 3-open-requests-per-member cap.
const OPEN_STATUSES = [FeatureRequestStatus.GATHERING_INTEREST, FeatureRequestStatus.INVESTIGATING];

// Statuses members can see in the public list. Declined rows appear only when
// the admin chose a PUBLIC decline; private declines exist only in the
// submitter's own view.
const MEMBER_VISIBLE_STATUSES = [
  FeatureRequestStatus.GATHERING_INTEREST,
  FeatureRequestStatus.INVESTIGATING,
  FeatureRequestStatus.APPROVED,
  FeatureRequestStatus.IMPLEMENTED,
  FeatureRequestStatus.EXPIRED,
];

const DEFAULT_THRESHOLD_PCT = 10;
const THRESHOLD_SETTING_KEY = 'feature_request_threshold_pct';

@Injectable()
export class FeatureRequestsService {
  private readonly logger = new Logger(FeatureRequestsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  // ==========================================================================
  // Member: submit / resubmit
  // ==========================================================================

  async submit(userId: string, dto: CreateFeatureRequestDto, resubmittedFromId?: string): Promise<FeatureRequest> {
    const em = this.em.fork();

    const openCount = await em.count(FeatureRequest, { user: userId, status: { $in: OPEN_STATUSES } });
    if (openCount >= FEATURE_REQUEST_MAX_OPEN_PER_MEMBER) {
      throw new BadRequestException(
        `You already have ${openCount} open feature requests. Wait for one to be decided before submitting another.`,
      );
    }

    let resubmittedFrom: FeatureRequest | undefined;
    if (resubmittedFromId) {
      const prior = await em.findOne(FeatureRequest, { id: resubmittedFromId, user: userId });
      if (!prior) throw new NotFoundException('Original request not found.');
      if (prior.status !== FeatureRequestStatus.EXPIRED) {
        throw new BadRequestException('Only an expired request can be revised and resubmitted.');
      }
      resubmittedFrom = prior;
    }

    const request = new FeatureRequest();
    request.user = em.getReference(Profile, userId);
    request.title = dto.title;
    request.description = dto.description;
    request.category = dto.category;
    request.votingEndsAt = new Date(Date.now() + FEATURE_REQUEST_VOTING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    request.thresholdPct = String(await this.defaultThresholdPct(em));
    if (resubmittedFrom) request.resubmittedFrom = resubmittedFrom;

    await em.persistAndFlush(request);
    this.logger.log(`Feature request "${request.title}" submitted by ${userId}${resubmittedFromId ? ` (resubmission of ${resubmittedFromId})` : ''}`);
    return request;
  }

  private async defaultThresholdPct(em: EntityManager): Promise<number> {
    const row = await em.findOne(SiteSettings, { setting_key: THRESHOLD_SETTING_KEY });
    const n = Number(row?.setting_value);
    return Number.isFinite(n) && n > 0 && n <= 100 ? n : DEFAULT_THRESHOLD_PCT;
  }

  // ==========================================================================
  // Member: browse (never leaks voter identities, comments, or the threshold)
  // ==========================================================================

  async listForMember(userId: string, filter?: { status?: FeatureRequestStatus; sort?: 'top' | 'newest' }): Promise<any[]> {
    const em = this.em.fork();
    const statuses = filter?.status && MEMBER_VISIBLE_STATUSES.includes(filter.status)
      ? [filter.status]
      : MEMBER_VISIBLE_STATUSES;

    const requests = await em.find(FeatureRequest, { status: { $in: statuses } }, {
      populate: ['user'],
      orderBy: { createdAt: 'DESC' },
    });

    const myVotes = new Map(
      (await em.find(FeatureRequestVoteEntity, { user: userId })).map(v => [(v.request as any).id ?? v.request, v]),
    );

    const rows = requests.map(r => this.serializeForMember(r, userId, myVotes.get(r.id)));
    if ((filter?.sort ?? 'top') === 'top') {
      rows.sort((a, b) => b.score - a.score || +new Date(b.created_at) - +new Date(a.created_at));
    }
    return rows;
  }

  /** My submissions — includes my private declines + my admin threads. */
  async listMineForMember(userId: string): Promise<any[]> {
    const em = this.em.fork();
    const requests = await em.find(FeatureRequest, { user: userId }, { populate: ['user'], orderBy: { createdAt: 'DESC' } });
    const out = [];
    for (const r of requests) {
      const row = this.serializeForMember(r, userId, undefined);
      row.messages = await this.threadForMember(em, r.id, userId);
      out.push(row);
    }
    return out;
  }

  async detailForMember(requestId: string, userId: string): Promise<any> {
    const em = this.em.fork();
    const request = await em.findOne(FeatureRequest, { id: requestId }, { populate: ['user'] });
    if (!request) throw new NotFoundException('Feature request not found.');
    const isSubmitter = (request.user as any)?.id === userId;
    if (!isSubmitter && (!MEMBER_VISIBLE_STATUSES.includes(request.status) &&
        !(request.status === FeatureRequestStatus.DECLINED && request.declinePublic))) {
      throw new NotFoundException('Feature request not found.');
    }
    const myVote = await em.findOne(FeatureRequestVoteEntity, { request: requestId, user: userId });
    const row = this.serializeForMember(request, userId, myVote ?? undefined);
    row.messages = await this.threadForMember(em, requestId, userId);
    return row;
  }

  private serializeForMember(r: FeatureRequest, viewerId: string, myVote?: FeatureRequestVoteEntity): any {
    const s: any = wrap(r).toObject();
    // Submitter identity is intentionally public (name only).
    s.submitter_name = this.displayName(r.user as any);
    s.submitted_by_me = (r.user as any)?.id === viewerId;
    s.score = (r.upvotes ?? 0) - (r.downvotes ?? 0);
    s.avg_rating = r.avgRating != null ? Number(r.avgRating) : null;
    s.voting_open = r.status === FeatureRequestStatus.GATHERING_INTEREST && r.votingEndsAt > new Date();
    s.days_left = Math.max(0, Math.ceil((r.votingEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
    s.my_vote = myVote ? { vote: myVote.vote, rating: myVote.rating ?? null } : null;
    // A privately-declined request only reaches its own submitter; make sure
    // the row carries no admin-only fields either way.
    delete s.user;
    return s;
  }

  private async threadForMember(em: EntityManager, requestId: string, userId: string): Promise<any[]> {
    const messages = await em.find(FeatureRequestMessage, { request: requestId, memberUser: userId }, { orderBy: { createdAt: 'ASC' } });
    return messages.map(m => ({
      id: m.id,
      author_role: m.authorRole,
      body: m.body,
      created_at: m.createdAt,
    }));
  }

  private displayName(p?: { first_name?: string; last_name?: string; email?: string } | null): string {
    if (!p) return 'MECA Member';
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
    return name || 'MECA Member';
  }

  // ==========================================================================
  // Member: vote
  // ==========================================================================

  async castVote(requestId: string, userId: string, dto: CastFeatureVoteDto): Promise<any> {
    const em = this.em.fork();
    const request = await em.findOne(FeatureRequest, { id: requestId }, { populate: ['user'] });
    if (!request) throw new NotFoundException('Feature request not found.');

    if ((request.user as any)?.id === userId) {
      throw new BadRequestException('You cannot vote on your own idea — your suggestion is your vote!');
    }
    // Voting only while gathering interest and inside the 3-month window —
    // once admins move it forward (or it expires) the score is frozen.
    if (request.status !== FeatureRequestStatus.GATHERING_INTEREST) {
      throw new BadRequestException('Voting has closed for this request.');
    }
    if (request.votingEndsAt <= new Date()) {
      throw new BadRequestException('The voting window for this request has ended.');
    }

    let voteRow = await em.findOne(FeatureRequestVoteEntity, { request: requestId, user: userId });
    if (!voteRow) {
      voteRow = new FeatureRequestVoteEntity();
      voteRow.request = request;
      voteRow.user = em.getReference(Profile, userId);
      em.persist(voteRow);
    }
    voteRow.vote = dto.vote;
    voteRow.rating = dto.vote === FeatureRequestVote.UP ? dto.rating : undefined;
    if (dto.comment !== undefined) voteRow.comment = dto.comment || undefined;
    await em.flush();

    await this.recomputeTallies(em, request);
    return { vote: voteRow.vote, rating: voteRow.rating ?? null, upvotes: request.upvotes, downvotes: request.downvotes, avg_rating: request.avgRating != null ? Number(request.avgRating) : null };
  }

  private async recomputeTallies(em: EntityManager, request: FeatureRequest): Promise<void> {
    const rows: Array<{ vote: string; cnt: string; avg: string | null }> = await em.getConnection().execute(
      `SELECT vote, COUNT(*) AS cnt, AVG(rating) AS avg
         FROM public.feature_request_votes WHERE request_id = ? GROUP BY vote`,
      [request.id],
    );
    const up = rows.find(r => r.vote === 'up');
    const down = rows.find(r => r.vote === 'down');
    request.upvotes = Number(up?.cnt ?? 0);
    request.downvotes = Number(down?.cnt ?? 0);
    request.avgRating = up?.avg != null ? Number(up.avg).toFixed(2) : undefined;
    await em.flush();
  }

  // ==========================================================================
  // Member: turn-based reply in MY thread
  // ==========================================================================

  async memberReply(requestId: string, userId: string, body: string): Promise<any> {
    const em = this.em.fork();
    const request = await em.findOne(FeatureRequest, { id: requestId });
    if (!request) throw new NotFoundException('Feature request not found.');

    // A member may post ONLY when the newest message in their thread is from an
    // admin — they can never open a thread or post twice in a row.
    const last = await em.find(FeatureRequestMessage, { request: requestId, memberUser: userId }, {
      orderBy: { createdAt: 'DESC' }, limit: 1,
    });
    if (last.length === 0 || last[0].authorRole !== 'admin') {
      throw new ForbiddenException('You can reply once the MECA team asks you a question here.');
    }

    const msg = new FeatureRequestMessage();
    msg.request = request;
    msg.memberUser = em.getReference(Profile, userId);
    msg.authorRole = 'member';
    msg.authorId = userId;
    msg.body = body;
    await em.persistAndFlush(msg);
    return { id: msg.id, author_role: 'member', body: msg.body, created_at: msg.createdAt };
  }

  // ==========================================================================
  // Member dashboard payload (top 3, top-5 bars, leaderboard)
  // ==========================================================================

  async dashboard(userId: string): Promise<any> {
    const em = this.em.fork();
    const open = await em.find(FeatureRequest, { status: FeatureRequestStatus.GATHERING_INTEREST }, { populate: ['user'] });
    const scored = open
      .map(r => ({ r, score: (r.upvotes ?? 0) - (r.downvotes ?? 0) }))
      .sort((a, b) => b.score - a.score || +b.r.createdAt - +a.r.createdAt);

    const brief = ({ r, score }: { r: FeatureRequest; score: number }) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      upvotes: r.upvotes,
      downvotes: r.downvotes,
      score,
      avg_rating: r.avgRating != null ? Number(r.avgRating) : null,
      submitter_name: this.displayName(r.user as any),
      days_left: Math.max(0, Math.ceil((r.votingEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))),
    });

    const myVoted = new Set(
      (await em.find(FeatureRequestVoteEntity, { user: userId })).map(v => (v.request as any).id ?? v.request),
    );
    const votableCount = open.filter(r => (r.user as any)?.id !== userId && !myVoted.has(r.id) && r.votingEndsAt > new Date()).length;

    return {
      top3: scored.slice(0, 3).map(brief),
      top5: scored.slice(0, 5).map(brief),
      votableCount,
      leaderboard: await this.leaderboard(em),
    };
  }

  /** Fun emoji leaderboard: 💡 most submitted, ✅ most approved, 🚀 most shipped. */
  private async leaderboard(em: EntityManager): Promise<any> {
    const rows: Array<{ user_id: string; first_name: string | null; last_name: string | null; meca_id: string | null; submitted: string; approved: string; implemented: string }> =
      await em.getConnection().execute(`
        SELECT fr.user_id, p.first_name, p.last_name, p.meca_id,
               COUNT(*) AS submitted,
               COUNT(*) FILTER (WHERE fr.status IN ('approved', 'implemented')) AS approved,
               COUNT(*) FILTER (WHERE fr.status = 'implemented') AS implemented
          FROM public.feature_requests fr
          JOIN public.profiles p ON p.id = fr.user_id
         GROUP BY fr.user_id, p.first_name, p.last_name, p.meca_id
      `);
    const named = rows.map(r => ({
      name: [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || 'MECA Member',
      mecaId: r.meca_id,
      submitted: Number(r.submitted),
      approved: Number(r.approved),
      implemented: Number(r.implemented),
    }));
    const top = (key: 'submitted' | 'approved' | 'implemented') => {
      const best = [...named].sort((a, b) => b[key] - a[key])[0];
      return best && best[key] > 0 ? { name: best.name, mecaId: best.mecaId, count: best[key] } : null;
    };
    return { ideaMachine: top('submitted'), mostApproved: top('approved'), shippedIt: top('implemented') };
  }

  // ==========================================================================
  // Admin
  // ==========================================================================

  /** Admin list: everything — identities, comments, threshold progress. */
  async listForAdmin(filter?: { status?: FeatureRequestStatus }): Promise<any[]> {
    const em = this.em.fork();
    const where = filter?.status ? { status: filter.status } : {};
    const requests = await em.find(FeatureRequest, where as any, { populate: ['user'], orderBy: { createdAt: 'DESC' } });
    const activeMembers = await this.activeMemberCount(em);
    const out = [];
    for (const r of requests) {
      const votes = await em.find(FeatureRequestVoteEntity, { request: r.id }, { populate: ['user'] });
      const messages = await em.find(FeatureRequestMessage, { request: r.id }, { populate: ['memberUser'], orderBy: { createdAt: 'ASC' } });
      const thresholdPct = Number(r.thresholdPct);
      const needed = Math.max(1, Math.ceil((thresholdPct / 100) * activeMembers));
      out.push({
        ...wrap(r).toObject(),
        submitter: this.adminIdentity(r.user as any),
        threshold_pct: thresholdPct,
        threshold_needed: needed,
        threshold_met: (r.upvotes ?? 0) >= needed,
        active_member_count: activeMembers,
        votes: votes.map(v => ({
          user: this.adminIdentity(v.user as any),
          vote: v.vote,
          rating: v.rating ?? null,
          comment: v.comment ?? null,
          updated_at: v.updatedAt,
        })),
        messages: messages.map(m => ({
          id: m.id,
          member: this.adminIdentity(m.memberUser as any),
          author_role: m.authorRole,
          body: m.body,
          created_at: m.createdAt,
        })),
      });
    }
    return out;
  }

  private adminIdentity(p?: { id?: string; first_name?: string; last_name?: string; email?: string; meca_id?: string } | null): any {
    if (!p) return null;
    return { id: p.id, name: this.displayName(p), email: p.email ?? null, mecaId: p.meca_id ?? null };
  }

  private async activeMemberCount(em: EntityManager): Promise<number> {
    const rows: Array<{ cnt: string }> = await em.getConnection().execute(
      `SELECT COUNT(*) AS cnt FROM public.profiles WHERE membership_status = 'active'`,
    );
    return Math.max(1, Number(rows[0]?.cnt ?? 1));
  }

  async updateStatus(
    requestId: string,
    adminId: string,
    dto: { status: FeatureRequestStatus; plannedRelease?: string | null; publicNote?: string | null; declinePublic?: boolean },
  ): Promise<FeatureRequest> {
    const em = this.em.fork();
    const request = await em.findOne(FeatureRequest, { id: requestId }, { populate: ['user'] });
    if (!request) throw new NotFoundException('Feature request not found.');

    request.status = dto.status;
    if (dto.plannedRelease !== undefined) request.plannedRelease = dto.plannedRelease ?? undefined;
    if (dto.publicNote !== undefined) request.adminNotePublic = dto.publicNote ?? undefined;
    request.declinePublic = dto.status === FeatureRequestStatus.DECLINED ? dto.declinePublic === true : false;
    request.statusChangedAt = new Date();
    request.statusChangedBy = adminId;
    await em.flush();

    const memberId = (request.user as any)?.id;
    if (memberId) {
      const labels: Record<string, string> = {
        [FeatureRequestStatus.INVESTIGATING]: `Great news — "${request.title}" is now being investigated by the MECA team! 🔍`,
        [FeatureRequestStatus.APPROVED]: `Your idea "${request.title}" has been APPROVED! 🎉${request.plannedRelease ? ` Planned: ${request.plannedRelease}` : ''}`,
        [FeatureRequestStatus.IMPLEMENTED]: `Your idea "${request.title}" is now LIVE on the system! 🚀`,
        [FeatureRequestStatus.DECLINED]: `Your idea "${request.title}" was reviewed but won't be moving forward.${request.adminNotePublic ? ` Note: ${request.adminNotePublic}` : ''}`,
        [FeatureRequestStatus.EXPIRED]: `Your idea "${request.title}" didn't gather enough interest and has been closed out. You can revise and resubmit it!`,
      };
      const message = labels[dto.status];
      if (message) {
        await this.notificationsService.createForUser({
          userId: memberId,
          title: 'Feature request update',
          message,
          type: 'info',
          link: '/dashboard?tab=features',
        }).catch(err => this.logger.warn(`Feature status notification failed: ${err}`));
      }
    }
    return request;
  }

  async updateThreshold(requestId: string, thresholdPct: number): Promise<FeatureRequest> {
    const em = this.em.fork();
    const request = await em.findOne(FeatureRequest, { id: requestId });
    if (!request) throw new NotFoundException('Feature request not found.');
    request.thresholdPct = String(thresholdPct);
    await em.flush();
    return request;
  }

  /** Admin message → unlocks a reply from that member. */
  async adminMessage(requestId: string, adminId: string, memberUserId: string, body: string): Promise<any> {
    const em = this.em.fork();
    const request = await em.findOne(FeatureRequest, { id: requestId }, { populate: ['user'] });
    if (!request) throw new NotFoundException('Feature request not found.');

    // The recipient must be a participant: the submitter or a voter.
    const isSubmitter = (request.user as any)?.id === memberUserId;
    const isVoter = !isSubmitter && !!(await em.findOne(FeatureRequestVoteEntity, { request: requestId, user: memberUserId }));
    if (!isSubmitter && !isVoter) {
      throw new BadRequestException('That member has not participated in this request.');
    }

    const msg = new FeatureRequestMessage();
    msg.request = request;
    msg.memberUser = em.getReference(Profile, memberUserId);
    msg.authorRole = 'admin';
    msg.authorId = adminId;
    msg.body = body;
    await em.persistAndFlush(msg);

    await this.notificationsService.createForUser({
      userId: memberUserId,
      title: 'The MECA team replied on a feature request',
      message: `On "${request.title}": ${body.slice(0, 120)}${body.length > 120 ? '…' : ''}`,
      type: 'info',
      link: '/dashboard?tab=features',
    }).catch(err => this.logger.warn(`Feature message notification failed: ${err}`));

    return { id: msg.id, author_role: 'admin', body: msg.body, created_at: msg.createdAt };
  }

  // ==========================================================================
  // Admin: convert a support ticket into a feature request
  // ==========================================================================

  /**
   * Convert a support ticket into a feature request on the member's behalf.
   * - Ticket must belong to an ACTIVE member (guests/expired can't convert).
   * - One conversion per ticket, ever.
   * - Thin description (< minimum) → NEEDS_DETAILS draft: not on the board,
   *   member gets ONE edit within the configurable deadline (default 72h).
   * - The ticket gets a final reply and is HARD-CLOSED — the member can never
   *   reopen it (the Feature Ideas board is where the idea lives now).
   */
  async convertFromTicket(adminId: string, dto: ConvertTicketToFeatureDto): Promise<{ request: FeatureRequest; needsDetails: boolean }> {
    const em = this.em.fork();

    const ticket = await em.findOne(Ticket, { id: dto.ticketId }, { populate: ['reporter'] });
    if (!ticket) throw new NotFoundException('Support ticket not found.');
    if (ticket.convertedFeatureRequestId) {
      throw new BadRequestException('This ticket has already been converted into a feature request.');
    }
    const member = ticket.reporter;
    if (!member?.id) {
      throw new BadRequestException('Only tickets from a member account can be converted — link the ticket to a member profile first.');
    }
    if (member.membership_status !== 'active') {
      throw new BadRequestException('Only tickets from ACTIVE members can be converted into feature requests.');
    }

    // 3-open cap: warn-level for conversions — the admin can override.
    const openCount = await em.count(FeatureRequest, { user: member.id, status: { $in: OPEN_STATUSES } });
    if (openCount >= FEATURE_REQUEST_MAX_OPEN_PER_MEMBER && !dto.overrideCap) {
      throw new BadRequestException(
        `CAP:This member already has ${openCount} open feature requests. Convert anyway?`,
      );
    }

    const needsDetails = dto.description.trim().length < FEATURE_REQUEST_DESCRIPTION_MIN;
    const deadlineDays = await this.detailsDeadlineDays(em);

    const request = new FeatureRequest();
    request.user = em.getReference(Profile, member.id);
    request.title = dto.title;
    request.description = dto.description;
    request.category = dto.category;
    request.sourceTicketId = ticket.id;
    request.thresholdPct = String(await this.defaultThresholdPct(em));
    if (needsDetails) {
      request.status = FeatureRequestStatus.NEEDS_DETAILS;
      request.detailsDeadlineAt = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000);
      // Placeholder — the real 3-month window starts when the member completes
      // the draft (completeDraft resets it).
      request.votingEndsAt = new Date(Date.now() + FEATURE_REQUEST_VOTING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    } else {
      request.votingEndsAt = new Date(Date.now() + FEATURE_REQUEST_VOTING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    }
    em.persist(request);

    // Ticket side: final reply + HARD close + conversion marker.
    em.create(TicketComment, {
      ticket: Reference.createFromPK(Ticket, ticket.id),
      author: Reference.createFromPK(Profile, adminId),
      content:
        `Great news — we've turned this suggestion into a Feature Request so other members can vote on it! ` +
        `You can follow it under Feature Ideas in your MECA dashboard.` +
        (needsDetails
          ? ` One thing first: your idea needs a little more detail before it goes live — check your dashboard (and email) for instructions. You have ${deadlineDays} day${deadlineDays === 1 ? '' : 's'} to complete it.`
          : '') +
        ` This ticket is now closed. For future feature ideas, please use the Feature Ideas section in your MECA dashboard instead of a support ticket.`,
      contentFormat: 'text',
      isInternal: false,
    } as any);
    ticket.status = TicketStatus.CLOSED;
    if (!ticket.closedAt) ticket.closedAt = new Date();
    ticket.convertedFeatureRequestId = request.id;
    await em.flush();

    // Notifications: bell + branded email, with the needs-details variant
    // spelling out the one-time edit and the deadline.
    const frontendUrl = (process.env.FRONTEND_URL || 'https://www.mecacaraudio.com').replace(/\/+$/, '');
    const featureLink = `${frontendUrl}/dashboard?tab=features`;
    const firstName = member.first_name || undefined;
    const deadlineText = request.detailsDeadlineAt
      ? request.detailsDeadlineAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : '';

    await this.notificationsService.createForUser({
      userId: member.id,
      title: needsDetails ? 'Your idea needs a few more details' : 'Your suggestion is now a Feature Idea!',
      message: needsDetails
        ? `We turned your support ticket "${ticket.ticketNumber}" into a feature request, but it needs more detail before members can vote. Complete it by ${deadlineText} — you get one revision.`
        : `We turned your support ticket "${ticket.ticketNumber}" into the feature idea "${request.title}" — members can now vote on it!`,
      type: 'info',
      link: '/dashboard?tab=features',
    }).catch(err => this.logger.warn(`Conversion notification failed: ${err}`));

    if (member.email) {
      const bodyCore = needsDetails
        ? `<p style="margin:0 0 16px 0;">Hi${firstName ? ` ${firstName}` : ''},</p>
           <p style="margin:0 0 16px 0;">Good news — the MECA team liked the suggestion in your support ticket <strong>${ticket.ticketNumber}</strong> and turned it into a feature request: <strong>${this.escapeHtml(request.title)}</strong>.</p>
           <p style="margin:0 0 16px 0;"><strong>Before it can go live for members to vote on, it needs more detail.</strong> Head to the <a href="${featureLink}">Feature Ideas section of your MECA dashboard</a> and complete your idea — explain what it is, how you'd use it, and why other members would benefit. You get <strong>one revision</strong>, and it must be completed by <strong>${deadlineText}</strong> or the request will be closed.</p>
           <p style="margin:0 0 16px 0;">Going forward, please submit feature ideas directly in the Feature Ideas section of your dashboard rather than through a support ticket — it puts your idea in front of the whole community right away.</p>`
        : `<p style="margin:0 0 16px 0;">Hi${firstName ? ` ${firstName}` : ''},</p>
           <p style="margin:0 0 16px 0;">Good news — the MECA team turned the suggestion in your support ticket <strong>${ticket.ticketNumber}</strong> into a live feature request: <strong>${this.escapeHtml(request.title)}</strong>. Members can now vote on it, and you'll be credited as the submitter!</p>
           <p style="margin:0 0 16px 0;">Follow its progress (and rally votes!) in the <a href="${featureLink}">Feature Ideas section of your MECA dashboard</a>.</p>
           <p style="margin:0 0 16px 0;">Going forward, please submit feature ideas directly in the Feature Ideas section of your dashboard rather than through a support ticket — it puts your idea in front of the whole community right away.</p>`;
      await this.emailService.sendEmail({
        to: member.email,
        subject: needsDetails
          ? `Action needed: complete your feature idea by ${deadlineText}`
          : `Your suggestion is now a MECA Feature Idea!`,
        from: 'noreply@mecacaraudio.com',
        html: this.emailService.buildBrandedHtml(
          needsDetails ? 'Your Idea Needs More Details' : 'Your Idea Is Live!',
          bodyCore,
          { preheader: needsDetails ? 'Complete your feature idea so members can vote on it' : 'Members can now vote on your feature idea' },
        ),
        text: needsDetails
          ? `We turned your support ticket ${ticket.ticketNumber} into a feature request, but it needs more detail before it can go live. Complete it (one revision) by ${deadlineText} in the Feature Ideas section of your MECA dashboard: ${featureLink}`
          : `We turned your support ticket ${ticket.ticketNumber} into the feature idea "${request.title}" — members can now vote on it! ${featureLink}`,
      }).catch(err => this.logger.warn(`Conversion email failed: ${err}`));
    }

    this.logger.log(`Ticket ${ticket.ticketNumber} converted to feature request ${request.id} by admin ${adminId}${needsDetails ? ' (needs details)' : ''}`);
    return { request, needsDetails };
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Member: ONE-TIME completion of a NEEDS_DETAILS draft. Full minimums apply;
   * a successful completion takes the idea live with a fresh 3-month window.
   */
  async completeDraft(requestId: string, userId: string, dto: CreateFeatureRequestDto): Promise<FeatureRequest> {
    const em = this.em.fork();
    const request = await em.findOne(FeatureRequest, { id: requestId }, { populate: ['user'] });
    if (!request) throw new NotFoundException('Feature request not found.');
    if ((request.user as any)?.id !== userId) {
      throw new ForbiddenException('You can only complete your own feature request.');
    }
    if (request.status !== FeatureRequestStatus.NEEDS_DETAILS) {
      throw new BadRequestException('This request is not waiting on additional details.');
    }
    if (request.revisionUsed) {
      throw new BadRequestException('This request has already used its one revision.');
    }
    if (request.detailsDeadlineAt && request.detailsDeadlineAt <= new Date()) {
      throw new BadRequestException('The deadline to complete this request has passed. Please submit a new feature request from your dashboard.');
    }

    request.title = dto.title;
    request.description = dto.description;
    request.category = dto.category;
    request.revisionUsed = true;
    request.detailsDeadlineAt = undefined;
    request.status = FeatureRequestStatus.GATHERING_INTEREST;
    // The community's 3-month voting window starts NOW, at go-live.
    request.votingEndsAt = new Date(Date.now() + FEATURE_REQUEST_VOTING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    await em.flush();

    await this.notificationsService.createForUser({
      userId,
      title: 'Your feature idea is live!',
      message: `"${request.title}" is now on the Feature Ideas board — members have 3 months to vote on it. 🗳️`,
      type: 'info',
      link: '/dashboard?tab=features',
    }).catch(err => this.logger.warn(`Draft completion notification failed: ${err}`));

    this.logger.log(`Feature request ${request.id} draft completed by member ${userId} — now live`);
    return request;
  }

  // ==========================================================================
  // Details-deadline setting (admin-editable on /admin/feature-requests)
  // ==========================================================================

  async detailsDeadlineDays(em?: EntityManager): Promise<number> {
    const e = em ?? this.em.fork();
    const row = await e.findOne(SiteSettings, { setting_key: FEATURE_REQUEST_DETAILS_DEADLINE_SETTING });
    const n = Number(row?.setting_value);
    return Number.isFinite(n) && n >= 1 && n <= 60 ? n : FEATURE_REQUEST_DETAILS_DEADLINE_DEFAULT_DAYS;
  }

  async setDetailsDeadlineDays(days: number, adminId: string): Promise<number> {
    if (!Number.isInteger(days) || days < 1 || days > 60) {
      throw new BadRequestException('The completion deadline must be a whole number of days between 1 and 60.');
    }
    const em = this.em.fork();
    // site_settings has NO unique constraint — find-then-update-or-insert.
    const existing = await em.findOne(SiteSettings, { setting_key: FEATURE_REQUEST_DETAILS_DEADLINE_SETTING });
    if (existing) {
      existing.setting_value = String(days);
      existing.updated_by = adminId;
      existing.updated_at = new Date();
    } else {
      em.persist(em.create(SiteSettings, {
        setting_key: FEATURE_REQUEST_DETAILS_DEADLINE_SETTING,
        setting_value: String(days),
        setting_type: 'number',
        description: 'Days a member has to complete a needs-details feature request (ticket conversions).',
        updated_by: adminId,
        updated_at: new Date(),
      }));
    }
    await em.flush();
    return days;
  }

  // ==========================================================================
  // Nightly expiry — closes out requests whose 3-month window lapsed below the
  // interest threshold. Requests AT/above threshold stay open for the admins.
  // ==========================================================================

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async expireLapsedRequests(): Promise<{ expired: number; thresholdMet: number; draftsExpired: number }> {
    const draftsExpired = await this.expireLapsedDrafts();
    const em = this.em.fork();
    const now = new Date();
    const lapsed = await em.find(FeatureRequest, {
      status: FeatureRequestStatus.GATHERING_INTEREST,
      votingEndsAt: { $lt: now },
    }, { populate: ['user'] });
    if (lapsed.length === 0) return { expired: 0, thresholdMet: 0, draftsExpired };

    const activeMembers = await this.activeMemberCount(em);
    let expired = 0;
    let thresholdMet = 0;
    for (const r of lapsed) {
      const needed = Math.max(1, Math.ceil((Number(r.thresholdPct) / 100) * activeMembers));
      if ((r.upvotes ?? 0) >= needed) {
        thresholdMet++; // stays open — flagged in the admin list via threshold_met
        continue;
      }
      r.status = FeatureRequestStatus.EXPIRED;
      r.statusChangedAt = now;
      expired++;
      const memberId = (r.user as any)?.id;
      if (memberId) {
        await this.notificationsService.createForUser({
          userId: memberId,
          title: 'Feature request closed',
          message: `"${r.title}" didn't gather enough interest during its voting window and has been closed out. You can revise and resubmit it!`,
          type: 'info',
          link: '/dashboard?tab=features',
        }).catch(err => this.logger.warn(`Feature expiry notification failed: ${err}`));
      }
    }
    await em.flush();
    this.logger.log(`Feature request expiry: ${expired} expired, ${thresholdMet} past window but at/above threshold (left open)`);
    return { expired, thresholdMet, draftsExpired };
  }

  /**
   * Close NEEDS_DETAILS drafts whose completion deadline passed without the
   * member finishing them. Bell + EMAIL, both steering the member to submit a
   * fresh idea from the dashboard (NOT a support ticket).
   */
  private async expireLapsedDrafts(): Promise<number> {
    const em = this.em.fork();
    const now = new Date();
    const drafts = await em.find(FeatureRequest, {
      status: FeatureRequestStatus.NEEDS_DETAILS,
      detailsDeadlineAt: { $lt: now },
    }, { populate: ['user'] });
    if (drafts.length === 0) return 0;

    const frontendUrl = (process.env.FRONTEND_URL || 'https://www.mecacaraudio.com').replace(/\/+$/, '');
    const featureLink = `${frontendUrl}/dashboard?tab=features`;

    for (const r of drafts) {
      r.status = FeatureRequestStatus.EXPIRED;
      r.statusChangedAt = now;
      const member = r.user as any;
      if (!member?.id) continue;

      await this.notificationsService.createForUser({
        userId: member.id,
        title: 'Feature request closed — deadline missed',
        message: `The deadline to complete "${r.title}" has passed and the request has been closed. You can enter a new feature request any time from the Feature Ideas section of your MECA dashboard.`,
        type: 'info',
        link: '/dashboard?tab=features',
      }).catch(err => this.logger.warn(`Draft expiry notification failed: ${err}`));

      if (member.email) {
        await this.emailService.sendEmail({
          to: member.email,
          subject: 'Your feature request was closed — deadline not met',
          from: 'noreply@mecacaraudio.com',
          html: this.emailService.buildBrandedHtml(
            'Feature Request Closed',
            `<p style="margin:0 0 16px 0;">Hi${member.first_name ? ` ${member.first_name}` : ''},</p>
             <p style="margin:0 0 16px 0;">The deadline to add details to your feature request <strong>${this.escapeHtml(r.title)}</strong> has passed, so the request has been closed.</p>
             <p style="margin:0 0 16px 0;">Still want to see it happen? You can enter a new feature request any time from the <a href="${featureLink}">Feature Ideas section of your MECA dashboard</a> — that's the best place for all feature suggestions, and it puts your idea straight in front of the community to vote on.</p>`,
            { preheader: 'The deadline to complete your feature idea has passed' },
          ),
          text: `The deadline to complete your feature request "${r.title}" has passed and it has been closed. You can enter a new feature request any time from the Feature Ideas section of your MECA dashboard: ${featureLink}`,
        }).catch(err => this.logger.warn(`Draft expiry email failed: ${err}`));
      }
    }
    await em.flush();
    this.logger.log(`Feature request draft expiry: ${drafts.length} needs-details draft(s) closed (deadline missed)`);
    return drafts.length;
  }
}
