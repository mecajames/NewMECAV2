import { EventRegistration } from './entity';

export class EventRegistrationService {
  async findById(id: string): Promise<EventRegistration | null> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async create(data: Partial<EventRegistration>): Promise<EventRegistration> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async update(id: string, data: Partial<EventRegistration>): Promise<EventRegistration> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async findByEvent(eventId: string): Promise<EventRegistration[]> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async findByUser(userId: string): Promise<EventRegistration[]> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async confirmRegistration(id: string): Promise<EventRegistration> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async cancelRegistration(id: string): Promise<EventRegistration> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async updatePaymentStatus(id: string, status: string, transactionId?: string): Promise<EventRegistration> {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}
