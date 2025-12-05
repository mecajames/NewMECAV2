# Payments Module

This module handles all payment-related functionality for the MECA V2 application, adapted from the V1 WordPress/PMPro integration system.

## Overview

The Payments module tracks payment transactions for memberships and event registrations. It's designed to integrate with multiple payment providers including Stripe, PayPal, and WordPress Paid Memberships Pro (PMPro).

## Architecture

### Entity: `Payment` ([payments.entity.ts](./payments.entity.ts))

Tracks individual payment transactions with the following key fields:

**Core Fields:**
- `id` (UUID) - Primary key
- `user` (Profile relation) - The user who made the payment
- `membership` (Membership relation, optional) - Associated membership if applicable
- `paymentType` (enum) - Type of payment: membership, event_registration, or other
- `paymentMethod` (enum) - Payment method: stripe, paypal, credit_card, manual, or wordpress_pmpro
- `paymentStatus` (enum) - Status: pending, paid, or refunded
- `amount` (decimal) - Payment amount
- `currency` (string) - Currency code (default: USD)

**Payment Provider Fields:**
- `transactionId` - Generic transaction ID
- `externalPaymentId` - External payment provider reference
- `stripePaymentIntentId` - Stripe Payment Intent ID
- `stripeCustomerId` - Stripe Customer ID
- `wordpressOrderId` - WordPress/WooCommerce Order ID
- `wordpressSubscriptionId` - WordPress subscription ID (for recurring payments)

**Metadata:**
- `paymentMetadata` (JSONB) - Flexible metadata storage
- `description` - Human-readable description

**Lifecycle Fields:**
- `paidAt` - Timestamp when payment was completed
- `refundedAt` - Timestamp when payment was refunded
- `refundReason` - Reason for refund
- `failureReason` - Reason if payment failed
- `createdAt` - Record creation timestamp
- `updatedAt` - Record update timestamp

### Service: `PaymentsService` ([payments.service.ts](./payments.service.ts))

Handles all payment business logic:

#### Query Methods
- `findById(id)` - Get payment by ID
- `findByUser(userId, page, limit)` - Get all payments for a user (paginated)
- `findByMembership(membershipId)` - Get all payments for a membership
- `findByTransactionId(transactionId)` - Find payment by transaction ID
- `findByStripePaymentIntent(stripePaymentIntentId)` - Find by Stripe Payment Intent
- `findByWordpressOrderId(wordpressOrderId)` - Find by WordPress order ID

#### Payment Processing Methods
- `create(data)` - Create a new payment record
- `processPayment(data)` - Mark a payment as paid
- `refundPayment(data)` - Process a refund

#### Membership-Specific Methods
- `createMembershipPayment(userId, membershipType, amount, paymentMethod, metadata)` - Create a membership and associated payment
- `syncWordpressPayment(data)` - Sync a payment from WordPress/PMPro to the V2 database

#### Analytics Methods
- `getPaymentStats(userId)` - Get payment statistics for a user (total paid, refunded, pending)

#### Management Methods
- `delete(id)` - Delete a payment (only allowed for non-paid payments)

### Controller: `PaymentsController` ([payments.controller.ts](./payments.controller.ts))

RESTful API endpoints:

#### Query Endpoints
- `GET /api/payments/:id` - Get payment by ID
- `GET /api/payments/user/:userId` - Get user's payments (supports pagination)
- `GET /api/payments/user/:userId/stats` - Get user's payment statistics
- `GET /api/payments/membership/:membershipId` - Get payments for a membership
- `GET /api/payments/transaction/:transactionId` - Get payment by transaction ID
- `GET /api/payments/stripe/payment-intent/:paymentIntentId` - Get payment by Stripe intent
- `GET /api/payments/wordpress/order/:orderId` - Get payment by WordPress order ID

#### Creation Endpoints
- `POST /api/payments` - Create a new payment
- `POST /api/payments/membership` - Create a membership with payment
- `POST /api/payments/wordpress/sync` - Sync a payment from WordPress

#### Update Endpoints
- `PUT /api/payments/:id/process` - Mark payment as processed
- `PUT /api/payments/:id/refund` - Refund a payment

#### Delete Endpoints
- `DELETE /api/payments/:id` - Delete a payment

### Module: `PaymentsModule` ([payments.module.ts](./payments.module.ts))

Registers the controller and service, exports the service for use in other modules.

## Migration from V1

### V1 Architecture (meca-react)
The V1 system used:
- WordPress with Paid Memberships Pro (PMPro) plugin for payment processing
- Membership data stored in WordPress database
- Expiration dates synced to Events database
- Members table with `expdate` field for membership expiration
- Payment processing handled entirely by WordPress/PMPro

### V2 Architecture (NewMECAV2)
The V2 system provides:
- Dedicated Payment entity for transaction tracking
- Support for multiple payment providers (Stripe, PayPal, WordPress)
- Detailed payment metadata and audit trail
- Direct integration with Membership entity
- WordPress sync capability via API endpoints

### Key Improvements
1. **Payment Tracking** - All payments are tracked in a dedicated table
2. **Provider Flexibility** - Support for multiple payment providers
3. **Audit Trail** - Complete payment history with timestamps
4. **Metadata Storage** - JSONB field for flexible payment data
5. **Refund Handling** - Built-in refund tracking and processing

## Database Schema

