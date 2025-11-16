import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { AuditService } from './audit.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Controller('api/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}


  @Get('event/:eventId/sessions')
  async getEventSessions(@Param('eventId') eventId: string) {
    return this.auditService.getEventSessions(eventId);
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
