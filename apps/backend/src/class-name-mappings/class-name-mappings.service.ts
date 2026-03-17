import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ClassNameMapping } from './class-name-mappings.entity';
import { CompetitionClass } from '../competition-classes/competition-classes.entity';

@Injectable()
export class ClassNameMappingsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<ClassNameMapping[]> {
    const em = this.em.fork();
    const mappings = await em.find(ClassNameMapping, {}, {
      orderBy: { sourceName: 'ASC' },
    });

    // Manually populate target class info
    const classIds = mappings.map(m => m.targetClassId).filter((id): id is string => !!id);
    if (classIds.length > 0) {
      const classes = await em.find(CompetitionClass, { id: { $in: classIds } });
      const classMap = new Map(classes.map(c => [c.id, c]));

      for (const mapping of mappings) {
        if (mapping.targetClassId) {
          (mapping as any).targetClass = classMap.get(mapping.targetClassId);
        }
      }
    }

    return mappings;
  }

  async findActive(): Promise<ClassNameMapping[]> {
    const em = this.em.fork();
    return em.find(ClassNameMapping, { isActive: true }, {
      orderBy: { sourceName: 'ASC' },
    });
  }

  async findById(id: string): Promise<ClassNameMapping> {
    const em = this.em.fork();
    const mapping = await em.findOne(ClassNameMapping, { id });
    if (!mapping) {
      throw new NotFoundException(`Class name mapping with ID ${id} not found`);
    }
    return mapping;
  }

  async findBySourceName(sourceName: string, sourceSystem?: string): Promise<ClassNameMapping | null> {
    const em = this.em.fork();
    const filter: any = {
      sourceName: { $ilike: sourceName },
      isActive: true
    };
    if (sourceSystem) {
      filter.sourceSystem = sourceSystem;
    }
    return em.findOne(ClassNameMapping, filter);
  }

  /**
   * Look up the target class ID for a given source name
   * Used during import to resolve class names
   */
  async resolveClassName(sourceName: string, sourceSystem: string = 'termlab'): Promise<string | null> {
    const mapping = await this.findBySourceName(sourceName, sourceSystem);
    return mapping?.targetClassId || null;
  }

  async create(data: {
    sourceName: string;
    targetClassId?: string;
    sourceSystem?: string;
    isActive?: boolean;
    notes?: string;
  }): Promise<ClassNameMapping> {
    const em = this.em.fork();

    // Validate target class exists if provided
    if (data.targetClassId) {
      const targetClass = await em.findOne(CompetitionClass, { id: data.targetClassId });
      if (!targetClass) {
        throw new NotFoundException(`Target class with ID ${data.targetClassId} not found`);
      }
    }

    const now = new Date();
    const mapping = em.create(ClassNameMapping, {
      sourceName: data.sourceName,
      targetClassId: data.targetClassId,
      sourceSystem: data.sourceSystem || 'termlab',
      isActive: data.isActive ?? true,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    });

    await em.persistAndFlush(mapping);
    return mapping;
  }

  async update(id: string, data: {
    sourceName?: string;
    targetClassId?: string | null;
    sourceSystem?: string;
    isActive?: boolean;
    notes?: string;
  }): Promise<ClassNameMapping> {
    const em = this.em.fork();
    const mapping = await em.findOne(ClassNameMapping, { id });
    if (!mapping) {
      throw new NotFoundException(`Class name mapping with ID ${id} not found`);
    }

    // Validate target class exists if provided
    if (data.targetClassId) {
      const targetClass = await em.findOne(CompetitionClass, { id: data.targetClassId });
      if (!targetClass) {
        throw new NotFoundException(`Target class with ID ${data.targetClassId} not found`);
      }
    }

    if (data.sourceName !== undefined) mapping.sourceName = data.sourceName;
    if (data.targetClassId !== undefined) mapping.targetClassId = data.targetClassId || undefined;
    if (data.sourceSystem !== undefined) mapping.sourceSystem = data.sourceSystem;
    if (data.isActive !== undefined) mapping.isActive = data.isActive;
    if (data.notes !== undefined) mapping.notes = data.notes;

    await em.flush();
    return mapping;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const mapping = await em.findOne(ClassNameMapping, { id });
    if (!mapping) {
      throw new NotFoundException(`Class name mapping with ID ${id} not found`);
    }
    await em.removeAndFlush(mapping);
  }

  /**
   * Get unmapped class names from competition results
   * Returns class names that don't have a class_id and don't have a mapping
   */
  async getUnmappedClassNames(): Promise<{ className: string; count: number; format: string | null }[]> {
    const em = this.em.fork();

    const result = await em.getConnection().execute(`
      SELECT
        cr.competition_class as "className",
        cr.format,
        COUNT(*) as count
      FROM public.competition_results cr
      WHERE cr.class_id IS NULL
        AND cr.competition_class IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.class_name_mappings cnm
          WHERE LOWER(cnm.source_name) = LOWER(cr.competition_class)
            AND cnm.is_active = true
        )
      GROUP BY cr.competition_class, cr.format
      ORDER BY count DESC
    `);

    return result.map((row: any) => ({
      className: row.className,
      count: parseInt(row.count),
      format: row.format,
    }));
  }

  /**
   * Get actual competition results for a specific unmapped class name
   */
  async getUnmappedResults(className: string, format?: string): Promise<any[]> {
    const em = this.em.fork();

    let query = `
      SELECT
        cr.id,
        cr.competitor_name,
        cr.meca_id,
        cr.score,
        cr.placement,
        cr.format,
        cr.vehicle_info,
        cr.competition_class,
        cr.points_earned,
        e.title as event_name,
        e.event_date
      FROM public.competition_results cr
      LEFT JOIN public.events e ON e.id = cr.event_id
      WHERE cr.class_id IS NULL
        AND cr.competition_class = ?
    `;
    const params: any[] = [className];

    if (format) {
      query += ` AND cr.format = ?`;
      params.push(format);
    }

    query += ` ORDER BY e.event_date DESC, cr.placement ASC`;

    const rows = await em.getConnection().execute(query, params);
    return rows.map((row: any) => ({
      id: row.id,
      competitorName: row.competitor_name,
      mecaId: row.meca_id,
      score: row.score,
      placement: row.placement,
      format: row.format,
      vehicleInfo: row.vehicle_info,
      competitionClass: row.competition_class,
      pointsEarned: row.points_earned,
      eventName: row.event_name,
      eventDate: row.event_date,
    }));
  }

  /**
   * Remap competition results from one class name to a target competition class
   */
  async remapResults(
    className: string,
    targetClassId: string,
    format?: string,
    resultIds?: string[],
  ): Promise<{ updated: number }> {
    const em = this.em.fork();

    // Validate target class exists
    const targetClass = await em.findOne(CompetitionClass, { id: targetClassId });
    if (!targetClass) {
      throw new NotFoundException(`Target class with ID ${targetClassId} not found`);
    }

    let query = `
      UPDATE public.competition_results
      SET class_id = ?, competition_class = ?
      WHERE class_id IS NULL
        AND competition_class = ?
    `;
    const params: any[] = [targetClassId, targetClass.name, className];

    if (format) {
      query += ` AND format = ?`;
      params.push(format);
    }

    if (resultIds && resultIds.length > 0) {
      const placeholders = resultIds.map(() => '?').join(', ');
      query += ` AND id IN (${placeholders})`;
      params.push(...resultIds);
    }

    const result = await em.getConnection().execute(query, params);
    const updated = typeof result === 'number' ? result : (result as any)?.affectedRows ?? (result as any)?.length ?? 0;

    return { updated };
  }

  /**
   * Bulk create mappings for unmapped classes
   */
  async bulkCreateMappings(mappings: {
    sourceName: string;
    targetClassId?: string;
    sourceSystem?: string;
    notes?: string;
  }[]): Promise<{ created: number; errors: string[] }> {
    const em = this.em.fork();
    let created = 0;
    const errors: string[] = [];

    for (const data of mappings) {
      try {
        const existing = await em.findOne(ClassNameMapping, {
          sourceName: { $ilike: data.sourceName },
          sourceSystem: data.sourceSystem || 'termlab'
        });

        if (existing) {
          errors.push(`Mapping for "${data.sourceName}" already exists`);
          continue;
        }

        const now = new Date();
        const mapping = em.create(ClassNameMapping, {
          sourceName: data.sourceName,
          targetClassId: data.targetClassId,
          sourceSystem: data.sourceSystem || 'termlab',
          isActive: true,
          notes: data.notes,
          createdAt: now,
          updatedAt: now,
        });
        em.persist(mapping);
        created++;
      } catch (error: any) {
        errors.push(`Failed to create mapping for "${data.sourceName}": ${error.message}`);
      }
    }

    await em.flush();
    return { created, errors };
  }
}
