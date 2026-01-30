import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/core';
import { createMockEntityManager } from '../mocks/mikro-orm.mock';

/**
 * Options for creating a test module
 */
export interface CreateTestModuleOptions {
  providers?: any[];
  imports?: any[];
  controllers?: any[];
  mockEntityManager?: boolean;
}

/**
 * Creates a NestJS testing module with common mocks pre-configured
 */
export async function createTestModule(
  options: CreateTestModuleOptions = {},
): Promise<{
  module: TestingModule;
  mockEm: jest.Mocked<EntityManager>;
}> {
  const mockEm = createMockEntityManager();

  const providers = [
    ...(options.providers || []),
  ];

  if (options.mockEntityManager !== false) {
    providers.push({
      provide: EntityManager,
      useValue: mockEm,
    });
  }

  const module = await Test.createTestingModule({
    imports: options.imports || [],
    controllers: options.controllers || [],
    providers,
  }).compile();

  return { module, mockEm };
}

/**
 * Creates a mock profile entity
 */
export function createMockProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile_test_123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    phone: '555-1234',
    address: '123 Test St',
    city: 'Test City',
    state: 'TX',
    postal_code: '12345',
    country: 'US',
    role: 'user',
    membership_status: 'none',
    stripe_customer_id: 'cus_test_123',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock membership entity
 */
export function createMockMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership_test_123',
    profile_id: 'profile_test_123',
    type: 'competitor',
    status: 'active',
    meca_id: 'MECA-2026-0001',
    season_id: 'season_test_123',
    amount_paid: 50,
    payment_method: 'stripe',
    stripe_payment_intent_id: 'pi_test_123',
    start_date: new Date(),
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock event entity
 */
export function createMockEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event_test_123',
    name: 'Test Event',
    slug: 'test-event',
    description: 'A test event',
    location: 'Test Location',
    address: '456 Event St',
    city: 'Event City',
    state: 'CA',
    postal_code: '90210',
    event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    registration_deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    status: 'upcoming',
    max_registrations: 100,
    current_registrations: 10,
    base_price: 25,
    member_price: 20,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock event registration entity
 */
export function createMockEventRegistration(overrides: Record<string, unknown> = {}) {
  return {
    id: 'registration_test_123',
    event_id: 'event_test_123',
    profile_id: 'profile_test_123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    phone: '555-1234',
    status: 'confirmed',
    amount_paid: 25,
    payment_method: 'stripe',
    stripe_payment_intent_id: 'pi_test_123',
    classes: ['class_a', 'class_b'],
    vehicle_info: '2020 Test Vehicle',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock payment entity
 */
export function createMockPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment_test_123',
    profile_id: 'profile_test_123',
    type: 'membership',
    status: 'completed',
    amount: 5000,
    currency: 'usd',
    payment_method: 'stripe',
    stripe_payment_intent_id: 'pi_test_123',
    stripe_customer_id: 'cus_test_123',
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock order entity
 */
export function createMockOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order_test_123',
    profile_id: 'profile_test_123',
    order_number: 'ORD-2026-0001',
    status: 'completed',
    subtotal: 5000,
    tax: 0,
    total: 5000,
    payment_method: 'stripe',
    stripe_payment_intent_id: 'pi_test_123',
    line_items: [],
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock invoice entity
 */
export function createMockInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invoice_test_123',
    order_id: 'order_test_123',
    invoice_number: 'INV-2026-0001',
    status: 'paid',
    amount_due: 5000,
    amount_paid: 5000,
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paid_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock season entity
 */
export function createMockSeason(overrides: Record<string, unknown> = {}) {
  return {
    id: 'season_test_123',
    name: '2026 Season',
    year: 2026,
    is_current: true,
    start_date: new Date('2026-01-01'),
    end_date: new Date('2026-12-31'),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

/**
 * Waits for all pending promises to resolve
 * Useful when testing async operations
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

/**
 * Creates a mock Request object for controller tests
 */
export function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    user: null,
    ...overrides,
  };
}

/**
 * Creates a mock Response object for controller tests
 */
export function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}
