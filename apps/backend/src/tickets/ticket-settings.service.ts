import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { TicketSetting } from './entities/ticket-setting.entity';

export interface TicketSettingsMap {
  allow_user_department_selection: boolean;
  allow_attachments: boolean;
  max_attachment_size_mb: number;
  require_category: boolean;
  auto_close_resolved_days: number;
  enable_email_notifications: boolean;
  default_department_id?: string;
}

@Injectable()
export class TicketSettingsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<TicketSetting[]> {
    const em = this.em.fork();
    return em.find(TicketSetting, {}, {
      orderBy: { settingKey: 'ASC' },
    });
  }

  async findByKey(key: string): Promise<TicketSetting> {
    const em = this.em.fork();
    const setting = await em.findOne(TicketSetting, { settingKey: key });
    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }
    return setting;
  }

  async getValue(key: string, defaultValue?: string): Promise<string | undefined> {
    try {
      const setting = await this.findByKey(key);
      return setting.settingValue;
    } catch {
      return defaultValue;
    }
  }

  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.getValue(key);
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1';
  }

  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const value = await this.getValue(key);
    if (value === undefined) return defaultValue;
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  }

  async getSettings(): Promise<TicketSettingsMap> {
    return {
      allow_user_department_selection: await this.getBoolean('allow_user_department_selection', false),
      allow_attachments: await this.getBoolean('allow_attachments', true),
      max_attachment_size_mb: await this.getNumber('max_attachment_size_mb', 10),
      require_category: await this.getBoolean('require_category', true),
      auto_close_resolved_days: await this.getNumber('auto_close_resolved_days', 7),
      enable_email_notifications: await this.getBoolean('enable_email_notifications', false),
      default_department_id: await this.getValue('default_department_id'),
    };
  }

  async update(key: string, value: string): Promise<TicketSetting> {
    const em = this.em.fork();
    let setting = await em.findOne(TicketSetting, { settingKey: key });

    if (!setting) {
      // Create if doesn't exist
      setting = em.create(TicketSetting, {
        settingKey: key,
        settingValue: value,
        settingType: this.inferType(value),
      } as any);
    } else {
      em.assign(setting, { settingValue: value });
    }

    await em.persistAndFlush(setting);
    return setting;
  }

  async upsert(key: string, value: string, type?: string, description?: string): Promise<TicketSetting> {
    const em = this.em.fork();
    let setting = await em.findOne(TicketSetting, { settingKey: key });

    if (!setting) {
      setting = em.create(TicketSetting, {
        settingKey: key,
        settingValue: value,
        settingType: type || this.inferType(value),
        description: description,
      } as any);
    } else {
      const updateData: Partial<TicketSetting> = { settingValue: value };
      if (type) updateData.settingType = type;
      if (description !== undefined) updateData.description = description;
      em.assign(setting, updateData);
    }

    await em.persistAndFlush(setting);
    return setting;
  }

  private inferType(value: string): string {
    if (value === 'true' || value === 'false') return 'boolean';
    if (!isNaN(Number(value))) return 'number';
    try {
      JSON.parse(value);
      return 'json';
    } catch {
      return 'string';
    }
  }
}
