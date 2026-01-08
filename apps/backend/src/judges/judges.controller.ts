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
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JudgesService } from './judges.service';
import {
  CreateJudgeApplicationDto,
  CreateJudgeApplicationSchema,
  AdminCreateJudgeApplicationDto,
  AdminCreateJudgeApplicationSchema,
  AdminQuickCreateJudgeApplicationDto,
  AdminQuickCreateJudgeApplicationSchema,
  ReviewJudgeApplicationDto,
  ReviewJudgeApplicationSchema,
  UpdateJudgeDto,
  UpdateJudgeSchema,
  CreateEventJudgeAssignmentDto,
  CreateEventJudgeAssignmentSchema,
  UpdateEventJudgeAssignmentDto,
  UpdateEventJudgeAssignmentSchema,
  ApplicationStatus,
  JudgeLevel,
  UserRole,
  EventAssignmentStatus,
} from '@newmeca/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { JudgeApplication } from './judge-application.entity';
import { JudgeApplicationReference } from './judge-application-reference.entity';
import { Judge } from './judge.entity';

// Helper to serialize Judge entity to API response format (snake_case)
function serializeJudge(judge: Judge) {
  return {
    id: judge.id,
    user_id: judge.user?.id,
    application_id: judge.application?.id,
    level: judge.level,
    specialty: judge.specialty,
    sub_specialties: judge.subSpecialties,
    headshot_url: judge.headshotUrl,
    bio: judge.bio,
    preferred_name: judge.preferredName,
    country: judge.country,
    state: judge.state,
    city: judge.city,
    travel_radius: judge.travelRadius,
    additional_regions: judge.additionalRegions,
    is_active: judge.isActive,
    approved_date: judge.approvedDate,
    admin_notes: judge.adminNotes,
    total_events_judged: judge.totalEventsJudged,
    average_rating: judge.averageRating,
    total_ratings: judge.totalRatings,
    created_at: judge.createdAt,
    updated_at: judge.updatedAt,
    user: judge.user ? {
      id: judge.user.id,
      email: judge.user.email,
      first_name: judge.user.first_name,
      last_name: judge.user.last_name,
      avatar_url: judge.user.avatar_url,
    } : null,
  };
}

