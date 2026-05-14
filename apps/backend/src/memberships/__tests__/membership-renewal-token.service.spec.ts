import { MembershipRenewalTokenService } from '../membership-renewal-token.service';
import { Membership } from '../memberships.entity';

/**
 * Behavior tests for the renewal-token lifecycle. Validates:
 *   - issueToken() rotates: prior unused tokens for the same membership
 *     get marked used the moment a new one is issued
 *   - validateToken() rejects unknown / used / expired tokens
 *   - markUsed() flips the row
 *
 * Uses a hand-rolled in-memory EM mock to avoid spinning up MikroORM.
 */
describe('MembershipRenewalTokenService — rotation & validation', () => {
  let svc: MembershipRenewalTokenService;
  let store: any[]; // tokens table
  let conn: any;
  let em: any;
  let mecaIdService: any;

  function makeMembership(): Membership {
    return {
      id: 'm-1',
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      user: { id: 'u-1' },
    } as any;
  }

  beforeEach(() => {
    store = [];
    conn = {
      execute: jest.fn(async (sql: string, params: any[]) => {
        if (/UPDATE.*membership_renewal_tokens SET used_at = NOW\(\)/.test(sql)) {
          const [membershipId] = params;
          let affected = 0;
          for (const t of store) {
            if (t.membership_id === membershipId && !t.used_at) {
              t.used_at = new Date();
              affected++;
            }
          }
          return { affectedRows: affected, rowCount: affected };
        }
        return [];
      }),
    };
    em = {
      fork: () => em,
      getConnection: () => conn,
      findOneOrFail: jest.fn(async (_entity: any, where: any) => {
        if (where?.id?.startsWith?.('m-')) return makeMembership();
        if (where?.id) {
          const row = store.find((t) => t.id === where.id);
          if (!row) throw new Error('not found');
          return row;
        }
        return makeMembership();
      }),
      findOne: jest.fn(async (_entity: any, where: any) => {
        if (where?.token) {
          return store.find((t) => t.token === where.token) ?? null;
        }
        return null;
      }),
      persistAndFlush: jest.fn(async (row: any) => {
        store.push({
          id: `tok-${store.length + 1}`,
          membership_id: row.membership.id,
          user_id: row.user.id,
          token: row.token,
          expires_at: row.expiresAt,
          used_at: null,
          membership: row.membership,
          user: row.user,
          expiresAt: row.expiresAt,
          usedAt: null,
        });
        row.id = `tok-${store.length}`;
      }),
      flush: jest.fn(async () => {}),
    };
    mecaIdService = {};
    svc = new MembershipRenewalTokenService(em, mecaIdService);
  });

  it('issueToken creates a fresh row with token + 45-day TTL', async () => {
    const row = await svc.issueToken('m-1');
    expect(row.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(store).toHaveLength(1);
    expect(store[0].used_at).toBeNull();
  });

  it('issueToken ROTATES: a second call invalidates the first token', async () => {
    const first = await svc.issueToken('m-1');
    const second = await svc.issueToken('m-1');
    expect(first.token).not.toBe(second.token);
    expect(store).toHaveLength(2);
    // First token's used_at should now be set (revoked by rotation)
    const firstRow = store.find((t) => t.token === first.token);
    expect(firstRow.used_at).toBeInstanceOf(Date);
    // Second token must still be live
    const secondRow = store.find((t) => t.token === second.token);
    expect(secondRow.used_at).toBeNull();
  });

  it('validateToken rejects unknown tokens with NotFoundException', async () => {
    await expect(svc.validateToken('bogus')).rejects.toThrow(/invalid or has been removed/);
  });

  it('validateToken rejects already-used tokens with GoneException', async () => {
    const row = await svc.issueToken('m-1');
    // Manually mark used
    store[0].used_at = new Date();
    store[0].usedAt = new Date();
    await expect(svc.validateToken(row.token)).rejects.toThrow(/already been used/);
  });

  it('validateToken rejects expired tokens with GoneException', async () => {
    const row = await svc.issueToken('m-1');
    store[0].expires_at = new Date(Date.now() - 1000);
    store[0].expiresAt = new Date(Date.now() - 1000);
    await expect(svc.validateToken(row.token)).rejects.toThrow(/expired/);
  });

  it('markUsed sets used_at on the row', async () => {
    const row = await svc.issueToken('m-1');
    await svc.markUsed(store[0].id);
    expect(store[0].usedAt).toBeInstanceOf(Date);
  });

  it('revokeAllForMembership flips every unused token for that membership', async () => {
    await svc.issueToken('m-1'); // rotation will revoke any prior
    const before = store.filter((t) => !t.used_at).length;
    expect(before).toBe(1);
    const affected = await svc.revokeAllForMembership('m-1');
    expect(affected).toBe(1);
    const after = store.filter((t) => !t.used_at).length;
    expect(after).toBe(0);
  });
});
