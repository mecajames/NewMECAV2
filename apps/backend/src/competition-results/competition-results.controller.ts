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
  UploadedFile,
  UseInterceptors,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompetitionResultsService } from './competition-results.service';
import { CompetitionResult } from './competition-results.entity';
import { ResultsImportService } from './results-import.service';

@Controller('api/competition-results')
export class CompetitionResultsController {
  constructor(
    private readonly competitionResultsService: CompetitionResultsService,
    private readonly resultsImportService: ResultsImportService
  ) {}

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
  async createResult(@Body() data: Partial<CompetitionResult & { userId?: string }>): Promise<CompetitionResult> {
    const userId = data.userId;
    delete data.userId;
    return this.competitionResultsService.create(data, userId);
  }

  @Put(':id')
  async updateResult(
    @Param('id') id: string,
    @Body() data: Partial<CompetitionResult & { userId?: string }>,
  ): Promise<CompetitionResult> {
    const userId = data.userId;
    delete data.userId;
    return this.competitionResultsService.update(id, data, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteResult(
    @Param('id') id: string,
    @Body() body?: { userId?: string }
  ): Promise<void> {
    return this.competitionResultsService.delete(id, body?.userId);
  }

  @Post('session/start')
  @HttpCode(HttpStatus.OK)
  async startManualSession(
    @Body() body: { eventId: string; userId: string; format?: string }
  ): Promise<{ sessionId: string }> {
    const sessionId = await this.competitionResultsService.startManualSession(
      body.eventId,
      body.userId,
      body.format
    );
    return { sessionId };
  }

  @Post('session/end')
  @HttpCode(HttpStatus.OK)
  async endManualSession(): Promise<{ message: string }> {
    await this.competitionResultsService.endManualSession();
    return { message: 'Session ended successfully' };
  }

  @Post('recalculate-points/:eventId')
  @HttpCode(HttpStatus.OK)
  async recalculateEventPoints(@Param('eventId') eventId: string): Promise<{ message: string }> {
    await this.competitionResultsService.updateEventPoints(eventId);
    return { message: 'Points recalculated successfully' };
  }

  @Post('import/:eventId')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async importResults(
    @Param('eventId') eventId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('createdBy') createdBy: string
  ): Promise<{ message: string; imported: number; errors: string[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!createdBy) {
      throw new BadRequestException('Created by user ID is required');
    }

    // Determine file type and parse accordingly
    let parsedResults;
    const fileExtension = file.originalname.toLowerCase().split('.').pop();

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      parsedResults = this.resultsImportService.parseExcelFile(file.buffer);
    } else if (fileExtension === 'tlab') {
      parsedResults = this.resultsImportService.parseTermLabFile(file.buffer);
    } else {
      throw new BadRequestException('Unsupported file type. Only .xlsx and .tlab files are supported');
    }

    // Import the parsed results using the service method
    return this.competitionResultsService.importResults(
      eventId,
      parsedResults,
      createdBy,
      fileExtension,
      file
    );
  }
}
