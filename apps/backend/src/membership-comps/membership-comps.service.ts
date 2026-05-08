import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/core';
import { MembershipComp, MembershipCompType, MembershipCompStatus } from './membership-comp.entity';
import { Membership } from '../memberships/memberships.entity';
import { Profile } from '../profiles/profiles.entity';
import { ForeverMember } from '../forever-members/forever-members.entity';
import { AdminAuditService } from '../user-activity/admin-audit.service';

export interface GrantCompDto {
  membershipId: string;
  compType: MembershipCompType;
  /**
   * Semantics depend on type:
   *   FREE_PERIOD          → months free
   *   FREE_SECONDARY_SLOTS → number of slots
   *   RENEWAL_DISCOUNT_PCT → percent (1-100)
   *   RENEWAL_DISCOUNT_FIXED → dollars
   */
  value: number;
  /**
   * For free_period: ignored (we compute ends_at = startsAt + value months).
   * For free_secondary_slots / discounts: optional deadline. NULL = until-revoked.
   */
  endsAt?: Date | string | null;
  /**
   * For free_period only: when true, ignore `value` and treat as indefinite
   * (until-revoked). The membership is comp'd until an admin revokes.
   */
  indefinite?: boolean;
  /**
   * For discounts: how many renewals it applies to. Default 1.
   * For free_secondary_slots: defaults to `value` (one use per slot).
   * For free_period: ignored (the period itself defines bounds).
   */
  maxUses?: number;
  reason?: string;
  notes?: string;
}

