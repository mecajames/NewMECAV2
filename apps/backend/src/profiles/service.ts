import { Profile } from './entity';

export class ProfileService {
  async findById(id: string): Promise<Profile | null> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async findByEmail(email: string): Promise<Profile | null> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async create(data: Partial<Profile>): Promise<Profile> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async update(id: string, data: Partial<Profile>): Promise<Profile> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async findAll(page: number = 1, limit: number = 10): Promise<Profile[]> {
    // TODO: Implement
    throw new Error('Not implemented');
  }
}
