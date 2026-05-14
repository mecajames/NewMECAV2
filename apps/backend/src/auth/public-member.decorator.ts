import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route as accessible to authenticated users whose membership is
 * expired. Used for endpoints an expired user legitimately needs to hit
 * to renew (token-based renewal, profile-read-for-renewal-display,
 * invoice payment, logout).
 *
 * The route is still gated by the standard auth guard — this only bypasses
 * the ActiveMembershipGuard's membership-status check. A route that should
 * be open to truly unauthenticated visitors should use @Public() instead.
 */
export const IS_PUBLIC_MEMBER_KEY = 'isPublicMember';
export const PublicMember = () => SetMetadata(IS_PUBLIC_MEMBER_KEY, true);
