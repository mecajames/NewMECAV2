import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { CompetitionClass } from './competition-classes.entity';
import { CompetitionFormat } from '../competition-formats/competition-formats.entity';
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
      unlimitedWattage: input.unlimited_wattage ?? input.unlimitedWattage ?? false,
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
    if (input.unlimited_wattage !== undefined) updateData.unlimitedWattage = input.unlimited_wattage;
    if (input.unlimitedWattage !== undefined) updateData.unlimitedWattage = input.unlimitedWattage;

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
        unlimitedWattage: sourceClass.unlimitedWattage,
      } as any);
      newClasses.push(newClass);
    }

    if (newClasses.length > 0) {
      await em.persistAndFlush(newClasses);
    }

    console.log(`Copied ${newClasses.length} classes from season ${fromSeasonId} to ${toSeasonId}`);
    return { copied: newClasses.length, classes: newClasses };
  }

  /**
   * Export every competition class for the given season as a portable
   * JSON document. Used to mirror class definitions between environments
   * (e.g. stage → production) without depending on UUID matches across DBs.
   *
   * The shape intentionally omits id, season_id, created_at and updated_at —
   * those are environment-specific. Matching on import happens by
   * (season.year, format, abbreviation), which is what's stable across
   * environments.
   */
  async exportSeason(seasonId: string): Promise<{
    exportedAt: string;
    season: { year: number; name: string };
    formats: Array<{
      name: string;
      abbreviation?: string;
      description?: string;
      isActive: boolean;
      displayOrder: number;
    }>;
    classes: Array<{
      name: string;
      abbreviation: string;
      format: string;
      isActive: boolean;
      displayOrder: number;
      unlimitedWattage: boolean;
    }>;
  }> {
    const em = this.em.fork();
    const season = await em.findOne(Season, { id: seasonId });
    if (!season) throw new NotFoundException(`Season ${seasonId} not found`);

    const classes = await em.find(CompetitionClass, { seasonId }, {
      orderBy: { format: 'ASC', displayOrder: 'ASC', name: 'ASC' },
    });

    // Include all formats currently referenced by these classes so the
    // import side can ensure each format row exists before saving classes.
    // Limiting to *referenced* formats (rather than every active format)
    // keeps the export payload focused on what's actually needed for the
    // season being moved between environments.
    const referencedFormatNames = Array.from(new Set(classes.map(c => c.format).filter(Boolean)));
    const formats = referencedFormatNames.length > 0
      ? await em.find(CompetitionFormat, { name: { $in: referencedFormatNames } }, {
          orderBy: { displayOrder: 'ASC', name: 'ASC' },
        })
      : [];

    return {
      exportedAt: new Date().toISOString(),
      season: { year: season.year, name: season.name },
      formats: formats.map(f => ({
        name: f.name,
        abbreviation: f.abbreviation,
        description: f.description,
        isActive: f.isActive,
        displayOrder: f.displayOrder,
      })),
      classes: classes.map(c => ({
        name: c.name,
        abbreviation: c.abbreviation,
        format: c.format,
        isActive: c.isActive,
        displayOrder: c.displayOrder,
        unlimitedWattage: c.unlimitedWattage,
      })),
    };
  }

  /**
   * Import a previously-exported set of classes into a target season,
   * keyed by season YEAR (so it works across environments where the
   * season UUID differs). Match an incoming class to an existing one by
   * (season_id, format, abbreviation):
   *   - Found      → update name/displayOrder/isActive/unlimitedWattage
   *   - Not found  → insert a new row
   *
   * `mode = 'replace'` additionally deactivates (NOT deletes) any class
   * already in the target season that isn't in the import — useful when
   * cloning the source environment's exact state. Default is 'merge'.
   */
  async importSeason(
    data: {
      season: { year: number; name?: string };
      formats?: Array<{
        name: string;
        abbreviation?: string;
        description?: string;
        isActive?: boolean;
        displayOrder?: number;
      }>;
      classes: Array<{
        name: string;
        abbreviation: string;
        format: string;
        isActive?: boolean;
        displayOrder?: number;
        unlimitedWattage?: boolean;
      }>;
    },
    mode: 'merge' | 'replace' = 'merge',
  ): Promise<{
    seasonId: string;
    seasonYear: number;
    formatsCreated: number;
    formatsUpdated: number;
    created: number;
    updated: number;
    deactivated: number;
    skipped: number;
  }> {
    if (!data?.classes?.length || !data?.season?.year) {
      throw new NotFoundException('Import payload missing required fields (season.year, classes)');
    }
    const em = this.em.fork();

    // Resolve target season by YEAR. UUIDs differ across environments so we
    // can't rely on the source's id; year is the stable identifier.
    const season = await em.findOne(Season, { year: data.season.year });
    if (!season) {
      throw new NotFoundException(
        `Cannot import: target environment has no season for year ${data.season.year}. ` +
        `Create the season first, then re-run the import.`,
      );
    }

    // ── Formats: upsert by name BEFORE classes ─────────────────────────
    // The classes table stores the format as a plain text string, but the
    // formats table holds the user-visible metadata (description, display
    // order, etc.). Without ensuring each referenced format row exists,
    // class dropdowns may render incomplete on the target environment.
    let formatsCreated = 0;
    let formatsUpdated = 0;
    const incomingFormats = data.formats ?? [];
    if (incomingFormats.length > 0) {
      const existingFormats = await em.find(CompetitionFormat, {
        name: { $in: incomingFormats.map(f => f.name) },
      });
      const existingByName = new Map(existingFormats.map(f => [f.name, f]));

      for (const incoming of incomingFormats) {
        if (!incoming.name) continue;
        const found = existingByName.get(incoming.name);
        if (found) {
          em.assign(found, {
            abbreviation: incoming.abbreviation ?? found.abbreviation,
            description: incoming.description ?? found.description,
            isActive: incoming.isActive ?? found.isActive,
            displayOrder: incoming.displayOrder ?? found.displayOrder,
            updatedAt: new Date(),
          });
          formatsUpdated++;
        } else {
          em.create(CompetitionFormat, {
            name: incoming.name,
            abbreviation: incoming.abbreviation,
            description: incoming.description,
            isActive: incoming.isActive ?? true,
            displayOrder: incoming.displayOrder ?? 0,
          } as any);
          formatsCreated++;
        }
      }
    }

    const existing = await em.find(CompetitionClass, { seasonId: season.id });
    const existingByKey = new Map(
      existing.map(c => [`${c.format}::${c.abbreviation.toLowerCase()}`, c]),
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const importedKeys = new Set<string>();

    for (const incoming of data.classes) {
      if (!incoming.format || !incoming.abbreviation || !incoming.name) {
        skipped++;
        continue;
      }
      const key = `${incoming.format}::${incoming.abbreviation.toLowerCase()}`;
      importedKeys.add(key);
      const found = existingByKey.get(key);
      if (found) {
        em.assign(found, {
          name: incoming.name,
          displayOrder: incoming.displayOrder ?? found.displayOrder,
          isActive: incoming.isActive ?? found.isActive,
          unlimitedWattage: incoming.unlimitedWattage ?? found.unlimitedWattage,
          updatedAt: new Date(),
        });
        updated++;
      } else {
        em.create(CompetitionClass, {
          name: incoming.name,
          abbreviation: incoming.abbreviation,
          format: incoming.format,
          season,
          isActive: incoming.isActive ?? true,
          displayOrder: incoming.displayOrder ?? 0,
          unlimitedWattage: incoming.unlimitedWattage ?? false,
        } as any);
        created++;
      }
    }

    let deactivated = 0;
    if (mode === 'replace') {
      // Deactivate (don't delete) any pre-existing active class that isn't
      // in the import. Soft-disable preserves historical references from
      // competition_results / event_classes / etc.
      for (const c of existing) {
        const key = `${c.format}::${c.abbreviation.toLowerCase()}`;
        if (!importedKeys.has(key) && c.isActive) {
          c.isActive = false;
          c.updatedAt = new Date();
          deactivated++;
        }
      }
    }

    await em.flush();

    return {
      seasonId: season.id,
      seasonYear: season.year,
      formatsCreated,
      formatsUpdated,
      created,
      updated,
      deactivated,
      skipped,
    };
  }
}
