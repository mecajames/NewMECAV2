import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { RulebookStatus } from '@newmeca/shared';
import { Rulebook } from './rulebooks.entity';

@Injectable()
export class RulebooksService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<Rulebook[]> {
    const em = this.em.fork();
    return em.find(Rulebook, { status: RulebookStatus.ACTIVE }, {
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
    const seasonNum = parseInt(season, 10);
    return em.find(Rulebook, { season: seasonNum, status: RulebookStatus.ACTIVE });
  }

  async create(data: Partial<Rulebook>): Promise<Rulebook> {
    const em = this.em.fork();
    console.log('📝 CREATE RULEBOOK - Data received:', JSON.stringify(data, null, 2));

    // Transform and validate data
    const transformedData: any = { ...data };
    // Season must be an integer (maps to 'year' column)
    if (transformedData.season !== undefined) {
      transformedData.season = typeof transformedData.season === 'string'
        ? parseInt(transformedData.season, 10)
        : transformedData.season;
    }
    // Sync isActive boolean with status text
    if (transformedData.status !== undefined) {
      transformedData.isActive = transformedData.status === RulebookStatus.ACTIVE;
    }

    console.log('📝 CREATE RULEBOOK - Transformed data:', JSON.stringify(transformedData, null, 2));

    try {
      const rulebook = em.create(Rulebook, transformedData);
      await em.persistAndFlush(rulebook);
      console.log('📝 CREATE RULEBOOK - Success, ID:', rulebook.id);
      return rulebook;
    } catch (error) {
      console.error('❌ CREATE RULEBOOK - Error:', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<Rulebook>): Promise<Rulebook> {
    const em = this.em.fork();
    console.log('📝 UPDATE RULEBOOK - ID:', id);
    console.log('📝 UPDATE RULEBOOK - Data received:', JSON.stringify(data, null, 2));

    const rulebook = await em.findOne(Rulebook, { id });
    if (!rulebook) {
      throw new NotFoundException(`Rulebook with ID ${id} not found`);
    }

    // Transform and validate data
    const transformedData: any = {};
    if (data.title !== undefined) transformedData.title = data.title;
    if (data.category !== undefined) transformedData.category = data.category;
    // Season must be an integer (maps to 'year' column)
    if (data.season !== undefined) {
      transformedData.season = typeof data.season === 'string' ? parseInt(data.season, 10) : data.season;
    }
    // Handle status - accept both string and boolean for backwards compatibility
    if (data.status !== undefined) {
      if (typeof data.status === 'boolean') {
        // Convert boolean to string status
        transformedData.status = data.status ? RulebookStatus.ACTIVE : RulebookStatus.INACTIVE;
        transformedData.isActive = data.status;
      } else {
        // Use string status directly
        transformedData.status = data.status;
        transformedData.isActive = data.status === RulebookStatus.ACTIVE;
      }
    }
    if ((data as any).pdfUrl !== undefined) transformedData.pdfUrl = (data as any).pdfUrl;
    if (data.description !== undefined) transformedData.description = data.description;
    if (data.displayOrder !== undefined) transformedData.displayOrder = data.displayOrder;

    console.log('📝 UPDATE RULEBOOK - Transformed data:', JSON.stringify(transformedData, null, 2));

    try {
      em.assign(rulebook, transformedData);
      await em.flush();
      console.log('📝 UPDATE RULEBOOK - Success');
      return rulebook;
    } catch (error) {
      console.error('❌ UPDATE RULEBOOK - Error:', error);
      throw error;
    }
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