// Helper to serialize JudgeApplication entity to API response format (snake_case)
function serializeApplication(app: JudgeApplication) {
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
    industry_positions: app.industryPositions,
    company_names: app.companyNames,
    education_training: app.educationTraining,
    competition_history: app.competitionHistory,
    judging_experience: app.judgingExperience,
    specialty: app.specialty,
    sub_specialties: app.subSpecialties,
    additional_skills: app.additionalSkills,
    essay_why_judge: app.essayWhyJudge,
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

function serializeReference(ref: JudgeApplicationReference) {
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

@Controller('api/judges')
export class JudgesController {
  constructor(
    private readonly judgesService: JudgesService,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  // Helper to get current user from auth header
  private async getCurrentUser(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }

  // Helper to check admin role
  private async requireAdmin(authHeader?: string) {
    const user = await this.getCurrentUser(authHeader);

    // Get profile to check role
    const profile = await this.supabaseAdmin.getClient()
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile.error || profile.data?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return user;
  }

  // =============================================================================
  // Public Endpoints
  // =============================================================================

  @Get('directory')
  async getPublicDirectory(
    @Query('state') state?: string,
    @Query('specialty') specialty?: string,
  ) {
    const judges = await this.judgesService.getAllJudges({
      isActive: true,
      state,
      specialty,
    });

    // Return only public information
    return judges.map(judge => ({
      id: judge.id,
      name: judge.user.first_name && judge.user.last_name
        ? `${judge.user.first_name} ${judge.user.last_name}`
        : judge.user.email?.split('@')[0] || 'Unknown',
      avatar_url: judge.user.avatar_url,
      level: judge.level,
      specialty: judge.specialty,
      state: judge.state,
      city: judge.city,
      total_events_judged: judge.totalEventsJudged,
      average_rating: judge.averageRating,
    }));
  }

  @Get('directory/:id')
  async getPublicJudgeProfile(@Param('id') id: string) {
    const judge = await this.judgesService.getJudge(id);

    if (!judge || !judge.isActive) {
      return null;
    }

    // Return public profile information
    return {
      id: judge.id,
      name: judge.user.first_name && judge.user.last_name
        ? `${judge.user.first_name} ${judge.user.last_name}`
        : judge.user.email?.split('@')[0] || 'Unknown',
      avatar_url: judge.user.avatar_url,
      level: judge.level,
      specialty: judge.specialty,
      sub_specialties: judge.subSpecialties,
      state: judge.state,
      city: judge.city,
      country: judge.country,
      travel_radius: judge.travelRadius,
      additional_regions: judge.additionalRegions,
      approved_date: judge.approvedDate,
      total_events_judged: judge.totalEventsJudged,
      average_rating: judge.averageRating,
      total_ratings: judge.totalRatings,
    };
  }

  @Post('verify-reference')
  async verifyReference(
    @Body('token') token: string,
    @Body('response') response: string,
  ) {
    await this.judgesService.verifyReference(token, response);
    return { message: 'Reference verified successfully' };
  }

  // =============================================================================
  // User Endpoints (Authenticated)
  // =============================================================================

  @Post('applications')
  async createApplication(
    @Headers('authorization') authHeader: string,
    @Body(new ZodValidationPipe(CreateJudgeApplicationSchema)) dto: CreateJudgeApplicationDto,
  ) {
    const user = await this.getCurrentUser(authHeader);
    const application = await this.judgesService.createApplication(user.id, dto);
    return serializeApplication(application);
  }

  @Get('applications/me')
  async getMyApplication(@Headers('authorization') authHeader: string) {
    const user = await this.getCurrentUser(authHeader);
    const application = await this.judgesService.getMyApplication(user.id);
    // Return explicit object to ensure valid JSON response (not empty body)
    return { data: application ? serializeApplication(application) : null };
  }

  @Get('me')
  async getMyJudgeProfile(@Headers('authorization') authHeader: string) {
    const user = await this.getCurrentUser(authHeader);
    const judge = await this.judgesService.getJudgeByUserId(user.id);
    // Return explicit object to ensure valid JSON response (not empty body)
    return { data: judge || null };
  }

  // =============================================================================
  // Admin Endpoints
  // =============================================================================

  @Get('applications')
  async getAllApplications(
    @Headers('authorization') authHeader: string,
    @Query('status') status?: ApplicationStatus,
    @Query('specialty') specialty?: string,
  ) {
    await this.requireAdmin(authHeader);
    const applications = await this.judgesService.getAllApplications({ status, specialty });
    return applications.map(serializeApplication);
  }

  @Get('applications/:id')
  async getApplication(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    const application = await this.judgesService.getApplication(id);
    return serializeApplication(application);
  }

  @Post('applications/admin')
  async adminCreateApplication(
    @Headers('authorization') authHeader: string,
    @Body(new ZodValidationPipe(AdminCreateJudgeApplicationSchema)) dto: AdminCreateJudgeApplicationDto,
  ) {
    const admin = await this.requireAdmin(authHeader);
    const application = await this.judgesService.adminCreateApplication(admin.id, dto);
    return serializeApplication(application);
  }

  @Post('applications/admin/quick')
  async adminQuickCreateApplication(
    @Headers('authorization') authHeader: string,
    @Body(new ZodValidationPipe(AdminQuickCreateJudgeApplicationSchema)) dto: AdminQuickCreateJudgeApplicationDto,
  ) {
    const admin = await this.requireAdmin(authHeader);
    const application = await this.judgesService.adminQuickCreateApplication(admin.id, dto);
    return serializeApplication(application);
  }

  @Put('applications/:id/review')
  async reviewApplication(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReviewJudgeApplicationSchema)) dto: ReviewJudgeApplicationDto,
  ) {
    const admin = await this.requireAdmin(authHeader);
    const application = await this.judgesService.reviewApplication(id, admin.id, dto);
    return serializeApplication(application);
  }

  @Get()
  async getAllJudges(
    @Headers('authorization') authHeader: string,
    @Query('isActive') isActive?: string,
    @Query('level') level?: JudgeLevel,
    @Query('specialty') specialty?: string,
    @Query('state') state?: string,
  ) {
    await this.requireAdmin(authHeader);
    const judges = await this.judgesService.getAllJudges({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      level,
      specialty,
      state,
    });
    return judges.map(serializeJudge);
  }

  @Get(':id')
  async getJudge(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    // Allow admin or the judge themselves
    const user = await this.getCurrentUser(authHeader);
    const judge = await this.judgesService.getJudge(id);

    // Check if user is admin or the judge
    const profile = await this.supabaseAdmin.getClient()
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile.data?.role !== UserRole.ADMIN && judge.user.id !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return serializeJudge(judge);
  }

  @Put(':id')
  async updateJudge(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateJudgeSchema)) dto: UpdateJudgeDto,
  ) {
    const admin = await this.requireAdmin(authHeader);

    // Get current judge to check for level change
    const currentJudge = await this.judgesService.getJudge(id);
    const previousLevel = currentJudge.level;

    const updatedJudge = await this.judgesService.updateJudge(id, dto);

    // Record level change if it happened
    if (dto.level && dto.level !== previousLevel) {
      await this.judgesService.recordLevelChange(
        id,
        previousLevel,
        dto.level,
        admin.id,
        `Level changed by admin`,
      );
    }

    return updatedJudge;
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
    return this.judgesService.getMyAssignments(user.id, {
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
    const assignment = await this.judgesService.getAssignment(id);

    // Check if user is admin or the assigned judge
    const profile = await this.supabaseAdmin.getClient()
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile.data?.role !== UserRole.ADMIN && assignment.judge.user.id !== user.id) {
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
    return this.judgesService.respondToAssignment(
      id,
      user.id,
      body.accept,
      body.decline_reason,
    );
  }

  @Post('assignments')
  async createAssignment(
    @Headers('authorization') authHeader: string,
    @Body(new ZodValidationPipe(CreateEventJudgeAssignmentSchema)) dto: CreateEventJudgeAssignmentDto,
  ) {
    const admin = await this.requireAdmin(authHeader);
    return this.judgesService.createAssignment(dto, admin.id);
  }

  @Put('assignments/:id')
  async updateAssignment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateEventJudgeAssignmentSchema)) dto: UpdateEventJudgeAssignmentDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.judgesService.updateAssignment(id, dto);
  }

  @Delete('assignments/:id')
  async deleteAssignment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.judgesService.deleteAssignment(id);
    return { message: 'Assignment deleted successfully' };
  }

  // Get all assignments for a specific event (admin)
  @Get('events/:eventId/assignments')
  async getEventAssignments(
    @Headers('authorization') authHeader: string,
    @Param('eventId') eventId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.judgesService.getEventAssignments(eventId);
  }

  // Get all assignments for a specific judge (admin)
  @Get(':judgeId/assignments')
  async getJudgeAssignments(
    @Headers('authorization') authHeader: string,
    @Param('judgeId') judgeId: string,
    @Query('status') status?: EventAssignmentStatus,
    @Query('upcoming') upcoming?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.judgesService.getJudgeAssignments(judgeId, {
      status,
      upcoming: upcoming === 'true',
    });
  }
}
