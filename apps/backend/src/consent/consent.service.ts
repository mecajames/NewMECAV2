import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ConsentLog } from './consent-log.entity';

export interface RecordConsentDto {
  visitorId: string;
  choice: 'accepted_all' | 'necessary_only' | 'custom';
  analytics: boolean;
  functional: boolean;
  userAgent?: string;
}

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(private readonly em: EntityManager) {}

  async record(dto: RecordConsentDto): Promise<{ success: boolean }> {
    const em = this.em.fork();
    const row = em.create(ConsentLog, {
      visitorId: dto.visitorId,
      choice: dto.choice,
      analytics: !!dto.analytics,
      functional: !!dto.functional,
      userAgent: dto.userAgent?.slice(0, 500),
      createdAt: new Date(),
    });
    await em.persistAndFlush(row);
    return { success: true };
  }

  /** Consent stats for the admin Privacy & Consent panel. */
  async getStats(days = 30): Promise<{
    days: number;
    total: number;
    acceptedAll: number;
    necessaryOnly: number;
    custom: number;
    analyticsGranted: number;
    allTimeTotal: number;
  }> {
    const em = this.em.fork();
    const connection = em.getConnection();
    const [inWindow] = await connection.execute(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE choice = 'accepted_all')::int AS accepted_all,
         COUNT(*) FILTER (WHERE choice = 'necessary_only')::int AS necessary_only,
         COUNT(*) FILTER (WHERE choice = 'custom')::int AS custom,
         COUNT(*) FILTER (WHERE analytics = true)::int AS analytics_granted
       FROM consent_log
       WHERE created_at >= NOW() - (?|| ' days')::interval`,
      [String(days)],
    );
    const [allTime] = await connection.execute(`SELECT COUNT(*)::int AS total FROM consent_log`);
    return {
      days,
      total: inWindow?.total ?? 0,
      acceptedAll: inWindow?.accepted_all ?? 0,
      necessaryOnly: inWindow?.necessary_only ?? 0,
      custom: inWindow?.custom ?? 0,
      analyticsGranted: inWindow?.analytics_granted ?? 0,
      allTimeTotal: allTime?.total ?? 0,
    };
  }
}
