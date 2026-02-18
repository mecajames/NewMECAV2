import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { CompetitionClass } from './competition-classes.entity';
import { Season } from '../seasons/seasons.entity';

@Injectable()
export class CompetitionClassesService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<CompetitionClass[]> {
    const em = this.em.fork();
    return em.find(CompetitionClass, {}, {
      orderBy: { displayOrder: 'ASC' },
    });
  }

  async findById(id: string): Promise<CompetitionClass> {
    const em = this.em.fork();
    const competitionClass = await em.findOne(CompetitionClass, { id });
    if (!competitionClass) {
      throw new NotFoundException(`Competition class with ID ${id} not found`);
    }
    return competitionClass;
  }

  async findBySeason(seasonId: string): Promise<CompetitionClass[]> {
    const em = this.em.fork();
    return em.find(CompetitionClass, { seasonId }, {
      orderBy: { displayOrder: 'ASC' },
    });
  }

  async findByFormat(format: string): Promise<CompetitionClass[]> {
    const em = this.em.fork();
    return em.find(CompetitionClass, { format }, {
      orderBy: { displayOrder: 'ASC' },
    });
  }

  async findActiveClasses(): Promise<CompetitionClass[]> {
    const em = this.em.fork();
    return em.find(CompetitionClass, { isActive: true }, {
      orderBy: { displayOrder: 'ASC' },
    });
  }

  async create(data: Partial<CompetitionClass>): Promise<CompetitionClass> {
    const em = this.em.fork();
    const input = data as any;

    // Load the season reference
    const seasonId = input.season_id || input.seasonId;
    const season = await em.findOne(Season, { id: seasonId });
    if (!season) {
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
    }

    const competitionClass = em.create(CompetitionClass, {
      name: input.name,
      abbreviation: input.abbreviation,
      format: input.format,
      season,
      isActive: input.is_active ?? input.isActive ?? true,
      displayOrder: input.display_order ?? input.displayOrder ?? 0,
    } as any);
    await em.persistAndFlush(competitionClass);
    return competitionClass;
  }

  async update(id: string, data: Partial<CompetitionClass>): Promise<CompetitionClass> {
    const em = this.em.fork();
    const competitionClass = await em.findOne(CompetitionClass, { id });
    if (!competitionClass) {
      throw new NotFoundException(`Competition class with ID ${id} not found`);
    }

    const input = data as any;

    // Map snake_case input to camelCase entity properties
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.abbreviation !== undefined) updateData.abbreviation = input.abbreviation;
    if (input.format !== undefined) updateData.format = input.format;
    if (input.is_active !== undefined) updateData.isActive = input.is_active;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.display_order !== undefined) updateData.displayOrder = input.display_order;
    if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;

    // Handle season change
    const seasonId = input.season_id || input.seasonId;
    if (seasonId) {
      const season = await em.findOne(Season, { id: seasonId });
      if (season) updateData.season = season;
    }

    em.assign(competitionClass, updateData);
    await em.flush();
    return competitionClass;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const competitionClass = await em.findOne(CompetitionClass, { id });
    if (!competitionClass) {
      throw new NotFoundException(`Competition class with ID ${id} not found`);
    }
    await em.removeAndFlush(competitionClass);
  }

  /**
   * Copy competition classes from one season to another
   * @param fromSeasonId Source season ID
   * @param toSeasonId Destination season ID
   * @param format Optional format filter (e.g., 'SPL', 'SQL', or 'all' for all formats)
   * @returns Array of newly created competition classes
   */
  async copyBetweenSeasons(
    fromSeasonId: string,
    toSeasonId: string,
    format?: string
  ): Promise<{ copied: number; classes: CompetitionClass[] }> {
    const em = this.em.fork();

    // Verify both seasons exist
    const fromSeason = await em.findOne(Season, { id: fromSeasonId });
    if (!fromSeason) {
      throw new NotFoundException(`Source season with ID ${fromSeasonId} not found`);
    }

    const toSeason = await em.findOne(Season, { id: toSeasonId });
    if (!toSeason) {
      throw new NotFoundException(`Destination season with ID ${toSeasonId} not found`);
    }

    // Get classes from source season
    const whereClause: any = { season: fromSeasonId };
    if (format && format !== 'all') {
      whereClause.format = format;
    }

    const sourceClasses = await em.find(CompetitionClass, whereClause, {
      orderBy: { displayOrder: 'ASC' },
    });

    if (sourceClasses.length === 0) {
      return { copied: 0, classes: [] };
    }

    // Check for existing classes in destination season to avoid duplicates
    const existingClasses = await em.find(CompetitionClass, { season: toSeasonId });
    const existingNames = new Set(existingClasses.map(c => `${c.name}-${c.format}`));

    // Create copies for destination season
    const newClasses: CompetitionClass[] = [];
    for (const sourceClass of sourceClasses) {
      // Skip if a class with same name and format already exists in destination
      const key = `${sourceClass.name}-${sourceClass.format}`;
      if (existingNames.has(key)) {
        console.log(`Skipping duplicate class: ${sourceClass.name} (${sourceClass.format})`);
        continue;
      }

      const newClass = em.create(CompetitionClass, {
        name: sourceClass.name,
        abbreviation: sourceClass.abbreviation,
        format: sourceClass.format,
        season: Reference.createFromPK(Season, toSeasonId),
        isActive: sourceClass.isActive,
        displayOrder: sourceClass.displayOrder,
      } as any);
      newClasses.push(newClass);
    }

    if (newClasses.length > 0) {
      await em.persistAndFlush(newClasses);
    }

    console.log(`Copied ${newClasses.length} classes from season ${fromSeasonId} to ${toSeasonId}`);
    return { copied: newClasses.length, classes: newClasses };
  }
}
