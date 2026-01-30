"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockStripeClient = createMockStripeClient;
exports.createMockPaymentIntent = createMockPaymentIntent;
exports.createMockCustomer = createMockCustomer;
exports.createMockWebhookEvent = createMockWebhookEvent;
exports.createMockCharge = createMockCharge;
exports.createMockRefund = createMockRefund;
exports.createMockDispute = createMockDispute;
/**
 * Mock Stripe client factory
 * Creates a mock Stripe instance with common methods stubbed
 */
function createMockStripeClient() {
    const mockStripe = {
        paymentIntents: {
            create: jest.fn(),
            retrieve: jest.fn(),
            update: jest.fn(),
            cancel: jest.fn(),
            confirm: jest.fn(),
        },
        customers: {
            create: jest.fn(),
            retrieve: jest.fn(),
            update: jest.fn(),
            list: jest.fn(),
        },
        refunds: {
            create: jest.fn(),
        },
        webhooks: {
            constructEvent: jest.fn(),
        },
    };
    return mockStripe;
}
/**
 * Mock Stripe payment intent factory
 */
function createMockPaymentIntent(overrides = {}) {
    return {
        id: 'pi_test_123',
        object: 'payment_intent',
        amount: 5000,
        amount_capturable: 0,
        amount_details: { tip: {} },
        amount_received: 5000,
        application: null,
        application_fee_amount: null,
        automatic_payment_methods: { enabled: true, allow_redirects: 'always' },
        canceled_at: null,
        cancellation_reason: null,
        capture_method: 'automatic',
        client_secret: 'pi_test_123_secret_abc',
        confirmation_method: 'automatic',
        created: Math.floor(Date.now() / 1000),
        currency: 'usd',
        customer: 'cus_test_123',
        description: 'Test payment',
        invoice: null,
        last_payment_error: null,
        latest_charge: 'ch_test_123',
        livemode: false,
        metadata: {
            payment_type: 'membership',
            profile_id: 'profile_123',
        },
        next_action: null,
        on_behalf_of: null,
        payment_method: 'pm_test_123',
        payment_method_configuration_details: null,
        payment_method_options: {},
        payment_method_types: ['card'],
        processing: null,
        receipt_email: 'test@example.com',
        review: null,
        setup_future_usage: null,
        shipping: null,
        source: null,
        statement_descriptor: null,
        statement_descriptor_suffix: null,
        status: 'succeeded',
        transfer_data: null,
        transfer_group: null,
        ...overrides,
    };
}
/**
 * Mock Stripe customer factory
 */
function createMockCustomer(overrides = {}) {
    return {
        id: 'cus_test_123',
        object: 'customer',
        address: null,
        balance: 0,
        created: Math.floor(Date.now() / 1000),
        currency: 'usd',
        default_source: null,
        delinquent: false,
        description: null,
        discount: null,
        email: 'test@example.com',
        invoice_prefix: 'TEST',
        invoice_settings: {
            custom_fields: null,
            default_payment_method: null,
            footer: null,
            rendering_options: null,
        },
        livemode: false,
        metadata: {},
        name: 'Test User',
        phone: null,
        preferred_locales: [],
        shipping: null,
        tax_exempt: 'none',
        test_clock: null,
        ...overrides,
    };
}
/**
 * Mock Stripe webhook event factory
 */
function createMockWebhookEvent(type, data, overrides = {}) {
    return {
        id: `evt_test_${Date.now()}`,
        object: 'event',
        api_version: '2025-02-24.acacia',
        created: Math.floor(Date.now() / 1000),
        data: {
            object: data,
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
            id: 'req_test_123',
            idempotency_key: null,
        },
        type,
        ...overrides,
    };
}
/**
 * Mock Stripe charge factory
 */
