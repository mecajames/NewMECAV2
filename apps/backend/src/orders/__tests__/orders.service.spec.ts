import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Collection } from '@mikro-orm/core';
import { OrdersService } from '../orders.service';
import { Order } from '../orders.entity';
import { OrderItem } from '../order-items.entity';
import {
  OrderStatus,
  OrderType,
  OrderItemType,
} from '@newmeca/shared';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { createMockOrder } from '../../../test/utils/test-utils';

// Mock @mikro-orm/core wrap function
jest.mock('@mikro-orm/core', () => ({
  ...jest.requireActual('@mikro-orm/core'),
  wrap: jest.fn((entity) => ({
    assign: jest.fn((data) => Object.assign(entity, data)),
  })),
}));

describe('OrdersService', () => {
  let service: OrdersService;
  let mockEm: ReturnType<typeof createMockEntityManager>;

  // Reusable mock connection for generateOrderNumber
  const mockConnection = {
    execute: jest.fn().mockResolvedValue([{ order_number: 'ORD-2026-00001' }]),
  };

  beforeEach(async () => {
    mockEm = createMockEntityManager();
    (mockEm as any).getConnection = jest.fn().mockReturnValue(mockConnection);

    // findAndCount is not on createMockEntityManager by default; add it
    (mockEm as any).findAndCount = jest.fn().mockResolvedValue([[], 0]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: 'EntityManager',
          useValue: mockEm,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Build a mock Order entity with a real-ish shape matching the entity class.
   * Uses the test-utils factory as a base but adds entity-style field names.
   */
  function buildMockOrder(overrides: Partial<Order> = {}): Order {
    const base = createMockOrder();
    const order = {
      id: base.id,
      orderNumber: base.order_number,
      status: OrderStatus.PENDING,
      orderType: OrderType.MEMBERSHIP,
      subtotal: '50.00',
      tax: '0.00',
      discount: '0.00',
      total: '50.00',
      currency: 'USD',
      notes: undefined,
      items: { add: jest.fn(), getItems: jest.fn().mockReturnValue([]) } as unknown as Collection<OrderItem>,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as unknown as Order;
    return order;
  }

  function buildMockProfile(overrides: Record<string, unknown> = {}) {
    return {
      id: 'profile_test_123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      ...overrides,
    };
  }

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------

  describe('findById', () => {
    it('should return an order when found', async () => {
      const order = buildMockOrder();
      mockEm.findOne.mockResolvedValueOnce(order as any);

      const result = await service.findById(order.id);

      expect(result).toBe(order);
      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.findOne).toHaveBeenCalledWith(
        Order,
        { id: order.id },
        { populate: ['member', 'items', 'payment'] },
      );
    });

    it('should throw NotFoundException when order is not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        'Order with ID nonexistent-id not found',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findByOrderNumber
  // ---------------------------------------------------------------------------

  describe('findByOrderNumber', () => {
    it('should return an order when found by order number', async () => {
      const order = buildMockOrder({ orderNumber: 'ORD-2026-00042' });
      mockEm.findOne.mockResolvedValueOnce(order as any);

      const result = await service.findByOrderNumber('ORD-2026-00042');

      expect(result).toBe(order);
      expect(mockEm.findOne).toHaveBeenCalledWith(
        Order,
        { orderNumber: 'ORD-2026-00042' },
        { populate: ['member', 'items', 'payment'] },
      );
    });

    it('should return null when order number does not exist', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      const result = await service.findByOrderNumber('ORD-9999-99999');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findByUser
  // ---------------------------------------------------------------------------

  describe('findByUser', () => {
    it('should return paginated orders for a user', async () => {
      const orders = [buildMockOrder(), buildMockOrder({ id: 'order_2' })];
      (mockEm as any).findAndCount.mockResolvedValueOnce([orders, 2]);

      const result = await service.findByUser('user_123', 1, 20);

      expect(result).toEqual({ data: orders, total: 2 });
      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Order,
        { member: 'user_123' },
        {
          populate: ['items'],
          limit: 20,
          offset: 0,
          orderBy: { createdAt: 'DESC' },
        },
      );
    });

    it('should calculate offset correctly for page 2', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findByUser('user_123', 2, 10);

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Order,
        { member: 'user_123' },
        expect.objectContaining({
          limit: 10,
          offset: 10,
        }),
      );
    });

    it('should use default pagination when not provided', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findByUser('user_123');

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Order,
        { member: 'user_123' },
        expect.objectContaining({
          limit: 20,
          offset: 0,
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------

  describe('findAll', () => {
    it('should return all orders with default pagination', async () => {
      const orders = [buildMockOrder()];
      (mockEm as any).findAndCount.mockResolvedValueOnce([orders, 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({
        data: orders,
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 1,
          totalPages: 1,
        },
      });
    });

    it('should filter by status', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findAll({ page: 1, limit: 20, status: OrderStatus.PENDING });

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({ status: OrderStatus.PENDING }),
        expect.any(Object),
      );
    });

    it('should filter by orderType', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findAll({ page: 1, limit: 20, orderType: OrderType.MEMBERSHIP });

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({ orderType: OrderType.MEMBERSHIP }),
        expect.any(Object),
      );
    });

    it('should filter by userId', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findAll({ page: 1, limit: 20, userId: 'user_123' });

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({ member: 'user_123' }),
        expect.any(Object),
      );
    });

    it('should filter by date range', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      await service.findAll({ page: 1, limit: 20, startDate, endDate });

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        expect.any(Object),
      );
    });

    it('should filter by search term on orderNumber', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findAll({ page: 1, limit: 20, search: '00042' });

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          orderNumber: { $like: '%00042%' },
        }),
        expect.any(Object),
      );
    });

    it('should calculate totalPages correctly', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 45]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.pagination.totalPages).toBe(3); // ceil(45/20)
    });

    it('should apply multiple filters simultaneously', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findAll({
        page: 2,
        limit: 10,
        status: OrderStatus.COMPLETED,
        orderType: OrderType.EVENT_REGISTRATION,
        userId: 'user_abc',
        search: 'ORD',
      });

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Order,
        {
          status: OrderStatus.COMPLETED,
          orderType: OrderType.EVENT_REGISTRATION,
          member: 'user_abc',
          orderNumber: { $like: '%ORD%' },
        },
        expect.objectContaining({
          limit: 10,
          offset: 10,
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create', () => {
    const createDto = {
      userId: 'profile_test_123',
      orderType: OrderType.MEMBERSHIP,
      items: [
        {
          description: 'Competitor Membership',
          quantity: 1,
          unitPrice: '50.00',
          itemType: OrderItemType.MEMBERSHIP,
        },
      ],
      notes: 'Test order',
      currency: 'USD',
    };

    it('should create an order successfully', async () => {
      const mockProfile = buildMockProfile();
      // First findOne call: profile lookup
      mockEm.findOne.mockResolvedValueOnce(mockProfile as any);

      // em.create returns the entity-like object
      const createdOrder = buildMockOrder({
        orderNumber: 'ORD-2026-00001',
        status: OrderStatus.PENDING,
        orderType: OrderType.MEMBERSHIP,
      });
      mockEm.create
        .mockReturnValueOnce(createdOrder as any) // Order creation
        .mockReturnValueOnce({} as any); // OrderItem creation

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockEm.findOne).toHaveBeenCalledWith(expect.anything(), { id: 'profile_test_123' });
      expect(mockEm.persistAndFlush).toHaveBeenCalled();
      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT generate_order_number() as order_number',
      );
    });

    it('should throw NotFoundException when user is not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        `User with ID ${createDto.userId} not found`,
      );
    });

    it('should throw BadRequestException when no userId is provided', async () => {
      const dtoWithoutUser = { ...createDto, userId: undefined };

      await expect(service.create(dtoWithoutUser)).rejects.toThrow(BadRequestException);
      await expect(service.create(dtoWithoutUser)).rejects.toThrow(
        'User is required to create an order',
      );
    });

    it('should calculate totals correctly for multiple items', async () => {
      const multiItemDto = {
        ...createDto,
        items: [
          {
            description: 'Item 1',
            quantity: 2,
            unitPrice: '25.00',
            itemType: OrderItemType.MEMBERSHIP,
          },
          {
            description: 'Item 2',
            quantity: 1,
            unitPrice: '10.00',
            itemType: OrderItemType.OTHER,
          },
        ],
      };

      const mockProfile = buildMockProfile();
      mockEm.findOne.mockResolvedValueOnce(mockProfile as any);

      const createdOrder = buildMockOrder();
      mockEm.create
        .mockReturnValueOnce(createdOrder as any)
        .mockReturnValueOnce({} as any)
        .mockReturnValueOnce({} as any);

      await service.create(multiItemDto);

      // The first em.create call is for the Order. Verify subtotal/total = 2*25 + 1*10 = 60.00
      expect(mockEm.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          subtotal: '60.00',
          total: '60.00',
        }),
      );
    });

    it('should fall back to count-based order number when database function fails', async () => {
      mockConnection.execute.mockRejectedValueOnce(new Error('Function not found'));
      mockEm.count.mockResolvedValueOnce(5);

      const mockProfile = buildMockProfile();
      mockEm.findOne.mockResolvedValueOnce(mockProfile as any);

      const createdOrder = buildMockOrder();
      mockEm.create
        .mockReturnValueOnce(createdOrder as any)
        .mockReturnValueOnce({} as any);

      await service.create(createDto);

      const year = new Date().getFullYear();
      expect(mockEm.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          orderNumber: `ORD-${year}-00006`,
        }),
      );
    });

    it('should use default currency USD when not specified', async () => {
      const dtoNoCurrency = { ...createDto };
      delete (dtoNoCurrency as any).currency;

      const mockProfile = buildMockProfile();
      mockEm.findOne.mockResolvedValueOnce(mockProfile as any);

      const createdOrder = buildMockOrder();
      mockEm.create
        .mockReturnValueOnce(createdOrder as any)
        .mockReturnValueOnce({} as any);

      await service.create(dtoNoCurrency);

      expect(mockEm.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          currency: 'USD',
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // createFromPayment
  // ---------------------------------------------------------------------------

  describe('createFromPayment', () => {
    const paymentDto = {
      paymentId: 'payment_test_123',
      userId: 'profile_test_123',
      orderType: OrderType.MEMBERSHIP,
      items: [
        {
          description: 'Competitor Membership',
          quantity: 1,
          unitPrice: '50.00',
          itemType: OrderItemType.MEMBERSHIP,
        },
      ],
      notes: 'From payment',
    };

    it('should create an order from payment data', async () => {
      const mockPayment = { id: 'payment_test_123' };
      const mockProfile = buildMockProfile();

      // First findOne: payment lookup
      mockEm.findOne
        .mockResolvedValueOnce(mockPayment as any) // Payment
        .mockResolvedValueOnce(mockProfile as any); // Profile

      const createdOrder = buildMockOrder({ status: OrderStatus.COMPLETED });
      mockEm.create
        .mockReturnValueOnce(createdOrder as any)
        .mockReturnValueOnce({} as any);

      const result = await service.createFromPayment(paymentDto);

      expect(result).toBeDefined();
      expect(mockEm.persistAndFlush).toHaveBeenCalled();
    });

    it('should support guest orders with guestEmail', async () => {
      const guestDto = {
        ...paymentDto,
        userId: undefined,
        guestEmail: 'guest@example.com',
        guestName: 'Guest User',
      };

      // Payment lookup
      mockEm.findOne.mockResolvedValueOnce({ id: 'payment_test_123' } as any);

      const createdOrder = buildMockOrder();
      mockEm.create
        .mockReturnValueOnce(createdOrder as any)
        .mockReturnValueOnce({} as any);

      await service.createFromPayment(guestDto);

      expect(mockEm.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          guestEmail: 'guest@example.com',
          guestName: 'Guest User',
        }),
      );
    });

    it('should throw BadRequestException when neither userId nor guestEmail provided', async () => {
      const noUserDto = {
        ...paymentDto,
        userId: undefined,
      };

      // Payment lookup returns null since no paymentId match
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(service.createFromPayment(noUserDto)).rejects.toThrow(BadRequestException);
      await expect(service.createFromPayment(noUserDto)).rejects.toThrow(
        'Either userId or guestEmail is required to create an order',
      );
    });

    it('should set status to COMPLETED for payment-based orders', async () => {
      const mockProfile = buildMockProfile();
      mockEm.findOne
        .mockResolvedValueOnce(null) // no payment
        .mockResolvedValueOnce(mockProfile as any);

      const createdOrder = buildMockOrder({ status: OrderStatus.COMPLETED });
      mockEm.create
        .mockReturnValueOnce(createdOrder as any)
        .mockReturnValueOnce({} as any);

      await service.createFromPayment(paymentDto);

      expect(mockEm.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          status: OrderStatus.COMPLETED,
        }),
      );
    });

    it('should set shopOrderReference when provided', async () => {
      const dtoWithShopRef = {
        ...paymentDto,
        shopOrderReference: {
          shopOrderId: 'shop_123',
          shopOrderNumber: 'SHOP-001',
        },
      };

      const mockProfile = buildMockProfile();
      mockEm.findOne
        .mockResolvedValueOnce(null) // no payment
        .mockResolvedValueOnce(mockProfile as any);

      const createdOrder = buildMockOrder();
      mockEm.create
        .mockReturnValueOnce(createdOrder as any)
        .mockReturnValueOnce({} as any);

      await service.createFromPayment(dtoWithShopRef);

      expect(mockEm.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          shopOrderReference: {
            shopOrderId: 'shop_123',
            shopOrderNumber: 'SHOP-001',
          },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // updateStatus
  // ---------------------------------------------------------------------------

  describe('updateStatus', () => {
    it('should update order status successfully', async () => {
      const order = buildMockOrder({ status: OrderStatus.PENDING });
      mockEm.findOne.mockResolvedValueOnce(order as any);

      const result = await service.updateStatus('order_test_123', {
        status: OrderStatus.PROCESSING,
        notes: 'Processing started',
      });

      expect(result.status).toBe(OrderStatus.PROCESSING);
      expect(result.notes).toBe('Processing started');
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should keep existing notes when new notes are not provided', async () => {
      const order = buildMockOrder({ status: OrderStatus.PENDING, notes: 'Original notes' });
      mockEm.findOne.mockResolvedValueOnce(order as any);

      const result = await service.updateStatus('order_test_123', {
        status: OrderStatus.COMPLETED,
      });

      expect(result.status).toBe(OrderStatus.COMPLETED);
      expect(result.notes).toBe('Original notes');
    });

    it('should throw NotFoundException when order is not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateStatus('nonexistent', { status: OrderStatus.PROCESSING }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // cancel
  // ---------------------------------------------------------------------------

  describe('cancel', () => {
    it('should cancel a PENDING order', async () => {
      const order = buildMockOrder({ status: OrderStatus.PENDING });
      mockEm.findOne.mockResolvedValueOnce(order as any);

      const result = await service.cancel('order_test_123', { reason: 'Customer requested' });

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.notes).toBe('Customer requested');
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should cancel a PROCESSING order', async () => {
      const order = buildMockOrder({ status: OrderStatus.PROCESSING });
      mockEm.findOne.mockResolvedValueOnce(order as any);

      const result = await service.cancel('order_test_123', { reason: 'No longer needed' });

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw BadRequestException when cancelling a COMPLETED order', async () => {
      const order = buildMockOrder({ status: OrderStatus.COMPLETED });
      mockEm.findOne.mockResolvedValueOnce(order as any);

      await expect(
        service.cancel('order_test_123', { reason: 'Too late' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockEm.flush).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when cancelling a REFUNDED order', async () => {
      const order = buildMockOrder({ status: OrderStatus.REFUNDED });
      mockEm.findOne.mockResolvedValueOnce(order as any);

      await expect(
        service.cancel('order_test_123', { reason: 'Already refunded' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include helpful message about using refund instead', async () => {
      const order = buildMockOrder({ status: OrderStatus.COMPLETED });
      mockEm.findOne.mockResolvedValueOnce(order as any);

      await expect(
        service.cancel('order_test_123', { reason: 'Cancel completed' }),
      ).rejects.toThrow('Use refund instead');
    });

    it('should throw NotFoundException when order is not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(
        service.cancel('nonexistent', { reason: 'Does not exist' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // markRefunded
  // ---------------------------------------------------------------------------

  describe('markRefunded', () => {
    it('should mark an order as refunded', async () => {
      const order = buildMockOrder({ status: OrderStatus.COMPLETED });
      mockEm.findOne.mockResolvedValueOnce(order as any);

      const result = await service.markRefunded('order_test_123', 'Customer unhappy');

      expect(result.status).toBe(OrderStatus.REFUNDED);
      expect(result.notes).toBe('Customer unhappy');
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order is not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(
        service.markRefunded('nonexistent', 'Reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // getStatusCounts
  // ---------------------------------------------------------------------------

  describe('getStatusCounts', () => {
    it('should return counts for each order status', async () => {
      // The service calls em.count once per status value
      mockEm.count
        .mockResolvedValueOnce(3)  // PENDING
        .mockResolvedValueOnce(2)  // PROCESSING
        .mockResolvedValueOnce(10) // COMPLETED
        .mockResolvedValueOnce(1)  // CANCELLED
        .mockResolvedValueOnce(0); // REFUNDED

      const result = await service.getStatusCounts();

      expect(result).toEqual({
        [OrderStatus.PENDING]: 3,
        [OrderStatus.PROCESSING]: 2,
        [OrderStatus.COMPLETED]: 10,
        [OrderStatus.CANCELLED]: 1,
        [OrderStatus.REFUNDED]: 0,
      });

      // Verify it was called once per status
      expect(mockEm.count).toHaveBeenCalledTimes(5);
      expect(mockEm.count).toHaveBeenCalledWith(Order, { status: OrderStatus.PENDING });
      expect(mockEm.count).toHaveBeenCalledWith(Order, { status: OrderStatus.PROCESSING });
      expect(mockEm.count).toHaveBeenCalledWith(Order, { status: OrderStatus.COMPLETED });
      expect(mockEm.count).toHaveBeenCalledWith(Order, { status: OrderStatus.CANCELLED });
      expect(mockEm.count).toHaveBeenCalledWith(Order, { status: OrderStatus.REFUNDED });
    });

    it('should return all zeros when no orders exist', async () => {
      mockEm.count.mockResolvedValue(0);

      const result = await service.getStatusCounts();

      expect(Object.values(result).every((c) => c === 0)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // getRecentOrders
  // ---------------------------------------------------------------------------

  describe('getRecentOrders', () => {
    it('should return recent orders with default limit of 5', async () => {
      const orders = [buildMockOrder(), buildMockOrder({ id: 'order_2' })];
      mockEm.find.mockResolvedValueOnce(orders as any);

      const result = await service.getRecentOrders();

      expect(result).toEqual(orders);
      expect(mockEm.find).toHaveBeenCalledWith(
        Order,
        {},
        {
          populate: ['member', 'items'],
          limit: 5,
          orderBy: { createdAt: 'DESC' },
        },
      );
    });

    it('should respect custom limit parameter', async () => {
      mockEm.find.mockResolvedValueOnce([] as any);

      await service.getRecentOrders(10);

      expect(mockEm.find).toHaveBeenCalledWith(
        Order,
        {},
        expect.objectContaining({ limit: 10 }),
      );
    });

    it('should return empty array when no orders exist', async () => {
      mockEm.find.mockResolvedValueOnce([] as any);

      const result = await service.getRecentOrders();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // linkInvoice
  // ---------------------------------------------------------------------------

  describe('linkInvoice', () => {
    it('should link an invoice to an order', async () => {
      const order = buildMockOrder();
      mockEm.findOne.mockResolvedValueOnce(order as any);

      const result = await service.linkInvoice('order_test_123', 'invoice_456');

      expect(result.invoiceId).toBe('invoice_456');
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order is not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(
        service.linkInvoice('nonexistent', 'invoice_456'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
