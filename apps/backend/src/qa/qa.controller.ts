import {
  Controller, Get, Post, Put, Delete, Body, Param, Headers, Inject,
  UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { UserRole, QaResponseStatus, QaFixStatus } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import { QaService } from './qa.service';

@Controller('api/qa')
export class QaController {
  constructor(
    private readonly qaService: QaService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // ── Auth Helpers ──

  private async getAuthenticatedUser(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid or expired token');
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    return { user, profile };
  }

  private async requireAdmin(authHeader?: string) {
    const { user, profile } = await this.getAuthenticatedUser(authHeader);
    if (!isAdminUser(profile)) throw new ForbiddenException('Admin access required');
    return { user, profile: profile! };
  }

  // ── Rounds ──

  @Get('dashboard')
  async getDashboard(@Headers('authorization') authHeader?: string) {
    await this.requireAdmin(authHeader);
    return this.qaService.getDashboard();
  }

  @Get('rounds')
  async listRounds(@Headers('authorization') authHeader?: string) {
    await this.requireAdmin(authHeader);
    return this.qaService.listRounds();
  }

  @Post('rounds')
  async createRound(
    @Headers('authorization') authHeader: string,
    @Body() body: { title: string; description?: string },
  ) {
    const { profile } = await this.requireAdmin(authHeader);
    return this.qaService.createRound(body.title, body.description, profile.id);
  }

  @Post('rounds/from-previous/:id')
  async createRoundFromPrevious(
    @Headers('authorization') authHeader: string,
    @Param('id') previousRoundId: string,
    @Body() body: { title: string },
  ) {
    const { profile } = await this.requireAdmin(authHeader);
    return this.qaService.createRoundFromPrevious(previousRoundId, body.title, profile.id);
  }

  @Get('rounds/:id')
  async getRound(
    @Headers('authorization') authHeader: string,
    @Param('id') roundId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.qaService.getRound(roundId);
  }

  @Post('rounds/:id/activate')
  async activateRound(
    @Headers('authorization') authHeader: string,
    @Param('id') roundId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.qaService.activateRound(roundId);
  }

  @Post('rounds/:id/complete')
  async completeRound(
    @Headers('authorization') authHeader: string,
    @Param('id') roundId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.qaService.completeRound(roundId);
  }

  @Put('rounds/:id')
  async updateRound(
    @Headers('authorization') authHeader: string,
    @Param('id') roundId: string,
    @Body() body: { title?: string; description?: string | null },
  ) {
    await this.requireAdmin(authHeader);
    return this.qaService.updateRound(roundId, body);
  }

  @Post('rounds/:id/suspend')
  async suspendRound(
    @Headers('authorization') authHeader: string,
    @Param('id') roundId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.qaService.setSuspended(roundId, true);
  }

  @Post('rounds/:id/resume')
  async resumeRound(
    @Headers('authorization') authHeader: string,
    @Param('id') roundId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.qaService.setSuspended(roundId, false);
  }

  @Delete('rounds/:id')
  async deleteRound(
    @Headers('authorization') authHeader: string,
    @Param('id') roundId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.qaService.deleteRound(roundId);
  }

  @Get('rounds/:id/failed-items')
  async getFailedItems(
    @Headers('authorization') authHeader: string,
    @Param('id') roundId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.qaService.getFailedItems(roundId);
  }

  // ── Assignments ──

  @Post('rounds/:roundId/assignments')
  async assignReviewers(
    @Headers('authorization') authHeader: string,
    @Param('roundId') roundId: string,
    @Body() body: { profileIds: string[] },
  ) {
    const { profile } = await this.requireAdmin(authHeader);
    return this.qaService.assignReviewers(roundId, body.profileIds, profile.id);
  }

  @Delete('assignments/:id')
  async removeAssignment(
    @Headers('authorization') authHeader: string,
    @Param('id') assignmentId: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.qaService.removeAssignment(assignmentId);
    return { success: true };
  }

  @Get('assignments/mine')
  async getMyAssignments(@Headers('authorization') authHeader: string) {
    const { profile } = await this.requireAdmin(authHeader);
    return this.qaService.getMyAssignments(profile.id);
  }

  @Get('assignments/:id')
  async getAssignment(
    @Headers('authorization') authHeader: string,
    @Param('id') assignmentId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.qaService.getAssignment(assignmentId);
  }

  // ── Responses ──

  @Put('assignments/:assignmentId/responses/:itemId')
  async submitResponse(
    @Headers('authorization') authHeader: string,
    @Param('assignmentId') assignmentId: string,
    @Param('itemId') itemId: string,
    @Body() body: { status: QaResponseStatus; comment?: string; pageUrl?: string; screenshotUrl?: string },
  ) {
    const { profile } = await this.requireAdmin(authHeader);
    return this.qaService.submitResponse(assignmentId, itemId, body, profile.id);
  }

  // ── Developer Fixes ──

  @Post('responses/:responseId/fix')
  async submitFix(
    @Headers('authorization') authHeader: string,
    @Param('responseId') responseId: string,
    @Body() body: { fixNotes: string; status: QaFixStatus },
  ) {
    const { profile } = await this.requireAdmin(authHeader);
    return this.qaService.submitFix(responseId, body, profile.id);
  }

  // ── Admin Users ──

  @Get('admin-users')
  async getAdminUsers(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.qaService.getAdminUsers();
  }
}