function createMockCharge(overrides = {}) {
    return {
        id: 'ch_test_123',
        object: 'charge',
        amount: 5000,
        amount_captured: 5000,
        amount_refunded: 0,
        application: null,
        application_fee: null,
        application_fee_amount: null,
        balance_transaction: 'txn_test_123',
        billing_details: {
            address: {
                city: null,
                country: null,
                line1: null,
                line2: null,
                postal_code: null,
                state: null,
            },
            email: 'test@example.com',
            name: 'Test User',
            phone: null,
        },
        calculated_statement_descriptor: 'MECA TEST',
        captured: true,
        created: Math.floor(Date.now() / 1000),
        currency: 'usd',
        customer: 'cus_test_123',
        description: 'Test charge',
        destination: null,
        dispute: null,
        disputed: false,
        failure_balance_transaction: null,
        failure_code: null,
        failure_message: null,
        fraud_details: {},
        invoice: null,
        livemode: false,
        metadata: {},
        on_behalf_of: null,
        order: null,
        outcome: {
            network_advice_code: null,
            network_decline_code: null,
            reason: null,
            risk_level: 'normal',
            risk_score: 30,
            seller_message: 'Payment complete.',
            type: 'authorized',
        },
        paid: true,
        payment_intent: 'pi_test_123',
        payment_method: 'pm_test_123',
        payment_method_details: {
            card: {
                amount_authorized: 5000,
                authorization_code: null,
                brand: 'visa',
                checks: {
                    address_line1_check: null,
                    address_postal_code_check: null,
                    cvc_check: 'pass',
                },
                country: 'US',
                exp_month: 12,
                exp_year: 2030,
                fingerprint: 'fingerprint_123',
                funding: 'credit',
                incremental_authorization: { status: 'unavailable' },
                installments: null,
                last4: '4242',
                mandate: null,
                multicapture: { status: 'unavailable' },
                network: 'visa',
                network_token: { used: false },
                network_transaction_id: 'txn_123',
                overcapture: { maximum_amount_capturable: 5000, status: 'unavailable' },
                regulated_status: 'unregulated',
                three_d_secure: null,
                wallet: null,
            },
            type: 'card',
        },
        receipt_email: 'test@example.com',
        receipt_number: null,
        receipt_url: 'https://pay.stripe.com/receipts/test',
        refunded: false,
        refunds: {
            object: 'list',
            data: [],
            has_more: false,
            url: '/v1/charges/ch_test_123/refunds',
        },
        review: null,
        shipping: null,
        source: null,
        source_transfer: null,
        statement_descriptor: null,
        statement_descriptor_suffix: null,
        status: 'succeeded',
        transfer_data: null,
        transfer_group: null,
        ...overrides,
    };
}
/**
 * Mock Stripe refund factory
 */
function createMockRefund(overrides = {}) {
    return {
        id: 're_test_123',
        object: 'refund',
        amount: 5000,
        balance_transaction: 'txn_test_refund_123',
        charge: 'ch_test_123',
        created: Math.floor(Date.now() / 1000),
        currency: 'usd',
        destination_details: null,
        metadata: {},
        payment_intent: 'pi_test_123',
        reason: null,
        receipt_number: null,
        source_transfer_reversal: null,
        status: 'succeeded',
        transfer_reversal: null,
        ...overrides,
    };
}
/**
 * Mock Stripe dispute factory
 */
function createMockDispute(overrides = {}) {
    return {
        id: 'dp_test_123',
        object: 'dispute',
        amount: 5000,
        balance_transactions: [],
        charge: 'ch_test_123',
        created: Math.floor(Date.now() / 1000),
        currency: 'usd',
        evidence: {
            access_activity_log: null,
            billing_address: null,
            cancellation_policy: null,
            cancellation_policy_disclosure: null,
            cancellation_rebuttal: null,
            customer_communication: null,
            customer_email_address: null,
            customer_name: null,
            customer_purchase_ip: null,
            customer_signature: null,
            duplicate_charge_documentation: null,
            duplicate_charge_explanation: null,
            duplicate_charge_id: null,
            product_description: null,
            receipt: null,
            refund_policy: null,
            refund_policy_disclosure: null,
            refund_refusal_explanation: null,
            service_date: null,
            service_documentation: null,
            shipping_address: null,
            shipping_carrier: null,
            shipping_date: null,
            shipping_documentation: null,
            shipping_tracking_number: null,
            uncategorized_file: null,
            uncategorized_text: null,
        },
        evidence_details: {
            due_by: Math.floor(Date.now() / 1000) + 86400 * 7,
            has_evidence: false,
            past_due: false,
            submission_count: 0,
        },
        is_charge_refundable: false,
        livemode: false,
        metadata: {},
        payment_intent: 'pi_test_123',
        payment_method_details: null,
        reason: 'fraudulent',
        status: 'warning_needs_response',
        ...overrides,
    };
}
//# sourceMappingURL=stripe.mock.js.map