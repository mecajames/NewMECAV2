import { Injectable } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { MediaFile, MediaType } from './media-file.entity';

@Injectable()
export class MediaFilesService {
  constructor(private readonly em: EntityManager) {}

  async findAll(
    page: number = 1,
    limit: number = 50,
    fileType?: MediaType,
    searchTerm?: string
  ) {
    const offset = (page - 1) * limit;
    const where: FilterQuery<MediaFile> = {};

    if (fileType) {
      where.fileType = fileType;
    }

    if (searchTerm) {
      where.$or = [
        { title: { $like: `%${searchTerm}%` } },
        { description: { $like: `%${searchTerm}%` } },
      ];
    }

    const [files, total] = await this.em.findAndCount(
      MediaFile,
      where,
      {
        limit,
        offset,
        orderBy: { createdAt: 'DESC' },
        populate: ['createdBy'],
      }
    );

    return {
      data: files,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return this.em.findOne(MediaFile, { id }, { populate: ['createdBy'] });
  }

  async create(data: Partial<MediaFile>) {
    const mediaFile = this.em.create(MediaFile, data);
    await this.em.persistAndFlush(mediaFile);
    return mediaFile;
  }

  async update(id: string, data: Partial<MediaFile>) {
    const mediaFile = await this.em.findOneOrFail(MediaFile, { id });
    this.em.assign(mediaFile, data);
    await this.em.flush();
    return mediaFile;
  }

  async delete(id: string) {
    const mediaFile = await this.em.findOneOrFail(MediaFile, { id });
    await this.em.removeAndFlush(mediaFile);
    return { success: true, id };
  }

  async findByTags(tags: string[]) {
    return this.em.find(MediaFile, {
      tags: { $overlap: tags },
    }, {
      orderBy: { createdAt: 'DESC' },
    });
  }

  async findByCreator(creatorId: string) {
    return this.em.find(MediaFile, {
      createdBy: creatorId,
    }, {
      orderBy: { createdAt: 'DESC' },
    });
  }
}
