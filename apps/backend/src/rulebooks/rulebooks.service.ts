import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Rulebook } from './rulebooks.entity';

@Injectable()
export class RulebooksService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<Rulebook[]> {
    return this.em.find(Rulebook, { isActive: true }, {
      orderBy: { displayOrder: 'ASC', year: 'DESC' }
    });
  }

  async findById(id: string): Promise<Rulebook> {
    const rulebook = await this.em.findOne(Rulebook, { id });
    if (!rulebook) {
      throw new NotFoundException(`Rulebook with ID ${id} not found`);
    }
    return rulebook;
  }

  async findByYear(year: number): Promise<Rulebook[]> {
    return this.em.find(Rulebook, { year, isActive: true });
  }

  async create(data: Partial<Rulebook>): Promise<Rulebook> {
    const rulebook = this.em.create(Rulebook, data as any);
    await this.em.persistAndFlush(rulebook);
    return rulebook;
  }

  async update(id: string, data: Partial<Rulebook>): Promise<Rulebook> {
    const rulebook = await this.findById(id);
    this.em.assign(rulebook, data);
    await this.em.flush();
    return rulebook;
  }

  async delete(id: string): Promise<void> {
    const rulebook = await this.findById(id);
    await this.em.removeAndFlush(rulebook);
  }
}
