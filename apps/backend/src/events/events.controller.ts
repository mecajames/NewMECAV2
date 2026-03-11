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
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { EventsService } from './events.service';
import { Event } from './events.entity';
import { Profile } from '../profiles/profiles.entity';
import { UserRole, MultiDayResultsMode } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Public } from '../auth/public.decorator';

@Controller('api/events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to require admin or event director authentication
  private async requireAdminOrEventDirector(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }

    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });

    if (profile?.role !== UserRole.ADMIN && profile?.role !== UserRole.EVENT_DIRECTOR) {
      throw new ForbiddenException('Admin or Event Director access required');
    }

    return { user, profile };
  }

  @Public()
  @Get()
  async listEvents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('season_id') seasonId?: string,
  ): Promise<Event[]> {
    if (seasonId) {
      return this.eventsService.findBySeason(seasonId, page, limit);
    }
    return this.eventsService.findAll(page, limit);
  }

  @Get('stats')
  async getStats(): Promise<{ totalEvents: number }> {
    return this.eventsService.getStats();
  }

  @Public()
  @Get('upcoming')
  async getUpcomingEvents(): Promise<Event[]> {
    return this.eventsService.findUpcoming();
  }

  @Public()
  @Get('public')
  async getPublicEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('season_id') seasonId?: string,
    @Query('status') status?: string,
  ): Promise<{ events: Event[]; total: number; page: number; limit: number }> {
    return this.eventsService.findPublicEvents({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      seasonId,
      status,
    });
  }

  @Public()
  @Get('completed-with-results')
  async getCompletedEventsWithResults(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('season_id') seasonId?: string,
  ): Promise<{ events: any[]; total: number }> {
    return this.eventsService.findCompletedWithResultCounts({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      seasonId,
    });
  }

  @Get('by-director/:directorId')
  async getEventsByDirector(@Param('directorId') directorId: string): Promise<Event[]> {
    return this.eventsService.findByDirector(directorId);
  }

  @Get('multi-day-group/:groupId')
  async getEventsByMultiDayGroup(@Param('groupId') groupId: string): Promise<Event[]> {
    return this.eventsService.findByMultiDayGroup(groupId);
  }

  // --- Admin Geocode Backfill (must be before :id routes) ---

  @Get('admin/backfill-geocode/count')
  async getBackfillGeocodeCount(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{ count: number }> {
    const { profile } = await this.requireAdminOrEventDirector(authHeader);
    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    const count = await this.eventsService.countEventsNeedingGeocode(startDate, endDate);
    return { count };
  }

  @Post('admin/backfill-geocode')
  async startBackfillGeocode(
    @Headers('authorization') authHeader: string,
    @Body() body: { startDate?: string; endDate?: string },
  ): Promise<{ jobId: string; total: number }> {
    const { profile } = await this.requireAdminOrEventDirector(authHeader);
    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return this.eventsService.startBackfillGeocode(body.startDate, body.endDate);
  }

  @Get('admin/backfill-geocode/:jobId')
  async getBackfillProgress(
    @Headers('authorization') authHeader: string,
    @Param('jobId') jobId: string,
  ) {
    const { profile } = await this.requireAdminOrEventDirector(authHeader);
    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    const progress = this.eventsService.getBackfillProgress(jobId);
    if (!progress) {
      return { error: 'Job not found' };
    }
    return progress;
  }

  // --- Wildcard :id routes (must be after specific routes) ---

  @Public()
  @Get(':id')
  async getEvent(@Param('id') id: string): Promise<Event> {
    return this.eventsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEvent(
    @Headers('authorization') authHeader: string,
    @Body() data: Partial<Event>,
  ): Promise<Event> {
    await this.requireAdminOrEventDirector(authHeader);
    return this.eventsService.create(data);
  }

  @Post('multi-day')
  @HttpCode(HttpStatus.CREATED)
  async createMultiDayEvent(
    @Headers('authorization') authHeader: string,
    @Body() body: {
      data: Partial<Event>;
      numberOfDays: number;
      dayDates: string[];
      dayMultipliers?: number[];
      multiDayResultsMode?: MultiDayResultsMode;
    },
  ): Promise<Event[]> {
    await this.requireAdminOrEventDirector(authHeader);
    return this.eventsService.createMultiDay(
      body.data,
      body.numberOfDays,
      body.dayDates,
      body.dayMultipliers,
      body.multiDayResultsMode
    );
  }

  @Put(':id')
  async updateEvent(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: Partial<Event>,
  ): Promise<Event> {
    await this.requireAdminOrEventDirector(authHeader);
    return this.eventsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.requireAdminOrEventDirector(authHeader);
    return this.eventsService.delete(id);
  }

  @Post(':id/send-rating-emails')
  async sendRatingEmails(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    await this.requireAdminOrEventDirector(authHeader);
    return this.eventsService.sendRatingRequestEmails(id);
  }
}
