import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { CompetitionClassesService } from './competition-classes.service';
import { CompetitionClass } from './competition-classes.entity';
import { Public } from '../auth/public.decorator';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

@Controller('api/competition-classes')
export class CompetitionClassesController {
  constructor(
    private readonly competitionClassesService: CompetitionClassesService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  private async requireAdmin(authHeader?: string): Promise<void> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid authorization token');
    const profile = await this.em.fork().findOne(Profile, { id: user.id });
    if (!isAdminUser(profile)) throw new ForbiddenException('Admin access required');
  }

  @Public()
  @Get()
  async getAllClasses(): Promise<CompetitionClass[]> {
    return this.competitionClassesService.findAll();
  }

  @Get('active')
  async getActiveClasses(): Promise<CompetitionClass[]> {
    return this.competitionClassesService.findActiveClasses();
  }

  @Public()
  @Get('season/:seasonId')
  async getClassesBySeason(@Param('seasonId') seasonId: string): Promise<CompetitionClass[]> {
    return this.competitionClassesService.findBySeason(seasonId);
  }

  @Public()
  @Get('format/:format')
  async getClassesByFormat(@Param('format') format: string): Promise<CompetitionClass[]> {
    return this.competitionClassesService.findByFormat(format);
  }

  @Public()
  @Get(':id')
  async getClass(@Param('id') id: string): Promise<CompetitionClass> {
    return this.competitionClassesService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createClass(@Body() data: Partial<CompetitionClass>): Promise<CompetitionClass> {
    return this.competitionClassesService.create(data);
  }

  @Put(':id')
  async updateClass(
    @Param('id') id: string,
    @Body() data: Partial<CompetitionClass>,
  ): Promise<CompetitionClass> {
    return this.competitionClassesService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClass(@Param('id') id: string): Promise<void> {
    return this.competitionClassesService.delete(id);
  }

  @Post('copy-between-seasons')
  @HttpCode(HttpStatus.CREATED)
  async copyBetweenSeasons(
    @Body() data: { fromSeasonId: string; toSeasonId: string; format?: string },
  ): Promise<{ copied: number; classes: CompetitionClass[] }> {
    return this.competitionClassesService.copyBetweenSeasons(
      data.fromSeasonId,
      data.toSeasonId,
      data.format,
    );
  }

  /**
   * Admin export — returns a JSON document admins can download from one
   * environment and POST to another via /admin/import. Keyed by season
   * year (not UUID) so it works across stage / production.
   */
  @Get('admin/export')
  async exportSeason(
    @Headers('authorization') authHeader: string,
    @Query('seasonId') seasonId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.competitionClassesService.exportSeason(seasonId);
  }

  /**
   * Admin import — accepts the JSON document produced by /admin/export.
   * Defaults to merge (upsert by format+abbreviation, leave others alone);
   * pass mode=replace to also deactivate any local class not in the import.
   */
  @Post('admin/import')
  @HttpCode(HttpStatus.OK)
  async importSeason(
    @Headers('authorization') authHeader: string,
    @Body() body: {
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
      mode?: 'merge' | 'replace';
    },
  ) {
    await this.requireAdmin(authHeader);
    return this.competitionClassesService.importSeason(
      { season: body.season, formats: body.formats, classes: body.classes },
      body.mode ?? 'merge',
    );
  }
}
