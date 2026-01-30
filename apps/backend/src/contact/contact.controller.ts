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
  Req,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { EntityManager } from '@mikro-orm/postgresql';
import { ContactService } from './contact.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { ContactFormSchema, ContactFormDto, ContactStatus, UserRole } from '@newmeca/shared';

@Controller('api/contact')
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to get current user from auth header
  private async getCurrentUser(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }

    return user;
  }

  private async requireAdmin(authHeader?: string) {
    const user = await this.getCurrentUser(authHeader);
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  // =============================================================================
  // Public Endpoints
  // =============================================================================

  /**
   * Submit a contact form (public)
   */
  @Post()
  async submitContactForm(
    @Body(new ZodValidationPipe(ContactFormSchema)) dto: ContactFormDto,
    @Req() request: Request,
  ) {
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers['user-agent'];

    return this.contactService.submitContactForm(dto, ipAddress, userAgent);
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  // =============================================================================
  // Admin Endpoints
  // =============================================================================

  /**
   * Get all contact submissions (admin)
   */
  @Get()
  async getSubmissions(
    @Headers('authorization') authHeader: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    await this.requireAdmin(authHeader);

    const result = await this.contactService.getSubmissions({
      status: status as ContactStatus,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return {
      submissions: result.submissions.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        subject: s.subject,
        message: s.message,
        status: s.status,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt,
        repliedAt: s.repliedAt,
        repliedBy: s.repliedBy
          ? {
              id: s.repliedBy.id,
              firstName: s.repliedBy.first_name,
              lastName: s.repliedBy.last_name,
            }
          : null,
        adminNotes: s.adminNotes,
      })),
      total: result.total,
    };
  }

  /**
   * Get a single submission (admin)
   */
  @Get(':id')
  async getSubmission(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);

    const s = await this.contactService.getSubmission(id);
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      subject: s.subject,
      message: s.message,
      status: s.status,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      repliedAt: s.repliedAt,
      repliedBy: s.repliedBy
        ? {
            id: s.repliedBy.id,
            firstName: s.repliedBy.first_name,
            lastName: s.repliedBy.last_name,
          }
        : null,
      adminNotes: s.adminNotes,
    };
  }

  /**
   * Update submission status (admin)
   */
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
    @Body() body: { status: ContactStatus; notes?: string },
  ) {
    const { user } = await this.requireAdmin(authHeader);

    const s = await this.contactService.updateStatus(id, body.status, user.id, body.notes);
    return {
      id: s.id,
      status: s.status,
      repliedAt: s.repliedAt,
      adminNotes: s.adminNotes,
    };
  }

  /**
   * Delete a submission (admin)
   */
  @Delete(':id')
  async deleteSubmission(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.contactService.deleteSubmission(id);
    return { success: true };
  }
}
