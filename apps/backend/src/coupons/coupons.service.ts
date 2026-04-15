import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomBytes } from 'crypto';
import {
  CouponDiscountType,
  CouponScope,
  CouponStatus,
  PaymentStatus,
} from '@newmeca/shared';
import { Coupon } from './entities/coupon.entity';
import { CouponUsage } from './entities/coupon-usage.entity';
import { Profile } from '../profiles/profiles.entity';
import { Membership } from '../memberships/memberships.entity';

interface ValidateCouponContext {
  scope: 'membership' | 'shop' | 'all';
  subtotal: number;
  productIds?: string[];
  membershipTypeConfigId?: string;
  userId?: string;
  email?: string;
}

export interface ValidationResult {
  valid: boolean;
  couponId?: string;
  discountType?: CouponDiscountType;
  discountValue?: number;
  discountAmount?: number;
  message: string;
}

interface RecordUsageContext {
  couponId: string;
  userId?: string;
  guestEmail?: string;
  discountApplied: number;
  orderId?: string;
  shopOrderId?: string;
  membershipId?: string;
  stripePaymentIntentId?: string;
}

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // ── Code Generation ──────────────────────────────────────────────────────

  generateCode(prefix?: string, suffix?: string, length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 for readability
    const bytes = randomBytes(length);
    let random = '';
    for (let i = 0; i < length; i++) {
      random += chars[bytes[i] % chars.length];
    }

    const parts: string[] = [];
    if (prefix) parts.push(prefix.toUpperCase());
    parts.push(random);
    if (suffix) parts.push(suffix.toUpperCase());
    return parts.join('-');
  }

  generatePreview(prefix?: string, suffix?: string, length: number = 8): string {
    return this.generateCode(prefix, suffix, length);
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async create(data: any, createdByUserId?: string): Promise<Coupon> {
    const em = this.em.fork();

    // Generate or validate code
    let code = data.code;
    if (!code) {
      code = this.generateCode(data.codePrefix, data.codeSuffix, data.codeLength || 8);
    } else {
      code = code.toUpperCase().trim();
    }

    // Check uniqueness
    const existing = await em.findOne(Coupon, { code });
    if (existing) {
      throw new BadRequestException(`Coupon code "${code}" already exists`);
    }

    // Validate percentage range
    if (data.discountType === CouponDiscountType.PERCENTAGE && data.discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    const coupon = em.create(Coupon, {
      code,
      description: data.description || null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      scope: data.scope || CouponScope.ALL,
      applicableProductIds: data.applicableProductIds || null,
      applicableMembershipTypeConfigIds: data.applicableMembershipTypeConfigIds || null,
      minOrderAmount: data.minOrderAmount || null,
      maxDiscountAmount: data.maxDiscountAmount || null,
      maxUses: data.maxUses || null,
      maxUsesPerUser: data.maxUsesPerUser ?? 1,
      newMembersOnly: data.newMembersOnly || false,
      status: data.status || CouponStatus.ACTIVE,
      startsAt: data.startsAt || null,
      expiresAt: data.expiresAt || null,
    } as any);

    if (createdByUserId) {
      (coupon as any).creator = em.getReference(Profile, createdByUserId);
    }

    await em.persistAndFlush(coupon);
    return coupon;
  }

  async createBatch(data: any, quantity: number, createdByUserId?: string): Promise<Coupon[]> {
    if (quantity < 1 || quantity > 50) {
      throw new BadRequestException('Quantity must be between 1 and 50');
    }

    if (data.discountType === CouponDiscountType.PERCENTAGE && data.discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    const em = this.em.fork();
    const coupons: Coupon[] = [];
    const generatedCodes = new Set<string>();

    for (let i = 0; i < quantity; i++) {
      // Generate unique codes, retrying on collision
      let code: string;
      let attempts = 0;
      do {
        code = this.generateCode(data.codePrefix, data.codeSuffix, data.codeLength || 8);
        attempts++;
        if (attempts > 20) {
          throw new BadRequestException('Unable to generate unique codes. Try a longer code length.');
        }
      } while (generatedCodes.has(code) || await em.findOne(Coupon, { code }));

      generatedCodes.add(code);

      const coupon = em.create(Coupon, {
        code,
        description: data.description || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        scope: data.scope || CouponScope.ALL,
        applicableProductIds: data.applicableProductIds || null,
        applicableMembershipTypeConfigIds: data.applicableMembershipTypeConfigIds || null,
        minOrderAmount: data.minOrderAmount || null,
        maxDiscountAmount: data.maxDiscountAmount || null,
        maxUses: data.maxUses || null,
        maxUsesPerUser: data.maxUsesPerUser ?? 1,
        newMembersOnly: data.newMembersOnly || false,
        status: data.status || CouponStatus.ACTIVE,
        startsAt: data.startsAt || null,
        expiresAt: data.expiresAt || null,
      } as any);

      if (createdByUserId) {
        (coupon as any).creator = em.getReference(Profile, createdByUserId);
      }

      em.persist(coupon);
      coupons.push(coupon);
    }

    await em.flush();
    this.logger.log(`Batch created ${coupons.length} coupons`);
    return coupons;
  }

  async findAll(filters?: {
    status?: string;
    scope?: string;
    search?: string;
  }): Promise<Coupon[]> {
    const em = this.em.fork();
    const where: any = {};

    if (filters?.status && filters.status !== 'all') {
      where.status = filters.status;
    }
    if (filters?.scope && filters.scope !== 'all') {
      where.scope = filters.scope;
    }
    if (filters?.search) {
      where.code = { $ilike: `%${filters.search}%` };
    }

    return em.find(Coupon, where, {
      orderBy: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Coupon> {
    const em = this.em.fork();
    const coupon = await em.findOne(Coupon, { id });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }
    return coupon;
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const em = this.em.fork();
    return em.findOne(Coupon, { code: { $ilike: code.trim() } });
  }

  async update(id: string, data: any): Promise<Coupon> {
    const em = this.em.fork();
    const coupon = await em.findOne(Coupon, { id });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }

    if (data.discountType === CouponDiscountType.PERCENTAGE && data.discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    const updateData: any = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.discountType !== undefined) updateData.discountType = data.discountType;
    if (data.discountValue !== undefined) updateData.discountValue = data.discountValue;
    if (data.scope !== undefined) updateData.scope = data.scope;
    if (data.applicableProductIds !== undefined) updateData.applicableProductIds = data.applicableProductIds;
    if (data.applicableMembershipTypeConfigIds !== undefined) updateData.applicableMembershipTypeConfigIds = data.applicableMembershipTypeConfigIds;
    if (data.minOrderAmount !== undefined) updateData.minOrderAmount = data.minOrderAmount;
    if (data.maxDiscountAmount !== undefined) updateData.maxDiscountAmount = data.maxDiscountAmount;
    if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;
    if (data.maxUsesPerUser !== undefined) updateData.maxUsesPerUser = data.maxUsesPerUser;
    if (data.newMembersOnly !== undefined) updateData.newMembersOnly = data.newMembersOnly;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startsAt !== undefined) updateData.startsAt = data.startsAt;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;

    em.assign(coupon, updateData);
    await em.flush();
    return coupon;
  }

  async deactivate(id: string): Promise<void> {
    const em = this.em.fork();
    const coupon = await em.findOne(Coupon, { id });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }
    coupon.status = CouponStatus.INACTIVE;
    await em.flush();
  }

  // ── Validation ───────────────────────────────────────────────────────────

  async validateCoupon(code: string, context: ValidateCouponContext): Promise<ValidationResult> {
    const em = this.em.fork();
    const coupon = await em.findOne(Coupon, { code: { $ilike: code.trim() } });

    if (!coupon) {
      return { valid: false, message: 'Invalid coupon code' };
    }

    // 1. Check status
    if (coupon.status !== CouponStatus.ACTIVE) {
      return { valid: false, message: 'This coupon is no longer active' };
    }

    // 2. Check date range
    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      return { valid: false, message: 'This coupon is not yet active' };
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      return { valid: false, message: 'This coupon has expired' };
    }

    // 3. Check scope
    if (coupon.scope !== CouponScope.ALL && coupon.scope !== context.scope) {
      const scopeLabel = coupon.scope === CouponScope.MEMBERSHIP ? 'memberships' : 'shop purchases';
      return { valid: false, message: `This coupon is only valid for ${scopeLabel}` };
    }

    // 4. Check total usage
    if (coupon.maxUses && coupon.maxUses > 0) {
      const totalUsed = await em.count(CouponUsage, { coupon: coupon.id });
      if (totalUsed >= coupon.maxUses) {
        return { valid: false, message: 'This coupon has reached its maximum number of uses' };
      }
    }

    // 5. Check per-user usage
    if (coupon.maxUsesPerUser && coupon.maxUsesPerUser > 0) {
      const userWhere: any = { coupon: coupon.id };
      if (context.userId) {
        userWhere.user = context.userId;
      } else if (context.email) {
        userWhere.guestEmail = context.email;
      }

      if (context.userId || context.email) {
        const userUsed = await em.count(CouponUsage, userWhere);
        if (userUsed >= coupon.maxUsesPerUser) {
          return { valid: false, message: 'You have already used this coupon' };
        }
      }
    }

    // 6. Check product/membership type targeting
    if (context.scope === 'shop' && coupon.applicableProductIds && coupon.applicableProductIds.length > 0) {
      if (!context.productIds || context.productIds.length === 0) {
        return { valid: false, message: 'This coupon is not valid for the items in your cart' };
      }
      const hasMatch = context.productIds.some(pid => coupon.applicableProductIds!.includes(pid));
      if (!hasMatch) {
        return { valid: false, message: 'This coupon is not valid for the items in your cart' };
      }
    }

    if (context.scope === 'membership' && coupon.applicableMembershipTypeConfigIds && coupon.applicableMembershipTypeConfigIds.length > 0) {
      if (!context.membershipTypeConfigId) {
        return { valid: false, message: 'This coupon is not valid for this membership type' };
      }
      if (!coupon.applicableMembershipTypeConfigIds.includes(context.membershipTypeConfigId)) {
        return { valid: false, message: 'This coupon is not valid for this membership type' };
      }
    }

    // 7. Check minimum order amount
    if (coupon.minOrderAmount && Number(coupon.minOrderAmount) > 0) {
      if (context.subtotal < Number(coupon.minOrderAmount)) {
        return {
          valid: false,
          message: `Minimum order amount of $${Number(coupon.minOrderAmount).toFixed(2)} required`,
        };
      }
    }

    // 8. Check new members only
    if (coupon.newMembersOnly) {
      if (context.userId) {
        const existingMembership = await em.findOne(Membership, {
          user: context.userId,
          paymentStatus: PaymentStatus.PAID,
        });
        if (existingMembership) {
          return { valid: false, message: 'This coupon is only available for new members' };
        }
      } else if (context.email) {
        // Check by email for guest checkout
        const profile = await em.findOne(Profile, { email: context.email });
        if (profile) {
          const existingMembership = await em.findOne(Membership, {
            user: profile.id,
            paymentStatus: PaymentStatus.PAID,
          });
          if (existingMembership) {
            return { valid: false, message: 'This coupon is only available for new members' };
          }
        }
      }
    }

    // 9. Calculate discount amount
    let discountAmount: number;
    if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
      discountAmount = Math.round(context.subtotal * Number(coupon.discountValue)) / 100;
      // Apply cap
      if (coupon.maxDiscountAmount && Number(coupon.maxDiscountAmount) > 0) {
        discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
      }
    } else {
      discountAmount = Math.min(Number(coupon.discountValue), context.subtotal);
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    return {
      valid: true,
      couponId: coupon.id,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discountAmount,
      message: coupon.discountType === CouponDiscountType.PERCENTAGE
        ? `${Number(coupon.discountValue)}% off applied (-$${discountAmount.toFixed(2)})`
        : `$${discountAmount.toFixed(2)} off applied`,
    };
  }

  // ── Usage Tracking ───────────────────────────────────────────────────────

  async recordUsage(context: RecordUsageContext): Promise<CouponUsage> {
    const em = this.em.fork();

    // Use a transaction with FOR UPDATE lock to prevent race conditions
    return em.transactional(async (txEm) => {
      // Lock the coupon row
      const coupon = await txEm.findOne(Coupon, { id: context.couponId }, {
        lockMode: 2, // PESSIMISTIC_WRITE = FOR UPDATE
      });

      if (!coupon) {
        throw new NotFoundException('Coupon not found');
      }

      // Double-check max uses within the lock
      if (coupon.maxUses && coupon.maxUses > 0) {
        const totalUsed = await txEm.count(CouponUsage, { coupon: coupon.id });
        if (totalUsed >= coupon.maxUses) {
          throw new BadRequestException('This coupon has reached its maximum number of uses');
        }
      }

      // Create usage record
      const usage = txEm.create(CouponUsage, {
        coupon,
        discountApplied: context.discountApplied,
        stripePaymentIntentId: context.stripePaymentIntentId || null,
      } as any);

      if (context.userId) {
        (usage as any).user = txEm.getReference(Profile, context.userId);
      }
      if (context.guestEmail) {
        usage.guestEmail = context.guestEmail;
      }
      if (context.orderId) {
        usage.orderId = context.orderId;
      }
      if (context.shopOrderId) {
        usage.shopOrderId = context.shopOrderId;
      }
      if (context.membershipId) {
        usage.membershipId = context.membershipId;
      }

      // Increment times_used counter
      coupon.timesUsed = (coupon.timesUsed || 0) + 1;

      await txEm.persistAndFlush(usage);
      return usage;
    });
  }

  // ── Usage History ────────────────────────────────────────────────────────

  async getUsages(couponId: string): Promise<CouponUsage[]> {
    const em = this.em.fork();
    const coupon = await em.findOne(Coupon, { id: couponId });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${couponId} not found`);
    }

    return em.find(CouponUsage, { coupon: couponId }, {
      populate: ['user'],
      orderBy: { createdAt: 'DESC' },
    });
  }

  async getUsageStats(couponId: string): Promise<{
    totalUses: number;
    uniqueUsers: number;
    totalDiscountGiven: number;
  }> {
    const em = this.em.fork();
    const usages = await em.find(CouponUsage, { coupon: couponId });

    const userIds = new Set<string>();
    let totalDiscount = 0;

    for (const usage of usages) {
      if (usage.userId) userIds.add(usage.userId);
      else if (usage.guestEmail) userIds.add(usage.guestEmail);
      totalDiscount += Number(usage.discountApplied);
    }

    return {
      totalUses: usages.length,
      uniqueUsers: userIds.size,
      totalDiscountGiven: Math.round(totalDiscount * 100) / 100,
    };
  }
}
