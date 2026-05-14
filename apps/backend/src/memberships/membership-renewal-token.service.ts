import { Injectable, Inject, Logger, NotFoundException, BadRequestException, GoneException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomBytes } from 'crypto';
import { MembershipRenewalToken } from './membership-renewal-token.entity';
import { Membership } from './memberships.entity';
import { Profile } from '../profiles/profiles.entity';
import { MecaIdService } from './meca-id.service';

const TOKEN_BYTES = 32; // 256-bit token, URL-safe base64 → ~43 chars

@Injectable()
export class MembershipRenewalTokenService {
  private readonly logger = new Logger(MembershipRenewalTokenService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly mecaIdService: MecaIdService,
  ) {}

  /**
   * Issue a renewal token for an expired (or about-to-expire) membership.
   *
   * **Rotation policy:** every call invalidates all prior unused tokens for
   * the same membership and issues a fresh one. This keeps the most-recent
   * renewal email link valid while burning any earlier link that may have
   * been leaked or forwarded. Idempotency for the SAME email run is provided
   * by the caller checking `expiresAt > now` before re-issuing if needed.
   *
   * Token TTL = 45 days past the membership's end_date (the outer edge of
   * the admin MECA ID grace window).
   */
  async issueToken(membershipId: string): Promise<MembershipRenewalToken> {
    const em = this.em.fork();
    const membership = await em.findOneOrFail(Membership, { id: membershipId }, { populate: ['user'] });
    if (!membership.endDate) {
      throw new BadRequestException('Membership has no end_date and cannot be renewed via token');
    }

    // Rotate: mark every prior unused token for this membership as used so
    // it can no longer authenticate the renewal page. This means a token
    // leaked from an earlier email is killed the moment we send a new one.
    await em.getConnection().execute(
      `UPDATE public.membership_renewal_tokens SET used_at = NOW()
        WHERE membership_id = ? AND used_at IS NULL`,
      [membershipId],
    );

    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(membership.endDate.getTime() + MecaIdService.GRACE_ADMIN_DAYS * 24 * 60 * 60 * 1000);
    // Floor at "now + 7 days" so a token issued unusually late still gets a sane window
    const minExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (expiresAt < minExpires) expiresAt.setTime(minExpires.getTime());

    const row = new MembershipRenewalToken();
    row.membership = membership;
    row.user = membership.user;
    row.token = token;
    row.expiresAt = expiresAt;
    await em.persistAndFlush(row);
    this.logger.log(`Issued renewal token for membership ${membershipId} (expires ${expiresAt.toISOString()})`);
    return row;
  }

  async validateToken(token: string): Promise<{
    row: MembershipRenewalToken;
    membership: Membership;
    user: Profile;
  }> {
    const em = this.em.fork();
    const row = await em.findOne(
      MembershipRenewalToken,
      { token },
      { populate: ['membership', 'membership.membershipTypeConfig', 'user'] },
    );
    if (!row) throw new NotFoundException('Renewal link is invalid or has been removed.');
    if (row.usedAt) throw new GoneException('This renewal link has already been used. If you need help, contact support.');
    if (row.expiresAt < new Date()) throw new GoneException('This renewal link has expired. Please contact support to renew your membership.');
    return { row, membership: row.membership, user: row.user };
  }

  async markUsed(tokenId: string): Promise<void> {
    const em = this.em.fork();
    const row = await em.findOneOrFail(MembershipRenewalToken, { id: tokenId });
    row.usedAt = new Date();
    await em.flush();
  }

  /**
   * Admin tool: revoke ALL unused renewal tokens for a membership. Used
   * when an admin needs to invalidate an outstanding renewal link
   * (e.g. customer reports their email was hacked, or the membership was
   * refunded mid-grace).
   */
  async revokeAllForMembership(membershipId: string): Promise<number> {
    const em = this.em.fork();
    const result: any = await em.getConnection().execute(
      `UPDATE public.membership_renewal_tokens SET used_at = NOW()
        WHERE membership_id = ? AND used_at IS NULL`,
      [membershipId],
    );
    const affected = (result?.affectedRows ?? result?.rowCount ?? 0) as number;
    this.logger.log(`Revoked ${affected} unused renewal token(s) for membership ${membershipId}`);
    return affected;
  }
}
