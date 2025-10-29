import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CompetitionClass } from './class.entity';

@Controller('api/classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  /**
   * GET /api/classes
   * Get all competition classes, optionally filtered by season and/or format
   */
  @Get()
  async getAll(
    @Query('seasonId') seasonId?: string,
    @Query('format') format?: string,
  ): Promise<CompetitionClass[]> {
    return this.classesService.findAll(seasonId, format);
  }

  /**
   * GET /api/classes/:id
   * Get a single competition class by ID
   */
  @Get(':id')
  async getOne(@Param('id') id: string): Promise<CompetitionClass | null> {
    return this.classesService.findOne(id);
  }

  /**
   * POST /api/classes
   * Create a new competition class
   */
  @Post()
  async create(@Body() data: Partial<CompetitionClass>): Promise<CompetitionClass> {
    return this.classesService.create(data);
  }

  /**
   * PUT /api/classes/:id
   * Update an existing competition class
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<CompetitionClass>,
  ): Promise<CompetitionClass> {
    return this.classesService.update(id, data);
  }

  /**
   * DELETE /api/classes/:id
   * Delete a competition class
   */
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.classesService.remove(id);
    return { message: 'Class deleted successfully' };
  }

  /**
   * POST /api/classes/copy
   * Copy classes from one season to another
   * Body: { sourceSeasonId, destSeasonId, format? }
   */
  @Post('copy')
  async copy(
    @Body() body: { sourceSeasonId: string; destSeasonId: string; format?: string },
  ): Promise<{ count: number; classes: CompetitionClass[] }> {
    const classes = await this.classesService.copyClassesBetweenSeasons(
      body.sourceSeasonId,
      body.destSeasonId,
      body.format,
    );
    return {
      count: classes.length,
      classes,
    };
  }
}
