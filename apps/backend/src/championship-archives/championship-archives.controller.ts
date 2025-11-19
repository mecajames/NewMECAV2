import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ChampionshipArchivesService } from './championship-archives.service';
import { ChampionshipArchive } from './championship-archives.entity';
import { ChampionshipAward } from './championship-awards.entity';

@Controller('api/championship-archives')
export class ChampionshipArchivesController {
  constructor(private readonly archivesService: ChampionshipArchivesService) {}

  /**
   * Get all archives (public - only published unless includeUnpublished=true)
   */
  @Get()
  async listArchives(
    @Query('includeUnpublished') includeUnpublished?: string,
  ): Promise<ChampionshipArchive[]> {
    if (includeUnpublished === 'true') {
      return this.archivesService.findAll();
    }
    return this.archivesService.findAllPublished();
  }

  /**
   * Get archive by year
   */
  @Get('year/:year')
  async getArchiveByYear(
    @Param('year') year: number,
    @Query('includeUnpublished') includeUnpublished?: string,
  ): Promise<ChampionshipArchive> {
    const archive = await this.archivesService.findByYear(
      Number(year),
      includeUnpublished === 'true',
    );

    if (!archive) {
      throw new NotFoundException(`Archive for year ${year} not found`);
    }

    return archive;
  }

  /**
   * Get archive by ID
   */
  @Get(':id')
  async getArchive(@Param('id') id: string): Promise<ChampionshipArchive> {
    return this.archivesService.findById(id);
  }

  /**
   * Get competition results for a year
   */
  @Get('year/:year/results')
  async getResultsForYear(@Param('year') year: number): Promise<any> {
    return this.archivesService.getResultsForYear(Number(year));
  }

  /**
   * Get state champions for a year
   */
  @Get('year/:year/state-champions')
  async getStateChampionsForYear(@Param('year') year: number): Promise<any> {
    return this.archivesService.getStateChampionsForYear(Number(year));
  }

  /**
   * Create new archive (admin)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createArchive(@Body() data: Partial<ChampionshipArchive>): Promise<ChampionshipArchive> {
    return this.archivesService.create(data);
  }

  /**
   * Update archive (admin)
   */
  @Put(':id')
  async updateArchive(
    @Param('id') id: string,
    @Body() data: Partial<ChampionshipArchive>,
  ): Promise<ChampionshipArchive> {
    return this.archivesService.update(id, data);
  }

  /**
   * Publish/unpublish archive (admin)
   */
  @Put(':id/publish')
  async setPublished(
    @Param('id') id: string,
    @Body('published') published: boolean,
  ): Promise<ChampionshipArchive> {
    return this.archivesService.setPublished(id, published);
  }

  /**
   * Delete archive (admin)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteArchive(@Param('id') id: string): Promise<void> {
    return this.archivesService.delete(id);
  }

  // ===== AWARDS ENDPOINTS =====

  /**
   * Get all awards for an archive
   */
  @Get(':archiveId/awards')
  async getAwards(
    @Param('archiveId') archiveId: string,
    @Query('section') section?: string,
  ): Promise<ChampionshipAward[]> {
    return this.archivesService.getAwards(archiveId, section as any);
  }

  /**
   * Create award (admin)
   */
  @Post(':archiveId/awards')
  @HttpCode(HttpStatus.CREATED)
  async createAward(
    @Param('archiveId') archiveId: string,
    @Body() data: Partial<ChampionshipAward>,
  ): Promise<ChampionshipAward> {
    return this.archivesService.createAward(archiveId, data);
  }

  /**
   * Update award (admin)
   */
  @Put(':archiveId/awards/:awardId')
  async updateAward(
    @Param('archiveId') archiveId: string,
    @Param('awardId') awardId: string,
    @Body() data: Partial<ChampionshipAward>,
  ): Promise<ChampionshipAward> {
    return this.archivesService.updateAward(archiveId, awardId, data);
  }

  /**
   * Delete award (admin)
   */
  @Delete(':archiveId/awards/:awardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAward(
    @Param('archiveId') archiveId: string,
    @Param('awardId') awardId: string,
  ): Promise<void> {
    return this.archivesService.deleteAward(archiveId, awardId);
  }
}
