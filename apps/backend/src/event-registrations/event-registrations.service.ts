import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { EventRegistration } from './event-registrations.entity';
import { RegistrationStatus, PaymentStatus } from '../types/enums';

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
    const registration = this.em.create(EventRegistration, data as any);
    await this.em.persistAndFlush(registration);
    return registration;
  }

  async update(id: string, data: Partial<EventRegistration>): Promise<EventRegistration> {
    const registration = await this.findById(id);
    this.em.assign(registration, data);
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
