/**
 * Verifies the renewal-token bookkeeping in PaymentFulfillmentService.
 *
 * Specifically: when fulfillMembershipPayment runs with PaymentMethod.PAYPAL
 * (i.e. the PayPal capture endpoint called us) AND the metadata carries a
 * `renewalTokenId`, the renewal token must be marked used after the
 * membership is created — same behavior as the Stripe path. This is the
 * unit-level cover that the user flagged was missing for PayPal.
 *
 * We mock every dependency the fulfillment service touches and assert the
 * side effects we care about. We're NOT exercising createMembership's own
 * logic (which has its own tests) — only the renewal-bookkeeping wiring.
 */
import { PaymentMethod } from '@newmeca/shared';

describe('PaymentFulfillmentService.fulfillMembershipPayment — renewal token bookkeeping', () => {
  // Build a fresh service per test with our own mocks. Importing the class
  // dynamically inside the test avoids decorator hoisting issues.
  function makeService(opts: {
    existingMembershipForTxn?: any;
    existingPayment?: any;
    createdMembership?: any;
  } = {}) {
    const renewalTokenService = { markUsed: jest.fn().mockResolvedValue(undefined) };
    const membershipsService = {
      createMembership: jest.fn().mockResolvedValue(
        opts.createdMembership ?? {
          id: 'new-m',
          mecaId: 700321,
          user: { id: 'u1', email: 'james@mecacaraudio.com' },
        },
      ),
    };
    const adminNotificationsService = {
      notifyNewMembership: jest.fn().mockResolvedValue(undefined),
    };

    const emFork = {
      findOne: jest.fn(async (entityName: any, where: any) => {
        if (typeof entityName === 'function') {
          // Idempotency checks
          if (where?.transactionId) return opts.existingMembershipForTxn ?? null;
          if (where?.$or) return opts.existingPayment ?? null;
        }
        return null;
      }),
      getConnection: () => ({ execute: jest.fn().mockResolvedValue({ affectedRows: 0 }) }),
    };
    const em = { fork: () => emFork };

    const { PaymentFulfillmentService } = require('../payment-fulfillment.service');
    const svc = new PaymentFulfillmentService(
      membershipsService,                  // membershipsService
      {} as any,                           // masterSecondaryService
      {} as any,                           // mecaIdService
      {} as any,                           // membershipSyncService
      {} as any,                           // eventRegistrationsService
      {} as any,                           // ordersService
      {} as any,                           // invoicesService
      {} as any,                           // quickBooksService
      {} as any,                           // shopService
      {} as any,                           // worldFinalsService
      adminNotificationsService,           // adminNotificationsService
      renewalTokenService,                 // renewalTokenService
      em,                                  // EntityManager
    );
    // Side-effect helpers we don't care about for this test
    (svc as any).fulfillBillingForMembership = jest.fn().mockResolvedValue(undefined);
    (svc as any).createQuickBooksSalesReceipt = jest.fn().mockResolvedValue(undefined);
    return { svc, renewalTokenService, membershipsService, adminNotificationsService };
  }

  it('marks the renewal token used when fulfillment succeeds via PAYPAL', async () => {
    const { svc, renewalTokenService } = makeService();
    await svc.fulfillMembershipPayment({
      transactionId: 'paypal-capture-abc',
      paymentMethod: PaymentMethod.PAYPAL,
      amountCents: 4240,
      metadata: {
        email: 'james@mecacaraudio.com',
        membershipTypeConfigId: 'cfg-1',
        userId: 'u1',
        renewalTokenId: 'tok-XYZ',
      },
    });
    expect(renewalTokenService.markUsed).toHaveBeenCalledTimes(1);
    expect(renewalTokenService.markUsed).toHaveBeenCalledWith('tok-XYZ');
  });

  it('marks the renewal token used when fulfillment succeeds via STRIPE', async () => {
    const { svc, renewalTokenService } = makeService();
    await svc.fulfillMembershipPayment({
      transactionId: 'pi_abc',
      paymentMethod: PaymentMethod.STRIPE,
      amountCents: 4240,
      metadata: {
        email: 'james@mecacaraudio.com',
        membershipTypeConfigId: 'cfg-1',
        userId: 'u1',
        renewalTokenId: 'tok-XYZ',
      },
    });
    expect(renewalTokenService.markUsed).toHaveBeenCalledWith('tok-XYZ');
  });

  it('does NOT mark a token used when metadata has no renewalTokenId (new-purchase path)', async () => {
    const { svc, renewalTokenService } = makeService();
    await svc.fulfillMembershipPayment({
      transactionId: 'paypal-fresh-buy',
      paymentMethod: PaymentMethod.PAYPAL,
      amountCents: 4240,
      metadata: {
        email: 'new@example.com',
        membershipTypeConfigId: 'cfg-1',
        userId: 'u-new',
      },
    });
    expect(renewalTokenService.markUsed).not.toHaveBeenCalled();
  });

  it('skips fulfillment entirely if a membership for this transaction already exists (webhook retry safety)', async () => {
    const { svc, membershipsService, renewalTokenService } = makeService({
      existingMembershipForTxn: { id: 'pre-existing-m' },
    });
    await svc.fulfillMembershipPayment({
      transactionId: 'paypal-replay',
      paymentMethod: PaymentMethod.PAYPAL,
      amountCents: 4240,
      metadata: {
        email: 'james@mecacaraudio.com',
        membershipTypeConfigId: 'cfg-1',
        userId: 'u1',
        renewalTokenId: 'tok-RETRY',
      },
    });
    // Neither createMembership nor markUsed should run on the replay
    expect(membershipsService.createMembership).not.toHaveBeenCalled();
    expect(renewalTokenService.markUsed).not.toHaveBeenCalled();
  });

  it('skips fulfillment when the associated payment is REFUNDED (anti-undo refund guard)', async () => {
    const { svc, membershipsService, renewalTokenService } = makeService({
      existingPayment: { paymentStatus: 'refunded' },
    });
    await svc.fulfillMembershipPayment({
      transactionId: 'paypal-refunded',
      paymentMethod: PaymentMethod.PAYPAL,
      amountCents: 4240,
      metadata: {
        email: 'james@mecacaraudio.com',
        membershipTypeConfigId: 'cfg-1',
        userId: 'u1',
        renewalTokenId: 'tok-REFUNDED',
      },
    });
    expect(membershipsService.createMembership).not.toHaveBeenCalled();
    expect(renewalTokenService.markUsed).not.toHaveBeenCalled();
  });
});
