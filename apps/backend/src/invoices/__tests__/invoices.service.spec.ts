import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/core';
import { InvoicesService } from '../invoices.service';
import { Invoice } from '../invoices.entity';
import { InvoiceItem } from '../invoice-items.entity';
import { Profile } from '../../profiles/profiles.entity';
import { Order } from '../../orders/orders.entity';
import { EmailService } from '../../email/email.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { createMockInvoice, createMockProfile } from '../../../test/utils/test-utils';
import {
  InvoiceStatus,
  InvoiceItemType,
  CreateInvoiceDto,
  UpdateInvoiceStatusDto,
  InvoiceListQuery,
} from '@newmeca/shared';

// Mock @mikro-orm/core wrap function
jest.mock('@mikro-orm/core', () => {
  const actual = jest.requireActual('@mikro-orm/core');
  return {
    ...actual,
    wrap: jest.fn((entity) => ({
      assign: jest.fn((data) => Object.assign(entity, data)),
    })),
  };
});

describe('InvoicesService', () => {
  let service: InvoicesService;
  let mockEm: jest.Mocked<EntityManager>;
  let mockEmailService: { sendInvoiceEmail: jest.Mock };
  let mockConnection: { execute: jest.Mock };

  beforeEach(async () => {
    mockEm = createMockEntityManager();

    // Add findAndCount mock (not in the default mock factory)
    (mockEm as any).findAndCount = jest.fn().mockResolvedValue([[], 0]);

    // Setup getConnection().execute() for invoice number generation
    mockConnection = { execute: jest.fn() };
    (mockEm as any).getConnection = jest.fn().mockReturnValue(mockConnection);

    mockEmailService = {
      sendInvoiceEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: 'EntityManager',
          useValue: mockEm,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Helper factories
  // ---------------------------------------------------------------------------

  function buildInvoiceEntity(overrides: Partial<Invoice> = {}): Invoice {
    return {
      id: 'inv-uuid-1',
      invoiceNumber: 'INV-2026-00001',
      status: InvoiceStatus.DRAFT,
      subtotal: '100.00',
      tax: '0.00',
      discount: '0.00',
      total: '100.00',
      currency: 'USD',
      dueDate: new Date('2026-03-01'),
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-02-01'),
      items: {
        getItems: () => [],
        add: jest.fn(),
      } as any,
      ...overrides,
    } as Invoice;
  }

  function buildOrderEntity(overrides: Partial<any> = {}) {
    return {
      id: 'order-uuid-1',
      orderNumber: 'ORD-2026-0001',
      member: { id: 'profile-uuid-1', email: 'user@example.com' },
      subtotal: '50.00',
      tax: '5.00',
      discount: '0.00',
      total: '55.00',
      currency: 'USD',
      notes: 'Order notes',
      billingAddress: { city: 'Dallas', state: 'TX' },
      items: {
        getItems: () => [
          {
            description: 'Membership',
            quantity: 1,
            unitPrice: '50.00',
            total: '50.00',
            itemType: 'membership',
            referenceId: 'ref-1',
            metadata: null,
          },
        ],
      },
      ...overrides,
    };
  }

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------

  describe('findById', () => {
    it('should return an invoice when found', async () => {
      const invoice = buildInvoiceEntity();
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      const result = await service.findById('inv-uuid-1');

      expect(result).toBe(invoice);
      expect(mockEm.findOne).toHaveBeenCalledWith(
        Invoice,
        { id: 'inv-uuid-1' },
        { populate: ['user', 'items'] },
      );
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        new NotFoundException('Invoice with ID nonexistent not found'),
      );
    });

    it('should use a forked entity manager', async () => {
      mockEm.findOne.mockResolvedValueOnce(buildInvoiceEntity() as any);

      await service.findById('inv-uuid-1');

      expect(mockEm.fork).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // findByInvoiceNumber
  // ---------------------------------------------------------------------------

  describe('findByInvoiceNumber', () => {
    it('should return an invoice when found by invoice number', async () => {
      const invoice = buildInvoiceEntity();
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      const result = await service.findByInvoiceNumber('INV-2026-00001');

      expect(result).toBe(invoice);
      expect(mockEm.findOne).toHaveBeenCalledWith(
        Invoice,
        { invoiceNumber: 'INV-2026-00001' },
        { populate: ['user', 'items'] },
      );
    });

    it('should return null when invoice not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      const result = await service.findByInvoiceNumber('INV-MISSING');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findByUser
  // ---------------------------------------------------------------------------

  describe('findByUser', () => {
    it('should return paginated invoices for a user', async () => {
      const invoices = [buildInvoiceEntity(), buildInvoiceEntity({ id: 'inv-uuid-2' })];
      (mockEm as any).findAndCount.mockResolvedValueOnce([invoices, 2]);

      const result = await service.findByUser('user-uuid-1', 1, 20);

      expect(result).toEqual({ data: invoices, total: 2 });
      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Invoice,
        { user: 'user-uuid-1' },
        {
          populate: ['items'],
          limit: 20,
          offset: 0,
          orderBy: { createdAt: 'DESC' },
        },
      );
    });

    it('should calculate offset from page and limit', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findByUser('user-uuid-1', 3, 10);

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Invoice,
        { user: 'user-uuid-1' },
        expect.objectContaining({
          limit: 10,
          offset: 20,
        }),
      );
    });

    it('should use default page 1 and limit 20', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findByUser('user-uuid-1');

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Invoice,
        { user: 'user-uuid-1' },
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
    it('should return paginated results with default query', async () => {
      const invoices = [buildInvoiceEntity()];
      (mockEm as any).findAndCount.mockResolvedValueOnce([invoices, 1]);

      const query: InvoiceListQuery = { page: 1, limit: 20 };
      const result = await service.findAll(query);

      expect(result.data).toEqual(invoices);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findAll({ page: 1, limit: 20, status: InvoiceStatus.PAID });

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Invoice,
        expect.objectContaining({ status: InvoiceStatus.PAID }),
        expect.any(Object),
      );
    });

    it('should filter by userId', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findAll({ page: 1, limit: 20, userId: 'user-1' });

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Invoice,
        expect.objectContaining({ user: 'user-1' }),
        expect.any(Object),
      );
    });

    it('should filter by startDate and endDate', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      await service.findAll({ page: 1, limit: 20, startDate, endDate });

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Invoice,
        expect.objectContaining({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        expect.any(Object),
      );
    });

    it('should filter by search (invoiceNumber like)', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findAll({ page: 1, limit: 20, search: '2026' });

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Invoice,
        expect.objectContaining({
          invoiceNumber: { $like: '%2026%' },
        }),
        expect.any(Object),
      );
    });

    it('should filter overdue invoices (SENT with past dueDate)', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 0]);

      await service.findAll({ page: 1, limit: 20, overdue: true });

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Invoice,
        expect.objectContaining({
          status: InvoiceStatus.SENT,
          dueDate: { $lt: expect.any(Date) },
        }),
        expect.any(Object),
      );
    });

    it('should calculate totalPages correctly', async () => {
      (mockEm as any).findAndCount.mockResolvedValueOnce([[], 45]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.pagination.totalPages).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe('create', () => {
    const createDto: CreateInvoiceDto = {
      userId: 'user-uuid-1',
      items: [
        {
          description: 'Competitor Membership',
          quantity: 1,
          unitPrice: '50.00',
          itemType: InvoiceItemType.MEMBERSHIP,
        },
        {
          description: 'Processing Fee',
          quantity: 1,
          unitPrice: '2.50',
          itemType: InvoiceItemType.PROCESSING_FEE,
        },
      ],
      sendEmail: false,
      currency: 'USD',
    };

    beforeEach(() => {
      // Mock user lookup
      mockEm.findOne.mockResolvedValueOnce({ id: 'user-uuid-1', email: 'user@example.com' } as any);
      // Mock invoice number generation
      mockConnection.execute.mockResolvedValueOnce([{ invoice_number: 'INV-2026-00001' }]);
      // Mock em.create to return an object with an items collection for Invoices
      mockEm.create.mockImplementation((EntityClass: any, data: any) => {
        if (EntityClass === Invoice) {
          return {
            ...data,
            items: { add: jest.fn(), getItems: () => [] },
          };
        }
        // InvoiceItem creation
        return { ...data };
      });
    });

    it('should create an invoice with correct totals', async () => {
      await service.create(createDto);

      // First em.create call is for the Invoice
      expect(mockEm.create).toHaveBeenCalledWith(
        Invoice,
        expect.objectContaining({
          invoiceNumber: 'INV-2026-00001',
          status: InvoiceStatus.DRAFT,
          subtotal: '52.50',
          total: '52.50',
          tax: '0.00',
          discount: '0.00',
          currency: 'USD',
        }),
      );
    });

    it('should create invoice items for each item in data', async () => {
      await service.create(createDto);

      // Two InvoiceItem creates + one Invoice create = 3 calls
      expect(mockEm.create).toHaveBeenCalledTimes(3);
      expect(mockEm.create).toHaveBeenCalledWith(
        InvoiceItem,
        expect.objectContaining({
          description: 'Competitor Membership',
          quantity: 1,
          unitPrice: '50.00',
          total: '50.00',
          itemType: InvoiceItemType.MEMBERSHIP,
        }),
      );
      expect(mockEm.create).toHaveBeenCalledWith(
        InvoiceItem,
        expect.objectContaining({
          description: 'Processing Fee',
          quantity: 1,
          unitPrice: '2.50',
          total: '2.50',
          itemType: InvoiceItemType.PROCESSING_FEE,
        }),
      );
    });

    it('should throw NotFoundException if userId is provided but user not found', async () => {
      // Override: user not found
      mockEm.findOne.mockReset();
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(
        new NotFoundException('User with ID user-uuid-1 not found'),
      );
    });

    it('should generate invoice number via database function', async () => {
      await service.create(createDto);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        'SELECT generate_invoice_number() as invoice_number',
      );
    });

    it('should fallback to count-based invoice number when db function fails', async () => {
      // Reset mocks set in beforeEach
      mockEm.findOne.mockReset();
      mockEm.findOne.mockResolvedValueOnce({ id: 'user-uuid-1' } as any);
      mockConnection.execute.mockReset();
      mockConnection.execute.mockRejectedValueOnce(new Error('function not found'));
      mockEm.count.mockResolvedValueOnce(7);

      mockEm.create.mockImplementation((EntityClass: any, data: any) => {
        if (EntityClass === Invoice) {
          return { ...data, items: { add: jest.fn(), getItems: () => [] } };
        }
        return { ...data };
      });

      await service.create(createDto);

      expect(mockEm.count).toHaveBeenCalledWith(Invoice, {
        invoiceNumber: { $like: `INV-${new Date().getFullYear()}-%` },
      });
      // 7 existing + 1 = 8, padded to 5 digits
      expect(mockEm.create).toHaveBeenCalledWith(
        Invoice,
        expect.objectContaining({
          invoiceNumber: `INV-${new Date().getFullYear()}-00008`,
        }),
      );
    });

    it('should use dueDate from data when provided', async () => {
      const dueDate = new Date('2026-06-01');
      await service.create({ ...createDto, dueDate });

      expect(mockEm.create).toHaveBeenCalledWith(
        Invoice,
        expect.objectContaining({
          dueDate: expect.any(Date),
        }),
      );
    });

    it('should persist and flush the invoice', async () => {
      await service.create(createDto);

      expect(mockEm.persistAndFlush).toHaveBeenCalled();
    });

    it('should create invoice without userId', async () => {
      mockEm.findOne.mockReset();
      // No user lookup needed
      mockConnection.execute.mockReset();
      mockConnection.execute.mockResolvedValueOnce([{ invoice_number: 'INV-2026-00002' }]);
      mockEm.create.mockImplementation((EntityClass: any, data: any) => {
        if (EntityClass === Invoice) {
          return { ...data, items: { add: jest.fn(), getItems: () => [] } };
        }
        return { ...data };
      });

      const dto: CreateInvoiceDto = {
        items: [
          {
            description: 'Item',
            quantity: 1,
            unitPrice: '10.00',
            itemType: InvoiceItemType.OTHER,
          },
        ],
        sendEmail: false,
        currency: 'USD',
      };

      await service.create(dto);

      expect(mockEm.create).toHaveBeenCalledWith(
        Invoice,
        expect.objectContaining({
          user: undefined,
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // createFromOrder
  // ---------------------------------------------------------------------------

  describe('createFromOrder', () => {
    it('should create an invoice from an order', async () => {
      const order = buildOrderEntity();
      // First findOne: order lookup
      mockEm.findOne.mockResolvedValueOnce(order as any);
      // Second findOne: existing invoice check (none found)
      mockEm.findOne.mockResolvedValueOnce(null);
      // Invoice number generation
      mockConnection.execute.mockResolvedValueOnce([{ invoice_number: 'INV-2026-00010' }]);

      mockEm.create.mockImplementation((EntityClass: any, data: any) => {
        if (EntityClass === Invoice) {
          return {
            ...data,
            id: 'new-invoice-id',
            items: { add: jest.fn(), getItems: () => [] },
          };
        }
        return { ...data };
      });

      const result = await service.createFromOrder('order-uuid-1');

      expect(result).toBeDefined();
      expect(mockEm.findOne).toHaveBeenCalledWith(
        Order,
        { id: 'order-uuid-1' },
        { populate: ['member', 'items'] },
      );
      expect(mockEm.create).toHaveBeenCalledWith(
        Invoice,
        expect.objectContaining({
          invoiceNumber: 'INV-2026-00010',
          status: InvoiceStatus.PAID,
          subtotal: '50.00',
          tax: '5.00',
          total: '55.00',
        }),
      );
    });

    it('should return existing invoice if one already exists for the order', async () => {
      const order = buildOrderEntity();
      const existingInvoice = buildInvoiceEntity({ id: 'existing-inv' });

      // First findOne: order lookup
      mockEm.findOne.mockResolvedValueOnce(order as any);
      // Second findOne: existing invoice found
      mockEm.findOne.mockResolvedValueOnce(existingInvoice as any);

      const result = await service.createFromOrder('order-uuid-1');

      expect(result).toBe(existingInvoice);
      expect(mockEm.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when order not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(service.createFromOrder('bad-order')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should copy order items to invoice items', async () => {
      const order = buildOrderEntity();
      mockEm.findOne.mockResolvedValueOnce(order as any);
      mockEm.findOne.mockResolvedValueOnce(null); // no existing invoice
      mockConnection.execute.mockResolvedValueOnce([{ invoice_number: 'INV-2026-00011' }]);

      mockEm.create.mockImplementation((EntityClass: any, data: any) => {
        if (EntityClass === Invoice) {
          return {
            ...data,
            id: 'new-inv',
            items: { add: jest.fn(), getItems: () => [] },
          };
        }
        return { ...data };
      });

      await service.createFromOrder('order-uuid-1');

      expect(mockEm.create).toHaveBeenCalledWith(
        InvoiceItem,
        expect.objectContaining({
          description: 'Membership',
          quantity: 1,
          unitPrice: '50.00',
          total: '50.00',
        }),
      );
    });

    it('should persist both invoice and order', async () => {
      const order = buildOrderEntity();
      mockEm.findOne.mockResolvedValueOnce(order as any);
      mockEm.findOne.mockResolvedValueOnce(null);
      mockConnection.execute.mockResolvedValueOnce([{ invoice_number: 'INV-2026-00012' }]);

      mockEm.create.mockImplementation((EntityClass: any, data: any) => {
        if (EntityClass === Invoice) {
          return {
            ...data,
            id: 'new-inv-id',
            items: { add: jest.fn(), getItems: () => [] },
          };
        }
        return { ...data };
      });

      await service.createFromOrder('order-uuid-1');

      expect(mockEm.persistAndFlush).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ invoiceNumber: 'INV-2026-00012' }),
          expect.objectContaining({ id: 'order-uuid-1' }),
        ]),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // updateStatus
  // ---------------------------------------------------------------------------

  describe('updateStatus', () => {
    it('should update the invoice status', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.DRAFT });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      const result = await service.updateStatus('inv-uuid-1', {
        status: InvoiceStatus.SENT,
      });

      expect(wrap).toHaveBeenCalledWith(invoice);
      expect(result.status).toBe(InvoiceStatus.SENT);
    });

    it('should set sentAt when transitioning to SENT', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.DRAFT, sentAt: undefined });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await service.updateStatus('inv-uuid-1', { status: InvoiceStatus.SENT });

      expect(wrap).toHaveBeenCalledWith(invoice);
      // wrap(invoice).assign was called with sentAt
      const mockWrap = (wrap as jest.Mock).mock.results.find(
        (r) => r.type === 'return',
      );
      expect(mockWrap?.value.assign).toHaveBeenCalledWith(
        expect.objectContaining({
          status: InvoiceStatus.SENT,
          sentAt: expect.any(Date),
        }),
      );
    });

    it('should NOT overwrite existing sentAt', async () => {
      const existingSentAt = new Date('2026-01-15');
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.DRAFT, sentAt: existingSentAt });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await service.updateStatus('inv-uuid-1', { status: InvoiceStatus.SENT });

      const mockWrap = (wrap as jest.Mock).mock.results[0];
      const assignCall = mockWrap.value.assign.mock.calls[0][0];
      expect(assignCall.sentAt).toBeUndefined();
    });

    it('should set paidAt when transitioning to PAID', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.SENT, paidAt: undefined });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await service.updateStatus('inv-uuid-1', { status: InvoiceStatus.PAID });

      const mockWrap = (wrap as jest.Mock).mock.results[0];
      expect(mockWrap.value.assign).toHaveBeenCalledWith(
        expect.objectContaining({
          status: InvoiceStatus.PAID,
          paidAt: expect.any(Date),
        }),
      );
    });

    it('should NOT overwrite existing paidAt', async () => {
      const existingPaidAt = new Date('2026-01-20');
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.SENT, paidAt: existingPaidAt });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await service.updateStatus('inv-uuid-1', { status: InvoiceStatus.PAID });

      const mockWrap = (wrap as jest.Mock).mock.results[0];
      const assignCall = mockWrap.value.assign.mock.calls[0][0];
      expect(assignCall.paidAt).toBeUndefined();
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateStatus('bad-id', { status: InvoiceStatus.PAID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use notes from data if provided', async () => {
      const invoice = buildInvoiceEntity({ notes: 'original notes' });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await service.updateStatus('inv-uuid-1', {
        status: InvoiceStatus.SENT,
        notes: 'updated notes',
      });

      const mockWrap = (wrap as jest.Mock).mock.results[0];
      expect(mockWrap.value.assign).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'updated notes' }),
      );
    });

    it('should preserve existing notes when none provided in data', async () => {
      const invoice = buildInvoiceEntity({ notes: 'keep these notes' });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await service.updateStatus('inv-uuid-1', { status: InvoiceStatus.SENT });

      const mockWrap = (wrap as jest.Mock).mock.results[0];
      expect(mockWrap.value.assign).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'keep these notes' }),
      );
    });

    it('should flush after updating', async () => {
      const invoice = buildInvoiceEntity();
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await service.updateStatus('inv-uuid-1', { status: InvoiceStatus.SENT });

      expect(mockEm.flush).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // markAsPaid
  // ---------------------------------------------------------------------------

  describe('markAsPaid', () => {
    it('should delegate to updateStatus with PAID status', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.SENT });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      const result = await service.markAsPaid('inv-uuid-1');

      expect(result).toBeDefined();
      expect(mockEm.findOne).toHaveBeenCalledWith(
        Invoice,
        { id: 'inv-uuid-1' },
        { populate: ['items'] },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // markAsSent
  // ---------------------------------------------------------------------------

  describe('markAsSent', () => {
    it('should delegate to updateStatus with SENT status', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.DRAFT });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      const result = await service.markAsSent('inv-uuid-1');

      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // cancel
  // ---------------------------------------------------------------------------

  describe('cancel', () => {
    it('should cancel a DRAFT invoice', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.DRAFT });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      const result = await service.cancel('inv-uuid-1', 'No longer needed');

      expect(wrap).toHaveBeenCalledWith(invoice);
      expect(result.status).toBe(InvoiceStatus.CANCELLED);
    });

    it('should cancel a SENT invoice', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.SENT });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      const result = await service.cancel('inv-uuid-1');

      expect(result.status).toBe(InvoiceStatus.CANCELLED);
    });

    it('should throw BadRequestException when cancelling a PAID invoice', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.PAID });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await expect(service.cancel('inv-uuid-1')).rejects.toThrow(
        new BadRequestException('Cannot cancel a paid invoice. Use refund instead.'),
      );
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(service.cancel('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set the reason as notes when provided', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.DRAFT, notes: 'old notes' });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await service.cancel('inv-uuid-1', 'Duplicate invoice');

      const mockWrap = (wrap as jest.Mock).mock.results[0];
      expect(mockWrap.value.assign).toHaveBeenCalledWith(
        expect.objectContaining({
          status: InvoiceStatus.CANCELLED,
          notes: 'Duplicate invoice',
        }),
      );
    });

    it('should keep existing notes when no reason provided', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.DRAFT, notes: 'existing' });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await service.cancel('inv-uuid-1');

      const mockWrap = (wrap as jest.Mock).mock.results[0];
      expect(mockWrap.value.assign).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'existing',
        }),
      );
    });

    it('should flush after cancelling', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.DRAFT });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await service.cancel('inv-uuid-1');

      expect(mockEm.flush).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // markOverdueInvoices
  // ---------------------------------------------------------------------------

  describe('markOverdueInvoices', () => {
    it('should find SENT invoices past due and mark as OVERDUE', async () => {
      const overdueInvoices = [
        buildInvoiceEntity({ id: 'ov-1', status: InvoiceStatus.SENT }),
        buildInvoiceEntity({ id: 'ov-2', status: InvoiceStatus.SENT }),
      ];
      mockEm.find.mockResolvedValueOnce(overdueInvoices as any);

      const count = await service.markOverdueInvoices();

      expect(count).toBe(2);
      expect(mockEm.find).toHaveBeenCalledWith(Invoice, {
        status: InvoiceStatus.SENT,
        dueDate: { $lt: expect.any(Date) },
      });
      expect(wrap).toHaveBeenCalledTimes(2);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should return 0 when no overdue invoices exist', async () => {
      mockEm.find.mockResolvedValueOnce([]);

      const count = await service.markOverdueInvoices();

      expect(count).toBe(0);
      expect(mockEm.flush).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getStatusCounts
  // ---------------------------------------------------------------------------

  describe('getStatusCounts', () => {
    it('should return counts for all statuses', async () => {
      // Mock em.count for each status call in order
      mockEm.count
        .mockResolvedValueOnce(3)   // DRAFT
        .mockResolvedValueOnce(5)   // SENT
        .mockResolvedValueOnce(10)  // PAID
        .mockResolvedValueOnce(2)   // OVERDUE
        .mockResolvedValueOnce(1)   // CANCELLED
        .mockResolvedValueOnce(0);  // REFUNDED

      const result = await service.getStatusCounts();

      expect(result).toEqual({
        [InvoiceStatus.DRAFT]: 3,
        [InvoiceStatus.SENT]: 5,
        [InvoiceStatus.PAID]: 10,
        [InvoiceStatus.OVERDUE]: 2,
        [InvoiceStatus.CANCELLED]: 1,
        [InvoiceStatus.REFUNDED]: 0,
      });
      expect(mockEm.count).toHaveBeenCalledTimes(6);
    });

    it('should query each status individually', async () => {
      mockEm.count.mockResolvedValue(0);

      await service.getStatusCounts();

      for (const status of Object.values(InvoiceStatus)) {
        expect(mockEm.count).toHaveBeenCalledWith(Invoice, { status });
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getUnpaidTotal
  // ---------------------------------------------------------------------------

  describe('getUnpaidTotal', () => {
    it('should sum totals of SENT and OVERDUE invoices', async () => {
      const unpaidInvoices = [
        buildInvoiceEntity({ total: '100.00', status: InvoiceStatus.SENT }),
        buildInvoiceEntity({ total: '250.50', status: InvoiceStatus.OVERDUE }),
        buildInvoiceEntity({ total: '75.00', status: InvoiceStatus.SENT }),
      ];
      mockEm.find.mockResolvedValueOnce(unpaidInvoices as any);

      const result = await service.getUnpaidTotal();

      expect(result).toEqual({
        count: 3,
        total: '425.50',
      });
      expect(mockEm.find).toHaveBeenCalledWith(Invoice, {
        status: { $in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
      });
    });

    it('should return zero when no unpaid invoices', async () => {
      mockEm.find.mockResolvedValueOnce([]);

      const result = await service.getUnpaidTotal();

      expect(result).toEqual({
        count: 0,
        total: '0.00',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // sendInvoice
  // ---------------------------------------------------------------------------

  describe('sendInvoice', () => {
    it('should send invoice email and update status to SENT', async () => {
      const user = { id: 'user-1', email: 'user@example.com', first_name: 'John' };
      const invoice = buildInvoiceEntity({
        id: 'inv-1',
        status: InvoiceStatus.DRAFT,
        user: user as any,
        total: '100.00',
        invoiceNumber: 'INV-2026-00001',
        dueDate: new Date('2026-03-01'),
        items: {
          getItems: () => [
            {
              description: 'Membership',
              quantity: 1,
              unitPrice: '100.00',
              total: '100.00',
            },
          ],
          add: jest.fn(),
        } as any,
      });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);
      mockEmailService.sendInvoiceEmail.mockResolvedValueOnce({ success: true });

      const result = await service.sendInvoice('inv-1');

      expect(result.success).toBe(true);
      expect(result.invoice).toBeDefined();
      expect(mockEmailService.sendInvoiceEmail).toHaveBeenCalledWith({
        to: 'user@example.com',
        firstName: 'John',
        invoiceNumber: 'INV-2026-00001',
        invoiceTotal: '100.00',
        dueDate: expect.any(Date),
        paymentUrl: expect.stringContaining('/pay/invoice/inv-1'),
        items: [
          {
            description: 'Membership',
            quantity: 1,
            unitPrice: '100.00',
            total: '100.00',
          },
        ],
      });
      expect(wrap).toHaveBeenCalledWith(invoice);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(service.sendInvoice('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for PAID invoices', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.PAID });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await expect(service.sendInvoice('inv-1')).rejects.toThrow(
        new BadRequestException('Cannot send a paid invoice'),
      );
    });

    it('should throw BadRequestException for CANCELLED invoices', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.CANCELLED });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await expect(service.sendInvoice('inv-1')).rejects.toThrow(
        new BadRequestException('Cannot send a cancelled invoice'),
      );
    });

    it('should throw BadRequestException for REFUNDED invoices', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.REFUNDED });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await expect(service.sendInvoice('inv-1')).rejects.toThrow(
        new BadRequestException('Cannot send a refunded invoice'),
      );
    });

    it('should throw BadRequestException when no email address available', async () => {
      const invoice = buildInvoiceEntity({
        status: InvoiceStatus.DRAFT,
        user: undefined,
      });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await expect(service.sendInvoice('inv-1')).rejects.toThrow(
        new BadRequestException('Invoice has no associated email address'),
      );
    });

    it('should return error result when email fails to send', async () => {
      const user = { id: 'user-1', email: 'user@example.com' };
      const invoice = buildInvoiceEntity({
        status: InvoiceStatus.DRAFT,
        user: user as any,
        items: { getItems: () => [], add: jest.fn() } as any,
      });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);
      mockEmailService.sendInvoiceEmail.mockResolvedValueOnce({
        success: false,
        error: 'SMTP connection failed',
      });

      const result = await service.sendInvoice('inv-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP connection failed');
      // Should NOT update status when email fails
      expect(mockEm.flush).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // resendInvoice
  // ---------------------------------------------------------------------------

  describe('resendInvoice', () => {
    it('should resend email for SENT invoice', async () => {
      const user = { id: 'user-1', email: 'user@example.com', first_name: 'Jane' };
      const invoice = buildInvoiceEntity({
        id: 'inv-1',
        status: InvoiceStatus.SENT,
        user: user as any,
        invoiceNumber: 'INV-2026-00005',
        total: '200.00',
        dueDate: new Date('2026-04-01'),
        items: {
          getItems: () => [
            { description: 'Item', quantity: 1, unitPrice: '200.00', total: '200.00' },
          ],
          add: jest.fn(),
        } as any,
      });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);
      mockEmailService.sendInvoiceEmail.mockResolvedValueOnce({ success: true });

      const result = await service.resendInvoice('inv-1');

      expect(result.success).toBe(true);
      expect(mockEmailService.sendInvoiceEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          invoiceNumber: 'INV-2026-00005',
        }),
      );
    });

    it('should resend email for OVERDUE invoice', async () => {
      const user = { id: 'user-1', email: 'user@example.com' };
      const invoice = buildInvoiceEntity({
        status: InvoiceStatus.OVERDUE,
        user: user as any,
        items: { getItems: () => [], add: jest.fn() } as any,
      });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);
      mockEmailService.sendInvoiceEmail.mockResolvedValueOnce({ success: true });

      const result = await service.resendInvoice('inv-1');

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(service.resendInvoice('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for DRAFT invoices', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.DRAFT });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await expect(service.resendInvoice('inv-1')).rejects.toThrow(
        new BadRequestException('Cannot resend invoice with status draft'),
      );
    });

    it('should throw BadRequestException for PAID invoices', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.PAID });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await expect(service.resendInvoice('inv-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for CANCELLED invoices', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.CANCELLED });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await expect(service.resendInvoice('inv-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when no email address', async () => {
      const invoice = buildInvoiceEntity({
        status: InvoiceStatus.SENT,
        user: undefined,
      });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await expect(service.resendInvoice('inv-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return error when email fails', async () => {
      const user = { id: 'user-1', email: 'user@example.com' };
      const invoice = buildInvoiceEntity({
        status: InvoiceStatus.SENT,
        user: user as any,
        items: { getItems: () => [], add: jest.fn() } as any,
      });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);
      mockEmailService.sendInvoiceEmail.mockResolvedValueOnce({
        success: false,
        error: 'Timeout',
      });

      const result = await service.resendInvoice('inv-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Timeout');
    });
  });

  // ---------------------------------------------------------------------------
  // generatePaymentUrl
  // ---------------------------------------------------------------------------

  describe('generatePaymentUrl', () => {
    it('should generate URL with FRONTEND_URL env variable', () => {
      const originalUrl = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = 'https://mecacaraudio.com';

      const url = service.generatePaymentUrl('inv-uuid-1');

      expect(url).toBe('https://mecacaraudio.com/pay/invoice/inv-uuid-1');
      process.env.FRONTEND_URL = originalUrl;
    });

    it('should fallback to localhost when FRONTEND_URL is not set', () => {
      const originalUrl = process.env.FRONTEND_URL;
      delete process.env.FRONTEND_URL;

      const url = service.generatePaymentUrl('inv-uuid-1');

      expect(url).toBe('http://localhost:5173/pay/invoice/inv-uuid-1');
      process.env.FRONTEND_URL = originalUrl;
    });
  });

  // ---------------------------------------------------------------------------
  // markRefunded
  // ---------------------------------------------------------------------------

  describe('markRefunded', () => {
    it('should mark an invoice as refunded with a reason', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.PAID });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      const result = await service.markRefunded('inv-uuid-1', 'Customer requested refund');

      expect(wrap).toHaveBeenCalledWith(invoice);
      expect(result.status).toBe(InvoiceStatus.REFUNDED);
      expect(result.notes).toBe('Customer requested refund');
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockEm.findOne.mockResolvedValueOnce(null);

      await expect(
        service.markRefunded('bad-id', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should flush after marking as refunded', async () => {
      const invoice = buildInvoiceEntity({ status: InvoiceStatus.PAID });
      mockEm.findOne.mockResolvedValueOnce(invoice as any);

      await service.markRefunded('inv-uuid-1', 'Refund reason');

      expect(mockEm.flush).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // fixNullDueDates
  // ---------------------------------------------------------------------------

  describe('fixNullDueDates', () => {
    it('should fix invoices with null due dates', async () => {
      const invoices = [
        buildInvoiceEntity({
          invoiceNumber: 'INV-001',
          dueDate: undefined,
          createdAt: new Date('2026-01-15'),
        }),
        buildInvoiceEntity({
          invoiceNumber: 'INV-002',
          dueDate: undefined,
          createdAt: new Date('2026-02-01'),
        }),
      ];
      mockEm.find.mockResolvedValueOnce(invoices as any);

      const result = await service.fixNullDueDates();

      expect(result.fixed).toBe(2);
      expect(result.invoiceNumbers).toEqual(['INV-001', 'INV-002']);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should return zero when no invoices have null due dates', async () => {
      mockEm.find.mockResolvedValueOnce([]);

      const result = await service.fixNullDueDates();

      expect(result.fixed).toBe(0);
      expect(result.invoiceNumbers).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getRecentInvoices
  // ---------------------------------------------------------------------------

  describe('getRecentInvoices', () => {
    it('should return recent invoices with default limit of 5', async () => {
      const invoices = [buildInvoiceEntity()];
      mockEm.find.mockResolvedValueOnce(invoices as any);

      const result = await service.getRecentInvoices();

      expect(result).toEqual(invoices);
      expect(mockEm.find).toHaveBeenCalledWith(
        Invoice,
        {},
        {
          populate: ['user', 'items'],
          limit: 5,
          orderBy: { createdAt: 'DESC' },
        },
      );
    });

    it('should accept a custom limit', async () => {
      mockEm.find.mockResolvedValueOnce([]);

      await service.getRecentInvoices(10);

      expect(mockEm.find).toHaveBeenCalledWith(
        Invoice,
        {},
        expect.objectContaining({ limit: 10 }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findPaidSince
  // ---------------------------------------------------------------------------

  describe('findPaidSince', () => {
    it('should find invoices paid since a given date', async () => {
      const since = new Date('2026-01-01');
      const invoices = [buildInvoiceEntity({ status: InvoiceStatus.PAID })];
      mockEm.find.mockResolvedValueOnce(invoices as any);

      const result = await service.findPaidSince(since);

      expect(result).toEqual(invoices);
      expect(mockEm.find).toHaveBeenCalledWith(
        Invoice,
        {
          status: InvoiceStatus.PAID,
          paidAt: { $gte: since },
        },
        {
          populate: ['user', 'items'],
          orderBy: { paidAt: 'ASC' },
        },
      );
    });
  });
});
