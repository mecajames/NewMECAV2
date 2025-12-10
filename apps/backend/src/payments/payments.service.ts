import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Payment } from './payments.entity';
import { Membership } from '../memberships/memberships.entity';
import { Profile } from '../profiles/profiles.entity';
import { PaymentStatus, PaymentMethod, PaymentType, MembershipType, CreatePaymentDto, ProcessPaymentDto, RefundPaymentDto } from '@newmeca/shared';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findById(id: string): Promise<Payment> {
    const em = this.em.fork();
    const payment = await em.findOne(
      Payment,
      { id },
      { populate: ['user', 'membership'] },
    );

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async findByUser(userId: string, page: number = 1, limit: number = 10): Promise<Payment[]> {
    const em = this.em.fork();
    const offset = (page - 1) * limit;

    return em.find(
      Payment,
      { user: userId },
      {
        populate: ['user', 'membership'],
        limit,
        offset,
        orderBy: { createdAt: 'DESC' },
      },
    );
  }

  async findByMembership(membershipId: string): Promise<Payment[]> {
    const em = this.em.fork();

    return em.find(
      Payment,
      { membership: membershipId },
      {
        populate: ['user', 'membership'],
        orderBy: { createdAt: 'DESC' },
      },
    );
  }

  async findByTransactionId(transactionId: string): Promise<Payment | null> {
    const em = this.em.fork();
    return em.findOne(Payment, { transactionId });
  }

  async findByStripePaymentIntent(stripePaymentIntentId: string): Promise<Payment | null> {
    const em = this.em.fork();
    return em.findOne(Payment, { stripePaymentIntentId });
  }

  async findByWordpressOrderId(wordpressOrderId: string): Promise<Payment | null> {
    const em = this.em.fork();
    return em.findOne(Payment, { wordpressOrderId });
  }

  async create(data: CreatePaymentDto): Promise<Payment> {
    const em = this.em.fork();

    // Verify user exists
    const user = await em.findOne(Profile, { id: data.userId });
    if (!user) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    // If membership is specified, verify it exists and belongs to user
    if (data.membershipId) {
      const membership = await em.findOne(Membership, {
        id: data.membershipId,
        user: data.userId,
      });

      if (!membership) {
        throw new NotFoundException(
          `Membership with ID ${data.membershipId} not found for user ${data.userId}`,
        );
      }
    }

    const payment = em.create(Payment, {
      user: user,
      membership: data.membershipId ? em.getReference(Membership, data.membershipId) : undefined,
      paymentType: data.paymentType,
      paymentMethod: data.paymentMethod,
      amount: data.amount,
      currency: data.currency || 'USD',
      transactionId: data.transactionId,
      externalPaymentId: data.externalPaymentId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      stripeCustomerId: data.stripeCustomerId,
      wordpressOrderId: data.wordpressOrderId,
      wordpressSubscriptionId: data.wordpressSubscriptionId,
      description: data.description,
      paymentMetadata: data.paymentMetadata,
      paymentStatus: PaymentStatus.PENDING,
    } as any);

    await em.persistAndFlush(payment);
    return payment;
  }

  async processPayment(data: ProcessPaymentDto): Promise<Payment> {
    const em = this.em.fork();
    const payment = await em.findOne(
      Payment,
      { id: data.paymentId },
      { populate: ['user', 'membership'] },
    );

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${data.paymentId} not found`);
    }

    if (payment.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Payment has already been processed');
    }

    if (payment.paymentStatus === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Cannot process a refunded payment');
    }

    payment.paymentStatus = PaymentStatus.PAID;
    payment.paidAt = data.paidAt || new Date();

    if (data.transactionId) {
      payment.transactionId = data.transactionId;
    }

    // If this is a membership payment, update the membership status
    if (payment.membership) {
      const membership = await em.findOne(Membership, { id: payment.membership.id });
      if (membership) {
        membership.paymentStatus = PaymentStatus.PAID;
        membership.transactionId = payment.transactionId;
      }
    }

    await em.flush();
    return payment;
  }

  async refundPayment(data: RefundPaymentDto): Promise<Payment> {
    const em = this.em.fork();
    const payment = await em.findOne(
      Payment,
      { id: data.paymentId },
      { populate: ['user', 'membership'] },
    );

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${data.paymentId} not found`);
    }

    if (payment.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Only paid payments can be refunded');
    }

    payment.paymentStatus = PaymentStatus.REFUNDED;
    payment.refundedAt = new Date();
    payment.refundReason = data.reason;

    // If this is a membership payment, update the membership status
    if (payment.membership) {
      const membership = await em.findOne(Membership, { id: payment.membership.id });
      if (membership) {
        membership.paymentStatus = PaymentStatus.REFUNDED;
      }
    }

    await em.flush();
    return payment;
  }

  async createMembershipPayment(
    userId: string,
    membershipType: MembershipType,
    amount: number,
    paymentMethod: PaymentMethod,
    metadata?: {
      stripePaymentIntentId?: string;
      stripeCustomerId?: string;
      wordpressOrderId?: string;
      wordpressSubscriptionId?: string;
    },
  ): Promise<{ payment: Payment; membership: Membership }> {
    const em = this.em.fork();

    // Verify user exists
    const user = await em.findOne(Profile, { id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Create membership
    const startDate = new Date();
    const endDate = new Date(startDate);

    // Set expiration based on membership type
    if (membershipType === MembershipType.ANNUAL) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (membershipType === MembershipType.LIFETIME) {
      // Lifetime memberships expire in 100 years (effectively never)
      endDate.setFullYear(endDate.getFullYear() + 100);
    }

    const membership = em.create(Membership, {
      user: user,
      membershipType: membershipType,
      startDate: startDate,
      endDate: endDate,
      amountPaid: amount,
      paymentStatus: PaymentStatus.PENDING,
    } as any);

    await em.persistAndFlush(membership);

    // Create payment record
    const payment = em.create(Payment, {
      user: user,
      membership: membership,
      paymentType: PaymentType.MEMBERSHIP,
      paymentMethod: paymentMethod,
      amount: amount,
      currency: 'USD',
      description: `${membershipType} membership`,
      stripePaymentIntentId: metadata?.stripePaymentIntentId,
      stripeCustomerId: metadata?.stripeCustomerId,
      wordpressOrderId: metadata?.wordpressOrderId,
      wordpressSubscriptionId: metadata?.wordpressSubscriptionId,
      paymentStatus: PaymentStatus.PENDING,
    } as any);

    await em.persistAndFlush(payment);

    return { payment, membership };
  }

  async syncWordpressPayment(data: {
    wordpressOrderId: string;
    wordpressSubscriptionId?: string;
    userId: string;
    membershipType: MembershipType;
    amount: number;
    expirationDate: Date;
    paidAt: Date;
  }): Promise<{ payment: Payment; membership: Membership }> {
    const em = this.em.fork();

    // Check if payment already exists
    const existingPayment = await this.findByWordpressOrderId(data.wordpressOrderId);
    if (existingPayment) {
      const membership = await em.findOne(Membership, { id: existingPayment.membership?.id });
      if (membership) {
        return { payment: existingPayment, membership };
      }
    }

    // Verify user exists
    const user = await em.findOne(Profile, { id: data.userId });
    if (!user) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    // Create membership
    const membership = em.create(Membership, {
      user: user,
      membershipType: data.membershipType,
      startDate: data.paidAt,
      endDate: data.expirationDate,
      amountPaid: data.amount,
      paymentStatus: PaymentStatus.PAID,
    } as any);

    await em.persistAndFlush(membership);

    // Create payment record
    const payment = em.create(Payment, {
      user: user,
      membership: membership,
      paymentType: PaymentType.MEMBERSHIP,
      paymentMethod: PaymentMethod.WORDPRESS_PMPRO,
      amount: data.amount,
      currency: 'USD',
      description: `${data.membershipType} membership (WordPress sync)`,
      wordpressOrderId: data.wordpressOrderId,
      wordpressSubscriptionId: data.wordpressSubscriptionId,
      paymentStatus: PaymentStatus.PAID,
      paidAt: data.paidAt,
    } as any);

    await em.persistAndFlush(payment);

    return { payment, membership };
  }

  async getPaymentStats(userId: string): Promise<{
    totalPaid: number;
    totalRefunded: number;
    totalPending: number;
    paymentCount: number;
  }> {
    const em = this.em.fork();

    const payments = await em.find(Payment, { user: userId });

    const stats = payments.reduce(
      (acc, payment) => {
        acc.paymentCount++;
        if (payment.paymentStatus === PaymentStatus.PAID) {
          acc.totalPaid += Number(payment.amount);
        } else if (payment.paymentStatus === PaymentStatus.REFUNDED) {
          acc.totalRefunded += Number(payment.amount);
        } else if (payment.paymentStatus === PaymentStatus.PENDING) {
          acc.totalPending += Number(payment.amount);
        }
        return acc;
      },
      { totalPaid: 0, totalRefunded: 0, totalPending: 0, paymentCount: 0 },
    );

    return stats;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const payment = await em.findOne(Payment, { id });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    if (payment.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Cannot delete a paid payment. Refund it first.');
    }

    await em.removeAndFlush(payment);
  }
}
