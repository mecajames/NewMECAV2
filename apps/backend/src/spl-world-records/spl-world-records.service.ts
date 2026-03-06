import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { SplWorldRecord } from './spl-world-records.entity';

@Injectable()
export class SplWorldRecordsService {
  private readonly logger = new Logger(SplWorldRecordsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Get all current world records, ordered by class display_order
   */
  async findAll(): Promise<SplWorldRecord[]> {
    const em = this.em.fork();
    const records = await em.find(SplWorldRecord, {}, {
      populate: ['competitionClass'],
    });

    // Sort by class display_order (loaded via populate)
    records.sort((a, b) => {
      const orderA = a.competitionClass?.displayOrder ?? 999;
      const orderB = b.competitionClass?.displayOrder ?? 999;
      return orderA - orderB;
    });

    return records;
  }

  /**
   * Get a single world record by ID
   */
  async findById(id: string): Promise<SplWorldRecord> {
    const em = this.em.fork();
    const record = await em.findOne(SplWorldRecord, { id });
    if (!record) {
      throw new NotFoundException('World record not found');
    }
    return record;
  }

  /**
   * Get history for a specific class
   */
  async findHistoryByClassId(classId: string): Promise<any[]> {
    const em = this.em.fork();
    const conn = em.getConnection();
    return conn.execute(
      `SELECT * FROM public.spl_world_records_history WHERE class_id = ? ORDER BY replaced_at DESC`,
      [classId],
    );
  }

  /**
   * Create or update (upsert) a world record.
   * If a record already exists for the class_id, archive the old one to history, then update.
   */
  async upsert(data: Partial<SplWorldRecord>, userId: string): Promise<SplWorldRecord> {
    const em = this.em.fork();

    if (!data.classId) {
      throw new Error('class_id is required');
    }

    // Check if a record already exists for this class
    const existing = await em.findOne(SplWorldRecord, { classId: data.classId });

    if (existing) {
      // Archive the old record to history via raw SQL (avoids MikroORM relation requirements)
      const conn = em.getConnection();
      await conn.execute(
        `INSERT INTO public.spl_world_records_history
          (record_id, class_id, class_name, event_id, event_name, season_id,
           competitor_name, meca_id, competitor_id, score, wattage, frequency,
           notes, record_date, created_by, updated_by, replaced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          existing.id, existing.classId, existing.className,
          existing.eventId || null, existing.eventName || null, existing.seasonId || null,
          existing.competitorName, existing.mecaId || null, existing.competitorId || null,
          existing.score, existing.wattage || null, existing.frequency || null,
          existing.notes || null, existing.recordDate || null,
          existing.createdBy, existing.updatedBy || null,
        ],
      );

      // Update the existing record
      existing.className = data.className || existing.className;
      existing.eventId = data.eventId;
      existing.eventName = data.eventName;
      existing.seasonId = data.seasonId;
      existing.competitorName = data.competitorName || existing.competitorName;
      existing.mecaId = data.mecaId;
      existing.competitorId = data.competitorId;
      existing.score = data.score ?? existing.score;
      existing.wattage = data.wattage;
      existing.frequency = data.frequency;
      existing.notes = data.notes;
      existing.recordDate = data.recordDate;
      existing.updatedBy = userId;
      existing.updatedAt = new Date();

      await em.flush();

      this.logger.log(`Replaced world record for class ${existing.className} — new holder: ${existing.competitorName} (${existing.score})`);
      return existing;
    }

    // No existing record — create via raw SQL, then return entity
    const conn = em.getConnection();
    const result = await conn.execute(
      `INSERT INTO public.spl_world_records
        (class_id, class_name, event_id, event_name, season_id,
         competitor_name, meca_id, competitor_id, score, wattage, frequency,
         notes, record_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        data.classId, data.className,
        data.eventId || null, data.eventName || null, data.seasonId || null,
        data.competitorName, data.mecaId || null, data.competitorId || null,
        data.score, data.wattage || null, data.frequency || null,
        data.notes || null, data.recordDate || null, userId,
      ],
    );

    const newId = result[0]?.id;
    this.logger.log(`Created world record for class ${data.className}: ${data.competitorName} (${data.score})`);

    // Fetch and return the newly created entity
    return em.findOneOrFail(SplWorldRecord, { id: newId });
  }

  /**
   * Delete a world record (and its history cascade-deletes)
   */
  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const record = await em.findOne(SplWorldRecord, { id });
    if (!record) {
      throw new NotFoundException('World record not found');
    }
    await em.removeAndFlush(record);
    this.logger.log(`Deleted world record for class ${record.className}`);
  }
}
