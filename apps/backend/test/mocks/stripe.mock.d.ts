import Stripe from 'stripe';
/**
 * Mock Stripe client factory
 * Creates a mock Stripe instance with common methods stubbed
 */
export declare function createMockStripeClient(): jest.Mocked<Stripe>;
/**
 * Mock Stripe payment intent factory
 */
export declare function createMockPaymentIntent(overrides?: Partial<Stripe.PaymentIntent>): Stripe.PaymentIntent;
/**
 * Mock Stripe customer factory
 */
export declare function createMockCustomer(overrides?: Partial<Stripe.Customer>): Stripe.Customer;
/**
 * Mock Stripe webhook event factory
 */
export declare function createMockWebhookEvent(type: string, data: unknown, overrides?: Partial<Stripe.Event>): Stripe.Event;
/**
 * Mock Stripe charge factory
 */
export declare function createMockCharge(overrides?: Partial<Stripe.Charge>): Stripe.Charge;
/**
 * Mock Stripe refund factory
 */
export declare function createMockRefund(overrides?: Partial<Stripe.Refund>): Stripe.Refund;
/**
 * Mock Stripe dispute factory
 */
export declare function createMockDispute(overrides?: Partial<Stripe.Dispute>): Stripe.Dispute;
//# sourceMappingURL=stripe.mock.d.ts.map