### Payments Table
```sql
CREATE TABLE "payments" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid REFERENCES "profiles"("id"),
  "membership_id" uuid REFERENCES "memberships"("id"),
  "payment_type" payment_type NOT NULL,
  "payment_method" payment_method NOT NULL,
  "payment_status" payment_status NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "currency" varchar(3),
  "transaction_id" text,
  "external_payment_id" text,
  "stripe_payment_intent_id" text,
  "stripe_customer_id" text,
  "wordpress_order_id" text,
  "wordpress_subscription_id" text,
  "payment_metadata" jsonb,
  "description" text,
  "paid_at" timestamptz,
  "refunded_at" timestamptz,
  "refund_reason" text,
  "failure_reason" text,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);
```

### Indexes
- `idx_payments_user` - Fast user lookups
- `idx_payments_membership` - Fast membership lookups
- `idx_payments_status` - Filter by payment status
- `idx_payments_type` - Filter by payment type
- `idx_payments_method` - Filter by payment method
- `idx_payments_transaction_id` - Transaction ID lookups
- `idx_payments_stripe_intent` - Stripe Payment Intent lookups
- `idx_payments_wordpress_order` - WordPress order lookups
- `idx_payments_created_at` - Time-based queries

## Enums

### PaymentStatus
- `PENDING` - Payment initiated but not completed
- `PAID` - Payment successfully processed
- `REFUNDED` - Payment has been refunded

### PaymentMethod
- `STRIPE` - Stripe payment processor
- `PAYPAL` - PayPal payment processor
- `CREDIT_CARD` - Direct credit card (legacy)
- `MANUAL` - Manual payment entry
- `WORDPRESS_PMPRO` - WordPress Paid Memberships Pro

### PaymentType
- `MEMBERSHIP` - Membership purchase/renewal
- `EVENT_REGISTRATION` - Event registration fee
- `OTHER` - Other payment types

## Usage Examples

### Creating a Membership Payment

```typescript
// Create a membership with payment
const result = await paymentsService.createMembershipPayment(
  userId,
  MembershipType.ANNUAL,
  50.00,
  PaymentMethod.STRIPE,
  {
    stripePaymentIntentId: 'pi_xxxxxxxxxxxx',
    stripeCustomerId: 'cus_xxxxxxxxxxxx',
  }
);

// Result contains both payment and membership
console.log(result.payment.id);
console.log(result.membership.id);
```

### Processing a Payment

```typescript
// Mark payment as paid
const payment = await paymentsService.processPayment({
  paymentId: 'payment-uuid',
  transactionId: 'txn_12345',
  paidAt: new Date(),
});
```

### Syncing WordPress Payments

```typescript
// Sync payment from WordPress PMPro
const result = await paymentsService.syncWordpressPayment({
  wordpressOrderId: 'wp_order_123',
  wordpressSubscriptionId: 'wp_sub_456',
  userId: 'user-uuid',
  membershipType: MembershipType.ANNUAL,
  amount: 50.00,
  expirationDate: new Date('2025-12-31'),
  paidAt: new Date(),
});
```

### Refunding a Payment

```typescript
// Process a refund
const payment = await paymentsService.refundPayment({
  paymentId: 'payment-uuid',
  reason: 'Customer requested refund',
});
```

### Getting Payment Statistics

```typescript
// Get user payment stats
const stats = await paymentsService.getPaymentStats(userId);
console.log(stats.totalPaid);      // Total amount paid
console.log(stats.totalRefunded);  // Total amount refunded
console.log(stats.totalPending);   // Total pending payments
console.log(stats.paymentCount);   // Number of payments
```

## WordPress Integration

The module includes specific support for WordPress/PMPro integration:

1. **Sync Endpoint**: `POST /api/payments/wordpress/sync` allows WordPress to push payment data to V2
2. **Order ID Tracking**: `wordpressOrderId` field stores WordPress/WooCommerce order IDs
3. **Subscription Tracking**: `wordpressSubscriptionId` field for recurring payments
4. **Lookup Methods**: Quick lookup by WordPress order ID

### WordPress Webhook Integration

Your WordPress site can send payment data to V2 using:

```php
// WordPress/PMPro webhook handler
add_action('pmpro_after_checkout', 'sync_payment_to_v2', 10, 2);

function sync_payment_to_v2($user_id, $order) {
  $data = [
    'wordpressOrderId' => $order->code,
    'wordpressSubscriptionId' => $order->subscription_transaction_id,
    'userId' => get_user_meta($user_id, 'meca_v2_user_id', true),
    'membershipType' => $order->membership_level->name === 'Lifetime' ? 'lifetime' : 'annual',
    'amount' => $order->total,
    'expirationDate' => $order->membership_level->expiration_date,
    'paidAt' => $order->timestamp,
  ];

  wp_remote_post('https://api.mecacaraudio.com/api/payments/wordpress/sync', [
    'body' => json_encode($data),
    'headers' => ['Content-Type' => 'application/json'],
  ]);
}
```

## Running Migrations

To apply the payments table migration:

```bash
npm run migration:up
```

To rollback:

```bash
npm run migration:down
```

## Testing

Example test cases to implement:

1. Create payment and verify database record
2. Process payment and verify status update
3. Refund payment and verify refund tracking
4. Create membership payment and verify both records
5. Sync WordPress payment and verify deduplication
6. Get payment statistics and verify calculations
7. Delete pending payment (should succeed)
8. Delete paid payment (should fail)

## Future Enhancements

Potential improvements:

1. **Stripe Webhooks** - Direct webhook handling for Stripe events
2. **Recurring Payments** - Subscription management
3. **Payment Plans** - Installment payment support
4. **Tax Calculation** - Automatic tax calculation
5. **Invoice Generation** - PDF invoice generation
6. **Payment Notifications** - Email notifications for payment events
7. **Payment Dashboard** - Admin dashboard for payment management
8. **Analytics** - Revenue analytics and reporting
