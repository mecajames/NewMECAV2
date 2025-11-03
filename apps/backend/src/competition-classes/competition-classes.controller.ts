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
  HttpStatus
} from '@nestjs/common';
import { CompetitionClassesService } from './competition-classes.service';
import { CompetitionClass } from './competition-classes.entity';

@Controller('api/competition-classes')
export class CompetitionClassesController {
  constructor(private readonly competitionClassesService: CompetitionClassesService) {}

  @Get()
  async getAllClasses(): Promise<CompetitionClass[]> {
    return this.competitionClassesService.findAll();
  }

  @Get('active')
  async getActiveClasses(): Promise<CompetitionClass[]> {
    return this.competitionClassesService.findActiveClasses();
  }

  @Get('season/:seasonId')
  async getClassesBySeason(@Param('seasonId') seasonId: string): Promise<CompetitionClass[]> {
    return this.competitionClassesService.findBySeason(seasonId);
  }

  @Get('format/:format')
  async getClassesByFormat(@Param('format') format: string): Promise<CompetitionClass[]> {
    return this.competitionClassesService.findByFormat(format);
  }

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
}
