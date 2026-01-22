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
  BadRequestException,
  Req
} from '@nestjs/common';
import { Request } from 'express';
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

  // Get result counts for all events in a single call (efficient bulk endpoint)
  @Get('counts-by-event')
  async getResultCountsByEvent(): Promise<Record<string, number>> {
    return this.competitionResultsService.getResultCountsByEvent();
  }

  @Get('by-event/:eventId')
  async getResultsByEvent(@Param('eventId') eventId: string): Promise<CompetitionResult[]> {
    return this.competitionResultsService.findByEvent(eventId);
  }

  @Post('counts-by-events')
  @HttpCode(HttpStatus.OK)
  async getResultCountsByEvents(
    @Body() body: { eventIds: string[] }
  ): Promise<Record<string, number>> {
    return this.competitionResultsService.getResultCountsByEventIds(body.eventIds || []);
  }

  @Get('by-meca-id/:mecaId')
  async getResultsByMecaId(@Param('mecaId') mecaId: string): Promise<CompetitionResult[]> {
    return this.competitionResultsService.findByMecaId(mecaId);
  }

  @Get(':id')
  async getResult(@Param('id') id: string): Promise<CompetitionResult> {
    return this.competitionResultsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createResult(@Body() data: Partial<CompetitionResult & { userId?: string; created_by?: string }>): Promise<CompetitionResult> {
    // Support both userId and created_by for audit logging
    const userId = data.userId || data.created_by;
    delete data.userId;
    return this.competitionResultsService.create(data, userId);
  }

  @Put(':id')
  async updateResult(
    @Param('id') id: string,
    @Body() data: Partial<CompetitionResult & { userId?: string }>,
    @Req() req: Request,
  ): Promise<CompetitionResult> {
    const userId = data.userId;
    delete data.userId;
    const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket?.remoteAddress || req.ip;
    return this.competitionResultsService.update(id, data, userId, ipAddress);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteResult(
    @Param('id') id: string,
    @Body() body?: { userId?: string; reason?: string },
    @Req() req?: Request,
  ): Promise<void> {
    const ipAddress = req?.headers['x-forwarded-for']?.toString().split(',')[0] || req?.socket?.remoteAddress || req?.ip;
    return this.competitionResultsService.delete(id, body?.userId, ipAddress, body?.reason);
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

  @Post('recalculate-season/:seasonId')
  @HttpCode(HttpStatus.OK)
  async recalculateSeasonPoints(
    @Param('seasonId') seasonId: string
  ): Promise<{ events_processed: number; results_updated: number; duration_ms: number }> {
    return this.competitionResultsService.recalculateSeasonPoints(seasonId);
  }

  @Post('recalculate-all-placements')
  @HttpCode(HttpStatus.OK)
  async recalculateAllPlacements(): Promise<{ message: string; processed: number; errors: number }> {
    const result = await this.competitionResultsService.recalculateAllPlacements();
    return {
      message: 'Placements recalculated successfully',
      processed: result.processed,
      errors: result.errors,
    };
  }

  @Post('link-competitors')
  @HttpCode(HttpStatus.OK)
  async linkCompetitors(): Promise<{ message: string; linked: number; alreadyLinked: number; noMatch: number }> {
    const result = await this.competitionResultsService.linkCompetitorsByMecaId();
    return {
      message: 'Competitors linked successfully',
      linked: result.linked,
      alreadyLinked: result.alreadyLinked,
      noMatch: result.noMatch,
    };
  }

  @Post('populate-state')
  @HttpCode(HttpStatus.OK)
  async populateState(): Promise<{ message: string; updated: number }> {
    const result = await this.competitionResultsService.populateStateFromProfiles();
    return {
      message: 'State codes populated successfully',
      updated: result.updated,
    };
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

  @Post('parse-and-validate/:eventId')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async parseAndValidate(
    @Param('eventId') eventId: string,
    @UploadedFile() file: Express.Multer.File
  ): Promise<{
    results: any[];
    totalCount: number;
    needsNameConfirmation: number;
    needsDataCompletion: number;
    fileExtension: string;
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Determine file type and parse accordingly
    let parsedResults;
    const fileExtension = file.originalname.toLowerCase().split('.').pop() || 'xlsx';

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      parsedResults = this.resultsImportService.parseExcelFile(file.buffer);
    } else if (fileExtension === 'tlab') {
      parsedResults = this.resultsImportService.parseTermLabFile(file.buffer);
    } else {
      throw new BadRequestException('Unsupported file type. Only .xlsx and .tlab files are supported');
    }

    // Parse and validate the results
    const validationResult = await this.competitionResultsService.parseAndValidate(
      eventId,
      parsedResults
    );

    return {
      ...validationResult,
      fileExtension,
    };
  }

  @Post('check-duplicates/:eventId')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async checkDuplicates(
    @Param('eventId') eventId: string,
    @UploadedFile() file: Express.Multer.File
  ): Promise<{
    duplicates: any[];
    nonDuplicates: number[];
    parsedResults: any[];
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
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

    // Check for duplicates
    const { duplicates, nonDuplicates } = await this.competitionResultsService.checkForDuplicates(
      eventId,
      parsedResults
    );

    return {
      duplicates,
      nonDuplicates,
      parsedResults,
    };
  }

  @Post('import-with-resolution/:eventId')
  @HttpCode(HttpStatus.OK)
  async importWithResolution(
    @Param('eventId') eventId: string,
    @Body() body: {
      parsedResults: any[];
      resolutions: Record<number, 'skip' | 'replace'>;
      createdBy: string;
      fileExtension: string;
    },
    @Req() req: Request
  ): Promise<{ message: string; imported: number; updated: number; skipped: number; errors: string[] }> {
    if (!body.parsedResults || !body.createdBy) {
      throw new BadRequestException('Missing required fields');
    }

    const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket?.remoteAddress || req.ip;

    return this.competitionResultsService.importResultsWithResolution(
      eventId,
      body.parsedResults,
      body.createdBy,
      body.fileExtension || 'xlsx',
      body.resolutions || {},
      undefined, // file already saved in check-duplicates step if needed
      ipAddress
    );
  }
}
