/**
 * Root-cause coverage for the "guest membership payment silently dropped" bug.
 *
 * Before the fix, fulfillMembershipPayment did `if (!userId) return;` — a paid
 * membership with no userId in the Stripe metadata (guest checkout / not logged
 * in) produced NO membership, NO account, NO payment row, while the webhook
 * still recorded the event as 'success'. 15 paying members got nothing.
 *
 * These tests prove the new behavior:
 *   - guest (no userId) + email  -> account is provisioned/relinked and the
 *     membership IS created (createMembership called with skipVehicleValidation)
 *   - no userId AND no email      -> THROWS (so the webhook records 'error') and
 *     admins are alerted — never a silent success
 *   - createMembership failure    -> propagates (loud) + admin alert
 */
import { PaymentMethod } from '@newmeca/shared';

function makeService(opts: {
  existingProfileByEmail?: any;     // profile found by email
  authUserId?: string | null;      // supabaseAdmin.findUserByEmail result
  provisionedUserId?: string;      // supabaseAdmin.createUserWithPassword result
  provisionFails?: boolean;
  createMembershipImpl?: any;      // override createMembership
} = {}) {
  const createMembership =
    opts.createMembershipImpl ??
    jest.fn().mockResolvedValue({ id: 'new-m', mecaId: 0, user: { id: 'resolved', email: 'x@y.z' } });
  const membershipsService = { createMembership };
  const renewalTokenService = { markUsed: jest.fn().mockResolvedValue(undefined) };
  const adminNotificationsService = {
    notifyNewMembership: jest.fn().mockResolvedValue(undefined),
    notifyOneTimePaymentFailed: jest.fn().mockResolvedValue(undefined),
  };
  const supabaseAdmin = {
    findUserByEmail: jest.fn().mockResolvedValue({ userId: opts.authUserId ?? null }),
    createUserWithPassword: jest.fn().mockResolvedValue(
      opts.provisionFails
        ? { success: false, error: 'boom' }
        : { success: true, userId: opts.provisionedUserId ?? 'prov-1' },
    ),
  };

  const created: any[] = [];
  const emFork = {
    findOne: jest.fn(async (entity: any, where: any) => {
      const name = typeof entity === 'function' ? entity.name : '';
      if (name === 'Membership') return null;                 // idempotency: no prior membership
      if (name === 'Payment') return null;                    // idempotency: no prior payment
      if (name === 'Profile') {
        if (where?.email) return opts.existingProfileByEmail ?? null;
        if (where?.id) return null;                           // force profile creation
      }
      return null;
    }),
    create: jest.fn((_entity: any, data: any) => { created.push(data); return data; }),
    persistAndFlush: jest.fn().mockResolvedValue(undefined),
    getConnection: () => ({ execute: jest.fn().mockResolvedValue({ affectedRows: 0 }) }),
  };
  const em = { fork: () => emFork };

  const { PaymentFulfillmentService } = require('../payment-fulfillment.service');
  const svc = new PaymentFulfillmentService(
    membershipsService, {} as any, {} as any, {} as any, {} as any, {} as any,
    {} as any, {} as any, {} as any, {} as any,
    adminNotificationsService, renewalTokenService, supabaseAdmin, em,
  );
  (svc as any).fulfillBillingForMembership = jest.fn().mockResolvedValue(undefined);
  (svc as any).createQuickBooksSalesReceipt = jest.fn().mockResolvedValue(undefined);
  return { svc, membershipsService, supabaseAdmin, adminNotificationsService, created };
}

const baseMeta = {
  email: 'guest@example.com',
  membershipTypeConfigId: 'cfg-1',
  membershipPrice: '40.00',
  billingFirstName: 'Guest',
  billingLastName: 'Buyer',
};

describe('fulfillMembershipPayment — guest provisioning & no silent drop', () => {
  it('provisions a NEW account and creates the membership when userId is missing', async () => {
    const { svc, membershipsService, supabaseAdmin } = makeService({ authUserId: null, provisionedUserId: 'prov-NEW' });
    await svc.fulfillMembershipPayment({
      transactionId: 'pi_guest_new', paymentMethod: PaymentMethod.STRIPE, amountCents: 4240, metadata: { ...baseMeta },
    });
    expect(supabaseAdmin.createUserWithPassword).toHaveBeenCalledTimes(1);
    expect(membershipsService.createMembership).toHaveBeenCalledTimes(1);
    expect(membershipsService.createMembership).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'prov-NEW', skipVehicleValidation: true }),
    );
  });

  it('relinks an EXISTING auth user (no profile) instead of duplicating it', async () => {
    const { svc, membershipsService, supabaseAdmin } = makeService({ authUserId: 'auth-EXIST' });
    await svc.fulfillMembershipPayment({
      transactionId: 'pi_guest_authonly', paymentMethod: PaymentMethod.STRIPE, amountCents: 4240, metadata: { ...baseMeta },
    });
    expect(supabaseAdmin.createUserWithPassword).not.toHaveBeenCalled();
    expect(membershipsService.createMembership).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'auth-EXIST', skipVehicleValidation: true }),
    );
  });

  it('uses the existing profile when one already matches the email', async () => {
    const { svc, membershipsService, supabaseAdmin } = makeService({ existingProfileByEmail: { id: 'prof-EXIST' } });
    await svc.fulfillMembershipPayment({
      transactionId: 'pi_guest_prof', paymentMethod: PaymentMethod.STRIPE, amountCents: 4240, metadata: { ...baseMeta },
    });
    expect(supabaseAdmin.findUserByEmail).not.toHaveBeenCalled();
    expect(supabaseAdmin.createUserWithPassword).not.toHaveBeenCalled();
    expect(membershipsService.createMembership).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'prof-EXIST' }),
    );
  });

  it('THROWS and alerts admins when there is no userId AND no email (never silent)', async () => {
    const { svc, membershipsService, adminNotificationsService } = makeService();
    await expect(
      svc.fulfillMembershipPayment({
        transactionId: 'pi_no_email', paymentMethod: PaymentMethod.STRIPE, amountCents: 4240,
        metadata: { membershipTypeConfigId: 'cfg-1' },
      }),
    ).rejects.toThrow(/no userId and no email/);
    expect(membershipsService.createMembership).not.toHaveBeenCalled();
    expect(adminNotificationsService.notifyOneTimePaymentFailed).toHaveBeenCalledTimes(1);
  });

  it('propagates (does NOT swallow) a createMembership failure + alerts admins', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('db exploded'));
    const { svc, adminNotificationsService } = makeService({ createMembershipImpl: failing });
    await expect(
      svc.fulfillMembershipPayment({
        transactionId: 'pi_fail', paymentMethod: PaymentMethod.STRIPE, amountCents: 4240,
        metadata: { ...baseMeta, userId: 'u1' },
      }),
    ).rejects.toThrow(/db exploded/);
    expect(adminNotificationsService.notifyOneTimePaymentFailed).toHaveBeenCalledTimes(1);
  });
});
