import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Membership } from './memberships.entity';

@Injectable()
export class MembershipsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findById(id: string): Promise<Membership> {
    const membership = await this.em.findOne(Membership, { id });
    if (!membership) {
      throw new NotFoundException(`Membership with ID ${id} not found`);
    }
    return membership;
  }

  async create(data: Partial<Membership>): Promise<Membership> {
    const membership = this.em.create(Membership, data as any);
    await this.em.persistAndFlush(membership);
    return membership;
  }

  async update(id: string, data: Partial<Membership>): Promise<Membership> {
    const membership = await this.findById(id);
    this.em.assign(membership, data);
    await this.em.flush();
    return membership;
  }

  async delete(id: string): Promise<void> {
    const membership = await this.findById(id);
    await this.em.removeAndFlush(membership);
  }

  async findByUser(userId: string): Promise<Membership[]> {
    return this.em.find(Membership, { user: userId });
  }

  async getActiveMembership(userId: string): Promise<Membership> {
    const membership = await this.em.findOne(Membership, {
      user: userId,
      endDate: { $gte: new Date() },
    });
    
    if (!membership) {
      throw new NotFoundException('No active membership found for user');
    }
    
    return membership;
  }

  async renewMembership(userId: string, membershipType: string): Promise<Membership> {
    // TODO: Implement renewal logic - create new membership based on type
    const newMembership = this.em.create(Membership, {
      user: userId as any,
      membershipType: membershipType as any,
      startDate: new Date(),
      // Calculate end date based on membership type
    } as any);
    
    await this.em.persistAndFlush(newMembership);
    return newMembership;
  }

  async isExpired(membership: Membership): Promise<boolean> {
    if (!membership.endDate) {
      return false;
    }
    return membership.endDate < new Date();
  }
}
