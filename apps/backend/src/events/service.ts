import { Event } from './entity';

export class EventService {
  async findById(id: string): Promise<Event | null> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async create(data: Partial<Event>): Promise<Event> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async update(id: string, data: Partial<Event>): Promise<Event> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async findAll(page: number = 1, limit: number = 10): Promise<Event[]> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async findUpcoming(): Promise<Event[]> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async findByStatus(status: string): Promise<Event[]> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async findByDirector(directorId: string): Promise<Event[]> {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}
