import { CompetitionResultsService } from '../competition-results.service';
import { CompetitionResult } from '../competition-results.entity';
import { CompetitionClass } from '../../competition-classes/competition-classes.entity';
import { Membership } from '../../memberships/memberships.entity';

/**
 * Regression tests for the "manual points override does nothing" bug.
 *
 * A result stamped `pointsHeldForRenewal=true` (expired-member grace hold) is
 * masked to 0 points by every read path. The super-admin manual points tool
 * set `pointsEarned` but left the hold flag in place, and the event recalc
 * skips overridden rows before its self-heal release — so the hand-entered
 * points stayed invisible forever, no matter what the admin did.
 *
 * These tests pin the fix: setting manual points releases the hold, and the
 * recalc releases a stale hold on overridden rows it would otherwise skip.
 */
describe('CompetitionResultsService — manual points on held rows', () => {
  let svc: CompetitionResultsService;
  let em: any;
  let conn: any;
  let heldResult: any;
  let pointsConfigService: any;

  beforeEach(() => {
    heldResult = {
      id: 'r-1',
      mecaId: '701234',
      competitorName: 'Test Member',
      competitionClass: 'Amateur 1',
      classId: null,
      format: 'SQL',
      score: '85',
      pointsEarned: 0,
      pointsHeldForRenewal: true,
      heldAt: new Date('2026-07-01'),
      pointsManualOverride: false,
      notes: 'Held: membership expired, within grace period',
    };

    conn = {
      execute: jest.fn(async (sql: string) => {
        if (/FROM events WHERE id/.test(sql)) {
          return [{ id: 'e-1', points_multiplier: 2, season_id: 's-1' }];
        }
        return [];
      }),
    };

    em = {
      fork: () => em,
      getConnection: () => conn,
      findOne: jest.fn(async (entity: any, where: any) => {
        if (entity === CompetitionResult && where?.id === 'r-1') return heldResult;
        return null;
      }),
      find: jest.fn(async (entity: any) => {
        if (entity === CompetitionResult) return [heldResult];
        if (entity === CompetitionClass) return [];
        if (entity === Membership) return [];
        return [];
      }),
      flush: jest.fn(async () => {}),
    };

    pointsConfigService = {
      getConfigForSeason: jest.fn(async () => ({ id: 'pc-1' })),
      getConfigForCurrentSeason: jest.fn(async () => ({ id: 'pc-1' })),
    };

    svc = new CompetitionResultsService(
      em,
      {} as any, // auditService — not used by these paths
      pointsConfigService,
      {} as any, // resultTeamsService
      undefined,
      undefined,
    );
  });

  it('setManualPoints releases a renewal hold so the points are actually visible', async () => {
    const updated = await svc.setManualPoints('r-1', 42, 'admin correction', 'admin-1');

    expect(updated.pointsEarned).toBe(42);
    expect(updated.pointsManualOverride).toBe(true);
    // The hold must be released — otherwise every read path masks the row
    // back to 0 points and the tool appears to do nothing.
    expect(updated.pointsHeldForRenewal).toBe(false);
    expect(em.flush).toHaveBeenCalled();
  });

  it('updateEventPoints releases a stale hold on manually-overridden rows instead of skipping it', async () => {
    heldResult.pointsManualOverride = true;
    heldResult.pointsEarned = 42;

    await svc.updateEventPoints('e-1');

    // Points must be untouched (override is sacrosanct)…
    expect(heldResult.pointsEarned).toBe(42);
    expect(heldResult.pointsManualOverride).toBe(true);
    // …but the hold must not survive, or the display keeps masking the row.
    expect(heldResult.pointsHeldForRenewal).toBe(false);
  });
});
