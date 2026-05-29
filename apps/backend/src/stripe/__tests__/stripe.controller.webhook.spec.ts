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
import { MasterSecondaryService } from '../../memberships/master-secondary.service';
import { MecaIdService } from '../../memberships/meca-id.service';
import { MembershipSyncService } from '../../memberships/membership-sync.service';
import { TaxService } from '../../tax/tax.service';
import { CouponsService } from '../../coupons/coupons.service';
import { AdminNotificationsService } from '../../admin-notifications/admin-notifications.service';
import { EmailService } from '../../email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { WorldFinalsService } from '../../world-finals/world-finals.service';
import { PaymentFulfillmentService } from '../../payments/payment-fulfillment.service';
import { Membership } from '../../memberships/memberships.entity';
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
  let mockMasterSecondaryService: any;
  let mockMecaIdService: any;
  let mockMembershipSyncService: any;
  let mockTaxService: any;
  let mockCouponsService: any;
  let mockAdminNotificationsService: any;
  let mockEmailService: any;
  let mockNotificationsService: any;
  let mockWorldFinalsService: any;
  let mockPaymentFulfillmentService: any;
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

    mockMasterSecondaryService = {
      createSecondaryMemberships: jest.fn(),
    };

    mockMecaIdService = {
      assignMecaId: jest.fn(),
    };

    mockMembershipSyncService = {
      syncMembershipStatus: jest.fn(),
    };

    mockTaxService = { calculateTax: jest.fn() };
    mockCouponsService = { validateCoupon: jest.fn(), redeemCoupon: jest.fn() };
    mockAdminNotificationsService = {
      notifySubscriptionRenewal: jest.fn().mockResolvedValue(undefined),
      notifySubscriptionCancelled: jest.fn().mockResolvedValue(undefined),
      notifyInvoicePaymentFailed: jest.fn().mockResolvedValue(undefined),
    };
    mockEmailService = {
      sendMembershipRenewalEmail: jest.fn().mockResolvedValue(undefined),
      sendSubscriptionCancelledEmail: jest.fn().mockResolvedValue(undefined),
    };
    mockNotificationsService = { create: jest.fn() };
    mockWorldFinalsService = { markPreRegistrationPaid: jest.fn() };
    mockPaymentFulfillmentService = {
      fulfillMembershipPayment: jest.fn().mockResolvedValue(undefined),
      fulfillEventRegistrationPayment: jest.fn().mockResolvedValue(undefined),
      fulfillInvoicePayment: jest.fn().mockResolvedValue(undefined),
      fulfillShopPayment: jest.fn().mockResolvedValue(undefined),
      fulfillTeamUpgradePayment: jest.fn().mockResolvedValue(undefined),
      recordSubscriptionPayment: jest.fn().mockResolvedValue(null),
    };

    mockEm = createMockEntityManager();
    // handleInvoicePaid populates the membership after writing the ledger row.
    (mockEm as any).populate = jest.fn().mockResolvedValue(undefined);

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
        { provide: MasterSecondaryService, useValue: mockMasterSecondaryService },
        { provide: MecaIdService, useValue: mockMecaIdService },
        { provide: MembershipSyncService, useValue: mockMembershipSyncService },
        { provide: TaxService, useValue: mockTaxService },
        { provide: CouponsService, useValue: mockCouponsService },
        { provide: AdminNotificationsService, useValue: mockAdminNotificationsService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: WorldFinalsService, useValue: mockWorldFinalsService },
        { provide: PaymentFulfillmentService, useValue: mockPaymentFulfillmentService },
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

      // Dedup is enforced by a unique-constraint violation when inserting the
      // ProcessedWebhookEvent (not a prior findOne), so simulate that here.
      mockEm.persistAndFlush.mockRejectedValueOnce({ code: '23505', message: 'duplicate key value' });

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true, message: 'Already processed' });
      expect(mockPaymentFulfillmentService.fulfillMembershipPayment).not.toHaveBeenCalled();
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

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      // Controller delegates fulfillment to PaymentFulfillmentService.
      expect(mockPaymentFulfillmentService.fulfillMembershipPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: paymentIntent.id,
          metadata: expect.objectContaining({
            userId: 'user_123',
            membershipTypeConfigId: 'config_123',
          }),
        }),
      );
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

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      expect(mockPaymentFulfillmentService.fulfillEventRegistrationPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: paymentIntent.id,
          metadata: expect.objectContaining({ registrationId: 'reg_123' }),
        }),
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

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      expect(mockPaymentFulfillmentService.fulfillTeamUpgradePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: paymentIntent.id,
          metadata: expect.objectContaining({ membershipId: 'membership_123', teamName: 'Test Team' }),
        }),
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

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      expect(mockPaymentFulfillmentService.fulfillInvoicePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: paymentIntent.id,
          metadata: expect.objectContaining({ invoiceId: 'invoice_123' }),
        }),
      );
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

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      // Controller delegates to fulfillShopPayment, passing the charge id through metadata.
      expect(mockPaymentFulfillmentService.fulfillShopPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: paymentIntent.id,
          metadata: expect.objectContaining({ orderId: 'shop_order_123', chargeId: 'ch_test_123' }),
        }),
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

    it('writes an enriched billing record on invoice.paid subscription renewal', async () => {
      const invoice = {
        id: 'in_test_1',
        subscription: 'sub_test_1',
        billing_reason: 'subscription_cycle',
        amount_paid: 4000,
        currency: 'usd',
        customer: 'cus_test_1',
        payment_intent: 'pi_test_1',
        charge: 'ch_test_1',
      };
      const event = createMockWebhookEvent('invoice.paid', invoice);
      mockStripeService.constructWebhookEvent.mockReturnValue(event);

      const membership = {
        id: 'mem_1',
        endDate: new Date('2026-01-01T00:00:00Z'),
        user: { id: 'user_1', email: 'r@example.com' },
        mecaId: 123,
      };
      // ProcessedWebhookEvent dedup check → null; Membership lookup → membership.
      mockEm.findOne.mockImplementation(async (entity: any) => {
        if (entity === Membership) return membership;
        return null;
      });

      const req = createMockRequest(mockRawBody);
      const result = await controller.handleWebhook(req as any, mockSignature);

      expect(result).toEqual({ received: true });
      expect(mockPaymentFulfillmentService.recordSubscriptionPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          membershipId: 'mem_1',
          invoiceId: 'in_test_1',
          subscriptionId: 'sub_test_1',
          paymentIntentId: 'pi_test_1',
          chargeId: 'ch_test_1',
          customerId: 'cus_test_1',
          source: 'stripe_invoice_paid_webhook',
        }),
      );
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

      // Simulate error during fulfillment
      const errorMessage = 'Database connection failed';
      mockPaymentFulfillmentService.fulfillMembershipPayment.mockRejectedValue(new Error(errorMessage));

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

      const req = createMockRequest(mockRawBody);
      await controller.handleWebhook(req as any, mockSignature);

      // Should default to the membership fulfillment path.
      expect(mockPaymentFulfillmentService.fulfillMembershipPayment).toHaveBeenCalled();
    });
  });
});
