import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { Rulebook } from './rulebooks.entity';
import { ENTITY_MANAGER } from '../db/database.module';

@Injectable()
export class RulebooksService {
  constructor(
    @Inject(ENTITY_MANAGER)
    private readonly em: EntityManager
  ) {}

  async findAll(page: number = 1, limit: number = 10): Promise<Rulebook[]> {
    const offset = (page - 1) * limit;
    return this.em.find(Rulebook, {}, {
      limit,
      offset,
      orderBy: { displayOrder: 'ASC', year: 'DESC' },
      populate: ['uploadedBy'],
    });
  }

  async findById(id: string): Promise<Rulebook | null> {
    return this.em.findOne(Rulebook, { id }, {
      populate: ['uploadedBy'],
    });
  }

  async findActive(): Promise<Rulebook[]> {
    return this.em.find(Rulebook, {
      isActive: true,
    }, {
      orderBy: { displayOrder: 'ASC', year: 'DESC' },
      populate: ['uploadedBy'],
    });
  }

  async findByYear(year: number): Promise<Rulebook[]> {
    return this.em.find(Rulebook, {
      year,
    }, {
      orderBy: { displayOrder: 'ASC' },
      populate: ['uploadedBy'],
    });
  }

  async findByCategory(category: string): Promise<Rulebook[]> {
    return this.em.find(Rulebook, {
      category,
      isActive: true,
    }, {
      orderBy: { displayOrder: 'ASC', year: 'DESC' },
      populate: ['uploadedBy'],
    });
  }

  async create(data: Partial<Rulebook>): Promise<Rulebook> {
    const rulebook = this.em.create(Rulebook, data as any);
    await this.em.persistAndFlush(rulebook);
    return rulebook;
  }

  async update(id: string, data: Partial<Rulebook>): Promise<Rulebook> {
    const rulebook = await this.em.findOne(Rulebook, { id });

    if (!rulebook) {
      throw new NotFoundException(`Rulebook with ID ${id} not found`);
    }

    this.em.assign(rulebook, data);
    await this.em.flush();

    return rulebook;
  }

  async delete(id: string): Promise<void> {
    const rulebook = await this.em.findOne(Rulebook, { id });

    if (!rulebook) {
      throw new NotFoundException(`Rulebook with ID ${id} not found`);
    }

    await this.em.removeAndFlush(rulebook);
  }

  async setDisplayOrder(id: string, order: number): Promise<Rulebook> {
    const rulebook = await this.em.findOne(Rulebook, { id });

    if (!rulebook) {
      throw new NotFoundException(`Rulebook with ID ${id} not found`);
    }

    rulebook.displayOrder = order;
    await this.em.flush();

    return rulebook;
  }
}
