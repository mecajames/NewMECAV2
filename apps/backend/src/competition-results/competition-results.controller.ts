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
import { CompetitionResultsService } from './competition-results.service';
import { CompetitionResult } from './competition-results.entity';

@Controller('api/competition-results')
export class CompetitionResultsController {
  constructor(private readonly competitionResultsService: CompetitionResultsService) {}

  @Get()
  async getAllResults(): Promise<CompetitionResult[]> {
    return this.competitionResultsService.findAll();
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('seasonId') seasonId?: string): Promise<any[]> {
    return this.competitionResultsService.getLeaderboard(seasonId);
  }

  @Get('by-event/:eventId')
  async getResultsByEvent(@Param('eventId') eventId: string): Promise<CompetitionResult[]> {
    return this.competitionResultsService.findByEvent(eventId);
  }

  @Get(':id')
  async getResult(@Param('id') id: string): Promise<CompetitionResult> {
    return this.competitionResultsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createResult(@Body() data: Partial<CompetitionResult>): Promise<CompetitionResult> {
    return this.competitionResultsService.create(data);
  }

  @Put(':id')
  async updateResult(
    @Param('id') id: string,
    @Body() data: Partial<CompetitionResult>,
  ): Promise<CompetitionResult> {
    return this.competitionResultsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteResult(@Param('id') id: string): Promise<void> {
    return this.competitionResultsService.delete(id);
  }

  @Post('recalculate-points/:eventId')
  @HttpCode(HttpStatus.OK)
  async recalculateEventPoints(@Param('eventId') eventId: string): Promise<{ message: string }> {
    await this.competitionResultsService.updateEventPoints(eventId);
    return { message: 'Points recalculated successfully' };
  }
}
