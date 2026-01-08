import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { EventRegistration } from './event-registrations.entity';
import { EventRegistrationClass } from './event-registration-classes.entity';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import { Membership } from '../memberships/memberships.entity';
import { RegistrationStatus, PaymentStatus } from '@newmeca/shared';
import { QrCodeService } from './qr-code.service';

export interface CreateRegistrationDto {
  eventId: string;
  userId?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleInfo?: string;
  notes?: string;
  classes: Array<{
    competitionClassId: string;
    format: string;
    className: string;
  }>;
  includeMembership?: boolean;
  membershipTypeConfigId?: string;
  mecaId?: number;
}

export interface RegistrationPricing {
  perClassFee: number;
  classesSubtotal: number;
  membershipCost: number;
  total: number;
  savings: number;
  isMemberPricing: boolean;
}

export interface AdminListFilters {
  eventId?: string;
  status?: RegistrationStatus;
  paymentStatus?: PaymentStatus;
  checkedIn?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CheckInResponse {
  registration: {
    id: string;
    checkInCode: string;
    registeredAt?: Date;
    amountPaid?: number;
    paymentStatus: PaymentStatus;
    checkedIn: boolean;
    checkedInAt?: Date;
  };
  competitor: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    isMember: boolean;
    mecaId?: string;
  };
  event: {
    id: string;
    title: string;
    eventDate: Date;
  };
  classes: Array<{
    format: string;
    className: string;
    feeCharged: number;
  }>;
  vehicle: {
    year?: string;
    make?: string;
    model?: string;
    info?: string;
  };
}

