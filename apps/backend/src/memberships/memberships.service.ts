import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Membership } from './memberships.entity';
import { PaymentStatus, CreateGuestMembershipDto, CreateUserMembershipDto } from '@newmeca/shared';

@Injectable()
export class MembershipsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findById(id: string): Promise<Membership> {
    const membership = await this.em.findOne(Membership, { id }, { populate: ['user', 'membershipTypeConfig'] });
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
    return this.em.find(Membership, { user: userId }, { populate: ['membershipTypeConfig'] });
  }

  async findByEmail(email: string): Promise<Membership[]> {
    return this.em.find(Membership, { email: email.toLowerCase() }, { populate: ['membershipTypeConfig'] });
  }

  async findOrphanMembershipsByEmail(email: string): Promise<Membership[]> {
    // Find memberships with this email that don't have a user linked
    return this.em.find(
      Membership,
      { email: email.toLowerCase(), user: null },
      { populate: ['membershipTypeConfig'] }
    );
  }

  async getActiveMembership(userId: string): Promise<Membership | null> {
    const membership = await this.em.findOne(Membership, {
      user: userId,
      endDate: { $gte: new Date() },
      paymentStatus: PaymentStatus.PAID,
    }, { populate: ['membershipTypeConfig'] });

    return membership;
  }

  /**
   * Create a membership for a guest (no user account yet)
   */
  async createGuestMembership(data: CreateGuestMembershipDto): Promise<Membership> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year membership

    const membership = this.em.create(Membership, {
      email: data.email.toLowerCase(),
      membershipTypeConfig: data.membershipTypeConfigId as any,
      membershipType: data.membershipType,
      startDate,
      endDate,
      amountPaid: data.amountPaid,
      paymentStatus: PaymentStatus.PAID,
      stripePaymentIntentId: data.stripePaymentIntentId,
      transactionId: data.transactionId,
      billingFirstName: data.billingFirstName,
      billingLastName: data.billingLastName,
      billingPhone: data.billingPhone,
      billingAddress: data.billingAddress,
      billingCity: data.billingCity,
      billingState: data.billingState,
      billingPostalCode: data.billingPostalCode,
      billingCountry: data.billingCountry || 'USA',
      teamName: data.teamName,
      teamDescription: data.teamDescription,
      businessName: data.businessName,
      businessWebsite: data.businessWebsite,
    } as any);

    await this.em.persistAndFlush(membership);
    return membership;
  }

  /**
   * Create a membership for an existing user
   */
  async createUserMembership(data: CreateUserMembershipDto): Promise<Membership> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year membership

    const membership = this.em.create(Membership, {
      user: data.userId as any,
      membershipTypeConfig: data.membershipTypeConfigId as any,
      membershipType: data.membershipType,
      startDate,
      endDate,
      amountPaid: data.amountPaid,
      paymentStatus: PaymentStatus.PAID,
      stripePaymentIntentId: data.stripePaymentIntentId,
      transactionId: data.transactionId,
    } as any);

    await this.em.persistAndFlush(membership);
    return membership;
  }

  /**
   * Link orphan memberships to a user by email
   * Called after a user creates an account with an email that has existing memberships
   */
  async linkMembershipsToUser(email: string, userId: string): Promise<Membership[]> {
    const orphanMemberships = await this.findOrphanMembershipsByEmail(email);

    if (orphanMemberships.length === 0) {
      return [];
    }

    for (const membership of orphanMemberships) {
      membership.user = userId as any;
    }

    await this.em.flush();
    return orphanMemberships;
  }

  async renewMembership(userId: string, membershipType: string): Promise<Membership> {
    const newMembership = this.em.create(Membership, {
      user: userId as any,
      membershipType: membershipType as any,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
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
