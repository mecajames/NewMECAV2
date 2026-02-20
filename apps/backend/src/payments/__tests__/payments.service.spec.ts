import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PaymentsService } from '../payments.service';
import { Payment } from '../payments.entity';
import { Profile } from '../../profiles/profiles.entity';
import { Membership } from '../../memberships/memberships.entity';
import { PaymentStatus, PaymentMethod, PaymentType } from '@newmeca/shared';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { createMockPayment } from '../../../test/utils/test-utils';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockEm: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    mockEm = createMockEntityManager();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: 'EntityManager',
          useValue: mockEm,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('should return a payment when found', async () => {
      const mockPayment = createMockPayment({ id: 'payment-1' });
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      const result = await service.findById('payment-1');

      expect(result).toEqual(mockPayment);
      expect(mockEm.findOne).toHaveBeenCalledWith(
        Payment,
        { id: 'payment-1' },
        { populate: ['user', 'membership'] },
      );
    });

    it('should throw NotFoundException when payment is not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        new NotFoundException('Payment with ID nonexistent not found'),
      );
    });

    it('should fork the entity manager', async () => {
      mockEm.findOne.mockResolvedValueOnce(createMockPayment() as any);

      await service.findById('payment-1');

      expect(mockEm.fork).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // findByUser
  // ---------------------------------------------------------------------------
  describe('findByUser', () => {
    it('should return paginated payments for a user', async () => {
      const payments = [
        createMockPayment({ id: 'p1' }),
        createMockPayment({ id: 'p2' }),
      ];
      mockEm.find.mockResolvedValueOnce(payments as any);

      const result = await service.findByUser('user-1', 1, 10);

      expect(result).toEqual(payments);
      expect(mockEm.find).toHaveBeenCalledWith(
        Payment,
        { user: 'user-1' },
        {
          populate: ['user', 'membership'],
          limit: 10,
          offset: 0,
          orderBy: { createdAt: 'DESC' },
        },
      );
    });

    it('should calculate correct offset for page 2', async () => {
      mockEm.find.mockResolvedValueOnce([]);

      await service.findByUser('user-1', 2, 10);

      expect(mockEm.find).toHaveBeenCalledWith(
        Payment,
        { user: 'user-1' },
        expect.objectContaining({
          limit: 10,
          offset: 10,
        }),
      );
    });

    it('should calculate correct offset for page 3 with limit 5', async () => {
      mockEm.find.mockResolvedValueOnce([]);

      await service.findByUser('user-1', 3, 5);

      expect(mockEm.find).toHaveBeenCalledWith(
        Payment,
        { user: 'user-1' },
        expect.objectContaining({
          limit: 5,
          offset: 10,
        }),
      );
    });

    it('should use default page=1 and limit=10 when not specified', async () => {
      mockEm.find.mockResolvedValueOnce([]);

      await service.findByUser('user-1');

      expect(mockEm.find).toHaveBeenCalledWith(
        Payment,
        { user: 'user-1' },
        expect.objectContaining({
          limit: 10,
          offset: 0,
        }),
      );
    });

    it('should return an empty array when no payments exist', async () => {
      mockEm.find.mockResolvedValueOnce([]);

      const result = await service.findByUser('user-1');

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findByMembership
  // ---------------------------------------------------------------------------
  describe('findByMembership', () => {
    it('should return payments for a membership', async () => {
      const payments = [createMockPayment({ id: 'p1' })];
      mockEm.find.mockResolvedValueOnce(payments as any);

      const result = await service.findByMembership('membership-1');

      expect(result).toEqual(payments);
      expect(mockEm.find).toHaveBeenCalledWith(
        Payment,
        { membership: 'membership-1' },
        {
          populate: ['user', 'membership'],
          orderBy: { createdAt: 'DESC' },
        },
      );
    });

    it('should return an empty array when no payments exist for membership', async () => {
      mockEm.find.mockResolvedValueOnce([]);

      const result = await service.findByMembership('membership-1');

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findByTransactionId
  // ---------------------------------------------------------------------------
  describe('findByTransactionId', () => {
    it('should return a payment when found by transactionId', async () => {
      const mockPayment = createMockPayment({ id: 'p1' });
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      const result = await service.findByTransactionId('txn_123');

      expect(result).toEqual(mockPayment);
      expect(mockEm.findOne).toHaveBeenCalledWith(Payment, { transactionId: 'txn_123' });
    });

    it('should return null when no payment matches transactionId', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      const result = await service.findByTransactionId('txn_nonexistent');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findByStripePaymentIntent
  // ---------------------------------------------------------------------------
  describe('findByStripePaymentIntent', () => {
    it('should return a payment when found by stripePaymentIntentId', async () => {
      const mockPayment = createMockPayment({ id: 'p1' });
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      const result = await service.findByStripePaymentIntent('pi_test_123');

      expect(result).toEqual(mockPayment);
      expect(mockEm.findOne).toHaveBeenCalledWith(Payment, {
        stripePaymentIntentId: 'pi_test_123',
      });
    });

    it('should return null when no payment matches stripePaymentIntentId', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      const result = await service.findByStripePaymentIntent('pi_nonexistent');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findByWordpressOrderId
  // ---------------------------------------------------------------------------
  describe('findByWordpressOrderId', () => {
    it('should return a payment when found by wordpressOrderId', async () => {
      const mockPayment = createMockPayment({ id: 'p1' });
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      const result = await service.findByWordpressOrderId('wp_order_123');

      expect(result).toEqual(mockPayment);
      expect(mockEm.findOne).toHaveBeenCalledWith(Payment, {
        wordpressOrderId: 'wp_order_123',
      });
    });

    it('should return null when no payment matches wordpressOrderId', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      const result = await service.findByWordpressOrderId('wp_nonexistent');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    const createPaymentData = {
      userId: 'user-1',
      paymentType: PaymentType.MEMBERSHIP,
      paymentMethod: PaymentMethod.STRIPE,
      amount: 50,
      currency: 'USD',
      description: 'Membership payment',
    };

    it('should create a payment with PENDING status', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const createdPayment = createMockPayment({
        id: 'new-payment',
        paymentStatus: PaymentStatus.PENDING,
      });

      mockEm.findOne.mockResolvedValueOnce(mockUser as any); // user lookup
      mockEm.create.mockReturnValueOnce(createdPayment as any);

      const result = await service.create(createPaymentData);

      expect(result).toEqual(createdPayment);
      expect(mockEm.create).toHaveBeenCalledWith(
        Payment,
        expect.objectContaining({
          user: mockUser,
          paymentType: PaymentType.MEMBERSHIP,
          paymentMethod: PaymentMethod.STRIPE,
          amount: 50,
          currency: 'USD',
          paymentStatus: PaymentStatus.PENDING,
        }),
      );
      expect(mockEm.persistAndFlush).toHaveBeenCalledWith(createdPayment);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockEm.findOne.mockResolvedValueOnce(null); // user not found

      await expect(service.create(createPaymentData)).rejects.toThrow(
        new NotFoundException('User with ID user-1 not found'),
      );
    });

    it('should create payment with membership reference when membershipId is provided', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockMembership = { id: 'membership-1', user: 'user-1' };
      const membershipRef = { id: 'membership-1' };
      const createdPayment = createMockPayment({ id: 'new-payment' });

      // First findOne: user lookup; Second findOne: membership lookup
      mockEm.findOne
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockMembership as any);
      mockEm.getReference.mockReturnValueOnce(membershipRef as any);
      mockEm.create.mockReturnValueOnce(createdPayment as any);

      await service.create({
        ...createPaymentData,
        membershipId: 'membership-1',
      });

      expect(mockEm.findOne).toHaveBeenCalledWith(Profile, { id: 'user-1' });
      expect(mockEm.findOne).toHaveBeenCalledWith(Membership, {
        id: 'membership-1',
        user: 'user-1',
      });
      expect(mockEm.getReference).toHaveBeenCalledWith(Membership, 'membership-1');
      expect(mockEm.create).toHaveBeenCalledWith(
        Payment,
        expect.objectContaining({
          membership: membershipRef,
        }),
      );
    });

    it('should throw NotFoundException when membership does not belong to user', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };

      mockEm.findOne
        .mockResolvedValueOnce(mockUser as any) // user found
        .mockResolvedValueOnce(null); // membership not found

      await expect(
        service.create({
          ...createPaymentData,
          membershipId: 'membership-999',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should default currency to USD when not specified', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const createdPayment = createMockPayment();

      mockEm.findOne.mockResolvedValueOnce(mockUser as any);
      mockEm.create.mockReturnValueOnce(createdPayment as any);

      const dataWithoutCurrency = { ...createPaymentData };
      delete (dataWithoutCurrency as any).currency;

      await service.create(dataWithoutCurrency);

      expect(mockEm.create).toHaveBeenCalledWith(
        Payment,
        expect.objectContaining({
          currency: 'USD',
        }),
      );
    });

    it('should pass optional stripe and wordpress fields when provided', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const createdPayment = createMockPayment();

      mockEm.findOne.mockResolvedValueOnce(mockUser as any);
      mockEm.create.mockReturnValueOnce(createdPayment as any);

      await service.create({
        ...createPaymentData,
        stripePaymentIntentId: 'pi_test_abc',
        stripeCustomerId: 'cus_test_abc',
        wordpressOrderId: 'wp_123',
        wordpressSubscriptionId: 'wp_sub_123',
        transactionId: 'txn_abc',
        externalPaymentId: 'ext_123',
        paymentMetadata: { key: 'value' },
      });

      expect(mockEm.create).toHaveBeenCalledWith(
        Payment,
        expect.objectContaining({
          stripePaymentIntentId: 'pi_test_abc',
          stripeCustomerId: 'cus_test_abc',
          wordpressOrderId: 'wp_123',
          wordpressSubscriptionId: 'wp_sub_123',
          transactionId: 'txn_abc',
          externalPaymentId: 'ext_123',
          paymentMetadata: { key: 'value' },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // processPayment
  // ---------------------------------------------------------------------------
  describe('processPayment', () => {
    it('should mark a PENDING payment as PAID', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.PENDING,
        membership: null,
        paidAt: undefined as Date | undefined,
        transactionId: undefined as string | undefined,
      };
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      const result = await service.processPayment({ paymentId: 'payment-1' });

      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(result.paidAt).toBeInstanceOf(Date);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should throw NotFoundException when payment is not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(
        service.processPayment({ paymentId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when payment is already PAID', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.PAID,
      };
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      await expect(
        service.processPayment({ paymentId: 'payment-1' }),
      ).rejects.toThrow(new BadRequestException('Payment has already been processed'));
    });

    it('should throw BadRequestException when payment is REFUNDED', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.REFUNDED,
      };
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      await expect(
        service.processPayment({ paymentId: 'payment-1' }),
      ).rejects.toThrow(new BadRequestException('Cannot process a refunded payment'));
    });

    it('should use provided paidAt date', async () => {
      const customDate = new Date('2026-01-15T12:00:00Z');
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.PENDING,
        membership: null,
        paidAt: undefined as Date | undefined,
      };
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      const result = await service.processPayment({
        paymentId: 'payment-1',
        paidAt: customDate,
      });

      expect(result.paidAt).toEqual(customDate);
    });

    it('should update transactionId when provided', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.PENDING,
        membership: null,
        paidAt: undefined as Date | undefined,
        transactionId: undefined as string | undefined,
      };
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      const result = await service.processPayment({
        paymentId: 'payment-1',
        transactionId: 'txn_new_123',
      });

      expect(result.transactionId).toBe('txn_new_123');
    });

    it('should update linked membership when payment has a membership', async () => {
      const mockMembership = {
        id: 'membership-1',
        paymentStatus: PaymentStatus.PENDING,
        transactionId: undefined as string | undefined,
      };
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.PENDING,
        membership: { id: 'membership-1' },
        paidAt: undefined as Date | undefined,
        transactionId: 'txn_123',
      };

      // First findOne: payment lookup; Second findOne: membership lookup
      mockEm.findOne
        .mockResolvedValueOnce(mockPayment as any)
        .mockResolvedValueOnce(mockMembership as any);

      await service.processPayment({ paymentId: 'payment-1' });

      expect(mockMembership.paymentStatus).toBe(PaymentStatus.PAID);
      expect(mockMembership.transactionId).toBe('txn_123');
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should not fail if linked membership is not found in DB', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.PENDING,
        membership: { id: 'membership-gone' },
        paidAt: undefined as Date | undefined,
      };

      mockEm.findOne
        .mockResolvedValueOnce(mockPayment as any) // payment found
        .mockResolvedValueOnce(null); // membership not found

      const result = await service.processPayment({ paymentId: 'payment-1' });

      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(mockEm.flush).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // refundPayment
  // ---------------------------------------------------------------------------
  describe('refundPayment', () => {
    it('should mark a PAID payment as REFUNDED', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.PAID,
        membership: null,
        refundedAt: undefined as Date | undefined,
        refundReason: undefined as string | undefined,
      };
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      const result = await service.refundPayment({
        paymentId: 'payment-1',
        reason: 'Customer requested',
      });

      expect(result.paymentStatus).toBe(PaymentStatus.REFUNDED);
      expect(result.refundedAt).toBeInstanceOf(Date);
      expect(result.refundReason).toBe('Customer requested');
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should throw NotFoundException when payment is not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(
        service.refundPayment({ paymentId: 'nonexistent', reason: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when payment is not PAID', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.PENDING,
      };
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      await expect(
        service.refundPayment({ paymentId: 'payment-1', reason: 'Test' }),
      ).rejects.toThrow(new BadRequestException('Only paid payments can be refunded'));
    });

    it('should throw BadRequestException when payment is FAILED', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.FAILED,
      };
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      await expect(
        service.refundPayment({ paymentId: 'payment-1', reason: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update linked membership status to REFUNDED', async () => {
      const mockMembership = {
        id: 'membership-1',
        paymentStatus: PaymentStatus.PAID,
      };
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.PAID,
        membership: { id: 'membership-1' },
        refundedAt: undefined as Date | undefined,
        refundReason: undefined as string | undefined,
      };

      mockEm.findOne
        .mockResolvedValueOnce(mockPayment as any)
        .mockResolvedValueOnce(mockMembership as any);

      await service.refundPayment({
        paymentId: 'payment-1',
        reason: 'Duplicate charge',
      });

      expect(mockMembership.paymentStatus).toBe(PaymentStatus.REFUNDED);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should not fail if linked membership is not found in DB', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.PAID,
        membership: { id: 'membership-gone' },
        refundedAt: undefined as Date | undefined,
        refundReason: undefined as string | undefined,
      };

      mockEm.findOne
        .mockResolvedValueOnce(mockPayment as any) // payment found
        .mockResolvedValueOnce(null); // membership not found

      const result = await service.refundPayment({
        paymentId: 'payment-1',
        reason: 'Test',
      });

      expect(result.paymentStatus).toBe(PaymentStatus.REFUNDED);
      expect(mockEm.flush).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getPaymentStats
  // ---------------------------------------------------------------------------
  describe('getPaymentStats', () => {
    it('should calculate correct stats for mixed payment statuses', async () => {
      const payments = [
        { paymentStatus: PaymentStatus.PAID, amount: 50 },
        { paymentStatus: PaymentStatus.PAID, amount: 100 },
        { paymentStatus: PaymentStatus.REFUNDED, amount: 25 },
        { paymentStatus: PaymentStatus.PENDING, amount: 75 },
        { paymentStatus: PaymentStatus.FAILED, amount: 30 },
      ];
      mockEm.find.mockResolvedValueOnce(payments as any);

      const result = await service.getPaymentStats('user-1');

      expect(result).toEqual({
        totalPaid: 150,
        totalRefunded: 25,
        totalPending: 75,
        paymentCount: 5,
      });
      expect(mockEm.find).toHaveBeenCalledWith(Payment, { user: 'user-1' });
    });

    it('should return zeros when user has no payments', async () => {
      mockEm.find.mockResolvedValueOnce([]);

      const result = await service.getPaymentStats('user-1');

      expect(result).toEqual({
        totalPaid: 0,
        totalRefunded: 0,
        totalPending: 0,
        paymentCount: 0,
      });
    });

    it('should handle string amounts (decimal type coercion)', async () => {
      const payments = [
        { paymentStatus: PaymentStatus.PAID, amount: '49.99' },
        { paymentStatus: PaymentStatus.PAID, amount: '100.01' },
      ];
      mockEm.find.mockResolvedValueOnce(payments as any);

      const result = await service.getPaymentStats('user-1');

      expect(result.totalPaid).toBe(150);
      expect(result.paymentCount).toBe(2);
    });

    it('should only count PAID, REFUNDED, and PENDING toward respective totals', async () => {
      const payments = [
        { paymentStatus: PaymentStatus.FAILED, amount: 200 },
        { paymentStatus: PaymentStatus.CANCELLED, amount: 300 },
      ];
      mockEm.find.mockResolvedValueOnce(payments as any);

      const result = await service.getPaymentStats('user-1');

      expect(result.totalPaid).toBe(0);
      expect(result.totalRefunded).toBe(0);
      expect(result.totalPending).toBe(0);
      expect(result.paymentCount).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('should delete a PENDING payment', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.PENDING,
      };
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      await service.delete('payment-1');

      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(mockPayment);
    });

    it('should delete a FAILED payment', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.FAILED,
      };
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      await service.delete('payment-1');

      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(mockPayment);
    });

    it('should delete a REFUNDED payment', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.REFUNDED,
      };
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      await service.delete('payment-1');

      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(mockPayment);
    });

    it('should throw NotFoundException when payment is not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        new NotFoundException('Payment with ID nonexistent not found'),
      );
    });

    it('should throw BadRequestException when trying to delete a PAID payment', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.PAID,
      };
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      await expect(service.delete('payment-1')).rejects.toThrow(
        new BadRequestException('Cannot delete a paid payment. Refund it first.'),
      );
    });

    it('should not call removeAndFlush when payment is PAID', async () => {
      const mockPayment = {
        id: 'payment-1',
        paymentStatus: PaymentStatus.PAID,
      };
      mockEm.findOne.mockResolvedValueOnce(mockPayment as any);

      await expect(service.delete('payment-1')).rejects.toThrow(BadRequestException);

      expect(mockEm.removeAndFlush).not.toHaveBeenCalled();
    });
  });
});
