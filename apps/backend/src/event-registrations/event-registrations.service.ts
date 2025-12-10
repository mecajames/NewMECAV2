import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { EventRegistration } from './event-registrations.entity';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import { RegistrationStatus, PaymentStatus } from '@newmeca/shared';

@Injectable()
export class EventRegistrationsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findById(id: string): Promise<EventRegistration> {
    const registration = await this.em.findOne(EventRegistration, { id });
    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }
    return registration;
  }

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
    const registration = await this.findById(id);

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

    this.em.assign(registration, transformedData);
    await this.em.flush();
    return registration;
  }

  async delete(id: string): Promise<void> {
    const registration = await this.findById(id);
    await this.em.removeAndFlush(registration);
  }

  async findByEvent(eventId: string): Promise<EventRegistration[]> {
    return this.em.find(EventRegistration, { event: eventId });
  }

  async findByUser(userId: string): Promise<EventRegistration[]> {
    return this.em.find(EventRegistration, { user: userId });
  }

  async confirmRegistration(id: string): Promise<EventRegistration> {
    const registration = await this.findById(id);
    registration.registrationStatus = RegistrationStatus.CONFIRMED;
    registration.registeredAt = new Date();
    await this.em.flush();
    return registration;
  }

  async cancelRegistration(id: string): Promise<EventRegistration> {
    const registration = await this.findById(id);
    registration.registrationStatus = RegistrationStatus.CANCELLED;
    await this.em.flush();
    return registration;
  }

  async updatePaymentStatus(
    id: string,
    status: PaymentStatus,
    transactionId?: string
  ): Promise<EventRegistration> {
    const registration = await this.findById(id);
    registration.paymentStatus = status;
    if (transactionId) {
      registration.transactionId = transactionId;
    }
    await this.em.flush();
    return registration;
  }

  async getStats(): Promise<{ totalRegistrations: number }> {
    const em = this.em.fork();
    const totalRegistrations = await em.count(EventRegistration, {});
    return { totalRegistrations };
  }
}
