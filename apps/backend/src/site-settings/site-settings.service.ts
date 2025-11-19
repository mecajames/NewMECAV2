import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { SiteSettings } from './site-settings.entity';

@Injectable()
export class SiteSettingsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<SiteSettings[]> {
    const em = this.em.fork();
    return em.find(SiteSettings, {}, {
      orderBy: { setting_key: 'ASC' }
    });
  }

  async findByKey(key: string): Promise<SiteSettings | null> {
    const em = this.em.fork();
    return em.findOne(SiteSettings, { setting_key: key });
  }

  async upsert(key: string, value: string, type: string, description: string | undefined, updatedBy: string): Promise<SiteSettings> {
    const em = this.em.fork();

    // Try to find existing setting
    const existing = await em.findOne(SiteSettings, { setting_key: key });

    if (existing) {
      // Update existing
      existing.setting_value = value;
      existing.updated_by = updatedBy;
      existing.updated_at = new Date();
      if (description) {
        existing.description = description;
      }
      await em.flush();
      return existing;
    } else {
      // Create new
      const setting = em.create(SiteSettings, {
        setting_key: key,
        setting_value: value,
        setting_type: type,
        description,
        updated_by: updatedBy,
        updated_at: new Date(),
      });
      await em.persistAndFlush(setting);
      return setting;
    }
  }

  async delete(key: string): Promise<boolean> {
    const em = this.em.fork();
    const setting = await em.findOne(SiteSettings, { setting_key: key });
    if (!setting) return false;
    await em.removeAndFlush(setting);
    return true;
  }
}
