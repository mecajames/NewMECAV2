import { MecaIdService } from '../meca-id.service';
import { Membership } from '../memberships.entity';

/**
 * Pure-logic tests for MecaIdService — exercises tiered grace + A1 date
 * math without spinning up a DB. Constructor receives a tiny stub EM
 * since the helpers under test don't touch it.
 */
describe('MecaIdService — tiered grace + A1 date math', () => {
  let svc: MecaIdService;

  beforeEach(() => {
    svc = new MecaIdService({} as any);
  });

  // Build a paid Membership-shaped object with the fields the helpers read.
  function makeMembership(endDate: Date | null, mecaId: number | null = 700123): Membership {
    return {
      id: 'm-1',
      mecaId,
      endDate,
      paymentStatus: 'paid',
    } as any;
  }

  function daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
  function daysAhead(days: number): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  // ----- checkReactivationEligibility tiers -----

  it('returns tier=active when membership has not expired yet', () => {
    const r = svc.checkReactivationEligibility(makeMembership(daysAhead(5)));
    expect(r.tier).toBe('active');
    expect(r.canSelfReclaim).toBe(true);
  });

  it('returns tier=soft for days 1-30 past expiry with member-facing daysRemaining', () => {
    const r = svc.checkReactivationEligibility(makeMembership(daysAgo(10)));
    expect(r.tier).toBe('soft');
    expect(r.canSelfReclaim).toBe(true);
    expect(r.canAdminReclaim).toBe(true);
    // 30-day window - 10 days elapsed ≈ 20 remaining
    expect(r.daysRemaining).toBeGreaterThanOrEqual(19);
    expect(r.daysRemaining).toBeLessThanOrEqual(20);
  });

  it('returns tier=medium for days 31-37 past expiry, daysRemaining is zero (member-facing)', () => {
    const r = svc.checkReactivationEligibility(makeMembership(daysAgo(35)));
    expect(r.tier).toBe('medium');
    expect(r.canSelfReclaim).toBe(true); // still silent reclaim on renewal
    expect(r.daysRemaining).toBe(0);
  });

  it('returns tier=admin for days 38-45 past expiry — no self-reclaim, admin only', () => {
    const r = svc.checkReactivationEligibility(makeMembership(daysAgo(40)));
    expect(r.tier).toBe('admin');
    expect(r.canSelfReclaim).toBe(false);
    expect(r.canAdminReclaim).toBe(true);
  });

  it('returns tier=expired for day 46+ — nothing reclaimable', () => {
    const r = svc.checkReactivationEligibility(makeMembership(daysAgo(60)));
    expect(r.tier).toBe('expired');
    expect(r.canSelfReclaim).toBe(false);
    expect(r.canAdminReclaim).toBe(false);
  });

  // ----- computeRenewalEndDate — the three A1 cases -----

  it('A1 case 1: no previous membership → 365 days from today', () => {
    const before = Date.now();
    const result = svc.computeRenewalEndDate(undefined);
    const diff = result.getTime() - before;
    // Within ±2 seconds of "now + 365 days"
    expect(diff).toBeGreaterThan(365 * 24 * 60 * 60 * 1000 - 2000);
    expect(diff).toBeLessThan(365 * 24 * 60 * 60 * 1000 + 2000);
  });

  it('A1 case 2: active early-renew → extends from existing endDate, not today', () => {
    const prevEnd = daysAhead(45); // still active for 45 more days
    const result = svc.computeRenewalEndDate(makeMembership(prevEnd));
    // New end should be ~365 days after prevEnd, NOT ~365 days from now
    const expected = prevEnd.getTime() + 365 * 24 * 60 * 60 * 1000;
    expect(Math.abs(result.getTime() - expected)).toBeLessThan(2000);
  });

  it('A1 case 3: in-grace renewal (1-45 days expired) → extends from previous endDate', () => {
    const prevEnd = daysAgo(20); // 20 days expired, deep in grace
    const result = svc.computeRenewalEndDate(makeMembership(prevEnd));
    const expected = prevEnd.getTime() + 365 * 24 * 60 * 60 * 1000;
    expect(Math.abs(result.getTime() - expected)).toBeLessThan(2000);
  });

  it('A1 case 4: past 45-day grace → fresh 365-day term from today (NOT extending old endDate)', () => {
    const prevEnd = daysAgo(60); // way past grace
    const before = Date.now();
    const result = svc.computeRenewalEndDate(makeMembership(prevEnd));
    const diff = result.getTime() - before;
    expect(diff).toBeGreaterThan(365 * 24 * 60 * 60 * 1000 - 2000);
    expect(diff).toBeLessThan(365 * 24 * 60 * 60 * 1000 + 2000);
    // And the new endDate must NOT equal prevEnd + 365 (should be ≥60 days later)
    const wouldBeContinuation = prevEnd.getTime() + 365 * 24 * 60 * 60 * 1000;
    expect(Math.abs(result.getTime() - wouldBeContinuation)).toBeGreaterThanOrEqual(60 * 24 * 60 * 60 * 1000 - 2000);
  });
});