@Injectable()
export class MembershipCompsService {
  private readonly logger = new Logger(MembershipCompsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  /**
   * Grant a comp to a membership. Always logs to admin_audit_log.
   * Blocks comps on Forever Members (they don't have a renewal cycle).
   */
  async grant(adminUserId: string, dto: GrantCompDto): Promise<MembershipComp> {
    const em = this.em.fork();

    const membership = await em.findOne(
      Membership,
      { id: dto.membershipId },
      { populate: ['user', 'membershipTypeConfig'] },
    );
    if (!membership) {
      throw new NotFoundException(`Membership ${dto.membershipId} not found`);
    }

    // Forever Member guard: comp doesn't apply since they have no renewal.
    // We check by meca_id since forever_members is a separate honor-roll
    // table not joined to memberships.
    const mecaId = membership.mecaId;
    if (mecaId) {
      const fm = await em.findOne(ForeverMember, { mecaId: String(mecaId) });
      if (fm) {
        throw new BadRequestException(
          'Forever Members already have a lifetime status; comps cannot be applied.',
        );
      }
    }

    if (!Number.isFinite(dto.value) || dto.value <= 0) {
      if (!(dto.compType === MembershipCompType.FREE_PERIOD && dto.indefinite)) {
        throw new BadRequestException('Comp value must be a positive number');
      }
    }
    if (dto.compType === MembershipCompType.RENEWAL_DISCOUNT_PCT && (dto.value > 100)) {
      throw new BadRequestException('Discount percentage cannot exceed 100');
    }

    const now = new Date();
    let endsAt: Date | undefined;
    let usesRemaining: number | undefined;
    let maxUses: number | undefined;

    if (dto.compType === MembershipCompType.FREE_PERIOD) {
      if (dto.indefinite) {
        endsAt = undefined;
      } else {
        const months = Math.floor(dto.value);
        const e = new Date(now);
        e.setMonth(e.getMonth() + months);
        endsAt = e;
      }
    } else if (dto.compType === MembershipCompType.FREE_SECONDARY_SLOTS) {
      maxUses = Math.floor(dto.value);
      usesRemaining = maxUses;
      endsAt = dto.endsAt ? new Date(dto.endsAt as any) : undefined;
    } else {
      // discount comps
      maxUses = dto.maxUses ?? 1;
      usesRemaining = maxUses;
      endsAt = dto.endsAt ? new Date(dto.endsAt as any) : undefined;
    }

    const grantedBy = await em.findOne(Profile, { id: adminUserId });

    const comp = em.create(MembershipComp, {
      membership,
      compType: dto.compType,
      value: String(dto.value),
      startsAt: now,
      endsAt,
      maxUses,
      usesRemaining,
      status: MembershipCompStatus.ACTIVE,
      grantedByAdmin: grantedBy ?? undefined,
      grantedAt: now,
      reason: dto.reason,
      notes: dto.notes,
    } as Partial<MembershipComp> as MembershipComp);

    await em.persistAndFlush(comp);

    this.adminAuditService.logAction({
      adminUserId,
      action: 'membership_comp_grant',
      resourceType: 'membership',
      resourceId: dto.membershipId,
      description: this.describeComp(comp),
      newValues: {
        comp_id: comp.id,
        comp_type: dto.compType,
        value: dto.value,
        ends_at: endsAt?.toISOString() ?? null,
        max_uses: maxUses ?? null,
      },
    });

    this.logger.log(
      `Comp granted: ${this.describeComp(comp)} to membership ${dto.membershipId} by admin ${adminUserId}`,
    );

    return comp;
  }

  /**
   * Revoke an active comp. Sets status=REVOKED + revokedAt + revokedByAdmin.
   * Doesn't refund anything — comps are non-monetary.
   */
  async revoke(adminUserId: string, compId: string, reason?: string): Promise<MembershipComp> {
    const em = this.em.fork();
    const comp = await em.findOne(MembershipComp, { id: compId }, { populate: ['membership'] });
    if (!comp) throw new NotFoundException(`Comp ${compId} not found`);
    if (comp.status !== MembershipCompStatus.ACTIVE) {
      throw new BadRequestException(`Cannot revoke comp with status ${comp.status}`);
    }

    const revokedBy = await em.findOne(Profile, { id: adminUserId });
    comp.status = MembershipCompStatus.REVOKED;
    comp.revokedByAdmin = revokedBy ?? undefined;
    comp.revokedAt = new Date();
    if (reason) {
      comp.notes = comp.notes ? `${comp.notes}\nRevoked: ${reason}` : `Revoked: ${reason}`;
    }
    await em.flush();

    this.adminAuditService.logAction({
      adminUserId,
      action: 'membership_comp_revoke',
      resourceType: 'membership',
      resourceId: comp.membership.id,
      description: `Revoked comp: ${this.describeComp(comp)}` + (reason ? ` (${reason})` : ''),
      newValues: { comp_id: comp.id, reason: reason ?? null },
    });

    return comp;
  }

  async findById(id: string): Promise<MembershipComp> {
    const em = this.em.fork();
    const comp = await em.findOne(
      MembershipComp,
      { id },
      { populate: ['membership', 'grantedByAdmin', 'revokedByAdmin'] },
    );
    if (!comp) throw new NotFoundException(`Comp ${id} not found`);
    return comp;
  }

  /**
   * All comps (active + historical) for a single membership. Used by the
   * "Comps" tab on member detail.
   */
  async findByMembership(membershipId: string): Promise<MembershipComp[]> {
    const em = this.em.fork();
    return em.find(
      MembershipComp,
      { membership: membershipId },
      {
        populate: ['grantedByAdmin', 'revokedByAdmin'],
        orderBy: { grantedAt: 'DESC' },
      },
    );
  }

  /**
   * Member-scoped: every active comp on every membership owned by `userId`.
   * Used by the member dashboard badge + self-serve claim flow.
   */
  async findActiveForUser(userId: string): Promise<MembershipComp[]> {
    const em = this.em.fork();
    const memberships = await em.find(Membership, { user: userId });
    if (memberships.length === 0) return [];
    const ids = memberships.map(m => m.id);
    const comps = await em.find(MembershipComp, {
      membership: { $in: ids } as any,
      status: MembershipCompStatus.ACTIVE,
    }, {
      populate: ['membership', 'membership.membershipTypeConfig'],
    });
    // Soft-expire any past their ends_at (mirrors findActiveForMembership)
    const now = Date.now();
    const out: MembershipComp[] = [];
    let mutated = false;
    for (const c of comps) {
      if (c.endsAt && c.endsAt.getTime() < now) {
        c.status = c.usesRemaining && c.usesRemaining > 0
          ? MembershipCompStatus.EXPIRED_UNUSED
          : MembershipCompStatus.CONSUMED;
        mutated = true;
      } else {
        out.push(c);
      }
    }
    if (mutated) await em.flush();
    return out;
  }

  /**
   * Active comps only — for renewal-time decisions, eligibility checks,
   * and member-facing "your benefit" displays.
   */
  async findActiveForMembership(membershipId: string): Promise<MembershipComp[]> {
    const em = this.em.fork();
    const comps = await em.find(MembershipComp, {
      membership: membershipId,
      status: MembershipCompStatus.ACTIVE,
    });
    // Soft-expire any past their ends_at without waiting for the cron.
    // Lets a renewal happening right now see accurate state.
    const now = Date.now();
    const filtered: MembershipComp[] = [];
    for (const c of comps) {
      if (c.endsAt && c.endsAt.getTime() < now) {
        c.status = c.usesRemaining && c.usesRemaining > 0
          ? MembershipCompStatus.EXPIRED_UNUSED
          : MembershipCompStatus.CONSUMED;
      } else {
        filtered.push(c);
      }
    }
    if (filtered.length !== comps.length) {
      await em.flush();
    }
    return filtered;
  }

  /**
   * Returns the active free_period comp for a membership, if any. Used by
   * billing flows to decide "skip charge / generate $0 invoice."
   */
  async getActiveFreePeriod(membershipId: string): Promise<MembershipComp | null> {
    const active = await this.findActiveForMembership(membershipId);
    return active.find(c => c.compType === MembershipCompType.FREE_PERIOD) ?? null;
  }

  /**
   * Returns the active free-secondary-slots comp on a master membership,
   * if any (with uses_remaining > 0). Used when adding a secondary to
   * decide if it's free.
   */
  async getActiveSecondarySlot(masterMembershipId: string): Promise<MembershipComp | null> {
    const active = await this.findActiveForMembership(masterMembershipId);
    const slot = active.find(
      c => c.compType === MembershipCompType.FREE_SECONDARY_SLOTS
        && (c.usesRemaining ?? 0) > 0,
    );
    return slot ?? null;
  }

  /**
   * Pick the discount comp that gives the largest dollar reduction for a
   * given subtotal. Returns null if no eligible comp. Doesn't decrement
   * uses — the caller does that on successful checkout.
   */
  async getBestDiscount(membershipId: string, subtotalCents: number): Promise<{
    comp: MembershipComp;
    discountCents: number;
  } | null> {
    const active = await this.findActiveForMembership(membershipId);
    let best: { comp: MembershipComp; discountCents: number } | null = null;

    for (const c of active) {
      if ((c.usesRemaining ?? 0) <= 0) continue;
      let discountCents = 0;
      if (c.compType === MembershipCompType.RENEWAL_DISCOUNT_PCT) {
        discountCents = Math.floor(subtotalCents * (parseFloat(c.value) / 100));
      } else if (c.compType === MembershipCompType.RENEWAL_DISCOUNT_FIXED) {
        discountCents = Math.min(subtotalCents, Math.floor(parseFloat(c.value) * 100));
      } else {
        continue;
      }
      if (!best || discountCents > best.discountCents) {
        best = { comp: c, discountCents };
      }
    }
    return best;
  }

  /**
   * Decrement uses on a comp after it's been applied (slot claimed or
   * discount used). Marks status=CONSUMED when uses_remaining hits 0.
   * Safe to call inside a transaction.
   */
  async consumeOne(em: EntityManager, compId: string): Promise<void> {
    const comp = await em.findOne(MembershipComp, { id: compId });
    if (!comp) return;
    if (comp.usesRemaining == null) return;
    comp.usesRemaining = Math.max(0, comp.usesRemaining - 1);
    if (comp.usesRemaining === 0) {
      comp.status = MembershipCompStatus.CONSUMED;
    }
    await em.flush();
  }

  /**
   * Cron-friendly: for memberships with an active free_period comp whose
   * endDate is approaching (within the next 7 days) or has just passed,
   * auto-extend the membership endDate by one year and produce a $0 Order
   * + Invoice tagged "Comp" so the renewal still appears in revenue
   * reports / order history / member transaction list.
   *
   * The membership's new endDate is the lesser of:
   *   - now + 1 year (standard renewal cycle)
   *   - comp.endsAt (so we never extend past the comp's own deadline)
   *
   * If the comp is indefinite (endsAt = null), endDate = now + 1 year and
   * the cron will keep producing $0 invoices each year until admin
   * revokes the comp.
   *
   * Skips memberships where:
   *   - the comp's endsAt is already in the past (cron will mark it
   *     expired on the next sweep; renewal stops automatically)
   *   - a $0 comp invoice for this membership was created in the last
   *     11 months (idempotency — protects against multiple cron runs)
   */
  async processCompRenewals(now: Date = new Date()): Promise<{ generated: number; skipped: number; errors: number }> {
    const em = this.em.fork();
    let generated = 0;
    let skipped = 0;
    let errors = 0;

    // Window: memberships expiring in the next 7 days (or already expired)
    // that have an active free_period comp.
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 7);

    const candidates = await em.getConnection().execute(
      `
      SELECT m.id AS membership_id, m.end_date, m.user_id,
             m.membership_type_config_id,
             c.id AS comp_id, c.ends_at AS comp_ends_at
      FROM memberships m
      JOIN membership_comps c ON c.membership_id = m.id AND c.status = 'active' AND c.comp_type = 'free_period'
      WHERE m.end_date IS NOT NULL
        AND m.end_date <= ?
        AND (c.ends_at IS NULL OR c.ends_at > ?)
      `,
      [horizon, now],
    );

    for (const row of candidates) {
      try {
        // Idempotency: skip if a comp $0 invoice was created in the last 11 months
        const recentZero = await em.getConnection().execute(
          `SELECT i.id FROM invoices i
           WHERE i.user_id = ?
             AND i.total::numeric = 0
             AND i.notes ILIKE '%[Comp Renewal]%'
             AND i.created_at > ? - INTERVAL '11 months'
           LIMIT 1`,
          [row.user_id, now],
        );
        if (recentZero.length > 0) {
          skipped++;
          continue;
        }

        // Compute new endDate = min(now + 1y, comp.ends_at)
        const oneYear = new Date(now);
        oneYear.setFullYear(oneYear.getFullYear() + 1);
        const compEnds = row.comp_ends_at ? new Date(row.comp_ends_at) : null;
        const newEndDate = compEnds && compEnds < oneYear ? compEnds : oneYear;

        // Update the membership endDate directly via SQL (bypasses MikroORM
        // hooks; we just want the date moved forward).
        await em.getConnection().execute(
          `UPDATE memberships SET end_date = ?, updated_at = NOW() WHERE id = ?`,
          [newEndDate, row.membership_id],
        );

        // Generate the $0 Order + Invoice via raw SQL — going through the
        // services would require a lot more plumbing (membership type
        // lookup, billing address, etc.) and we just need a tracking row.
        const orderRows: Array<{ id: string; order_number: string }> = await em.getConnection().execute(
          `
          INSERT INTO orders (
            id, order_number, member_id, status, order_type,
            subtotal, tax, discount, total, currency,
            notes, created_at, updated_at
          )
          VALUES (
            gen_random_uuid(),
            'ORD-' || EXTRACT(year FROM NOW())::text || '-COMP-' || LEFT(REPLACE(gen_random_uuid()::text, '-', ''), 8),
            ?, 'completed', 'membership',
            '0.00', '0.00', '0.00', '0.00', 'USD',
            '[Comp Renewal] Auto-renewed under active free-period comp ' || ?,
            NOW(), NOW()
          )
          RETURNING id, order_number
          `,
          [row.user_id, row.comp_id],
        );
        const orderId = orderRows[0].id;
        const orderNumber = orderRows[0].order_number;

        const invoiceRows: Array<{ id: string; invoice_number: string }> = await em.getConnection().execute(
          `
          INSERT INTO invoices (
            id, invoice_number, user_id, order_id, status,
            subtotal, tax, discount, total, amount_paid, currency,
            due_date, paid_at, notes, created_at, updated_at
          )
          VALUES (
            gen_random_uuid(),
            'INV-' || EXTRACT(year FROM NOW())::text || '-COMP-' || LEFT(REPLACE(gen_random_uuid()::text, '-', ''), 8),
            ?, ?, 'paid',
            '0.00', '0.00', '0.00', '0.00', '0.00', 'USD',
            NOW(), NOW(),
            '[Comp Renewal] Auto-generated $0 invoice for membership ' || ? || ' under free-period comp ' || ?,
            NOW(), NOW()
          )
          RETURNING id, invoice_number
          `,
          [row.user_id, orderId, row.membership_id, row.comp_id],
        );

        // Cross-link order → invoice
        await em.getConnection().execute(
          `UPDATE orders SET invoice_id = ? WHERE id = ?`,
          [invoiceRows[0].id, orderId],
        );

        this.logger.log(
          `Comp renewal: extended membership ${row.membership_id} to ${newEndDate.toISOString().slice(0, 10)}, generated ${orderNumber} + ${invoiceRows[0].invoice_number} ($0)`,
        );
        generated++;
      } catch (err) {
        this.logger.error(`Failed to process comp renewal for membership ${row.membership_id}:`, err as any);
        errors++;
      }
    }

    return { generated, skipped, errors };
  }

