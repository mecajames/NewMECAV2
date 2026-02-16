import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  Headers,
  Query,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Response } from 'express';
import { AuditService } from './audit.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';
import * as fs from 'fs/promises';
import * as path from 'path';

@Controller('api/audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

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

  @Get('admin/all-sessions')
  async getAllSessions(
    @Headers('authorization') authHeader: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('eventId') eventId?: string,
    @Query('search') search?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.auditService.getAllSessions({
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      eventId: eventId || undefined,
      search: search || undefined,
    });
  }

  @Get('admin/all-activity')
  async getAllActivity(
    @Headers('authorization') authHeader: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('seasonId') seasonId?: string,
    @Query('search') search?: string,
    @Query('actionType') actionType?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.auditService.getAllActivity({
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      seasonId: seasonId || undefined,
      search: search || undefined,
      actionType: actionType || undefined,
    });
  }

  @Get('event/:eventId/sessions')
  async getEventSessions(@Param('eventId') eventId: string) {
    return this.auditService.getEventSessions(eventId);
  }

  @Get('event/:eventId/modifications')
  async getEventModifications(@Param('eventId') eventId: string) {
    return this.auditService.getEventModifications(eventId);
  }

  @Get('event/:eventId/deletions')
  async getEventDeletions(@Param('eventId') eventId: string) {
    return this.auditService.getEventDeletions(eventId);
  }

  @Get('event/:eventId/all')
  async getEventAllLogs(@Param('eventId') eventId: string) {
    return this.auditService.getEventAllLogs(eventId);
  }

  @Get('log/:logId')
  async getAuditLogById(@Param('logId') logId: string) {
    const log = await this.auditService.getAuditLogById(logId);
    if (!log) {
      throw new NotFoundException('Audit log not found');
    }
    return log;
  }

  @Get('session/:sessionId/logs')
  async getSessionAuditLogs(@Param('sessionId') sessionId: string) {
    return this.auditService.getSessionAuditLogs(sessionId);
  }

  @Get('session/:sessionId/download')
  async downloadSessionFile(
    @Param('sessionId') sessionId: string,
    @Res() res: Response
  ) {
    const filePath = await this.auditService.getSessionFilePath(sessionId);

    if (!filePath) {
      throw new NotFoundException('File not found for this session');
    }

    try {
      // Check if file exists
      await fs.access(filePath);

      // Get filename
      const filename = path.basename(filePath);

      // Set headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Read and send file
      const fileBuffer = await fs.readFile(filePath);
      res.send(fileBuffer);
    } catch (error) {
      throw new NotFoundException('File not found on disk');
    }
  }
}
