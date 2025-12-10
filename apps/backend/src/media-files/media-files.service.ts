import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { MediaType } from '@newmeca/shared';
import { MediaFile } from './media-files.entity';

@Injectable()
export class MediaFilesService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(fileType?: MediaType): Promise<MediaFile[]> {
    const em = this.em.fork();
    const where = fileType ? { fileType } : {};
    return em.find(MediaFile, where, {
      orderBy: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<MediaFile> {
    const em = this.em.fork();
    const mediaFile = await em.findOne(MediaFile, { id });
    if (!mediaFile) {
      throw new NotFoundException(`Media file with ID ${id} not found`);
    }
    return mediaFile;
  }

  async search(searchTerm: string, fileType?: MediaType): Promise<MediaFile[]> {
    const em = this.em.fork();
    const where: any = {
      $or: [
        { title: { $ilike: `%${searchTerm}%` } },
        { description: { $ilike: `%${searchTerm}%` } },
      ],
    };

    if (fileType) {
      where.fileType = fileType;
    }

    return em.find(MediaFile, where, {
      orderBy: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<MediaFile>): Promise<MediaFile> {
    const em = this.em.fork();
    const mediaFile = em.create(MediaFile, data as any);
    await em.persistAndFlush(mediaFile);
    return mediaFile;
  }

  async update(id: string, data: Partial<MediaFile>): Promise<MediaFile> {
    const em = this.em.fork();
    const mediaFile = await em.findOne(MediaFile, { id });
    if (!mediaFile) {
      throw new NotFoundException(`Media file with ID ${id} not found`);
    }
    em.assign(mediaFile, data);
    await em.flush();
    return mediaFile;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const mediaFile = await em.findOne(MediaFile, { id });
    if (!mediaFile) {
      throw new NotFoundException(`Media file with ID ${id} not found`);
    }
    await em.removeAndFlush(mediaFile);
  }
}
