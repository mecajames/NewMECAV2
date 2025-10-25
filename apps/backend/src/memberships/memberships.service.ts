import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { Membership } from './memberships.entity';
import { ENTITY_MANAGER } from '../db/database.module';
import { MembershipType, PaymentStatus } from '../types/enums';

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(ENTITY_MANAGER)
    private readonly em: EntityManager
  ) {}

  async findAll(page: number = 1, limit: number = 10): Promise<Membership[]> {
    const offset = (page - 1) * limit;
    return this.em.find(Membership, {}, {
      limit,
      offset,
      orderBy: { createdAt: 'DESC' },
      populate: ['user'],
    });
  }

  async findById(id: string): Promise<Membership | null> {
    return this.em.findOne(Membership, { id }, {
      populate: ['user'],
    });
  }

  async findByUser(userId: string): Promise<Membership[]> {
    return this.em.find(Membership, {
      user: userId,
    }, {
      orderBy: { createdAt: 'DESC' },
    });
  }

  async getActiveMembership(userId: string): Promise<Membership | null> {
    return this.em.findOne(Membership, {
      user: userId,
      paymentStatus: PaymentStatus.PAID,
      endDate: { $gte: new Date() },
    });
  }

  async create(data: Partial<Membership>): Promise<Membership> {
    const membership = this.em.create(Membership, data as any);
    await this.em.persistAndFlush(membership);
    return membership;
  }

  async update(id: string, data: Partial<Membership>): Promise<Membership> {
    const membership = await this.em.findOne(Membership, { id });

    if (!membership) {
      throw new NotFoundException(`Membership with ID ${id} not found`);
    }

    this.em.assign(membership, data);
    await this.em.flush();

    return membership;
  }

  async delete(id: string): Promise<void> {
    const membership = await this.em.findOne(Membership, { id });

    if (!membership) {
      throw new NotFoundException(`Membership with ID ${id} not found`);
    }

    await this.em.removeAndFlush(membership);
  }

  async isExpired(membership: Membership): Promise<boolean> {
    return membership.endDate ? membership.endDate < new Date() : false;
  }

  async renewMembership(userId: string, membershipType: MembershipType): Promise<Membership> {
    // Get current active membership
    const current = await this.getActiveMembership(userId);

    // Calculate new end date (1 year from now or from current end date)
    const startDate = current && current.endDate && current.endDate > new Date()
      ? current.endDate
      : new Date();

    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Create new membership
    return this.create({
      user: userId as any,
      membershipType,
      paymentStatus: PaymentStatus.PAID,
      startDate: new Date(),
      endDate,
      amountPaid: 0, // Should be set based on membership type
    });
  }
}
