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
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { EventDirectorsService } from './event-directors.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import {
  CreateEventDirectorApplicationDto,
  AdminQuickCreateEventDirectorApplicationDto,
  AdminQuickCreateEventDirectorApplicationSchema,
  AdminDirectCreateEventDirectorDto,
  AdminDirectCreateEventDirectorSchema,
  ReviewEventDirectorApplicationDto,
  CreateEventDirectorAssignmentDto,
  CreateEventDirectorAssignmentSchema,
  UpdateEventDirectorAssignmentDto,
  UpdateEventDirectorAssignmentSchema,
  ApplicationStatus,
  EventAssignmentStatus,
  UserRole,
} from '@newmeca/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { EventDirector } from './event-director.entity';
import { EventDirectorApplication } from './event-director-application.entity';
import { EventDirectorApplicationReference } from './event-director-application-reference.entity';

// Helper to serialize EventDirector entity to API response format (snake_case)
function serializeEventDirector(ed: EventDirector) {
  return {
    id: ed.id,
    user_id: ed.user?.id,
    application_id: ed.application?.id,
    headshot_url: ed.headshotUrl,
    bio: ed.bio,
    preferred_name: ed.preferredName,
    country: ed.country,
    state: ed.state,
    city: ed.city,
    specialized_formats: ed.specializedFormats,
    is_active: ed.isActive,
    approved_date: ed.approvedDate,
    total_events_directed: ed.totalEventsDirected,
    average_rating: ed.averageRating,
    total_ratings: ed.totalRatings,
    admin_notes: ed.adminNotes,
    created_at: ed.createdAt,
    updated_at: ed.updatedAt,
    user: ed.user ? {
      id: ed.user.id,
      email: ed.user.email,
      first_name: ed.user.first_name,
      last_name: ed.user.last_name,
      avatar_url: ed.user.avatar_url,
    } : null,
  };
}

// Helper to serialize EventDirectorApplication entity to API response format (snake_case)
function serializeApplication(app: EventDirectorApplication) {
  return {
    id: app.id,
    user_id: app.user?.id,
    status: app.status,
    application_date: app.applicationDate,
    reviewed_date: app.reviewedDate,
    reviewed_by: app.reviewedBy?.id || null,
    entered_by: app.enteredBy?.id || null,
    entry_method: app.entryMethod,
    full_name: app.fullName,
    preferred_name: app.preferredName,
    date_of_birth: app.dateOfBirth,
    phone: app.phone,
    secondary_phone: app.secondaryPhone,
    headshot_url: app.headshotUrl,
    country: app.country,
    state: app.state,
    city: app.city,
    zip: app.zip,
    travel_radius: app.travelRadius,
    additional_regions: app.additionalRegions,
    weekend_availability: app.weekendAvailability,
    availability_notes: app.availabilityNotes,
    years_in_industry: app.yearsInIndustry,
    event_management_experience: app.eventManagementExperience,
    team_management_experience: app.teamManagementExperience,
    equipment_resources: app.equipmentResources,
    specialized_formats: app.specializedFormats,
    essay_why_ed: app.essayWhyEd,
    essay_qualifications: app.essayQualifications,
    essay_additional: app.essayAdditional,
    ack_independent_contractor: app.ackIndependentContractor,
    ack_code_of_conduct: app.ackCodeOfConduct,
    ack_background_check: app.ackBackgroundCheck,
    ack_terms_conditions: app.ackTermsConditions,
    admin_notes: app.adminNotes,
    created_at: app.createdAt,
    updated_at: app.updatedAt,
    user: app.user ? {
      id: app.user.id,
      email: app.user.email,
      first_name: app.user.first_name,
      last_name: app.user.last_name,
      avatar_url: app.user.avatar_url,
    } : null,
    references: app.references?.getItems?.() ? app.references.getItems().map(serializeReference) : [],
  };
}

function serializeReference(ref: EventDirectorApplicationReference) {
  return {
    id: ref.id,
    application_id: ref.application?.id,
    name: ref.fullName,
    relationship: ref.relationship,
    email: ref.email,
    phone: ref.phone,
    company_name: ref.company,
    reference_checked: ref.referenceChecked,
    checked_date: ref.checkedDate,
    reference_notes: ref.referenceNotes,
    created_at: ref.createdAt,
  };
}

