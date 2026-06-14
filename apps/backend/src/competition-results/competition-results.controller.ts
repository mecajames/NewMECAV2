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
  InternalServerErrorException,
  Logger,
  Req,
  Headers,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { EntityManager } from '@mikro-orm/core';
import { CompetitionResultsService } from './competition-results.service';
import { CompetitionResult } from './competition-results.entity';
import { ResultsImportService } from './results-import.service';
import { Public } from '../auth/public.decorator';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

@Controller('api/competition-results')
export class CompetitionResultsController {
  private readonly logger = new Logger(CompetitionResultsController.name);

  constructor(
    private readonly competitionResultsService: CompetitionResultsService,
    private readonly resultsImportService: ResultsImportService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Admin-only auth guard for the back-office maintenance endpoints
   * (backfill, recalculate, etc.). Decodes the Supabase JWT, looks up
   * the local profile, throws 401/403 if not an admin.
   */
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
  async getAllResults(): Promise<CompetitionResult[]> {
    return this.competitionResultsService.findAll();
  }

  // NOTE: intentionally NOT @Public — the Top 10 leaderboard is member-only
  // content. The global ActiveMembershipGuard restricts this to active members
  // (staff/admin/ED/judge exempt). The public standings page uses the separate
  // /api/standings/leaderboard endpoint.
  @Get('leaderboard')
  async getLeaderboard(
    @Query('seasonId') seasonId?: string,
    @Query('format') format?: string,
    @Query('class') competitionClass?: string,
    @Query('rankBy') rankBy?: 'points' | 'score',
    @Query('limit') limit?: number,
  ): Promise<any[]> {
    return this.competitionResultsService.getLeaderboard(seasonId, {
      format,
      competitionClass,
      rankBy: rankBy || 'points',
      limit: limit ? Number(limit) : 10,
    });
  }

  // Get result counts for all events in a single call (efficient bulk endpoint)
  @Public()
  @Get('counts-by-event')
  async getResultCountsByEvent(): Promise<Record<string, number>> {
    return this.competitionResultsService.getResultCountsByEvent();
  }

  // Admin revenue report: per-event entry-fee revenue (member vs non-member)
  // grouped by event director, with a season grand total.
  @Get('revenue-report')
  async getRevenueReport(
    @Headers('authorization') authHeader: string,
    @Query('seasonId') seasonId?: string,
  ): Promise<any> {
    await this.requireAdmin(authHeader);
    if (!seasonId) throw new BadRequestException('seasonId is required');
    return this.competitionResultsService.getRevenueReport(seasonId);
  }

  @Public()
  @Get('by-event/:eventId')
  async getResultsByEvent(@Param('eventId') eventId: string): Promise<CompetitionResult[]> {
    return this.competitionResultsService.findByEvent(eventId);
  }

  @Public()
  @Post('counts-by-events')
  @HttpCode(HttpStatus.OK)
  async getResultCountsByEvents(
    @Body() body: { eventIds: string[] }
  ): Promise<Record<string, number>> {
    return this.competitionResultsService.getResultCountsByEventIds(body.eventIds || []);
  }

  @Public()
  @Get('by-competitor/:competitorId')
  async getResultsByCompetitor(@Param('competitorId') competitorId: string): Promise<any[]> {
    return this.competitionResultsService.findByCompetitorWithEvent(competitorId);
  }

  // MEMBER-ONLY: powers the individual competitor stats page
  // (/results/member/:mecaId), which is member-only content. No @Public — the
  // global ActiveMembershipGuard restricts to active members (admin/staff exempt).
  @Get('by-meca-id/:mecaId')
  async getResultsByMecaId(@Param('mecaId') mecaId: string): Promise<CompetitionResult[]> {
    return this.competitionResultsService.findByMecaId(mecaId);
  }

  @Public()
  @Get(':id')
  async getResult(@Param('id') id: string): Promise<CompetitionResult> {
    return this.competitionResultsService.findById(id);
  }

  // Whitelist of fields allowed for create/update to prevent mass assignment
  private static readonly ALLOWED_RESULT_FIELDS = new Set([
    'event_id', 'competitor_id', 'competitor_name', 'meca_id', 'state_code',
    'competition_class', 'format', 'score', 'placement', 'points_earned',
    'vehicle_info', 'wattage', 'frequency', 'notes', 'season_id', 'class_id',
    'created_by', 'modification_reason',
  ]);

  private sanitizeResultData(data: Record<string, any>): Partial<CompetitionResult> {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (CompetitionResultsController.ALLOWED_RESULT_FIELDS.has(key)) {
        sanitized[key] = data[key];
      }
    }
    return sanitized as Partial<CompetitionResult>;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createResult(@Body() data: Partial<CompetitionResult & { userId?: string; created_by?: string }>): Promise<CompetitionResult> {
    // Support both userId and created_by for audit logging
    const userId = data.userId || data.created_by;
    const sanitized = this.sanitizeResultData(data as Record<string, any>);
    return this.competitionResultsService.create(sanitized, userId);
  }

  @Put(':id')
  async updateResult(
    @Param('id') id: string,
    @Body() data: Partial<CompetitionResult & { userId?: string }>,
    @Req() req: Request,
  ): Promise<CompetitionResult> {
    const userId = data.userId;
    const sanitized = this.sanitizeResultData(data as Record<string, any>);
    const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket?.remoteAddress || req.ip;
    return this.competitionResultsService.update(id, sanitized, userId, ipAddress);
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
    try {
      await this.competitionResultsService.updateEventPoints(eventId);
      return { message: 'Points recalculated successfully' };
    } catch (error: any) {
      this.logger.error(`Failed to recalculate points for event ${eventId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to recalculate points: ${error.message}`);
    }
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

  /**
   * Admin: suggested duplicate-class groups for a season (read-only). Used by
   * the Classes Management "Find Duplicates" tool.
   */
  @Get('admin/duplicate-classes')
  async getDuplicateClasses(
    @Headers('authorization') authHeader: string,
    @Query('seasonId') seasonId: string,
  ): Promise<any> {
    await this.requireAdmin(authHeader);
    if (!seasonId) throw new BadRequestException('seasonId is required');
    return this.competitionResultsService.getDuplicateClassSuggestions(seasonId);
  }

  /**
   * Admin: merge duplicate classes (same season) into one canonical class —
   * moves results, repoints import mappings, deletes the duplicates, and
   * recalculates the season. Returns a report incl. any (event,member)
   * collisions for manual review.
   */
  @Post('admin/merge-classes')
  @HttpCode(HttpStatus.OK)
  async mergeClasses(
    @Headers('authorization') authHeader: string,
    @Body() body: { canonicalClassId?: string; duplicateClassIds?: string[] },
  ): Promise<any> {
    await this.requireAdmin(authHeader);
    const canonicalClassId = (body?.canonicalClassId || '').trim();
    const duplicateClassIds = Array.isArray(body?.duplicateClassIds) ? body.duplicateClassIds : [];
    if (!canonicalClassId) throw new BadRequestException('canonicalClassId is required');
    if (duplicateClassIds.length === 0) throw new BadRequestException('At least one duplicate class is required');
    return this.competitionResultsService.mergeClasses(canonicalClassId, duplicateClassIds, 'admin');
  }

  /**
   * Admin: mark a set of classes as "not duplicates" so the duplicate scan
   * stops suggesting them (e.g. SQ2 vs SQ2+).
   */
  @Post('admin/ignore-duplicate-classes')
  @HttpCode(HttpStatus.OK)
  async ignoreDuplicateClasses(
    @Headers('authorization') authHeader: string,
    @Body() body: { classIds?: string[] },
  ): Promise<any> {
    await this.requireAdmin(authHeader);
    const classIds = Array.isArray(body?.classIds) ? body.classIds : [];
    if (classIds.length < 2) throw new BadRequestException('At least two class ids are required');
    return this.competitionResultsService.ignoreDuplicateGroup(classIds);
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

  /**
   * One-shot backfill that walks every CompetitionResult with a
   * class_id set, looks up the class entity, and corrects the
   * result.format / result.competition_class text fields if they
   * don't match the class's own values. Cleans up the legacy data
   * where some rows were silently saved with format='SPL' by the
   * old "default to SPL if missing" code path.
   *
   * Idempotent — re-running is a no-op for rows already in sync.
   */
  @Post('admin/backfill-format-from-class')
  @HttpCode(HttpStatus.OK)
  async backfillFormatFromClass(
    @Headers('authorization') authHeader: string,
  ): Promise<{
    scanned: number;
    formatFixed: number;
    classNameFixed: number;
    skippedNoClass: number;
  }> {
    await this.requireAdmin(authHeader);
    return this.competitionResultsService.backfillFormatFromClass();
  }

  /**
   * Admin-only — lists every result whose class_id is missing or
   * points at a class that no longer exists / is inactive, AND can't
   * be resolved by the same text-fallback (competition_class + format)
   * the public pages use. These rows still exist in the DB but are
   * hidden from public results until an admin links them to a class.
   */
  @Get('admin/orphan-results')
  async getOrphanResults(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.competitionResultsService.findOrphanResults();
  }

  /**
   * Admin-only — repoint one or more results to a specific class.
   * Used by the orphan-review page: admin sees an unresolvable
   * result, picks the correct class, this endpoint updates the
   * class_id (and via create()/update() the format + competition_class
   * text are auto-derived from the class).
   */
  @Post('admin/repoint-to-class')
  @HttpCode(HttpStatus.OK)
  async repointToClass(
    @Headers('authorization') authHeader: string,
    @Body() body: { resultIds: string[]; classId: string },
  ): Promise<{ updated: number }> {
    await this.requireAdmin(authHeader);
    return this.competitionResultsService.repointResultsToClass(body.resultIds, body.classId);
  }

  /**
   * Admin-only — the dedicated "Pending Results" queue: results an Event
   * Director submitted whose class didn't match the system and that were
   * sent for review. EDs can never create classes, so this is where an
   * admin resolves each one.
   */
  @Get('admin/pending-class-review')
  async getPendingClassReview(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.competitionResultsService.findPendingClassReview();
  }

  /**
   * Admin-only — assign pending result(s) to an EXISTING class. Clears the
   * pending flag and recalculates points for the affected events.
   */
  @Post('admin/pending/assign')
  @HttpCode(HttpStatus.OK)
  async assignPendingToClass(
    @Headers('authorization') authHeader: string,
    @Body() body: { resultIds: string[]; classId: string },
  ): Promise<{ updated: number }> {
    await this.requireAdmin(authHeader);
    if (!body?.resultIds?.length || !body?.classId) {
      throw new BadRequestException('resultIds and classId are required.');
    }
    return this.competitionResultsService.resolvePendingResult(body.resultIds, body.classId);
  }

  /**
   * Admin-only — create a NEW class and accept the pending result(s) into it.
   * This is the only path by which an ED-entered unknown class becomes a real
   * class, and it's gated to admins.
   */
  @Post('admin/pending/create-class-and-accept')
  @HttpCode(HttpStatus.OK)
  async createClassAndAcceptPending(
    @Headers('authorization') authHeader: string,
    @Body() body: { resultIds: string[]; name: string; abbreviation?: string; format: string; seasonId: string },
  ): Promise<{ classId: string; updated: number }> {
    await this.requireAdmin(authHeader);
    if (!body?.resultIds?.length || !body?.name || !body?.format || !body?.seasonId) {
      throw new BadRequestException('resultIds, name, format and seasonId are required.');
    }
    return this.competitionResultsService.createClassAndAcceptPending(body);
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
