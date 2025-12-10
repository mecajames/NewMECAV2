import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Membership } from './memberships.entity';
<<<<<<< Updated upstream
import { PaymentStatus, CreateGuestMembershipDto, CreateUserMembershipDto } from '@newmeca/shared';
=======
import { PaymentStatus } from '../types/enums';
import { MembershipTypeConfig } from '../membership-type-configs/membership-type-configs.entity';
import { Profile } from '../profiles/profiles.entity';

export interface CreateGuestMembershipDto {
  email: string;
  membershipTypeConfigId: string;
  amountPaid: number;
  stripePaymentIntentId?: string;
  transactionId?: string;
  billingFirstName: string;
  billingLastName: string;
  billingPhone?: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingCountry?: string;
  teamName?: string;
  teamDescription?: string;
  businessName?: string;
  businessWebsite?: string;
}

export interface CreateUserMembershipDto {
  userId: string;
  membershipTypeConfigId: string;
  amountPaid: number;
  stripePaymentIntentId?: string;
  transactionId?: string;
}
>>>>>>> Stashed changes

export interface AdminAssignMembershipDto {
  userId: string;
  membershipTypeConfigId: string;
  durationMonths?: number; // Default 12 months
  notes?: string;
}

@Injectable()
export class MembershipsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findById(id: string): Promise<Membership> {
    const em = this.em.fork();
    const membership = await em.findOne(Membership, { id }, { populate: ['user', 'membershipTypeConfig'] });
    if (!membership) {
      throw new NotFoundException(`Membership with ID ${id} not found`);
    }
    return membership;
  }

  async create(data: Partial<Membership>): Promise<Membership> {
    const em = this.em.fork();
    const membership = em.create(Membership, data as any);
    await em.persistAndFlush(membership);
    return membership;
  }

  async update(id: string, data: Partial<Membership>): Promise<Membership> {
    const em = this.em.fork();
    const membership = await em.findOne(Membership, { id }, { populate: ['user', 'membershipTypeConfig'] });
    if (!membership) {
      throw new NotFoundException(`Membership with ID ${id} not found`);
    }
    em.assign(membership, data);
    await em.flush();
    return membership;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const membership = await em.findOne(Membership, { id });
    if (!membership) {
      throw new NotFoundException(`Membership with ID ${id} not found`);
    }
    await em.removeAndFlush(membership);
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

  async renewMembership(userId: string, membershipTypeConfigId: string): Promise<Membership> {
    const newMembership = this.em.create(Membership, {
      user: userId as any,
      membershipTypeConfig: membershipTypeConfigId as any,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      amountPaid: 0, // Will be set when payment is processed
      paymentStatus: PaymentStatus.PENDING,
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

  /**
   * Admin function to assign a membership to a user without payment
   */
  async adminAssignMembership(data: AdminAssignMembershipDto): Promise<Membership> {
    const em = this.em.fork();

    // Get the membership type config
    const membershipConfig = await em.findOne(MembershipTypeConfig, { id: data.membershipTypeConfigId });
    if (!membershipConfig) {
      throw new NotFoundException(`Membership type config with ID ${data.membershipTypeConfigId} not found`);
    }

    const startDate = new Date();
    const endDate = new Date();
    const months = data.durationMonths || 12;
    endDate.setMonth(endDate.getMonth() + months);

    // Create membership using reference
    const membership = new Membership();
    membership.user = em.getReference(Profile, data.userId);
    membership.membershipTypeConfig = membershipConfig;
    membership.startDate = startDate;
    membership.endDate = endDate;
    membership.amountPaid = 0; // Admin assigned - no payment
    membership.paymentStatus = PaymentStatus.PAID; // Marked as paid since admin assigned
    membership.transactionId = `ADMIN-${Date.now()}`;

    await em.persistAndFlush(membership);
    return membership;
  }

  /**
   * Get all memberships for a user (including expired)
   */
  async getAllMembershipsByUser(userId: string): Promise<Membership[]> {
    const em = this.em.fork();
    return em.find(
      Membership,
      { user: userId },
      {
        populate: ['membershipTypeConfig'],
        orderBy: { startDate: 'DESC' }
      }
    );
  }

  /**
   * Get all memberships in the system (admin)
   */
  async getAllMemberships(): Promise<Membership[]> {
    const em = this.em.fork();
    return em.find(
      Membership,
      {},
      {
        populate: ['user', 'membershipTypeConfig'],
        orderBy: { createdAt: 'DESC' }
      }
    );
  }

}
