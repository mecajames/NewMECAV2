import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UnauthorizedException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { StatesService, CreateStateFinalsDateDto, UpdateStateFinalsDateDto } from './states.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';

@Controller('api/states')
export class StatesController {
  constructor(
    private readonly statesService: StatesService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string) {
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
    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  // ============================================
  // STATE ENDPOINTS (Public)
  // ============================================

  /**
   * Get all states
   */
  @Get()
  async getAllStates(@Query('type') type?: 'domestic' | 'international') {
    if (type === 'domestic') {
      return this.statesService.getDomesticStates();
    }
    if (type === 'international') {
      return this.statesService.getInternationalStates();
    }
    return this.statesService.getAllStates();
  }

  /**
   * Search states by name or abbreviation
   */
  @Get('search')
  async searchStates(@Query('q') query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.statesService.searchStates(query);
  }

  /**
   * Get state by abbreviation
   */
  @Get(':abbreviation')
  async getStateByAbbreviation(@Param('abbreviation') abbreviation: string) {
    return this.statesService.getStateByAbbreviation(abbreviation);
  }

  // ============================================
  // STATE FINALS DATE ENDPOINTS
  // ============================================

  /**
   * Get state finals dates for a season (public)
   */
  @Get('finals-dates/season/:seasonId')
  async getStateFinalsDatesBySeason(@Param('seasonId') seasonId: string) {
    return this.statesService.getStateFinalsDatesBySeasonId(seasonId);
  }

  /**
   * Get state finals date for a specific state and season (public)
   */
  @Get('finals-dates/:stateCode/:seasonId')
  async getStateFinalsDateByState(
    @Param('stateCode') stateCode: string,
    @Param('seasonId') seasonId: string,
  ) {
    return this.statesService.getStateFinalsDateByState(stateCode, seasonId);
  }

  /**
   * Create a state finals date (admin only)
   */
  @Post('finals-dates')
  @HttpCode(HttpStatus.CREATED)
  async createStateFinalsDate(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateStateFinalsDateDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.statesService.createStateFinalsDate(data);
  }

  /**
   * Update a state finals date (admin only)
   */
  @Put('finals-dates/:id')
  async updateStateFinalsDate(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: UpdateStateFinalsDateDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.statesService.updateStateFinalsDate(id, data);
  }

  /**
   * Delete a state finals date (admin only)
   */
  @Delete('finals-dates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStateFinalsDate(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.statesService.deleteStateFinalsDate(id);
  }
}
