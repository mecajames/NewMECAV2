import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ActiveMembershipGuard } from '../active-membership.guard';
import { IS_PUBLIC_KEY } from '../public.decorator';
import { IS_PUBLIC_MEMBER_KEY } from '../public-member.decorator';

/**
 * Backend security gate tests. The guard's job: given a logged-in user
 * (request.user set by GlobalAuthGuard upstream), reject expired members
 * unless they fall into one of the exempt categories. This is the actual
 * enforcement boundary — the frontend guard is convenience only.
 */
describe('ActiveMembershipGuard', () => {
  let guard: ActiveMembershipGuard;
  let reflector: Reflector;
  let em: any;
  let comps: any;

  function mockContext(userId: string | null, handler: any = {}, klass: any = {}): ExecutionContext {
    const req: any = { user: userId ? { id: userId } : undefined };
    return {
      switchToHttp: () => ({ getRequest: () => req }) as any,
      getHandler: () => handler,
      getClass: () => klass,
    } as any;
  }

  function setReflector(opts: { isPublic?: boolean; isPublicMember?: boolean }) {
    reflector.getAllAndOverride = jest.fn((key: string) => {
      if (key === IS_PUBLIC_KEY) return !!opts.isPublic;
      if (key === IS_PUBLIC_MEMBER_KEY) return !!opts.isPublicMember;
      return undefined;
    }) as any;
  }

  function setProfile(profile: any) {
    em.fork = () => ({ findOne: jest.fn().mockResolvedValue(profile) });
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    em = { fork: () => ({ findOne: jest.fn().mockResolvedValue(null) }) };
    comps = { hasActiveCompPeriod: jest.fn().mockResolvedValue(false) };
    guard = new ActiveMembershipGuard(reflector, em, comps);
  });

  it('allows fully public routes without touching the DB', async () => {
    setReflector({ isPublic: true });
    em.fork = jest.fn(); // would throw if called
    await expect(guard.canActivate(mockContext(null))).resolves.toBe(true);
    expect(em.fork).not.toHaveBeenCalled();
  });

  it('allows @PublicMember() routes for any authenticated user without status check', async () => {
    setReflector({ isPublicMember: true });
    await expect(guard.canActivate(mockContext('u1'))).resolves.toBe(true);
  });

  it('allows when no userId — lets upstream GlobalAuthGuard handle rejection', async () => {
    setReflector({});
    await expect(guard.canActivate(mockContext(null))).resolves.toBe(true);
  });

  it('rejects expired member with no exempt role', async () => {
    setReflector({});
    setProfile({ id: 'u1', membership_status: 'expired', role: 'user', is_staff: false });
    await expect(guard.canActivate(mockContext('u1'))).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'MEMBERSHIP_EXPIRED' }),
    });
  });

  it('allows admin (role) regardless of membership_status', async () => {
    setReflector({});
    setProfile({ id: 'u1', membership_status: 'expired', role: 'admin' });
    await expect(guard.canActivate(mockContext('u1'))).resolves.toBe(true);
  });

  it('allows staff regardless of membership_status', async () => {
    setReflector({});
    setProfile({ id: 'u1', membership_status: 'expired', is_staff: true });
    await expect(guard.canActivate(mockContext('u1'))).resolves.toBe(true);
  });

  it('allows event_director role without paid membership', async () => {
    setReflector({});
    setProfile({ id: 'u1', membership_status: 'expired', role: 'event_director' });
    await expect(guard.canActivate(mockContext('u1'))).resolves.toBe(true);
  });

  it('allows judge role without paid membership', async () => {
    setReflector({});
    setProfile({ id: 'u1', membership_status: 'expired', role: 'judge' });
    await expect(guard.canActivate(mockContext('u1'))).resolves.toBe(true);
  });

  it('allows member with active paid status', async () => {
    setReflector({});
    setProfile({ id: 'u1', membership_status: 'active', role: 'user' });
    await expect(guard.canActivate(mockContext('u1'))).resolves.toBe(true);
  });

  it('allows expired member who has an active comp free_period', async () => {
    setReflector({});
    setProfile({ id: 'u1', membership_status: 'expired', role: 'user' });
    comps.hasActiveCompPeriod.mockResolvedValueOnce(true);
    await expect(guard.canActivate(mockContext('u1'))).resolves.toBe(true);
  });

  it('rejection payload includes a renewalUrl so the client can redirect', async () => {
    setReflector({});
    setProfile({ id: 'u1', membership_status: 'expired', role: 'user' });
    try {
      await guard.canActivate(mockContext('u1'));
      fail('should have thrown');
    } catch (err: any) {
      expect(err.response.renewalUrl).toMatch(/\/renew-expired$/);
    }
  });
});
