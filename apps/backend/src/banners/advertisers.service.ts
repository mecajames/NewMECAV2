import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/core';
import { CreateAdvertiserDto, UpdateAdvertiserDto } from '@newmeca/shared';
import { Advertiser } from './entities/advertiser.entity';

@Injectable()
export class AdvertisersService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<Advertiser[]> {
    const em = this.em.fork();
    return em.find(Advertiser, {}, { orderBy: { companyName: 'ASC' } });
  }

  async findActive(): Promise<Advertiser[]> {
    const em = this.em.fork();
    return em.find(Advertiser, { isActive: true }, { orderBy: { companyName: 'ASC' } });
  }

  async findOne(id: string): Promise<Advertiser> {
    const em = this.em.fork();
    const advertiser = await em.findOne(Advertiser, { id });
    if (!advertiser) {
      throw new NotFoundException(`Advertiser with ID ${id} not found`);
    }
    return advertiser;
  }

  async create(dto: CreateAdvertiserDto): Promise<Advertiser> {
    const em = this.em.fork();
    const now = new Date();
    const advertiser = em.create(Advertiser, {
      companyName: dto.companyName,
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      website: dto.website || undefined,
      notes: dto.notes,
      isActive: dto.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
    await em.persistAndFlush(advertiser);
    return advertiser;
  }

  async update(id: string, dto: UpdateAdvertiserDto): Promise<Advertiser> {
    const em = this.em.fork();
    const advertiser = await em.findOne(Advertiser, { id });
    if (!advertiser) {
      throw new NotFoundException(`Advertiser with ID ${id} not found`);
    }

    wrap(advertiser).assign({
      ...(dto.companyName !== undefined && { companyName: dto.companyName }),
      ...(dto.contactName !== undefined && { contactName: dto.contactName }),
      ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
      ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
      ...(dto.website !== undefined && { website: dto.website || undefined }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    await em.flush();
    return advertiser;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const advertiser = await em.findOne(Advertiser, { id });
    if (!advertiser) {
      throw new NotFoundException(`Advertiser with ID ${id} not found`);
    }
    await em.removeAndFlush(advertiser);
  }
}
