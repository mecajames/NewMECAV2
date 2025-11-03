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
    const em = this.em.fork();
    return em.find(Rulebook, { status: true }, {
      orderBy: { category: 'ASC', season: 'DESC' }
    });
  }

  async findAllIncludingInactive(): Promise<Rulebook[]> {
    const em = this.em.fork();
    return em.find(Rulebook, {}, {
      orderBy: { category: 'ASC', season: 'DESC' }
    });
  }

  async findById(id: string): Promise<Rulebook> {
    const em = this.em.fork();
    const rulebook = await em.findOne(Rulebook, { id });
    if (!rulebook) {
      throw new NotFoundException(`Rulebook with ID ${id} not found`);
    }
    return rulebook;
  }

  async findBySeason(season: string): Promise<Rulebook[]> {
    const em = this.em.fork();
    return em.find(Rulebook, { season, status: true });
  }

  async create(data: Partial<Rulebook>): Promise<Rulebook> {
    const em = this.em.fork();
    const rulebook = em.create(Rulebook, data as any);
    await em.persistAndFlush(rulebook);
    return rulebook;
  }

  async update(id: string, data: Partial<Rulebook>): Promise<Rulebook> {
    const em = this.em.fork();
    const rulebook = await em.findOne(Rulebook, { id });
    if (!rulebook) {
      throw new NotFoundException(`Rulebook with ID ${id} not found`);
    }
    em.assign(rulebook, data);
    await em.flush();
    return rulebook;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const rulebook = await em.findOne(Rulebook, { id });
    if (!rulebook) {
      throw new NotFoundException(`Rulebook with ID ${id} not found`);
    }
    await em.removeAndFlush(rulebook);
  }
}