@Injectable()
export class EventRegistrationsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly qrCodeService: QrCodeService,
  ) {}

  async findById(id: string): Promise<EventRegistration> {
    const em = this.em.fork();
    const registration = await em.findOne(EventRegistration, { id }, {
      populate: ['event', 'user', 'classes', 'membership', 'checkedInBy'],
    });
    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }
    return registration;
  }

  async findByCheckInCode(code: string): Promise<EventRegistration> {
    const em = this.em.fork();
    const registration = await em.findOne(EventRegistration, { checkInCode: code }, {
      populate: ['event', 'user', 'classes', 'membership', 'checkedInBy'],
    });
    if (!registration) {
      throw new NotFoundException(`Registration with check-in code ${code} not found`);
    }
    return registration;
  }

  /**
   * Calculate pricing for event registration.
   */
  async calculatePricing(
    eventId: string,
    classCount: number,
    isMember: boolean,
    includeMembership: boolean = false,
    membershipPrice: number = 0,
  ): Promise<RegistrationPricing> {
    const em = this.em.fork();
    const event = await em.findOne(Event, { id: eventId });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Use member pricing if already a member OR purchasing membership
    const isMemberPricing = isMember || includeMembership;
    const perClassFee = isMemberPricing
      ? (event.memberEntryFee ?? 0)
      : (event.nonMemberEntryFee ?? 0);

    const classesSubtotal = classCount * perClassFee;
    const membershipCost = includeMembership ? membershipPrice : 0;

    // Calculate savings from membership
    const nonMemberTotal = classCount * (event.nonMemberEntryFee ?? 0);
    const savings = includeMembership ? (nonMemberTotal - classesSubtotal) : 0;

    return {
      perClassFee,
      classesSubtotal,
      membershipCost,
      total: classesSubtotal + membershipCost,
      savings,
      isMemberPricing,
    };
  }

  /**
   * Create a new event registration (for both guests and logged-in users).
   */
  async createRegistration(dto: CreateRegistrationDto, isMember: boolean): Promise<EventRegistration> {
    const em = this.em.fork();

    // Verify event exists
    const event = await em.findOne(Event, { id: dto.eventId });
    if (!event) {
      throw new NotFoundException(`Event with ID ${dto.eventId} not found`);
    }

    // Calculate per-class fee
    const useMemberPricing = isMember || dto.includeMembership;
    const perClassFee = useMemberPricing
      ? (event.memberEntryFee ?? 0)
      : (event.nonMemberEntryFee ?? 0);

    // Create the registration
    const registration = new EventRegistration();
    registration.email = dto.email;
    registration.firstName = dto.firstName;
    registration.lastName = dto.lastName;
    registration.phone = dto.phone;
    registration.address = dto.address;
    registration.city = dto.city;
    registration.state = dto.state;
    registration.postalCode = dto.postalCode;
    registration.country = dto.country || 'US';
    registration.vehicleYear = dto.vehicleYear;
    registration.vehicleMake = dto.vehicleMake;
    registration.vehicleModel = dto.vehicleModel;
    registration.vehicleInfo = dto.vehicleInfo;
    registration.notes = dto.notes;
    registration.registrationStatus = RegistrationStatus.PENDING;
    registration.paymentStatus = PaymentStatus.PENDING;
    registration.membershipPurchasedDuringRegistration = dto.includeMembership ?? false;
    registration.event = Reference.createFromPK(Event, dto.eventId) as any;
    if (dto.userId) {
      registration.user = Reference.createFromPK(Profile, dto.userId) as any;
    }
    if (dto.mecaId) {
      registration.mecaId = dto.mecaId;
    }

    await em.persistAndFlush(registration);

    // Generate QR code and check-in code
    const checkInData = await this.qrCodeService.generateCheckInData(registration.id);
    registration.checkInCode = checkInData.checkInCode;
    registration.qrCodeData = checkInData.qrCodeData;
    await em.flush();

    // Create class registrations
    for (const classData of dto.classes) {
      const regClass = new EventRegistrationClass();
      regClass.eventRegistration = registration;
      regClass.competitionClassId = classData.competitionClassId;
      regClass.format = classData.format;
      regClass.className = classData.className;
      regClass.feeCharged = perClassFee;
      em.persist(regClass);
    }
    await em.flush();

    return registration;
  }

  /**
   * Complete registration after successful payment.
   */
  async completeRegistration(
    registrationId: string,
    paymentIntentId: string,
    amountPaid: number,
    membershipId?: string,
  ): Promise<EventRegistration> {
    const em = this.em.fork();
    const registration = await em.findOne(EventRegistration, { id: registrationId });

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${registrationId} not found`);
    }

    registration.stripePaymentIntentId = paymentIntentId;
    registration.amountPaid = amountPaid;
    registration.paymentStatus = PaymentStatus.PAID;
    registration.registrationStatus = RegistrationStatus.CONFIRMED;
    registration.registeredAt = new Date();

    if (membershipId) {
      registration.membership = Reference.createFromPK(Membership, membershipId) as any;
    }

    await em.flush();
    return registration;
  }

  /**
   * Get registration by email (for guest lookup).
   */
  async findByEmail(email: string): Promise<EventRegistration[]> {
    const em = this.em.fork();
    return em.find(EventRegistration, { email: email.toLowerCase() }, {
      populate: ['event', 'classes'],
      orderBy: { createdAt: 'DESC' },
    });
  }

  /**
   * Get registrations by user ID.
   */
  async findByUser(userId: string): Promise<EventRegistration[]> {
    const em = this.em.fork();
    return em.find(EventRegistration, { user: userId }, {
      populate: ['event', 'classes'],
      orderBy: { createdAt: 'DESC' },
    });
  }

  /**
   * Link guest registrations to a newly created user account.
   */
  async linkRegistrationsToUser(email: string, userId: string): Promise<number> {
    const em = this.em.fork();

    // Find all registrations with this email that don't have a user
    const registrations = await em.find(EventRegistration, {
      email: email.toLowerCase(),
      user: null,
    });

    for (const registration of registrations) {
      registration.user = Reference.createFromPK(Profile, userId) as any;
    }

    await em.flush();
    return registrations.length;
  }

  /**
   * Check in a registration by code.
   */
  async checkIn(checkInCode: string, checkedInById: string): Promise<CheckInResponse> {
    const em = this.em.fork();

    // Validate code format
    if (!this.qrCodeService.validateCheckInCode(checkInCode)) {
      throw new BadRequestException('Invalid check-in code format');
    }

    const registration = await em.findOne(EventRegistration, { checkInCode }, {
      populate: ['event', 'user', 'classes'],
    });

    if (!registration) {
      throw new NotFoundException(`Registration with check-in code ${checkInCode} not found`);
    }

    if (registration.checkedIn) {
      throw new BadRequestException('Registration has already been checked in');
    }

    // Verify payment
    if (registration.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Registration payment has not been completed');
    }

    // Mark as checked in
    registration.checkedIn = true;
    registration.checkedInAt = new Date();
    registration.checkedInBy = Reference.createFromPK(Profile, checkedInById) as any;
    await em.flush();

    // Get user info for member status
    let isMember = false;
    // Use the registration's mecaId first (what user selected for this event), fallback to profile
    let mecaId: string | undefined = registration.mecaId ? String(registration.mecaId) : undefined;

    if (registration.user) {
      const user = await em.findOne(Profile, { id: (registration.user as any).id || registration.user });
      if (user) {
        isMember = user.membership_status === 'active';
        // Only use profile meca_id as fallback if registration doesn't have one
        if (!mecaId && user.meca_id) {
          mecaId = user.meca_id;
        }
      }
    }

    // Build response
    const event = registration.event as Event;
    const classes = await em.find(EventRegistrationClass, { eventRegistration: registration.id });

    return {
      registration: {
        id: registration.id,
        checkInCode: registration.checkInCode!,
        registeredAt: registration.registeredAt,
        amountPaid: registration.amountPaid,
        paymentStatus: registration.paymentStatus,
        checkedIn: registration.checkedIn,
        checkedInAt: registration.checkedInAt,
      },
      competitor: {
        firstName: registration.firstName,
        lastName: registration.lastName,
        email: registration.email,
        phone: registration.phone,
        isMember,
        mecaId,
      },
      event: {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
      },
      classes: classes.map(c => ({
        format: c.format,
        className: c.className,
        feeCharged: c.feeCharged,
      })),
      vehicle: {
        year: registration.vehicleYear,
        make: registration.vehicleMake,
        model: registration.vehicleModel,
        info: registration.vehicleInfo,
      },
    };
  }

  /**
   * Look up registration by check-in code without checking in.
   */
  async lookupByCheckInCode(checkInCode: string): Promise<CheckInResponse> {
    const em = this.em.fork();

    // Validate code format
    if (!this.qrCodeService.validateCheckInCode(checkInCode)) {
      throw new BadRequestException('Invalid check-in code format');
    }

    const registration = await em.findOne(EventRegistration, { checkInCode }, {
      populate: ['event', 'user', 'classes'],
    });

    if (!registration) {
      throw new NotFoundException(`Registration with check-in code ${checkInCode} not found`);
    }

    // Get user info for member status
    let isMember = false;
    // Use the registration's mecaId first (what user selected for this event), fallback to profile
    let mecaId: string | undefined = registration.mecaId ? String(registration.mecaId) : undefined;

    if (registration.user) {
      const user = await em.findOne(Profile, { id: (registration.user as any).id || registration.user });
      if (user) {
        isMember = user.membership_status === 'active';
        // Only use profile meca_id as fallback if registration doesn't have one
        if (!mecaId && user.meca_id) {
          mecaId = user.meca_id;
        }
      }
    }

    // Build response
    const event = registration.event as Event;
    const classes = await em.find(EventRegistrationClass, { eventRegistration: registration.id });

    return {
      registration: {
        id: registration.id,
        checkInCode: registration.checkInCode!,
        registeredAt: registration.registeredAt,
        amountPaid: registration.amountPaid,
        paymentStatus: registration.paymentStatus,
        checkedIn: registration.checkedIn,
        checkedInAt: registration.checkedInAt,
      },
      competitor: {
        firstName: registration.firstName,
        lastName: registration.lastName,
        email: registration.email,
        phone: registration.phone,
        isMember,
        mecaId,
      },
      event: {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
      },
      classes: classes.map(c => ({
        format: c.format,
        className: c.className,
        feeCharged: c.feeCharged,
      })),
      vehicle: {
        year: registration.vehicleYear,
        make: registration.vehicleMake,
        model: registration.vehicleModel,
        info: registration.vehicleInfo,
      },
    };
  }

  /**
   * Admin: List registrations with filters.
   */
  async adminList(filters: AdminListFilters): Promise<{
    registrations: EventRegistration[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const em = this.em.fork();
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (filters.eventId) {
      where.event = filters.eventId;
    }
    if (filters.status) {
      where.registrationStatus = filters.status;
    }
    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }
    if (filters.checkedIn !== undefined) {
      where.checkedIn = filters.checkedIn;
    }
    if (filters.search) {
      const search = `%${filters.search}%`;
      where.$or = [
        { email: { $like: search } },
        { firstName: { $like: search } },
        { lastName: { $like: search } },
        { checkInCode: { $like: search.toUpperCase() } },
      ];
    }

    const [registrations, total] = await Promise.all([
      em.find(EventRegistration, where, {
        populate: ['event', 'user', 'classes'],
        orderBy: { createdAt: 'DESC' },
        limit,
        offset,
      }),
      em.count(EventRegistration, where),
    ]);

    return {
      registrations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: Get event check-in stats.
   */
  async getEventCheckInStats(eventId: string): Promise<{
    total: number;
    checkedIn: number;
    pending: number;
  }> {
    const em = this.em.fork();

    const [total, checkedIn] = await Promise.all([
      em.count(EventRegistration, {
        event: eventId,
        paymentStatus: PaymentStatus.PAID,
      }),
      em.count(EventRegistration, {
        event: eventId,
        paymentStatus: PaymentStatus.PAID,
        checkedIn: true,
      }),
    ]);

    return {
      total,
      checkedIn,
      pending: total - checkedIn,
    };
  }

  /**
   * Mark a registration as paid (used for test mode and webhook processing).
   */
  async markAsPaid(id: string, paymentIntentId: string, amountPaid?: number): Promise<EventRegistration> {
    const em = this.em.fork();
    const registration = await em.findOne(EventRegistration, { id });

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    registration.paymentStatus = PaymentStatus.PAID;
    registration.stripePaymentIntentId = paymentIntentId;
    registration.registrationStatus = RegistrationStatus.CONFIRMED;
    registration.registeredAt = new Date();
    if (amountPaid !== undefined) {
      registration.amountPaid = amountPaid;
    }
    await em.flush();

    return registration;
  }

  /**
   * Cancel a registration.
   */
  async cancelRegistration(id: string): Promise<EventRegistration> {
    const em = this.em.fork();
    const registration = await em.findOne(EventRegistration, { id });

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    registration.registrationStatus = RegistrationStatus.CANCELLED;
    await em.flush();

    return registration;
  }

  /**
   * Process a refund for a registration.
   */
  async processRefund(id: string): Promise<EventRegistration> {
    const em = this.em.fork();
    const registration = await em.findOne(EventRegistration, { id });

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    if (registration.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Registration has not been paid');
    }

    registration.paymentStatus = PaymentStatus.REFUNDED;
    registration.registrationStatus = RegistrationStatus.CANCELLED;
    await em.flush();

    return registration;
  }

  /**
   * Get QR code data for a registration.
   */
  async getQrCode(id: string): Promise<{ checkInCode: string; qrCodeData: string }> {
    const em = this.em.fork();
    const registration = await em.findOne(EventRegistration, { id });

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    if (!registration.checkInCode || !registration.qrCodeData) {
      // Generate if not exists
      const checkInData = await this.qrCodeService.generateCheckInData(registration.id);
      registration.checkInCode = checkInData.checkInCode;
      registration.qrCodeData = checkInData.qrCodeData;
      await em.flush();
    }

    return {
      checkInCode: registration.checkInCode!,
      qrCodeData: registration.qrCodeData!,
    };
  }

  async findByEvent(eventId: string): Promise<EventRegistration[]> {
    const em = this.em.fork();
    return em.find(EventRegistration, { event: eventId }, {
      populate: ['user', 'classes'],
      orderBy: { createdAt: 'DESC' },
    });
  }

  async getStats(): Promise<{ totalRegistrations: number }> {
    const em = this.em.fork();
    const totalRegistrations = await em.count(EventRegistration, {});
    return { totalRegistrations };
  }

  // Legacy methods for backwards compatibility
  async create(data: Partial<EventRegistration>): Promise<EventRegistration> {
    const em = this.em.fork();

    // Transform snake_case API fields
    const transformedData: any = { ...data };

    // Handle event_id -> event relation
    if ((data as any).event_id !== undefined) {
      const eventId = (data as any).event_id;
      if (eventId) {
        transformedData.event = Reference.createFromPK(Event, eventId);
      }
      delete transformedData.event_id;
    }

    // Handle user_id -> user relation
    if ((data as any).user_id !== undefined) {
      const userId = (data as any).user_id;
      if (userId) {
        transformedData.user = Reference.createFromPK(Profile, userId);
      }
      delete transformedData.user_id;
    }

    // Handle other snake_case fields
    if ((data as any).registration_status !== undefined) {
      transformedData.registrationStatus = (data as any).registration_status;
      delete transformedData.registration_status;
    }
    if ((data as any).payment_status !== undefined) {
      transformedData.paymentStatus = (data as any).payment_status;
      delete transformedData.payment_status;
    }
    if ((data as any).amount_paid !== undefined) {
      transformedData.amountPaid = (data as any).amount_paid;
      delete transformedData.amount_paid;
    }
    if ((data as any).transaction_id !== undefined) {
      transformedData.transactionId = (data as any).transaction_id;
      delete transformedData.transaction_id;
    }
    if ((data as any).registered_at !== undefined) {
      transformedData.registeredAt = (data as any).registered_at;
      delete transformedData.registered_at;
    }

    const registration = em.create(EventRegistration, transformedData);
    await em.persistAndFlush(registration);
    return registration;
  }

  async update(id: string, data: Partial<EventRegistration>): Promise<EventRegistration> {
    const em = this.em.fork();
    const registration = await em.findOne(EventRegistration, { id });

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    // Transform snake_case API fields
    const transformedData: any = { ...data };

    // Handle event_id -> event relation
    if ((data as any).event_id !== undefined) {
      const eventId = (data as any).event_id;
      if (eventId) {
        transformedData.event = Reference.createFromPK(Event, eventId);
      } else {
        transformedData.event = null;
      }
      delete transformedData.event_id;
    }

    // Handle user_id -> user relation
    if ((data as any).user_id !== undefined) {
      const userId = (data as any).user_id;
      if (userId) {
        transformedData.user = Reference.createFromPK(Profile, userId);
      } else {
        transformedData.user = null;
      }
      delete transformedData.user_id;
    }

    // Handle other snake_case fields
    if ((data as any).registration_status !== undefined) {
      transformedData.registrationStatus = (data as any).registration_status;
      delete transformedData.registration_status;
    }
    if ((data as any).payment_status !== undefined) {
      transformedData.paymentStatus = (data as any).payment_status;
      delete transformedData.payment_status;
    }
    if ((data as any).amount_paid !== undefined) {
      transformedData.amountPaid = (data as any).amount_paid;
      delete transformedData.amount_paid;
    }
    if ((data as any).transaction_id !== undefined) {
      transformedData.transactionId = (data as any).transaction_id;
      delete transformedData.transaction_id;
    }
    if ((data as any).registered_at !== undefined) {
      transformedData.registeredAt = (data as any).registered_at;
      delete transformedData.registered_at;
    }

    em.assign(registration, transformedData);
    await em.flush();
    return registration;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const registration = await em.findOne(EventRegistration, { id });

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    await em.removeAndFlush(registration);
  }

  async confirmRegistration(id: string): Promise<EventRegistration> {
    const em = this.em.fork();
    const registration = await em.findOne(EventRegistration, { id });

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    registration.registrationStatus = RegistrationStatus.CONFIRMED;
    registration.registeredAt = new Date();
    await em.flush();
    return registration;
  }

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    transactionId?: string
  ): Promise<EventRegistration> {
    const em = this.em.fork();
    const registration = await em.findOne(EventRegistration, { id });

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    registration.paymentStatus = status;
    if (transactionId) {
      registration.transactionId = transactionId;
    }
    await em.flush();
    return registration;
  }
}
