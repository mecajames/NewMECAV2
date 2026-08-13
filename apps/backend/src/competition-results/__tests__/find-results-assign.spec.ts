import { BadRequestException } from '@nestjs/common';
import { CompetitionResultsService } from '../competition-results.service';

/**
 * Admin "Find Results" → assign selected results to a MECA ID.
 * Built for the "member renewed but their old results aren't in My MECA"
 * support case: rows stranded under an old/expired ID (or guest-stamped)
 * get moved onto the member's current ID, linked to their profile, and the
 * affected events are recalculated with a fresh eligibility cache.
 */
describe('CompetitionResultsService — assignResultsToMecaId', () => {
  let svc: CompetitionResultsService;
  let em: any;
  let conn: any;
  let rows: any[];

  beforeEach(() => {
    rows = [
      {
        id: 'r-1', mecaId: '701000', originalMecaId: undefined, pendingBackFill: false,
        competitor: null, event: { id: 'e-1' },
      },
      {
        id: 'r-2', mecaId: '999999', originalMecaId: '701000', pendingBackFill: true,
        competitor: null, event: { id: 'e-2' },
      },
    ];
    conn = {
      execute: jest.fn(async (sql: string, params: any[]) => {
        if (/FROM public\.memberships m/.test(sql)) {
          // Owner lookup: 701567 belongs to Brady (active); others unowned.
          return params?.[0] === 701567
            ? [{ id: 'profile-brady', first_name: 'Brady', last_name: 'Wilson', email: 'b@x.com', is_active: true }]
            : [];
        }
        return [];
      }),
    };
    em = {
      fork: () => em,
      getConnection: () => conn,
      find: jest.fn(async () => rows),
      flush: jest.fn(async () => {}),
      getReference: jest.fn((_e: any, id: string) => ({ id })),
    };
    svc = new CompetitionResultsService(em, {} as any, {} as any, {} as any, undefined, undefined);
    // Recalc is exercised by its own tests — here we only assert it's invoked
    // per affected event after the cache is busted.
    jest.spyOn(svc, 'updateEventPoints').mockResolvedValue(undefined);
  });

  it('rejects an unowned/invalid target MECA ID and empty selections', async () => {
    await expect(svc.assignResultsToMecaId(['r-1'], 'abc', 'admin-1')).rejects.toThrow(BadRequestException);
    await expect(svc.assignResultsToMecaId([], '701567', 'admin-1')).rejects.toThrow(/at least one/i);
    await expect(svc.assignResultsToMecaId(['r-1'], '701999', 'admin-1')).rejects.toThrow(/does not belong/i);
  });

  it('assigns selected rows to the ID, links the owner profile, clears stamping leftovers, and recalcs each event once', async () => {
    const result = await svc.assignResultsToMecaId(['r-1', 'r-2'], ' 701567 ', 'admin-1');

    expect(result).toEqual({ updated: 2, eventsRecalculated: 2, owner: 'Brady Wilson' });
    for (const row of rows) {
      expect(row.mecaId).toBe('701567');
      expect(row.originalMecaId).toBeUndefined();
      expect(row.pendingBackFill).toBe(false);
      expect(row.competitor).toEqual({ id: 'profile-brady' });
    }
    expect(svc.updateEventPoints).toHaveBeenCalledTimes(2);
    expect(svc.updateEventPoints).toHaveBeenCalledWith('e-1');
    expect(svc.updateEventPoints).toHaveBeenCalledWith('e-2');
  });

  it('mecaIdOwnerForAdmin reports the current holder and activity', async () => {
    await expect(svc.mecaIdOwnerForAdmin('701567')).resolves.toEqual({
      found: true, name: 'Brady Wilson', email: 'b@x.com', active: true, userId: 'profile-brady',
    });
    await expect(svc.mecaIdOwnerForAdmin('701999')).resolves.toEqual({ found: false });
    await expect(svc.mecaIdOwnerForAdmin('nope')).resolves.toEqual({ found: false });
  });
});
