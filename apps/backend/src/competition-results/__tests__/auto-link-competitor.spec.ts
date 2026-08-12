import { CompetitionResultsService } from '../competition-results.service';

/**
 * Regression tests for auto-linking competitor profiles on result creation.
 *
 * Rows entered/imported with only a MECA ID (no competitor_id) were invisible
 * on the member's own My MECA results (which queried by profile link) even
 * though admin views (which query by MECA ID) showed them — Brady Wilson,
 * Sullivan Lake II/III, 2026-08-11. `resolveProfileIdForMecaId` finds the
 * owning member via the memberships table so create() can link the profile.
 */
describe('CompetitionResultsService — resolveProfileIdForMecaId', () => {
  let svc: CompetitionResultsService;
  let conn: any;
  let em: any;

  beforeEach(() => {
    conn = {
      execute: jest.fn(async (_sql: string, params: any[]) => {
        // Membership lookup: MECA ID 701567 belongs to Brady's profile.
        if (params?.[0] === 701567) return [{ user_id: 'profile-brady' }];
        return [];
      }),
    };
    em = { fork: () => em, getConnection: () => conn };
    svc = new CompetitionResultsService(
      em,
      {} as any, // auditService
      {} as any, // pointsConfigService
      {} as any, // resultTeamsService
      undefined,
      undefined,
    );
  });

  async function resolve(mecaId: string): Promise<string | null> {
    return (svc as any).resolveProfileIdForMecaId(em, mecaId);
  }

  it('resolves the owning profile for a real member MECA ID', async () => {
    await expect(resolve('701567')).resolves.toBe('profile-brady');
  });

  it('tolerates stray whitespace from imports', async () => {
    await expect(resolve(' 701567 ')).resolves.toBe('profile-brady');
  });

  it('returns null for guest / unassigned / test IDs without querying', async () => {
    await expect(resolve('999999')).resolves.toBeNull();
    await expect(resolve('0')).resolves.toBeNull();
    await expect(resolve('990001')).resolves.toBeNull();
    await expect(resolve('')).resolves.toBeNull();
    await expect(resolve('not-a-number')).resolves.toBeNull();
    expect(conn.execute).not.toHaveBeenCalled();
  });

  it('returns null when no membership carries the ID', async () => {
    await expect(resolve('701999')).resolves.toBeNull();
  });
});
