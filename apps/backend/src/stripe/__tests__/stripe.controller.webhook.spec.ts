import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StripeController } from '../stripe.controller';
import { StripeService } from '../stripe.service';
import { MembershipsService } from '../../memberships/memberships.service';
import { QuickBooksService } from '../../quickbooks/quickbooks.service';
import { EventRegistrationsService } from '../../event-registrations/event-registrations.service';
import { OrdersService } from '../../orders/orders.service';
import { InvoicesService } from '../../invoices/invoices.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { ShopService } from '../../shop/shop.service';
import { ProcessedWebhookEvent } from '../processed-webhook-event.entity';
import { StripePaymentType } from '@newmeca/shared';
import {
  createMockPaymentIntent,
  createMockWebhookEvent,
  createMockCharge,
  createMockDispute,
} from '../../../test/mocks/stripe.mock';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';

describe('StripeController - Webhook Handler', () => {
  let controller: StripeController;
  let mockStripeService: any;
  let mockMembershipsService: any;
  let mockQuickBooksService: any;
  let mockEventRegistrationsService: any;
  let mockOrdersService: any;
  let mockInvoicesService: any;
  let mockSupabaseAdminService: any;
  let mockShopService: any;
  let mockEm: any;

  beforeEach(async () => {
    // Create mocks with any type to avoid strict TypeScript issues
    mockStripeService = {
      createPaymentIntent: jest.fn(),
      getPaymentIntent: jest.fn(),
      constructWebhookEvent: jest.fn(),
      findOrCreateCustomer: jest.fn(),
      createRefund: jest.fn(),
    };

    mockMembershipsService = {
      createMembership: jest.fn(),
      applyTeamUpgrade: jest.fn(),
    };

    mockQuickBooksService = {
      createSalesReceipt: jest.fn(),
    };

    mockEventRegistrationsService = {
      confirmPayment: jest.fn(),
      completeRegistration: jest.fn(),
    };

    mockOrdersService = {
      createFromPayment: jest.fn(),
      updateStatus: jest.fn(),
    };

    mockInvoicesService = {
      createFromOrder: jest.fn(),
      markAsPaid: jest.fn(),
    };

    mockSupabaseAdminService = {
      getClient: jest.fn(),
    };

    mockShopService = {
      validateAndCalculateOrder: jest.fn(),
      findOrderByPaymentIntentId: jest.fn(),
      markOrderAsPaid: jest.fn(),
      processPaymentSuccess: jest.fn(),
      findOrderById: jest.fn(),
    };

    mockEm = createMockEntityManager();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeController],
      providers: [
        { provide: StripeService, useValue: mockStripeService },
        { provide: MembershipsService, useValue: mockMembershipsService },
        { provide: QuickBooksService, useValue: mockQuickBooksService },
        { provide: EventRegistrationsService, useValue: mockEventRegistrationsService },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: InvoicesService, useValue: mockInvoicesService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdminService },
        { provide: ShopService, useValue: mockShopService },
        { provide: 'EntityManager', useValue: mockEm },
      ],
    }).compile();

    controller = module.get<StripeController>(StripeController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleWebhook', () => {
    const mockRawBody = Buffer.from('{"test":"body"}');
    const mockSignature = 'test_signature';

    const createMockRequest = (rawBody: Buffer | undefined) => ({
      rawBody,
    });

    it('should throw BadRequestException if signature is missing', async () => {
      const req = createMockRequest(mockRawBody);

      await expect(controller.handleWebhook(req as any, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if raw body is missing', async () => {
      const req = createMockRequest(undefined);

      await expect(controller.handleWebhook(req as any, mockSignature)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should skip already processed webhook events (idempotency)', async () => {
      const paymentIntent = createMockPaymentIntent();
      const event = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);
      mockStripeService.constructWebhookEvent.mockReturnValue(event);

      // Simulate already processed event
      const existingProcessedEvent = new ProcessedWebhookEvent();
      existingProcessedEvent.stripeEventId = event.id;
      mockEm.findOne.mockResolvedValue(existingProcessedEvent);

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true, message: 'Already processed' });
      expect(mockMembershipsService.createMembership).not.toHaveBeenCalled();
    });

    it('should process payment_intent.succeeded for membership payment', async () => {
      const paymentIntent = createMockPaymentIntent({
        metadata: {
          paymentType: StripePaymentType.MEMBERSHIP,
          email: 'test@example.com',
          membershipTypeConfigId: 'config_123',
          userId: 'user_123',
        },
      });
      const event = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);
      mockStripeService.constructWebhookEvent.mockReturnValue(event);
      mockEm.findOne.mockResolvedValue(null); // Not already processed

      mockMembershipsService.createMembership.mockResolvedValue({});
      mockOrdersService.createFromPayment.mockResolvedValue({ id: 'order_123' });
      mockInvoicesService.createFromOrder.mockResolvedValue({ id: 'invoice_123' });

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      expect(mockMembershipsService.createMembership).toHaveBeenCalled();
      expect(mockEm.persistAndFlush).toHaveBeenCalled();
    });

    it('should process payment_intent.succeeded for event registration', async () => {
      const paymentIntent = createMockPaymentIntent({
        metadata: {
          paymentType: StripePaymentType.EVENT_REGISTRATION,
          registrationId: 'reg_123',
          email: 'test@example.com',
        },
      });
      const event = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);
      mockStripeService.constructWebhookEvent.mockReturnValue(event);
      mockEm.findOne.mockResolvedValue(null);

      mockEventRegistrationsService.completeRegistration.mockResolvedValue({});

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      // Controller calls completeRegistration with registrationId, paymentIntentId, amountPaid, membershipId
      expect(mockEventRegistrationsService.completeRegistration).toHaveBeenCalledWith(
        'reg_123',
        paymentIntent.id,
        expect.any(Number), // amountPaid
        undefined, // membershipId (no membership included)
      );
    });

    it('should process payment_intent.succeeded for team upgrade', async () => {
      const paymentIntent = createMockPaymentIntent({
        metadata: {
          paymentType: StripePaymentType.TEAM_UPGRADE,
          membershipId: 'membership_123',
          teamName: 'Test Team',
          userId: 'user_123',
        },
      });
      const event = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);
      mockStripeService.constructWebhookEvent.mockReturnValue(event);
      mockEm.findOne.mockResolvedValue(null);

      mockMembershipsService.applyTeamUpgrade.mockResolvedValue({});
      mockOrdersService.createFromPayment.mockResolvedValue({ id: 'order_123' });

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      expect(mockMembershipsService.applyTeamUpgrade).toHaveBeenCalledWith(
        'membership_123',
        'Test Team',
        undefined, // teamDescription
      );
    });

    it('should process payment_intent.succeeded for invoice payment', async () => {
      const paymentIntent = createMockPaymentIntent({
        metadata: {
          paymentType: StripePaymentType.INVOICE_PAYMENT,
          invoiceId: 'invoice_123',
        },
      });
      const event = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);
      mockStripeService.constructWebhookEvent.mockReturnValue(event);
      mockEm.findOne.mockResolvedValue(null);

      // Mock the invoice response with order relation
      mockInvoicesService.markAsPaid.mockResolvedValue({
        invoiceNumber: 'INV-001',
        order: { id: 'order_123' },
      });

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      // Controller calls markAsPaid with just invoiceId
      expect(mockInvoicesService.markAsPaid).toHaveBeenCalledWith('invoice_123');
    });

    it('should process payment_intent.succeeded for shop order', async () => {
      const paymentIntent = createMockPaymentIntent({
        latest_charge: 'ch_test_123',
        metadata: {
          paymentType: StripePaymentType.SHOP,
          orderId: 'shop_order_123',
        },
      });
      const event = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);
      mockStripeService.constructWebhookEvent.mockReturnValue(event);
      mockEm.findOne.mockResolvedValue(null);

      // Mock the shop order response
      mockShopService.processPaymentSuccess.mockResolvedValue({
        orderNumber: 'SHOP-001',
      });

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      // Controller calls processPaymentSuccess with paymentIntentId and chargeId
      expect(mockShopService.processPaymentSuccess).toHaveBeenCalledWith(
        paymentIntent.id,
        'ch_test_123', // latest_charge
      );
    });

    it('should handle charge.refunded event', async () => {
      const charge = createMockCharge({
        payment_intent: 'pi_test_123',
        amount_refunded: 5000,
      });
      const event = createMockWebhookEvent('charge.refunded', charge);
      mockStripeService.constructWebhookEvent.mockReturnValue(event);
      mockEm.findOne.mockResolvedValue(null);

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      // Verify the processed event was persisted
      expect(mockEm.persistAndFlush).toHaveBeenCalled();
    });

    it('should handle charge.dispute.created event', async () => {
      const dispute = createMockDispute({
        payment_intent: 'pi_test_123',
        reason: 'fraudulent',
        amount: 5000,
      });
      const event = createMockWebhookEvent('charge.dispute.created', dispute);
      mockStripeService.constructWebhookEvent.mockReturnValue(event);
      mockEm.findOne.mockResolvedValue(null);

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      expect(mockEm.persistAndFlush).toHaveBeenCalled();
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const paymentIntent = createMockPaymentIntent({
        status: 'canceled',
        last_payment_error: {
          message: 'Card declined',
          type: 'card_error',
          code: 'card_declined',
        } as any,
      });
      const event = createMockWebhookEvent('payment_intent.payment_failed', paymentIntent);
      mockStripeService.constructWebhookEvent.mockReturnValue(event);
      mockEm.findOne.mockResolvedValue(null);

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      expect(mockEm.persistAndFlush).toHaveBeenCalled();
    });

    it('should handle unhandled event types gracefully', async () => {
      const event = createMockWebhookEvent('customer.created', { id: 'cus_test' });
      mockStripeService.constructWebhookEvent.mockReturnValue(event);
      mockEm.findOne.mockResolvedValue(null);

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      // Should still persist the event but mark as unhandled
      expect(mockEm.persistAndFlush).toHaveBeenCalled();
    });

    it('should persist error info when handler throws', async () => {
      const paymentIntent = createMockPaymentIntent({
        metadata: {
          paymentType: StripePaymentType.MEMBERSHIP,
          email: 'test@example.com',
          membershipTypeConfigId: 'config_123',
          userId: 'user_123',
        },
      });
      const event = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);
      mockStripeService.constructWebhookEvent.mockReturnValue(event);
      mockEm.findOne.mockResolvedValue(null);

      // Simulate error in membership creation
      const errorMessage = 'Database connection failed';
      mockMembershipsService.createMembership.mockRejectedValue(new Error(errorMessage));

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      // Should still return received: true (webhook acknowledged)
      expect(result).toEqual({ received: true });

      // Verify the error was captured in the persisted event
      expect(mockEm.persistAndFlush).toHaveBeenCalled();
    });

    it('should default to membership payment when paymentType is not specified', async () => {
      const paymentIntent = createMockPaymentIntent({
        metadata: {
          // No paymentType specified
          email: 'test@example.com',
          membershipTypeConfigId: 'config_123',
          userId: 'user_123',
        },
      });
      const event = createMockWebhookEvent('payment_intent.succeeded', paymentIntent);
      mockStripeService.constructWebhookEvent.mockReturnValue(event);
      mockEm.findOne.mockResolvedValue(null);

      mockMembershipsService.createMembership.mockResolvedValue({});

      const req = createMockRequest(mockRawBody);
      await controller.handleWebhook(req as any, mockSignature);

      // Should have called membership handler (default)
      expect(mockMembershipsService.createMembership).toHaveBeenCalled();
    });
  });
});
