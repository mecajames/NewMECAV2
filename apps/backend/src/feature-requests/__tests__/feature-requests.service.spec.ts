import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FeatureRequestStatus, FeatureRequestVote, FeatureRequestCategory } from '@newmeca/shared';
import { FeatureRequestsService } from '../feature-requests.service';
import { FeatureRequest, FeatureRequestVoteEntity, FeatureRequestMessage } from '../feature-requests.entity';

const CAT = FeatureRequestCategory.WEBSITE;

/**
 * Behavior tests for the feature-request business rules James specified:
 *   - max 3 OPEN requests per member
 *   - members cannot vote on their own idea
 *   - voting only while gathering_interest AND inside the 3-month window
 *   - turn-based admin↔member thread: member can only reply after an admin message
 *   - nightly expiry: below-threshold requests expire, at/above stay open
 */
describe('FeatureRequestsService — business rules', () => {
  let svc: FeatureRequestsService;
  let em: any;
  let conn: any;
  let notifications: { createForUser: jest.Mock };
  let email: { sendEmail: jest.Mock; buildBrandedHtml: jest.Mock };

  const OTHER_USER = 'user-2';
  const SUBMITTER = 'user-1';

  function makeRequest(overrides: Partial<FeatureRequest> = {}): any {
    return {
      id: 'fr-1',
      user: { id: SUBMITTER },
      title: 'Dark mode',
      description: 'x'.repeat(250),
      status: FeatureRequestStatus.GATHERING_INTEREST,
      votingEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      thresholdPct: '10',
      upvotes: 0,
      downvotes: 0,
      ...overrides,
    };
  }

  beforeEach(() => {
    conn = { execute: jest.fn().mockResolvedValue([]) };
    em = {
      fork: () => em,
      getConnection: () => conn,
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      persist: jest.fn(),
      create: jest.fn((_entity: any, data: any) => data),
      persistAndFlush: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn().mockResolvedValue(undefined),
      getReference: jest.fn((_e: any, id: string) => ({ id })),
    };
    notifications = { createForUser: jest.fn().mockResolvedValue(undefined) };
    email = {
      sendEmail: jest.fn().mockResolvedValue({ success: true }),
      buildBrandedHtml: jest.fn().mockReturnValue('<html/>'),
    };
    svc = new FeatureRequestsService(em, notifications as any, email as any);
  });

  // ------------------------------------------------------------------ submit

  it('submit blocks a member with 3 open requests', async () => {
    em.count.mockResolvedValue(3);
    await expect(
      svc.submit(SUBMITTER, { title: 'Another idea', description: 'x'.repeat(250), category: CAT }),
    ).rejects.toThrow(BadRequestException);
    expect(em.persistAndFlush).not.toHaveBeenCalled();
  });

  it('submit stamps a ~3-month voting window and the default threshold', async () => {
    em.count.mockResolvedValue(0);
    const req = await svc.submit(SUBMITTER, { title: 'Idea', description: 'x'.repeat(250), category: CAT });
    const days = (req.votingEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(89);
    expect(days).toBeLessThan(95);
    expect(Number(req.thresholdPct)).toBe(10);
  });

  it('resubmit only works on an EXPIRED request the member owns', async () => {
    em.count.mockResolvedValue(0);
    em.findOne.mockResolvedValueOnce(makeRequest({ status: FeatureRequestStatus.GATHERING_INTEREST }));
    await expect(
      svc.submit(SUBMITTER, { title: 'Idea v2', description: 'x'.repeat(250), category: CAT }, 'fr-1'),
    ).rejects.toThrow(/expired/i);
  });

  // ------------------------------------------------------------------ voting

  it('blocks voting on your own idea', async () => {
    em.findOne.mockResolvedValueOnce(makeRequest());
    await expect(
      svc.castVote('fr-1', SUBMITTER, { vote: FeatureRequestVote.UP, rating: 8 }),
    ).rejects.toThrow(/your own idea/i);
  });

  it('blocks voting once the request left gathering_interest (score frozen)', async () => {
    em.findOne.mockResolvedValueOnce(makeRequest({ status: FeatureRequestStatus.INVESTIGATING }));
    await expect(
      svc.castVote('fr-1', OTHER_USER, { vote: FeatureRequestVote.UP, rating: 8 }),
    ).rejects.toThrow(/closed/i);
  });

  it('blocks voting after the 3-month window ends', async () => {
    em.findOne.mockResolvedValueOnce(makeRequest({ votingEndsAt: new Date(Date.now() - 1000) }));
    await expect(
      svc.castVote('fr-1', OTHER_USER, { vote: FeatureRequestVote.DOWN }),
    ).rejects.toThrow(/window/i);
  });

  it('a thumbs-up stores the 1–10 rating; switching to thumbs-down clears it', async () => {
    const request = makeRequest();
    conn.execute.mockResolvedValue([{ vote: 'up', cnt: '1', avg: '8' }]);
    em.findOne
      .mockResolvedValueOnce(request) // request lookup
      .mockResolvedValueOnce(null); // no existing vote
    const first = await svc.castVote('fr-1', OTHER_USER, { vote: FeatureRequestVote.UP, rating: 8 });
    expect(first.vote).toBe('up');
    expect(first.rating).toBe(8);

    const existingVote: any = { vote: FeatureRequestVote.UP, rating: 8 };
    conn.execute.mockResolvedValue([{ vote: 'down', cnt: '1', avg: null }]);
    em.findOne
      .mockResolvedValueOnce(request)
      .mockResolvedValueOnce(existingVote);
    const second = await svc.castVote('fr-1', OTHER_USER, { vote: FeatureRequestVote.DOWN });
    expect(second.vote).toBe('down');
    expect(second.rating).toBeNull();
    expect(existingVote.rating).toBeUndefined();
  });

  // ------------------------------------------------------------- thread rules

  it('member cannot open a thread — reply requires a prior admin message', async () => {
    em.findOne.mockResolvedValueOnce(makeRequest());
    em.find.mockResolvedValueOnce([]); // no messages in thread
    await expect(svc.memberReply('fr-1', SUBMITTER, 'hello?')).rejects.toThrow(ForbiddenException);
  });

  it('member cannot post twice in a row', async () => {
    em.findOne.mockResolvedValueOnce(makeRequest());
    em.find.mockResolvedValueOnce([{ authorRole: 'member' }]); // last message is theirs
    await expect(svc.memberReply('fr-1', SUBMITTER, 'and another thing')).rejects.toThrow(ForbiddenException);
  });

  it('member CAN reply when the newest message is from an admin', async () => {
    em.findOne.mockResolvedValueOnce(makeRequest());
    em.find.mockResolvedValueOnce([{ authorRole: 'admin' }]);
    const msg = await svc.memberReply('fr-1', SUBMITTER, 'Here are more details.');
    expect(msg.author_role).toBe('member');
    expect(em.persistAndFlush).toHaveBeenCalled();
  });

  it('admin can only message a participant (submitter or a voter)', async () => {
    em.findOne
      .mockResolvedValueOnce(makeRequest()) // request
      .mockResolvedValueOnce(null); // not a voter
    await expect(
      svc.adminMessage('fr-1', 'admin-1', 'random-user', 'Tell me more'),
    ).rejects.toThrow(/has not participated/i);
  });

  // ----------------------------------------------------------------- expiry

  it('expiry closes below-threshold requests and leaves threshold-met ones open', async () => {
    // 100 active members @ 10% → 10 thumbs-ups needed.
    conn.execute.mockResolvedValue([{ cnt: '100' }]);
    const below = makeRequest({ id: 'fr-low', upvotes: 4, votingEndsAt: new Date(Date.now() - 1000) });
    const met = makeRequest({ id: 'fr-hot', upvotes: 12, votingEndsAt: new Date(Date.now() - 1000) });
    em.find
      .mockResolvedValueOnce([]) // needs-details draft sweep runs first — none
      .mockResolvedValueOnce([below, met]);

    const result = await svc.expireLapsedRequests();

    expect(result).toEqual({ expired: 1, thresholdMet: 1, draftsExpired: 0 });
    expect(below.status).toBe(FeatureRequestStatus.EXPIRED);
    expect(met.status).toBe(FeatureRequestStatus.GATHERING_INTEREST);
    // The closed-out member is told they can revise and resubmit.
    expect(notifications.createForUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: SUBMITTER, message: expect.stringMatching(/revise and resubmit/i) }),
    );
  });

  // -------------------------------------------------- ticket conversion rules

  function makeTicket(overrides: any = {}): any {
    return {
      id: 'tk-1',
      ticketNumber: 'T-1001',
      title: 'Please add dark mode',
      description: 'It would be nice',
      status: 'open',
      reporter: { id: SUBMITTER, email: 'member@test.com', first_name: 'Brady', membership_status: 'active' },
      ...overrides,
    };
  }

  it('conversion rejects tickets from non-active members', async () => {
    em.findOne.mockResolvedValueOnce(makeTicket({ reporter: { id: SUBMITTER, membership_status: 'expired' } }));
    await expect(
      svc.convertFromTicket('admin-1', { ticketId: 'tk-1', title: 'Dark mode', description: 'short', category: CAT }),
    ).rejects.toThrow(/ACTIVE members/i);
  });

  it('conversion rejects guest tickets (no reporter)', async () => {
    em.findOne.mockResolvedValueOnce(makeTicket({ reporter: undefined }));
    await expect(
      svc.convertFromTicket('admin-1', { ticketId: 'tk-1', title: 'Dark mode', description: 'short', category: CAT }),
    ).rejects.toThrow(/member account/i);
  });

  it('conversion rejects an already-converted ticket', async () => {
    em.findOne.mockResolvedValueOnce(makeTicket({ convertedFeatureRequestId: 'fr-9' }));
    await expect(
      svc.convertFromTicket('admin-1', { ticketId: 'tk-1', title: 'Dark mode', description: 'short', category: CAT }),
    ).rejects.toThrow(/already been converted/i);
  });

  it('cap warns for conversions and can be overridden', async () => {
    em.findOne.mockResolvedValue(makeTicket());
    em.count.mockResolvedValue(3);
    await expect(
      svc.convertFromTicket('admin-1', { ticketId: 'tk-1', title: 'Dark mode', description: 'x'.repeat(250), category: CAT }),
    ).rejects.toThrow(/^CAP:/);

    em.findOne.mockResolvedValue(makeTicket());
    const { needsDetails } = await svc.convertFromTicket('admin-1', {
      ticketId: 'tk-1', title: 'Dark mode', description: 'x'.repeat(250), category: CAT, overrideCap: true,
    });
    expect(needsDetails).toBe(false);
  });

  it('thin description → NEEDS_DETAILS draft with a 72h-default deadline + hard-closed ticket + email', async () => {
    const ticket = makeTicket();
    em.findOne.mockResolvedValue(ticket);
    em.count.mockResolvedValue(0);

    const { request, needsDetails } = await svc.convertFromTicket('admin-1', {
      ticketId: 'tk-1', title: 'Dark mode', description: 'It would be nice', category: CAT,
    });

    expect(needsDetails).toBe(true);
    expect(request.status).toBe(FeatureRequestStatus.NEEDS_DETAILS);
    const hours = (request.detailsDeadlineAt!.getTime() - Date.now()) / (60 * 60 * 1000);
    expect(hours).toBeGreaterThan(70);
    expect(hours).toBeLessThan(74);
    // Ticket is HARD-closed and marked converted (reopen gate keys off this).
    expect(ticket.status).toBe('closed');
    expect(ticket.convertedFeatureRequestId).toBe(request.id);
    // Bell + email both fire, and the email explains the deadline.
    expect(notifications.createForUser).toHaveBeenCalled();
    expect(email.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'member@test.com' }));
  });

  it('adequate description converts straight to a LIVE request', async () => {
    em.findOne.mockResolvedValue(makeTicket());
    em.count.mockResolvedValue(0);
    const { request, needsDetails } = await svc.convertFromTicket('admin-1', {
      ticketId: 'tk-1', title: 'Dark mode', description: 'x'.repeat(250), category: CAT,
    });
    expect(needsDetails).toBe(false);
    expect(request.status).toBe(FeatureRequestStatus.GATHERING_INTEREST);
    expect(request.sourceTicketId).toBe('tk-1');
  });

  // --------------------------------------------------- draft completion rules

  function makeDraft(overrides: any = {}): any {
    return makeRequest({
      status: FeatureRequestStatus.NEEDS_DETAILS,
      revisionUsed: false,
      detailsDeadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      user: { id: SUBMITTER, email: 'member@test.com', first_name: 'Brady' },
      ...overrides,
    });
  }

  it('completeDraft takes the idea live with a fresh 3-month window', async () => {
    const draft = makeDraft();
    em.findOne.mockResolvedValueOnce(draft);
    const done = await svc.completeDraft('fr-1', SUBMITTER, { title: 'Dark mode', description: 'x'.repeat(250), category: CAT });
    expect(done.status).toBe(FeatureRequestStatus.GATHERING_INTEREST);
    expect(done.revisionUsed).toBe(true);
    const days = (done.votingEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(89);
  });

  it('completeDraft is ONE-TIME and deadline-bound, and owner-only', async () => {
    em.findOne.mockResolvedValueOnce(makeDraft({ revisionUsed: true }));
    await expect(
      svc.completeDraft('fr-1', SUBMITTER, { title: 'T'.repeat(6), description: 'x'.repeat(250), category: CAT }),
    ).rejects.toThrow(/one revision/i);

    em.findOne.mockResolvedValueOnce(makeDraft({ detailsDeadlineAt: new Date(Date.now() - 1000) }));
    await expect(
      svc.completeDraft('fr-1', SUBMITTER, { title: 'T'.repeat(6), description: 'x'.repeat(250), category: CAT }),
    ).rejects.toThrow(/deadline/i);

    em.findOne.mockResolvedValueOnce(makeDraft());
    await expect(
      svc.completeDraft('fr-1', OTHER_USER, { title: 'T'.repeat(6), description: 'x'.repeat(250), category: CAT }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('expired drafts get EMAIL + bell pointing the member to the dashboard', async () => {
    conn.execute.mockResolvedValue([{ cnt: '100' }]);
    const stale = makeDraft({ detailsDeadlineAt: new Date(Date.now() - 1000) });
    em.find
      .mockResolvedValueOnce([stale]) // drafts sweep
      .mockResolvedValueOnce([]); // voting-window sweep
    const result = await svc.expireLapsedRequests();
    expect(result.draftsExpired).toBe(1);
    expect(stale.status).toBe(FeatureRequestStatus.EXPIRED);
    expect(notifications.createForUser).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/MECA dashboard/i) }),
    );
    expect(email.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringMatching(/deadline not met/i) }),
    );
  });
});