@Controller('api/event-directors')
export class EventDirectorsController {
  constructor(
    private readonly eventDirectorsService: EventDirectorsService,
    private readonly supabaseAdminService: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  private async getCurrentUser(authHeader?: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.slice(7);
    try {
      const { data: { user }, error } = await this.supabaseAdminService
        .getClient()
        .auth.getUser(token);

      if (error || !user) return null;
      return user;
    } catch {
      return null;
    }
  }

  private async requireAdmin(authHeader?: string) {
    const user = await this.getCurrentUser(authHeader);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check if user is admin
    const profile = await this.em.findOne(Profile, { id: user.id }, { fields: ['role'] });

    if (!profile || profile.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return user;
  }

  // =============================================================================
  // Public Endpoints
  // =============================================================================

  @Get('directory')
  async getDirectory(
    @Query('state') state?: string,
    @Query('region') region?: string,
  ) {
    return this.eventDirectorsService.getDirectory({ state, region });
  }

  @Get('directory/:id')
  async getPublicProfile(@Param('id') id: string) {
    const ed = await this.eventDirectorsService.getEventDirector(id);

    if (!ed || !ed.isActive) {
      return null;
    }

    // Return public profile information
    return {
      id: ed.id,
      name: ed.user.first_name && ed.user.last_name
        ? `${ed.user.first_name} ${ed.user.last_name}`
        : ed.user.email?.split('@')[0] || 'Unknown',
      avatar_url: ed.user.avatar_url,
      headshot_url: ed.headshotUrl,
      bio: ed.bio,
      preferred_name: ed.preferredName,
      state: ed.state,
      city: ed.city,
      country: ed.country,
      specialized_formats: ed.specializedFormats,
      approved_date: ed.approvedDate,
      total_events_directed: ed.totalEventsDirected,
      average_rating: ed.averageRating,
      total_ratings: ed.totalRatings,
    };
  }

  @Post('verify-reference')
  async verifyReference(
    @Body('token') token: string,
    @Body('response') response: string,
  ) {
    await this.eventDirectorsService.verifyReference(token, response);
    return { success: true };
  }

  // =============================================================================
  // User Endpoints (Authenticated)
  // =============================================================================

  @Post('applications')
  async createApplication(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateEventDirectorApplicationDto,
  ) {
    const user = await this.getCurrentUser(authHeader);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.eventDirectorsService.createApplication(user.id, dto);
  }

  @Get('applications/me')
  async getMyApplication(@Headers('authorization') authHeader: string) {
    const user = await this.getCurrentUser(authHeader);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const application = await this.eventDirectorsService.getMyApplication(user.id);
    // Return explicit object to ensure valid JSON response (not empty body)
    return { data: application || null };
  }

  @Get('me')
  async getMyProfile(@Headers('authorization') authHeader: string) {
    const user = await this.getCurrentUser(authHeader);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const profile = await this.eventDirectorsService.getMyProfile(user.id);
    // Return explicit object to ensure valid JSON response (not empty body)
    return { data: profile ? serializeEventDirector(profile) : null };
  }

  // =============================================================================
  // Admin Endpoints
  // =============================================================================

  @Get('applications')
  async getAllApplications(
    @Headers('authorization') authHeader: string,
    @Query('status') status?: ApplicationStatus,
    @Query('region') region?: string,
  ) {
    await this.requireAdmin(authHeader);
    const applications = await this.eventDirectorsService.getAllApplications({ status, region });
    return applications.map(serializeApplication);
  }

  @Get('applications/:id')
  async getApplication(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    const application = await this.eventDirectorsService.getApplication(id);
    return serializeApplication(application);
  }

  @Post('applications/admin/quick')
  async adminQuickCreateApplication(
    @Headers('authorization') authHeader: string,
    @Body(new ZodValidationPipe(AdminQuickCreateEventDirectorApplicationSchema)) dto: AdminQuickCreateEventDirectorApplicationDto,
  ) {
    const admin = await this.requireAdmin(authHeader);
    const application = await this.eventDirectorsService.adminQuickCreateApplication(admin.id, dto);
    return serializeApplication(application);
  }

  @Post('direct')
  async createEventDirectorDirectly(
    @Headers('authorization') authHeader: string,
    @Body(new ZodValidationPipe(AdminDirectCreateEventDirectorSchema)) dto: AdminDirectCreateEventDirectorDto,
  ) {
    const admin = await this.requireAdmin(authHeader);
    const eventDirector = await this.eventDirectorsService.createEventDirectorDirectly(admin.id, dto);
    return serializeEventDirector(eventDirector);
  }

  @Put('applications/:id/review')
  async reviewApplication(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: ReviewEventDirectorApplicationDto,
  ) {
    const user = await this.requireAdmin(authHeader);
    const application = await this.eventDirectorsService.reviewApplication(id, user.id, dto);
    return serializeApplication(application);
  }

  @Get()
  async getAllEventDirectors(
    @Headers('authorization') authHeader: string,
    @Query('isActive') isActive?: string,
    @Query('state') state?: string,
    @Query('region') region?: string,
  ) {
    await this.requireAdmin(authHeader);
    const eventDirectors = await this.eventDirectorsService.getAllEventDirectors({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      state,
      region,
    });
    return eventDirectors.map(serializeEventDirector);
  }

  @Get(':id')
  async getEventDirector(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    const ed = await this.eventDirectorsService.getEventDirector(id);
    return serializeEventDirector(ed);
  }

  @Put(':id')
  async updateEventDirector(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() updates: any,
  ) {
    await this.requireAdmin(authHeader);
    const ed = await this.eventDirectorsService.updateEventDirector(id, updates);
    return serializeEventDirector(ed);
  }

  // =============================================================================
  // Event Assignment Endpoints
  // =============================================================================

  @Get('assignments/me')
  async getMyAssignments(
    @Headers('authorization') authHeader: string,
    @Query('status') status?: EventAssignmentStatus,
    @Query('upcoming') upcoming?: string,
  ) {
    const user = await this.getCurrentUser(authHeader);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.eventDirectorsService.getMyAssignments(user.id, {
      status,
      upcoming: upcoming === 'true',
    });
  }

  @Get('assignments/:id')
  async getAssignment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const user = await this.getCurrentUser(authHeader);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const assignment = await this.eventDirectorsService.getAssignment(id);

    // Check if user is admin or the assigned ED
    const profile = await this.em.findOne(Profile, { id: user.id }, { fields: ['role'] });

    if (profile?.role !== UserRole.ADMIN && assignment.eventDirector.user.id !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return assignment;
  }

  @Put('assignments/:id/respond')
  async respondToAssignment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { accept: boolean; decline_reason?: string },
  ) {
    const user = await this.getCurrentUser(authHeader);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.eventDirectorsService.respondToAssignment(
      id,
      user.id,
      body.accept,
      body.decline_reason,
    );
  }

  @Post('assignments')
  async createAssignment(
    @Headers('authorization') authHeader: string,
    @Body(new ZodValidationPipe(CreateEventDirectorAssignmentSchema)) dto: CreateEventDirectorAssignmentDto,
  ) {
    const admin = await this.requireAdmin(authHeader);
    return this.eventDirectorsService.createAssignment(dto, admin.id);
  }

  @Put('assignments/:id')
  async updateAssignment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateEventDirectorAssignmentSchema)) dto: UpdateEventDirectorAssignmentDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.eventDirectorsService.updateAssignment(id, dto);
  }

  @Delete('assignments/:id')
  async deleteAssignment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.eventDirectorsService.deleteAssignment(id);
    return { message: 'Assignment deleted successfully' };
  }

  // Get all assignments for a specific event (admin)
  @Get('events/:eventId/assignments')
  async getEventAssignments(
    @Headers('authorization') authHeader: string,
    @Param('eventId') eventId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.eventDirectorsService.getEventAssignments(eventId);
  }

  // Get all assignments for a specific ED (admin)
  @Get(':edId/assignments')
  async getEventDirectorAssignments(
    @Headers('authorization') authHeader: string,
    @Param('edId') edId: string,
    @Query('status') status?: EventAssignmentStatus,
    @Query('upcoming') upcoming?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.eventDirectorsService.getEventDirectorAssignments(edId, {
      status,
      upcoming: upcoming === 'true',
    });
  }
}
