import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { UserRole } from '@newmeca/shared';
import type {
  CreateVotingSessionDto,
  UpdateVotingSessionDto,
  CreateVotingCategoryDto,
  UpdateVotingCategoryDto,
  CreateVotingQuestionDto,
  UpdateVotingQuestionDto,
  SubmitResponsesDto,
  CloneSessionDto,
} from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { FinalsVotingService } from './finals-voting.service';

@Controller('api/finals-voting')
export class FinalsVotingController {
  constructor(
    private readonly finalsVotingService: FinalsVotingService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // =========================================================================
  // AUTH HELPERS
  // =========================================================================

  private async getAuthenticatedUser(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    return { user, profile };
  }

  private async requireAdmin(authHeader?: string) {
    const { user, profile } = await this.getAuthenticatedUser(authHeader);
    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  private async requireAuthUser(authHeader?: string) {
    const { user, profile } = await this.getAuthenticatedUser(authHeader);
    if (!profile) {
      throw new UnauthorizedException('Profile not found');
    }
    return { user, profile };
  }

  // =========================================================================
  // ADMIN: Sessions
  // =========================================================================

  @Get('admin/sessions')
  async getAdminSessions(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.finalsVotingService.getAllSessions();
  }

  @Get('admin/sessions/:id')
  async getAdminSession(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.finalsVotingService.getSessionById(id);
  }

  @Post('admin/sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @Body() dto: CreateVotingSessionDto,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.finalsVotingService.createSession(dto);
  }

  @Put('admin/sessions/:id')
  async updateSession(
    @Param('id') id: string,
    @Body() dto: UpdateVotingSessionDto,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.finalsVotingService.updateSession(id, dto);
  }

  @Delete('admin/sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.finalsVotingService.deleteSession(id);
  }

  @Post('admin/sessions/:id/open')
  async openSession(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.finalsVotingService.openSession(id);
  }

  @Post('admin/sessions/:id/close')
  async closeSession(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.finalsVotingService.closeSession(id);
  }

  @Post('admin/sessions/:id/finalize')
  async finalizeSession(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.finalsVotingService.finalizeSession(id);
  }

  @Post('admin/sessions/:id/clone')
  @HttpCode(HttpStatus.CREATED)
  async cloneSession(
    @Param('id') sourceId: string,
    @Body() dto: CloneSessionDto,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    const newSession = await this.finalsVotingService.cloneSession(sourceId, dto);
    return this.finalsVotingService.getSessionById(newSession.id);
  }

  @Post('admin/sessions/:id/seed-template')
  async seedTemplate(
    @Param('id') sessionId: string,
    @Body() body: { template_name: string },
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.finalsVotingService.seedTemplate(sessionId, body.template_name);
    return this.finalsVotingService.getSessionById(sessionId);
  }

  @Get('admin/sessions/:id/results')
  async getAdminResults(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.finalsVotingService.getResults(id, true);
  }

  @Get('admin/sessions/:id/preview')
  async getSessionPreview(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.finalsVotingService.getSessionPreview(id);
  }

  // =========================================================================
  // ADMIN: Categories
  // =========================================================================

  @Post('admin/categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @Body() dto: CreateVotingCategoryDto,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.finalsVotingService.createCategory(dto);
  }

  @Put('admin/categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateVotingCategoryDto,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.finalsVotingService.updateCategory(id, dto);
  }

  @Delete('admin/categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.finalsVotingService.deleteCategory(id);
  }

  // =========================================================================
  // ADMIN: Questions
  // =========================================================================

  @Post('admin/questions')
  @HttpCode(HttpStatus.CREATED)
  async createQuestion(
    @Body() dto: CreateVotingQuestionDto,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.finalsVotingService.createQuestion(dto);
  }

  @Put('admin/questions/:id')
  async updateQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateVotingQuestionDto,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.finalsVotingService.updateQuestion(id, dto);
  }

  @Delete('admin/questions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuestion(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.finalsVotingService.deleteQuestion(id);
  }

  // =========================================================================
  // ENTITY SEARCH (Authenticated)
  // =========================================================================

  @Get('entity-search')
  async entitySearch(
    @Query('type') type: string,
    @Query('q') query: string,
    @Query('session_id') sessionId: string,
    @Query('limit') limit: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAuthUser(authHeader);
    return this.finalsVotingService.searchEntities(
      type,
      query || '',
      sessionId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // =========================================================================
  // MEMBER: Voting
  // =========================================================================

  @Get('sessions/active')
  async getActiveSession(@Headers('authorization') authHeader: string) {
    await this.requireAuthUser(authHeader);
    return this.finalsVotingService.getActiveSession();
  }

  @Post('sessions/:id/respond')
  @HttpCode(HttpStatus.CREATED)
  async submitResponses(
    @Param('id') sessionId: string,
    @Body() dto: SubmitResponsesDto,
    @Headers('authorization') authHeader: string,
  ) {
    const { user } = await this.requireAuthUser(authHeader);
    if (dto.session_id !== sessionId) {
      dto.session_id = sessionId;
    }
    return this.finalsVotingService.submitResponses(user.id, dto);
  }

  @Get('sessions/:id/my-responses')
  async getMyResponses(
    @Param('id') sessionId: string,
    @Headers('authorization') authHeader: string,
  ) {
    const { user } = await this.requireAuthUser(authHeader);
    return this.finalsVotingService.getMyResponses(user.id, sessionId);
  }

  // =========================================================================
  // PUBLIC
  // =========================================================================

  @Get('status')
  async getPublicStatus(@Headers('authorization') authHeader?: string) {
    let userId: string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { user } = await this.getAuthenticatedUser(authHeader);
        userId = user.id;
      } catch {
        // Not authenticated, that's fine for public endpoint
      }
    }
    return this.finalsVotingService.getPublicStatus(userId);
  }

  @Get('results/:id')
  async getPublicResults(@Param('id') sessionId: string) {
    return this.finalsVotingService.getResults(sessionId, false);
  }
}
