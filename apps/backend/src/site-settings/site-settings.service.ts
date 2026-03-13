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

  async bulkUpsert(settings: { key: string; value: string; type: string; description?: string; updatedBy: string }[]): Promise<SiteSettings[]> {
    const em = this.em.fork();
    const results: SiteSettings[] = [];

    // Load all existing settings in one query
    const keys = settings.map(s => s.key);
    const existing = await em.find(SiteSettings, { setting_key: { $in: keys } });
    const existingMap = new Map(existing.map(s => [s.setting_key, s]));

    for (const s of settings) {
      const found = existingMap.get(s.key);
      if (found) {
        found.setting_value = s.value;
        found.updated_by = s.updatedBy;
        found.updated_at = new Date();
        if (s.description) {
          found.description = s.description;
        }
        results.push(found);
      } else {
        const setting = em.create(SiteSettings, {
          setting_key: s.key,
          setting_value: s.value,
          setting_type: s.type,
          description: s.description,
          updated_by: s.updatedBy,
          updated_at: new Date(),
        });
        em.persist(setting);
        results.push(setting);
      }
    }

    await em.flush();
    return results;
  }

  async delete(key: string): Promise<boolean> {
    const em = this.em.fork();
    const setting = await em.findOne(SiteSettings, { setting_key: key });
    if (!setting) return false;
    await em.removeAndFlush(setting);
    return true;
  }
}
