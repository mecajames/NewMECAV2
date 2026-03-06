import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { SplWorldRecordsService } from './spl-world-records.service';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';

@Controller('api/spl-world-records')
export class SplWorldRecordsController {
  constructor(
    private readonly splWorldRecordsService: SplWorldRecordsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

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

  @Get()
  async getAll() {
    return this.splWorldRecordsService.findAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.splWorldRecordsService.findById(id);
  }

  @Get('history/:classId')
  async getHistory(@Param('classId') classId: string) {
    return this.splWorldRecordsService.findHistoryByClassId(classId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrUpdate(
    @Body() body: any,
    @Headers('authorization') authHeader?: string,
  ) {
    const { user } = await this.requireAdminOrEventDirector(authHeader);

    // Map snake_case API input to camelCase entity fields
    const data: any = {
      classId: body.class_id,
      className: body.class_name,
      eventId: body.event_id || null,
      eventName: body.event_name || null,
      seasonId: body.season_id || null,
      competitorName: body.competitor_name,
      mecaId: body.meca_id || null,
      competitorId: body.competitor_id || null,
      score: body.score,
      wattage: body.wattage || null,
      frequency: body.frequency || null,
      notes: body.notes || null,
      recordDate: body.record_date ? new Date(body.record_date) : null,
    };

    return this.splWorldRecordsService.upsert(data, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    await this.requireAdminOrEventDirector(authHeader);
    return this.splWorldRecordsService.delete(id);
  }
}