  /**
   * Cron-friendly: scan active comps with ends_at in the past and flip
   * their status. Returns counts so the cron can log.
   */
  async expireDueComps(now: Date = new Date()): Promise<{ expired: number }> {
    const em = this.em.fork();
    const due = await em.find(MembershipComp, {
      status: MembershipCompStatus.ACTIVE,
      endsAt: { $lt: now } as any,
    });
    for (const c of due) {
      c.status = c.usesRemaining && c.usesRemaining > 0
        ? MembershipCompStatus.EXPIRED_UNUSED
        : MembershipCompStatus.CONSUMED;
    }
    if (due.length > 0) await em.flush();
    return { expired: due.length };
  }

  private describeComp(comp: MembershipComp): string {
    switch (comp.compType) {
      case MembershipCompType.FREE_PERIOD:
        return comp.endsAt
          ? `Free period until ${comp.endsAt.toISOString().slice(0, 10)} (${comp.value} months)`
          : `Free period (indefinite)`;
      case MembershipCompType.FREE_SECONDARY_SLOTS:
        return `${comp.value} free secondary slot(s)` +
          (comp.endsAt ? ` claim by ${comp.endsAt.toISOString().slice(0, 10)}` : '');
      case MembershipCompType.RENEWAL_DISCOUNT_PCT:
        return `${comp.value}% renewal discount × ${comp.maxUses ?? 1}`;
      case MembershipCompType.RENEWAL_DISCOUNT_FIXED:
        return `$${comp.value} renewal discount × ${comp.maxUses ?? 1}`;
      default:
        return 'Comp';
    }
  }
}
