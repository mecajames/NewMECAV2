import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { CompetitionFormat } from './competition-formats.entity';

@Injectable()
export class CompetitionFormatsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<CompetitionFormat[]> {
    const em = this.em.fork();
    return em.find(CompetitionFormat, {}, {
      orderBy: { displayOrder: 'ASC' },
    });
  }

  async findActive(): Promise<CompetitionFormat[]> {
    const em = this.em.fork();
    return em.find(CompetitionFormat, { isActive: true }, {
      orderBy: { displayOrder: 'ASC' },
    });
  }

  async findById(id: string): Promise<CompetitionFormat> {
    const em = this.em.fork();
    const format = await em.findOne(CompetitionFormat, { id });
    if (!format) {
      throw new NotFoundException(`Competition format with ID ${id} not found`);
    }
    return format;
  }

  async create(data: Partial<CompetitionFormat>): Promise<CompetitionFormat> {
    const em = this.em.fork();

    // Check if format with this name already exists
    const existing = await em.findOne(CompetitionFormat, { name: data.name });
    if (existing) {
      throw new ConflictException(`Format with name "${data.name}" already exists`);
    }

    const format = em.create(CompetitionFormat, data as any);
    await em.persistAndFlush(format);
    return format;
  }

  async update(id: string, data: Partial<CompetitionFormat>): Promise<CompetitionFormat> {
    const em = this.em.fork();
    const format = await em.findOne(CompetitionFormat, { id });
    if (!format) {
      throw new NotFoundException(`Competition format with ID ${id} not found`);
    }

    // If updating name, check for conflicts
    if (data.name && data.name !== format.name) {
      const existing = await em.findOne(CompetitionFormat, { name: data.name });
      if (existing) {
        throw new ConflictException(`Format with name "${data.name}" already exists`);
      }
    }

    em.assign(format, data);
    await em.flush();
    return format;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const format = await em.findOne(CompetitionFormat, { id });
    if (!format) {
      throw new NotFoundException(`Competition format with ID ${id} not found`);
    }
    await em.removeAndFlush(format);
  }
}
