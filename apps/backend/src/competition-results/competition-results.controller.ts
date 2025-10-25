import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { CompetitionResultsService } from './competition-results.service';
import { CompetitionResult } from './competition-results.entity';

@Controller('api/competition-results')
export class CompetitionResultsController {
  constructor(private readonly competitionResultsService: CompetitionResultsService) {}

  @Get('event/:eventId')
  async getResultsByEvent(@Param('eventId') eventId: string) {
    return this.competitionResultsService.findByEvent(eventId);
  }

  @Get('event/:eventId/leaderboard')
  async getEventLeaderboard(@Param('eventId') eventId: string) {
    return this.competitionResultsService.getLeaderboard(eventId);
  }

  @Get('event/:eventId/category/:category')
  async getResultsByCategory(
    @Param('eventId') eventId: string,
    @Param('category') category: string,
  ) {
    return this.competitionResultsService.findByCategory(eventId, category);
  }

  @Get('competitor/:competitorId')
  async getResultsByCompetitor(@Param('competitorId') competitorId: string) {
    return this.competitionResultsService.findByCompetitor(competitorId);
  }

  @Get(':id')
  async getResult(@Param('id') id: string) {
    const result = await this.competitionResultsService.findById(id);

    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }

    return result;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createResult(@Body() data: Partial<CompetitionResult>) {
    return this.competitionResultsService.create(data);
  }

  @Put(':id')
  async updateResult(
    @Param('id') id: string,
    @Body() data: Partial<CompetitionResult>,
  ) {
    return this.competitionResultsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteResult(@Param('id') id: string) {
    await this.competitionResultsService.delete(id);
  }
}
