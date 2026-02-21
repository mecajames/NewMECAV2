import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { EventRegistrationsService, CreateRegistrationDto } from '../event-registrations.service';
import { EventRegistration } from '../event-registrations.entity';
import { EventRegistrationClass } from '../event-registration-classes.entity';
import { Event } from '../../events/events.entity';
import { Profile } from '../../profiles/profiles.entity';
import { QrCodeService } from '../qr-code.service';
import { EmailService } from '../../email/email.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { createMockEventRegistration, createMockEvent } from '../../../test/utils/test-utils';
import { RegistrationStatus, PaymentStatus } from '@newmeca/shared';

describe('EventRegistrationsService', () => {
  let service: EventRegistrationsService;
  let mockEm: jest.Mocked<EntityManager>;
  let mockQrCodeService: any;
  let mockEmailService: any;

  beforeEach(async () => {
    mockEm = createMockEntityManager();

    mockQrCodeService = {
      generateCheckInData: jest.fn().mockResolvedValue({
        checkInCode: 'REG-ABC123-X9Y8',
        qrCodeData: 'data:image/png;base64,mockdata',
      }),
      validateCheckInCode: jest.fn().mockReturnValue(true),
    };

    mockEmailService = {
      sendEventRegistrationConfirmationEmail: jest.fn().mockResolvedValue(undefined),
      sendEventRegistrationCancelledEmail: jest.fn().mockResolvedValue(undefined),
      sendEventReminderEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventRegistrationsService,
        {
          provide: 'EntityManager',
          useValue: mockEm,
        },
        {
          provide: QrCodeService,
          useValue: mockQrCodeService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<EventRegistrationsService>(EventRegistrationsService);
  });

  // ============================================
  // findById
  // ============================================

  describe('findById', () => {
    it('should return a registration when found', async () => {
      const mockRegistration = createMockEventRegistration({ id: 'reg-1' });
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.findById('reg-1');

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.findOne).toHaveBeenCalledWith(EventRegistration, { id: 'reg-1' }, {
        populate: ['event', 'user', 'classes', 'membership', 'checkedInBy'],
      });
      expect(result).toEqual(mockRegistration);
    });

    it('should throw NotFoundException when registration not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('nonexistent')).rejects.toThrow(
        'Registration with ID nonexistent not found',
      );
    });
  });

  // ============================================
  // findByCheckInCode
  // ============================================

  describe('findByCheckInCode', () => {
    it('should return a registration when found by check-in code', async () => {
      const mockRegistration = createMockEventRegistration({ checkInCode: 'REG-ABC123-X9Y8' });
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.findByCheckInCode('REG-ABC123-X9Y8');

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.findOne).toHaveBeenCalledWith(EventRegistration, { checkInCode: 'REG-ABC123-X9Y8' }, {
        populate: ['event', 'user', 'classes', 'membership', 'checkedInBy'],
      });
      expect(result).toEqual(mockRegistration);
    });

    it('should throw NotFoundException when code not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.findByCheckInCode('REG-INVALID-CODE')).rejects.toThrow(NotFoundException);
      await expect(service.findByCheckInCode('REG-INVALID-CODE')).rejects.toThrow(
        'Registration with check-in code REG-INVALID-CODE not found',
      );
    });
  });

  // ============================================
  // calculatePricing
  // ============================================

  describe('calculatePricing', () => {
    const mockEvent = {
      id: 'event-1',
      memberEntryFee: 20,
      nonMemberEntryFee: 30,
    };

    it('should calculate member pricing when isMember is true', async () => {
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const result = await service.calculatePricing('event-1', 3, true, false, 0);

      expect(result).toEqual({
        perClassFee: 20,
        classesSubtotal: 60,
        membershipCost: 0,
        total: 60,
        savings: 0,
        isMemberPricing: true,
      });
    });

    it('should calculate non-member pricing when not a member', async () => {
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const result = await service.calculatePricing('event-1', 2, false, false, 0);

      expect(result).toEqual({
        perClassFee: 30,
        classesSubtotal: 60,
        membershipCost: 0,
        total: 60,
        savings: 0,
        isMemberPricing: false,
      });
    });

    it('should use member pricing when includeMembership is true even if not a member', async () => {
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const result = await service.calculatePricing('event-1', 3, false, true, 50);

      expect(result).toEqual({
        perClassFee: 20,
        classesSubtotal: 60,
        membershipCost: 50,
        total: 110,
        savings: 30,
        isMemberPricing: true,
      });
    });

    it('should calculate savings correctly when purchasing membership', async () => {
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const result = await service.calculatePricing('event-1', 2, false, true, 50);

      // Non-member total: 2 * 30 = 60
      // Member subtotal: 2 * 20 = 40
      // Savings: 60 - 40 = 20
      expect(result.savings).toBe(20);
      expect(result.membershipCost).toBe(50);
      expect(result.total).toBe(90); // 40 + 50
    });

    it('should throw NotFoundException when event not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.calculatePricing('nonexistent', 1, false)).rejects.toThrow(NotFoundException);
      await expect(service.calculatePricing('nonexistent', 1, false)).rejects.toThrow(
        'Event with ID nonexistent not found',
      );
    });

    it('should handle null entry fees by defaulting to 0', async () => {
      const eventWithNullFees = { id: 'event-null', memberEntryFee: null, nonMemberEntryFee: null };
      mockEm.findOne.mockResolvedValue(eventWithNullFees as any);

      const result = await service.calculatePricing('event-null', 3, false, false, 0);

      expect(result.perClassFee).toBe(0);
      expect(result.classesSubtotal).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle zero classes', async () => {
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const result = await service.calculatePricing('event-1', 0, true, false, 0);

      expect(result.classesSubtotal).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  // ============================================
  // createRegistration
  // ============================================

  describe('createRegistration', () => {
    const mockEvent = {
      id: 'event-1',
      title: 'Test Event',
      memberEntryFee: 20,
      nonMemberEntryFee: 30,
    };

    const baseDto: CreateRegistrationDto = {
      eventId: 'event-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      phone: '555-1234',
      classes: [
        { competitionClassId: 'class-1', format: 'SQ', className: 'SQ Beginner' },
        { competitionClassId: 'class-2', format: 'SPL', className: 'SPL Beginner' },
      ],
    };

    it('should create a registration with member pricing when isMember is true', async () => {
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const result = await service.createRegistration(baseDto, true);

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.persistAndFlush).toHaveBeenCalled();
      expect(mockQrCodeService.generateCheckInData).toHaveBeenCalledWith(expect.any(String));
      expect(mockEm.flush).toHaveBeenCalled();
      // Should persist class registrations
      expect(mockEm.persist).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBe('Test');
      expect(result.lastName).toBe('User');
      expect(result.registrationStatus).toBe(RegistrationStatus.PENDING);
      expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
    });

    it('should throw NotFoundException when event not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.createRegistration(baseDto, false)).rejects.toThrow(NotFoundException);
      await expect(service.createRegistration(baseDto, false)).rejects.toThrow(
        'Event with ID event-1 not found',
      );
    });

    it('should set user reference when userId is provided', async () => {
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const dtoWithUser = { ...baseDto, userId: 'user-123' };
      const result = await service.createRegistration(dtoWithUser, true);

      expect(result.user).toBeDefined();
    });

    it('should not set user reference when userId is not provided', async () => {
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const result = await service.createRegistration(baseDto, false);

      // user should remain undefined since no userId in dto
      // (user is only set if dto.userId is truthy)
      expect(result.user).toBeUndefined();
    });

    it('should generate QR code data after initial persist', async () => {
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const result = await service.createRegistration(baseDto, true);

      expect(mockQrCodeService.generateCheckInData).toHaveBeenCalled();
      expect(result.checkInCode).toBe('REG-ABC123-X9Y8');
      expect(result.qrCodeData).toBe('data:image/png;base64,mockdata');
    });

    it('should set membershipPurchasedDuringRegistration when includeMembership is true', async () => {
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const dtoWithMembership = { ...baseDto, includeMembership: true };
      const result = await service.createRegistration(dtoWithMembership, false);

      expect(result.membershipPurchasedDuringRegistration).toBe(true);
    });

    it('should set mecaId when provided in dto', async () => {
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const dtoWithMecaId = { ...baseDto, mecaId: 701501 };
      const result = await service.createRegistration(dtoWithMecaId, true);

      expect(result.mecaId).toBe(701501);
    });

    it('should default country to US when not provided', async () => {
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const result = await service.createRegistration(baseDto, false);

      expect(result.country).toBe('US');
    });

    it('should use provided country when specified', async () => {
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const dtoWithCountry = { ...baseDto, country: 'CA' };
      const result = await service.createRegistration(dtoWithCountry, false);

      expect(result.country).toBe('CA');
    });
  });

  // ============================================
  // completeRegistration
  // ============================================

  describe('completeRegistration', () => {
    it('should mark registration as paid and confirmed', async () => {
      const mockRegistration = {
        id: 'reg-1',
        email: 'test@example.com',
        firstName: 'Test',
        registrationStatus: RegistrationStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        event: { title: 'Test Event', eventDate: new Date(), venueName: 'Venue', venueAddress: 'Addr' },
        classes: { getItems: jest.fn().mockReturnValue([]) },
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.completeRegistration('reg-1', 'pi_test_123', 5000);

      expect(mockEm.fork).toHaveBeenCalled();
      expect(result.stripePaymentIntentId).toBe('pi_test_123');
      expect(result.amountPaid).toBe(5000);
      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(result.registrationStatus).toBe(RegistrationStatus.CONFIRMED);
      expect(result.registeredAt).toBeInstanceOf(Date);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should throw NotFoundException when registration not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.completeRegistration('nonexistent', 'pi_123', 5000)).rejects.toThrow(NotFoundException);
    });

    it('should set membership reference when membershipId provided', async () => {
      const mockRegistration = {
        id: 'reg-1',
        email: 'test@example.com',
        firstName: 'Test',
        registrationStatus: RegistrationStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        event: { title: 'Test Event', eventDate: new Date(), venueName: 'V', venueAddress: 'A' },
        classes: { getItems: jest.fn().mockReturnValue([]) },
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.completeRegistration('reg-1', 'pi_123', 5000, 'membership-1');

      expect(result.membership).toBeDefined();
    });

    it('should not set membership when membershipId is not provided', async () => {
      const mockRegistration = {
        id: 'reg-1',
        email: 'test@example.com',
        firstName: 'Test',
        registrationStatus: RegistrationStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        event: { title: 'Test Event', eventDate: new Date(), venueName: 'V', venueAddress: 'A' },
        classes: { getItems: jest.fn().mockReturnValue([]) },
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.completeRegistration('reg-1', 'pi_123', 5000);

      expect(result.membership).toBeUndefined();
    });

    it('should send confirmation email after completing registration', async () => {
      const mockRegistration = {
        id: 'reg-1',
        email: 'test@example.com',
        firstName: 'Test',
        registrationStatus: RegistrationStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        event: { title: 'Test Event', eventDate: new Date(), venueName: 'V', venueAddress: 'A' },
        classes: { getItems: jest.fn().mockReturnValue([]) },
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      await service.completeRegistration('reg-1', 'pi_123', 5000);

      expect(mockEmailService.sendEventRegistrationConfirmationEmail).toHaveBeenCalled();
    });
  });

  // ============================================
  // findByEmail
  // ============================================

  describe('findByEmail', () => {
    it('should find registrations by lowercased email', async () => {
      const mockRegs = [createMockEventRegistration({ email: 'test@example.com' })];
      mockEm.find.mockResolvedValue(mockRegs as any);

      const result = await service.findByEmail('TEST@EXAMPLE.COM');

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.find).toHaveBeenCalledWith(EventRegistration, { email: 'test@example.com' }, {
        populate: ['event', 'classes'],
        orderBy: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockRegs);
    });

    it('should return empty array when no registrations found', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.findByEmail('unknown@example.com');

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // findByUser
  // ============================================

  describe('findByUser', () => {
    it('should find registrations by user ID', async () => {
      const mockRegs = [createMockEventRegistration()];
      mockEm.find.mockResolvedValue(mockRegs as any);

      const result = await service.findByUser('user-123');

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.find).toHaveBeenCalledWith(EventRegistration, { user: 'user-123' }, {
        populate: ['event', 'classes'],
        orderBy: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockRegs);
    });

    it('should return empty array when no registrations for user', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.findByUser('user-no-regs');

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // linkRegistrationsToUser
  // ============================================

  describe('linkRegistrationsToUser', () => {
    it('should link unlinked registrations to user', async () => {
      const unlinkedRegs = [
        { id: 'reg-1', email: 'test@example.com', user: null },
        { id: 'reg-2', email: 'test@example.com', user: null },
      ];
      mockEm.find.mockResolvedValue(unlinkedRegs as any);

      const result = await service.linkRegistrationsToUser('TEST@EXAMPLE.COM', 'user-123');

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.find).toHaveBeenCalledWith(EventRegistration, {
        email: 'test@example.com',
        user: null,
      });
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result).toBe(2);
      // Verify user was set on each registration
      expect(unlinkedRegs[0].user).toBeDefined();
      expect(unlinkedRegs[1].user).toBeDefined();
    });

    it('should return 0 when no unlinked registrations found', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.linkRegistrationsToUser('test@example.com', 'user-123');

      expect(result).toBe(0);
    });
  });

  // ============================================
  // checkIn
  // ============================================

  describe('checkIn', () => {
    it('should successfully check in a paid registration', async () => {
      const mockRegistration: Record<string, any> = {
        id: 'reg-1',
        checkInCode: 'REG-ABC123-X9Y8',
        checkedIn: false,
        paymentStatus: PaymentStatus.PAID,
        registrationStatus: RegistrationStatus.CONFIRMED,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '555-1234',
        vehicleYear: '2020',
        vehicleMake: 'Honda',
        vehicleModel: 'Civic',
        vehicleInfo: 'Custom audio install',
        registeredAt: new Date(),
        amountPaid: 60,
        mecaId: null,
        user: null,
        event: {
          id: 'event-1',
          title: 'Test Event',
          eventDate: new Date('2026-03-15'),
        },
      };
      const mockClasses = [
        { format: 'SQ', className: 'SQ Beginner', feeCharged: 20 },
        { format: 'SPL', className: 'SPL Beginner', feeCharged: 20 },
      ];

      // First findOne returns the registration, second find returns classes
      mockEm.findOne.mockResolvedValue(mockRegistration as any);
      mockEm.find.mockResolvedValue(mockClasses as any);

      const result = await service.checkIn('REG-ABC123-X9Y8', 'admin-user-1');

      expect(mockQrCodeService.validateCheckInCode).toHaveBeenCalledWith('REG-ABC123-X9Y8');
      expect(mockRegistration.checkedIn).toBe(true);
      expect(mockRegistration.checkedInAt).toBeInstanceOf(Date);
      expect(mockRegistration.checkedInBy).toBeDefined();
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result.registration.id).toBe('reg-1');
      expect(result.registration.checkedIn).toBe(true);
      expect(result.competitor.firstName).toBe('Test');
      expect(result.competitor.lastName).toBe('User');
      expect(result.event.title).toBe('Test Event');
      expect(result.classes).toHaveLength(2);
      expect(result.vehicle.year).toBe('2020');
      expect(result.vehicle.make).toBe('Honda');
    });

    it('should throw BadRequestException for invalid check-in code format', async () => {
      mockQrCodeService.validateCheckInCode.mockReturnValue(false);

      await expect(service.checkIn('INVALID', 'admin-1')).rejects.toThrow(BadRequestException);
      await expect(service.checkIn('INVALID', 'admin-1')).rejects.toThrow(
        'Invalid check-in code format',
      );
    });

    it('should throw NotFoundException when registration not found by code', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.checkIn('REG-AAAAAA-BBBB', 'admin-1')).rejects.toThrow(NotFoundException);
      await expect(service.checkIn('REG-AAAAAA-BBBB', 'admin-1')).rejects.toThrow(
        'Registration with check-in code REG-AAAAAA-BBBB not found',
      );
    });

    it('should throw BadRequestException when already checked in', async () => {
      const mockRegistration = {
        id: 'reg-1',
        checkedIn: true,
        paymentStatus: PaymentStatus.PAID,
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      await expect(service.checkIn('REG-ABC123-X9Y8', 'admin-1')).rejects.toThrow(BadRequestException);
      await expect(service.checkIn('REG-ABC123-X9Y8', 'admin-1')).rejects.toThrow(
        'Registration has already been checked in',
      );
    });

    it('should throw BadRequestException when payment not completed', async () => {
      const mockRegistration = {
        id: 'reg-1',
        checkedIn: false,
        paymentStatus: PaymentStatus.PENDING,
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      await expect(service.checkIn('REG-ABC123-X9Y8', 'admin-1')).rejects.toThrow(BadRequestException);
      await expect(service.checkIn('REG-ABC123-X9Y8', 'admin-1')).rejects.toThrow(
        'Registration payment has not been completed',
      );
    });

    it('should include member status from user profile', async () => {
      const mockRegistration = {
        id: 'reg-1',
        checkInCode: 'REG-ABC123-X9Y8',
        checkedIn: false,
        paymentStatus: PaymentStatus.PAID,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        mecaId: null,
        user: { id: 'user-1' },
        event: { id: 'event-1', title: 'Test Event', eventDate: new Date() },
      };

      const mockUser = {
        id: 'user-1',
        membership_status: 'active',
        meca_id: '701501',
      };

      // First findOne: registration, second findOne: profile
      mockEm.findOne
        .mockResolvedValueOnce(mockRegistration as any)
        .mockResolvedValueOnce(mockUser as any);
      mockEm.find.mockResolvedValue([]);

      const result = await service.checkIn('REG-ABC123-X9Y8', 'admin-1');

      expect(result.competitor.isMember).toBe(true);
      expect(result.competitor.mecaId).toBe('701501');
    });

    it('should prefer registration mecaId over profile meca_id', async () => {
      const mockRegistration = {
        id: 'reg-1',
        checkInCode: 'REG-ABC123-X9Y8',
        checkedIn: false,
        paymentStatus: PaymentStatus.PAID,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        mecaId: 701555,
        user: { id: 'user-1' },
        event: { id: 'event-1', title: 'Test Event', eventDate: new Date() },
      };

      const mockUser = {
        id: 'user-1',
        membership_status: 'active',
        meca_id: '701501',
      };

      mockEm.findOne
        .mockResolvedValueOnce(mockRegistration as any)
        .mockResolvedValueOnce(mockUser as any);
      mockEm.find.mockResolvedValue([]);

      const result = await service.checkIn('REG-ABC123-X9Y8', 'admin-1');

      expect(result.competitor.mecaId).toBe('701555');
    });
  });

  // ============================================
  // lookupByCheckInCode
  // ============================================

  describe('lookupByCheckInCode', () => {
    it('should return check-in response without modifying the registration', async () => {
      const mockRegistration = {
        id: 'reg-1',
        checkInCode: 'REG-ABC123-X9Y8',
        checkedIn: false,
        paymentStatus: PaymentStatus.PAID,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '555-1234',
        vehicleYear: '2020',
        vehicleMake: 'Honda',
        vehicleModel: 'Civic',
        vehicleInfo: null,
        registeredAt: new Date(),
        amountPaid: 40,
        mecaId: null,
        user: null,
        event: { id: 'event-1', title: 'Test Event', eventDate: new Date() },
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);
      mockEm.find.mockResolvedValue([]);

      const result = await service.lookupByCheckInCode('REG-ABC123-X9Y8');

      expect(mockQrCodeService.validateCheckInCode).toHaveBeenCalledWith('REG-ABC123-X9Y8');
      expect(mockRegistration.checkedIn).toBe(false); // not modified
      expect(result.registration.id).toBe('reg-1');
      expect(result.competitor.firstName).toBe('Test');
      expect(result.event.title).toBe('Test Event');
    });

    it('should throw BadRequestException for invalid code format', async () => {
      mockQrCodeService.validateCheckInCode.mockReturnValue(false);

      await expect(service.lookupByCheckInCode('BAD')).rejects.toThrow(BadRequestException);
      await expect(service.lookupByCheckInCode('BAD')).rejects.toThrow(
        'Invalid check-in code format',
      );
    });

    it('should throw NotFoundException when registration not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.lookupByCheckInCode('REG-AAAAAA-BBBB')).rejects.toThrow(NotFoundException);
    });

    it('should include member info from user profile when user exists', async () => {
      const mockRegistration = {
        id: 'reg-1',
        checkInCode: 'REG-ABC123-X9Y8',
        checkedIn: false,
        paymentStatus: PaymentStatus.PENDING,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        mecaId: null,
        user: { id: 'user-1' },
        event: { id: 'event-1', title: 'Test', eventDate: new Date() },
      };
      const mockUser = { id: 'user-1', membership_status: 'active', meca_id: '701501' };

      mockEm.findOne
        .mockResolvedValueOnce(mockRegistration as any)
        .mockResolvedValueOnce(mockUser as any);
      mockEm.find.mockResolvedValue([]);

      const result = await service.lookupByCheckInCode('REG-ABC123-X9Y8');

      expect(result.competitor.isMember).toBe(true);
      expect(result.competitor.mecaId).toBe('701501');
    });
  });

  // ============================================
  // adminList
  // ============================================

  describe('adminList', () => {
    it('should return paginated registrations with defaults', async () => {
      const mockRegs = [createMockEventRegistration()];
      mockEm.find.mockResolvedValue(mockRegs as any);
      mockEm.count.mockResolvedValue(1);

      const result = await service.adminList({});

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.find).toHaveBeenCalledWith(EventRegistration, {}, {
        populate: ['event', 'user', 'classes'],
        orderBy: { createdAt: 'DESC' },
        limit: 20,
        offset: 0,
      });
      expect(result).toEqual({
        registrations: mockRegs,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply eventId filter', async () => {
      mockEm.find.mockResolvedValue([]);
      mockEm.count.mockResolvedValue(0);

      await service.adminList({ eventId: 'event-1' });

      expect(mockEm.find).toHaveBeenCalledWith(
        EventRegistration,
        expect.objectContaining({ event: 'event-1' }),
        expect.any(Object),
      );
    });

    it('should apply status filter', async () => {
      mockEm.find.mockResolvedValue([]);
      mockEm.count.mockResolvedValue(0);

      await service.adminList({ status: RegistrationStatus.CONFIRMED });

      expect(mockEm.find).toHaveBeenCalledWith(
        EventRegistration,
        expect.objectContaining({ registrationStatus: RegistrationStatus.CONFIRMED }),
        expect.any(Object),
      );
    });

    it('should apply paymentStatus filter', async () => {
      mockEm.find.mockResolvedValue([]);
      mockEm.count.mockResolvedValue(0);

      await service.adminList({ paymentStatus: PaymentStatus.PAID });

      expect(mockEm.find).toHaveBeenCalledWith(
        EventRegistration,
        expect.objectContaining({ paymentStatus: PaymentStatus.PAID }),
        expect.any(Object),
      );
    });

    it('should apply checkedIn filter', async () => {
      mockEm.find.mockResolvedValue([]);
      mockEm.count.mockResolvedValue(0);

      await service.adminList({ checkedIn: true });

      expect(mockEm.find).toHaveBeenCalledWith(
        EventRegistration,
        expect.objectContaining({ checkedIn: true }),
        expect.any(Object),
      );
    });

    it('should apply search filter with $or conditions', async () => {
      mockEm.find.mockResolvedValue([]);
      mockEm.count.mockResolvedValue(0);

      await service.adminList({ search: 'john' });

      expect(mockEm.find).toHaveBeenCalledWith(
        EventRegistration,
        expect.objectContaining({
          $or: [
            { email: { $like: '%john%' } },
            { firstName: { $like: '%john%' } },
            { lastName: { $like: '%john%' } },
            { checkInCode: { $like: '%JOHN%' } },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should calculate correct offset for pagination', async () => {
      mockEm.find.mockResolvedValue([]);
      mockEm.count.mockResolvedValue(50);

      const result = await service.adminList({ page: 3, limit: 10 });

      expect(mockEm.find).toHaveBeenCalledWith(
        EventRegistration,
        expect.any(Object),
        expect.objectContaining({
          limit: 10,
          offset: 20,
        }),
      );
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
    });

    it('should calculate totalPages correctly with partial last page', async () => {
      mockEm.find.mockResolvedValue([]);
      mockEm.count.mockResolvedValue(25);

      const result = await service.adminList({ limit: 10 });

      expect(result.totalPages).toBe(3); // ceil(25/10) = 3
    });
  });

  // ============================================
  // getEventCheckInStats
  // ============================================

  describe('getEventCheckInStats', () => {
    it('should return total, checkedIn, and pending counts', async () => {
      mockEm.count
        .mockResolvedValueOnce(50) // total paid
        .mockResolvedValueOnce(30); // checked in

      const result = await service.getEventCheckInStats('event-1');

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.count).toHaveBeenCalledWith(EventRegistration, {
        event: 'event-1',
        paymentStatus: PaymentStatus.PAID,
      });
      expect(mockEm.count).toHaveBeenCalledWith(EventRegistration, {
        event: 'event-1',
        paymentStatus: PaymentStatus.PAID,
        checkedIn: true,
      });
      expect(result).toEqual({
        total: 50,
        checkedIn: 30,
        pending: 20,
      });
    });

    it('should return zeros when no registrations exist', async () => {
      mockEm.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getEventCheckInStats('event-empty');

      expect(result).toEqual({ total: 0, checkedIn: 0, pending: 0 });
    });
  });

  // ============================================
  // cancelRegistration
  // ============================================

  describe('cancelRegistration', () => {
    it('should set registration status to CANCELLED', async () => {
      const mockRegistration = {
        id: 'reg-1',
        email: 'test@example.com',
        firstName: 'Test',
        registrationStatus: RegistrationStatus.CONFIRMED,
        event: { title: 'Test Event', eventDate: new Date() },
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.cancelRegistration('reg-1');

      expect(mockEm.fork).toHaveBeenCalled();
      expect(result.registrationStatus).toBe(RegistrationStatus.CANCELLED);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should throw NotFoundException when registration not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.cancelRegistration('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.cancelRegistration('nonexistent')).rejects.toThrow(
        'Registration with ID nonexistent not found',
      );
    });

    it('should send cancellation email', async () => {
      const mockRegistration = {
        id: 'reg-1',
        email: 'test@example.com',
        firstName: 'Test',
        registrationStatus: RegistrationStatus.CONFIRMED,
        event: { title: 'Test Event', eventDate: new Date() },
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      await service.cancelRegistration('reg-1');

      expect(mockEmailService.sendEventRegistrationCancelledEmail).toHaveBeenCalled();
    });
  });

  // ============================================
  // processRefund
  // ============================================

  describe('processRefund', () => {
    it('should set payment status to REFUNDED and registration to CANCELLED', async () => {
      const mockRegistration = {
        id: 'reg-1',
        email: 'test@example.com',
        firstName: 'Test',
        paymentStatus: PaymentStatus.PAID,
        registrationStatus: RegistrationStatus.CONFIRMED,
        amountPaid: 60,
        event: { title: 'Test Event', eventDate: new Date() },
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.processRefund('reg-1');

      expect(mockEm.fork).toHaveBeenCalled();
      expect(result.paymentStatus).toBe(PaymentStatus.REFUNDED);
      expect(result.registrationStatus).toBe(RegistrationStatus.CANCELLED);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should throw NotFoundException when registration not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.processRefund('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when registration has not been paid', async () => {
      const mockRegistration = {
        id: 'reg-1',
        paymentStatus: PaymentStatus.PENDING,
        event: { title: 'Test', eventDate: new Date() },
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      await expect(service.processRefund('reg-1')).rejects.toThrow(BadRequestException);
      await expect(service.processRefund('reg-1')).rejects.toThrow(
        'Registration has not been paid',
      );
    });

    it('should send cancellation email with refund amount', async () => {
      const mockRegistration = {
        id: 'reg-1',
        email: 'test@example.com',
        firstName: 'Test',
        paymentStatus: PaymentStatus.PAID,
        registrationStatus: RegistrationStatus.CONFIRMED,
        amountPaid: 60,
        event: { title: 'Test Event', eventDate: new Date() },
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      await service.processRefund('reg-1');

      expect(mockEmailService.sendEventRegistrationCancelledEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          refundAmount: 60,
        }),
      );
    });
  });

  // ============================================
  // getQrCode
  // ============================================

  describe('getQrCode', () => {
    it('should return existing QR code data when available', async () => {
      const mockRegistration = {
        id: 'reg-1',
        checkInCode: 'REG-EXISTING-CODE',
        qrCodeData: 'data:image/png;base64,existing',
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.getQrCode('reg-1');

      expect(result).toEqual({
        checkInCode: 'REG-EXISTING-CODE',
        qrCodeData: 'data:image/png;base64,existing',
      });
      expect(mockQrCodeService.generateCheckInData).not.toHaveBeenCalled();
    });

    it('should generate QR code when not existing', async () => {
      const mockRegistration = {
        id: 'reg-1',
        checkInCode: null,
        qrCodeData: null,
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.getQrCode('reg-1');

      expect(mockQrCodeService.generateCheckInData).toHaveBeenCalledWith('reg-1');
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result).toEqual({
        checkInCode: 'REG-ABC123-X9Y8',
        qrCodeData: 'data:image/png;base64,mockdata',
      });
    });

    it('should generate QR code when checkInCode exists but qrCodeData is missing', async () => {
      const mockRegistration = {
        id: 'reg-1',
        checkInCode: 'REG-EXISTING-CODE',
        qrCodeData: null,
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.getQrCode('reg-1');

      expect(mockQrCodeService.generateCheckInData).toHaveBeenCalledWith('reg-1');
    });

    it('should throw NotFoundException when registration not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.getQrCode('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getQrCode('nonexistent')).rejects.toThrow(
        'Registration with ID nonexistent not found',
      );
    });
  });

  // ============================================
  // getStats
  // ============================================

  describe('getStats', () => {
    it('should return total registration count', async () => {
      mockEm.count.mockResolvedValue(42);

      const result = await service.getStats();

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.count).toHaveBeenCalledWith(EventRegistration, {});
      expect(result).toEqual({ totalRegistrations: 42 });
    });

    it('should return zero when no registrations exist', async () => {
      mockEm.count.mockResolvedValue(0);

      const result = await service.getStats();

      expect(result).toEqual({ totalRegistrations: 0 });
    });
  });

  // ============================================
  // getCountByEvent
  // ============================================

  describe('getCountByEvent', () => {
    it('should return count of registrations for an event', async () => {
      mockEm.count.mockResolvedValue(15);

      const result = await service.getCountByEvent('event-1');

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.count).toHaveBeenCalledWith(EventRegistration, { event: 'event-1' });
      expect(result).toEqual({ count: 15 });
    });

    it('should return zero when no registrations for event', async () => {
      mockEm.count.mockResolvedValue(0);

      const result = await service.getCountByEvent('event-empty');

      expect(result).toEqual({ count: 0 });
    });
  });

  // ============================================
  // confirmRegistration
  // ============================================

  describe('confirmRegistration', () => {
    it('should set registration status to CONFIRMED and set registeredAt', async () => {
      const mockRegistration = {
        id: 'reg-1',
        registrationStatus: RegistrationStatus.PENDING,
        registeredAt: undefined,
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.confirmRegistration('reg-1');

      expect(mockEm.fork).toHaveBeenCalled();
      expect(result.registrationStatus).toBe(RegistrationStatus.CONFIRMED);
      expect(result.registeredAt).toBeInstanceOf(Date);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should throw NotFoundException when registration not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.confirmRegistration('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.confirmRegistration('nonexistent')).rejects.toThrow(
        'Registration with ID nonexistent not found',
      );
    });
  });

  // ============================================
  // findByEvent
  // ============================================

  describe('findByEvent', () => {
    it('should find registrations by event ID', async () => {
      const mockRegs = [createMockEventRegistration()];
      mockEm.find.mockResolvedValue(mockRegs as any);

      const result = await service.findByEvent('event-1');

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.find).toHaveBeenCalledWith(EventRegistration, { event: 'event-1' }, {
        populate: ['user', 'classes'],
        orderBy: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockRegs);
    });
  });

  // ============================================
  // markAsPaid
  // ============================================

  describe('markAsPaid', () => {
    it('should mark registration as paid and confirmed', async () => {
      const mockRegistration = {
        id: 'reg-1',
        email: 'test@example.com',
        firstName: 'Test',
        paymentStatus: PaymentStatus.PENDING,
        registrationStatus: RegistrationStatus.PENDING,
        event: { title: 'Test Event', eventDate: new Date(), venueName: 'V', venueAddress: 'A' },
        classes: { getItems: jest.fn().mockReturnValue([]) },
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.markAsPaid('reg-1', 'pi_123', 5000);

      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(result.registrationStatus).toBe(RegistrationStatus.CONFIRMED);
      expect(result.stripePaymentIntentId).toBe('pi_123');
      expect(result.amountPaid).toBe(5000);
      expect(result.registeredAt).toBeInstanceOf(Date);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should throw NotFoundException when registration not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.markAsPaid('nonexistent', 'pi_123')).rejects.toThrow(NotFoundException);
    });

    it('should not set amountPaid when not provided', async () => {
      const mockRegistration = {
        id: 'reg-1',
        email: 'test@example.com',
        firstName: 'Test',
        paymentStatus: PaymentStatus.PENDING,
        registrationStatus: RegistrationStatus.PENDING,
        amountPaid: undefined,
        event: { title: 'Test Event', eventDate: new Date(), venueName: 'V', venueAddress: 'A' },
        classes: { getItems: jest.fn().mockReturnValue([]) },
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.markAsPaid('reg-1', 'pi_123');

      expect(result.amountPaid).toBeUndefined();
    });

    it('should send confirmation email after marking as paid', async () => {
      const mockRegistration = {
        id: 'reg-1',
        email: 'test@example.com',
        firstName: 'Test',
        paymentStatus: PaymentStatus.PENDING,
        registrationStatus: RegistrationStatus.PENDING,
        event: { title: 'Test Event', eventDate: new Date(), venueName: 'V', venueAddress: 'A' },
        classes: { getItems: jest.fn().mockReturnValue([]) },
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      await service.markAsPaid('reg-1', 'pi_123', 5000);

      expect(mockEmailService.sendEventRegistrationConfirmationEmail).toHaveBeenCalled();
    });
  });

  // ============================================
  // delete
  // ============================================

  describe('delete', () => {
    it('should delete a registration when found', async () => {
      const mockRegistration = createMockEventRegistration({ id: 'delete-id' });
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      await service.delete('delete-id');

      expect(mockEm.findOne).toHaveBeenCalledWith(EventRegistration, { id: 'delete-id' });
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(mockRegistration);
    });

    it('should throw NotFoundException when registration not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.delete('nonexistent')).rejects.toThrow(
        'Registration with ID nonexistent not found',
      );
    });
  });

  // ============================================
  // updatePaymentStatus
  // ============================================

  describe('updatePaymentStatus', () => {
    it('should update payment status', async () => {
      const mockRegistration = {
        id: 'reg-1',
        paymentStatus: PaymentStatus.PENDING,
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.updatePaymentStatus('reg-1', PaymentStatus.PAID);

      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should set transactionId when provided', async () => {
      const mockRegistration = {
        id: 'reg-1',
        paymentStatus: PaymentStatus.PENDING,
        transactionId: undefined,
      };
      mockEm.findOne.mockResolvedValue(mockRegistration as any);

      const result = await service.updatePaymentStatus('reg-1', PaymentStatus.PAID, 'txn_123');

      expect(result.transactionId).toBe('txn_123');
    });

    it('should throw NotFoundException when registration not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.updatePaymentStatus('nonexistent', PaymentStatus.PAID)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // sendEventReminderEmails
  // ============================================

  describe('sendEventReminderEmails', () => {
    it('should send reminder emails to confirmed and paid registrations', async () => {
      const mockRegs = [
        {
          id: 'reg-1',
          email: 'user1@example.com',
          firstName: 'User1',
          checkInCode: 'REG-111111-AAAA',
          qrCodeData: 'data:image/png;base64,qr1',
          event: { title: 'Test Event', eventDate: new Date(), venueName: 'V', venueAddress: 'A' },
          classes: { getItems: jest.fn().mockReturnValue([{ format: 'SQ', className: 'SQ Beginner' }]) },
        },
        {
          id: 'reg-2',
          email: 'user2@example.com',
          firstName: 'User2',
          checkInCode: 'REG-222222-BBBB',
          qrCodeData: 'data:image/png;base64,qr2',
          event: { title: 'Test Event', eventDate: new Date(), venueName: 'V', venueAddress: 'A' },
          classes: { getItems: jest.fn().mockReturnValue([]) },
        },
      ];
      mockEm.find.mockResolvedValue(mockRegs as any);

      const result = await service.sendEventReminderEmails('event-1');

      expect(mockEm.find).toHaveBeenCalledWith(EventRegistration, {
        event: 'event-1',
        registrationStatus: RegistrationStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      }, {
        populate: ['event', 'classes'],
      });
      expect(mockEmailService.sendEventReminderEmail).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ sent: 2, failed: 0 });
    });

    it('should skip registrations without email', async () => {
      const mockRegs = [
        {
          id: 'reg-1',
          email: null,
          firstName: 'NoEmail',
          event: { title: 'Test Event', eventDate: new Date() },
          classes: { getItems: jest.fn().mockReturnValue([]) },
        },
      ];
      mockEm.find.mockResolvedValue(mockRegs as any);

      const result = await service.sendEventReminderEmails('event-1');

      expect(mockEmailService.sendEventReminderEmail).not.toHaveBeenCalled();
      expect(result).toEqual({ sent: 0, failed: 0 });
    });

    it('should count failed emails and continue', async () => {
      const mockRegs = [
        {
          id: 'reg-1',
          email: 'fail@example.com',
          firstName: 'Fail',
          checkInCode: 'REG-111111-AAAA',
          event: { title: 'Test Event', eventDate: new Date(), venueName: 'V', venueAddress: 'A' },
          classes: { getItems: jest.fn().mockReturnValue([]) },
        },
        {
          id: 'reg-2',
          email: 'success@example.com',
          firstName: 'Success',
          checkInCode: 'REG-222222-BBBB',
          event: { title: 'Test Event', eventDate: new Date(), venueName: 'V', venueAddress: 'A' },
          classes: { getItems: jest.fn().mockReturnValue([]) },
        },
      ];
      mockEm.find.mockResolvedValue(mockRegs as any);
      mockEmailService.sendEventReminderEmail
        .mockRejectedValueOnce(new Error('SMTP error'))
        .mockResolvedValueOnce(undefined);

      const result = await service.sendEventReminderEmails('event-1');

      expect(result).toEqual({ sent: 1, failed: 1 });
    });
  });
});
