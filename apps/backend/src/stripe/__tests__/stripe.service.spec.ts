import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StripeService } from '../stripe.service';
import Stripe from 'stripe';
import {
  createMockPaymentIntent,
  createMockCustomer,
  createMockRefund,
} from '../../../test/mocks/stripe.mock';

// Mock the Stripe module
jest.mock('stripe');

describe('StripeService', () => {
  let service: StripeService;
  let mockStripeInstance: any;

  const originalEnv = process.env;

  beforeEach(async () => {
    // Reset environment
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_mock_key',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_mock_secret',
    };

    // Create mock Stripe instance with jest.fn() methods
    mockStripeInstance = {
      paymentIntents: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
      customers: {
        list: jest.fn(),
        create: jest.fn(),
      },
      refunds: {
        create: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };

    // Mock Stripe constructor
    (Stripe as unknown as jest.Mock).mockImplementation(() => mockStripeInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [StripeService],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    const createPaymentIntentDto = {
      amount: 5000,
      currency: 'usd',
      email: 'test@example.com',
      membershipTypeConfigId: 'config_123',
      membershipTypeName: 'Competitor',
      metadata: { custom_field: 'value' },
    };

    it('should create a payment intent successfully', async () => {
      const mockPaymentIntent = createMockPaymentIntent();
      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await service.createPaymentIntent(createPaymentIntentDto);

      expect(result).toEqual({
        clientSecret: mockPaymentIntent.client_secret,
        paymentIntentId: mockPaymentIntent.id,
      });

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'usd',
        metadata: {
          membershipTypeConfigId: 'config_123',
          membershipTypeName: 'Competitor',
          email: 'test@example.com',
          custom_field: 'value',
        },
        receipt_email: 'test@example.com',
        automatic_payment_methods: {
          enabled: true,
        },
      });
    });

    it('should round amount to ensure integer cents', async () => {
      const mockPaymentIntent = createMockPaymentIntent();
      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      await service.createPaymentIntent({
        ...createPaymentIntentDto,
        amount: 50.99, // Floating point
      });

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 51, // Rounded to integer
        }),
      );
    });

    it('should use USD as default currency when not provided', async () => {
      const mockPaymentIntent = createMockPaymentIntent();
      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      // Create a dto without currency (will default to 'usd')
      const dtoWithoutCurrency = {
        amount: 5000,
        email: 'test@example.com',
        membershipTypeConfigId: 'config_123',
        membershipTypeName: 'Competitor',
      };

      await service.createPaymentIntent(dtoWithoutCurrency as any);

      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'usd',
        }),
      );
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeCardError({
        message: 'Card declined',
        type: 'card_error',
      } as any);
      mockStripeInstance.paymentIntents.create.mockRejectedValue(stripeError);

      await expect(service.createPaymentIntent(createPaymentIntentDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when Stripe is not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      // Create new service instance without Stripe key
      const module: TestingModule = await Test.createTestingModule({
        providers: [StripeService],
      }).compile();
      const unconfiguredService = module.get<StripeService>(StripeService);

      await expect(unconfiguredService.createPaymentIntent(createPaymentIntentDto)).rejects.toThrow(
        'Stripe is not configured',
      );
    });
  });

  describe('getPaymentIntent', () => {
    it('should retrieve a payment intent successfully', async () => {
      const mockPaymentIntent = createMockPaymentIntent();
      mockStripeInstance.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const result = await service.getPaymentIntent('pi_test_123');

      expect(result).toEqual(mockPaymentIntent);
      expect(mockStripeInstance.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_123');
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Payment intent not found',
        type: 'invalid_request_error',
      } as any);
      mockStripeInstance.paymentIntents.retrieve.mockRejectedValue(stripeError);

      await expect(service.getPaymentIntent('pi_invalid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('constructWebhookEvent', () => {
    it('should construct webhook event successfully', () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: {} },
      } as Stripe.Event;
      const payload = Buffer.from('{"type":"payment_intent.succeeded"}');
      const signature = 'test_signature';

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = service.constructWebhookEvent(payload, signature);

      expect(result).toEqual(mockEvent);
      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test_mock_secret',
      );
    });

    it('should throw BadRequestException on invalid signature', () => {
      const payload = Buffer.from('{"type":"payment_intent.succeeded"}');
      const signature = 'invalid_signature';

      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => service.constructWebhookEvent(payload, signature)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when webhook secret is not configured', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const payload = Buffer.from('{"type":"payment_intent.succeeded"}');
      const signature = 'test_signature';

      expect(() => service.constructWebhookEvent(payload, signature)).toThrow(
        'Stripe webhook secret not configured',
      );
    });
  });

  describe('findOrCreateCustomer', () => {
    const email = 'test@example.com';
    const name = 'Test User';

    it('should return existing customer if found', async () => {
      const existingCustomer = createMockCustomer();
      mockStripeInstance.customers.list.mockResolvedValue({
        data: [existingCustomer],
        has_more: false,
        object: 'list',
        url: '/v1/customers',
      });

      const result = await service.findOrCreateCustomer(email, name);

      expect(result).toEqual(existingCustomer);
      expect(mockStripeInstance.customers.list).toHaveBeenCalledWith({
        email: email,
        limit: 1,
      });
      expect(mockStripeInstance.customers.create).not.toHaveBeenCalled();
    });

    it('should create new customer if not found', async () => {
      const newCustomer = createMockCustomer();
      mockStripeInstance.customers.list.mockResolvedValue({
        data: [],
        has_more: false,
        object: 'list',
        url: '/v1/customers',
      });
      mockStripeInstance.customers.create.mockResolvedValue(newCustomer);

      const result = await service.findOrCreateCustomer(email, name);

      expect(result).toEqual(newCustomer);
      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: email,
        name: name,
      });
    });

    it('should create customer without name if not provided', async () => {
      const newCustomer = createMockCustomer();
      mockStripeInstance.customers.list.mockResolvedValue({
        data: [],
        has_more: false,
        object: 'list',
        url: '/v1/customers',
      });
      mockStripeInstance.customers.create.mockResolvedValue(newCustomer);

      await service.findOrCreateCustomer(email);

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: email,
        name: undefined,
      });
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeAPIError({
        message: 'API error',
        type: 'api_error',
      } as any);
      mockStripeInstance.customers.list.mockRejectedValue(stripeError);

      await expect(service.findOrCreateCustomer(email)).rejects.toThrow(BadRequestException);
    });
  });

  describe('createRefund', () => {
    const paymentIntentId = 'pi_test_123';
    const reason = 'Customer requested refund';

    it('should create a refund successfully', async () => {
      const mockRefund = createMockRefund();
      mockStripeInstance.refunds.create.mockResolvedValue(mockRefund);

      const result = await service.createRefund(paymentIntentId, reason);

      expect(result).toEqual(mockRefund);
      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
        metadata: { reason },
      });
    });

    it('should create refund without custom reason metadata', async () => {
      const mockRefund = createMockRefund();
      mockStripeInstance.refunds.create.mockResolvedValue(mockRefund);

      await service.createRefund(paymentIntentId);

      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
        metadata: undefined,
      });
    });

    it('should throw BadRequestException on Stripe error', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        message: 'Refund already exists',
        type: 'invalid_request_error',
      } as any);
      mockStripeInstance.refunds.create.mockRejectedValue(stripeError);

      await expect(service.createRefund(paymentIntentId)).rejects.toThrow(BadRequestException);
    });
  });
});
