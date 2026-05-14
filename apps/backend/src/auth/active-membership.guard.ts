import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { IS_PUBLIC_KEY } from './public.decorator';
import { IS_PUBLIC_MEMBER_KEY } from './public-member.decorator';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from './is-admin.helper';
import { MembershipCompsService } from '../membership-comps/membership-comps.service';
import { UserRole } from '@newmeca/shared';

/**
 * Backend enforcement of the "expired members cannot access member-only
 * data" rule. See docs/features/MEMBERSHIP_LIFECYCLE.md §4.2.
 *
 * Order: runs AFTER GlobalAuthGuard, so request.user is already populated.
 *
 * Exemptions (request proceeds even if membership_status is not 'active'):
 *   - Route marked @Public()       — fully public, no auth at all
 *   - Route marked @PublicMember() — authenticated but the route is one
 *                                    expired members legitimately need
 *   - profile.is_staff = true
 *   - profile.role in [admin, event_director, judge]
 *   - User has an active free_period comp on any of their memberships
 *
 * Anything else with status != 'active' is rejected:
 *   403 { code: 'MEMBERSHIP_EXPIRED', renewalUrl }
 */
@Injectable()
export class ActiveMembershipGuard implements CanActivate {
  // Roles that bypass the paid-membership gate. Retailer/Manufacturer are NOT
  // exempt — those are paid memberships whose expiry counts.
  private static readonly EXEMPT_ROLES: string[] = [
    UserRole.ADMIN,
    UserRole.EVENT_DIRECTOR,
    UserRole.JUDGE,
  ];

  constructor(
    private readonly reflector: Reflector,
    private readonly em: EntityManager,
    private readonly compsService: MembershipCompsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Fully public — skip
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Member-public — authenticated but exempt from the active check
    const isPublicMember = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_MEMBER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublicMember) return true;

    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.id;
    if (!userId) {
      // GlobalAuthGuard should have rejected already; treat as unauthenticated.
      return true;
    }

    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: userId });
    if (!profile) {
      // No profile row yet (mid-signup) — let the route decide; not our gate.
      return true;
    }

    // Attach for downstream handlers (avoid duplicate fetches)
    request.profile = profile;

    // Admin / staff bypass
    if (isAdminUser(profile)) return true;

    // Role-based exemption (ED, Judge, Admin)
    if (profile.role && ActiveMembershipGuard.EXEMPT_ROLES.includes(profile.role)) {
      return true;
    }

    // Active paid membership
    if (profile.membership_status === 'active') return true;

    // Comp period exemption — treat free-period comps as active
    const hasComp = await this.compsService.hasActiveCompPeriod(userId);
    if (hasComp) return true;

    // Build a helpful renewal URL for the client to redirect to.
    const frontendUrl = (process.env.FRONTEND_URL || 'https://www.mecacaraudio.com').replace(/\/+$/, '');
    throw new ForbiddenException({
      statusCode: 403,
      code: 'MEMBERSHIP_EXPIRED',
      message: 'Your membership is expired. Renew to restore access.',
      renewalUrl: `${frontendUrl}/renew-expired`,
    });
  }
}
