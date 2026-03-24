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
import {
  WorldFinalsService,
  CreateFinalsRegistrationDto,
  UpdateFinalsRegistrationDto,
  CreateFinalsVoteDto,
} from './world-finals.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import { UserRole, StripePaymentType } from '@newmeca/shared';
import { Public } from '../auth/public.decorator';
import { StripeService } from '../stripe/stripe.service';

@Controller('api/world-finals')
export class WorldFinalsController {
  constructor(
    private readonly worldFinalsService: WorldFinalsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly stripeService: StripeService,
    private readonly em: EntityManager,
  ) {}

  // Helper to require any authenticated user
  private async requireAuth(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }

    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id }, { fields: ['id', 'email', 'role', 'is_staff', 'meca_id'] as any });
    return { user, profile };
  }

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string) {
    const { user, profile } = await this.requireAuth(authHeader);

    if (!isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  /**
   * Get qualifications for the current season (public for leaderboard highlighting)
   */
  @Public()
  @Get('qualifications/current')
  async getCurrentSeasonQualifications() {
    return this.worldFinalsService.getCurrentSeasonQualifications();
  }

  /**
   * Get qualifications for a specific season
   */
  @Public()
  @Get('qualifications/season/:seasonId')
  async getSeasonQualifications(@Param('seasonId') seasonId: string) {
    return this.worldFinalsService.getSeasonQualifications(seasonId);
  }

  /**
   * Get qualification statistics for admin dashboard
   */
  @Get('stats')
  async getQualificationStats(
    @Headers('authorization') authHeader: string,
    @Query('seasonId') seasonId?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.getQualificationStats(seasonId);
  }

  /**
   * Send invitation to a specific qualified competitor
   */
  @Post('qualifications/:id/send-invitation')
  async sendInvitation(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.sendInvitation(id);
  }

  /**
   * Send invitations to all qualified competitors who haven't received one yet
   */
  @Post('send-all-invitations/:seasonId')
  async sendAllPendingInvitations(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.sendAllPendingInvitations(seasonId);
  }

  /**
   * Recalculate all qualifications for a season (admin tool)
   */
  @Post('recalculate/:seasonId')
  async recalculateSeasonQualifications(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.recalculateSeasonQualifications(seasonId);
  }

  /**
   * Redeem an invitation token (for pre-registration)
   */
  @Post('redeem-invitation')
  async redeemInvitation(@Body('token') token: string) {
    const qualification = await this.worldFinalsService.redeemInvitation(token);
    if (!qualification) {
      return { success: false, message: 'Invalid or already redeemed invitation token' };
    }
    return {
      success: true,
      qualification,
      message: 'Invitation redeemed successfully',
    };
  }

  // ============================================
  // FINALS REGISTRATION ENDPOINTS
  // ============================================

  /**
   * Create a new registration (authenticated users)
   */
  @Post('registrations')
  @HttpCode(HttpStatus.CREATED)
  async createRegistration(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateFinalsRegistrationDto,
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.createRegistration(user.id, data);
  }

  /**
   * Get current user's registrations
   */
  @Get('registrations/me')
  async getMyRegistrations(@Headers('authorization') authHeader: string) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.getMyRegistrations(user.id);
  }

  /**
   * Get current user's registration for a specific season
   */
  @Get('registrations/me/season/:seasonId')
  async getMyRegistrationForSeason(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.getMyRegistration(user.id, seasonId);
  }

  /**
   * Update a registration (owner only)
   */
  @Put('registrations/:id')
  async updateRegistration(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: UpdateFinalsRegistrationDto,
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.updateRegistration(id, user.id, data);
  }

  /**
   * Delete a registration (owner only)
   */
  @Delete('registrations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRegistration(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.deleteRegistration(id, user.id);
  }

  /**
   * Get all registrations for a season (admin only)
   */
  @Get('registrations/season/:seasonId')
  async getRegistrationsBySeason(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
    @Query('class') competitionClass?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.getRegistrationsBySeasonAndClass(seasonId, competitionClass);
  }

  /**
   * Get registration statistics (admin only)
   */
  @Get('registrations/stats/:seasonId')
  async getRegistrationStats(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.getRegistrationStats(seasonId);
  }

  // ============================================
  // FINALS VOTING ENDPOINTS
  // ============================================

  /**
   * Submit a vote (authenticated users)
   */
  @Post('votes')
  @HttpCode(HttpStatus.CREATED)
  async submitVote(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateFinalsVoteDto,
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.submitVote(user.id, data);
  }

  /**
   * Get current user's votes
   */
  @Get('votes/my-votes')
  async getMyVotes(@Headers('authorization') authHeader: string) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.getMyVotes(user.id);
  }

  /**
   * Check if user has voted in a category
   */
  @Get('votes/check/:category')
  async checkVoteStatus(
    @Headers('authorization') authHeader: string,
    @Param('category') category: string,
  ) {
    const { user } = await this.requireAuth(authHeader);
    const hasVoted = await this.worldFinalsService.hasUserVoted(user.id, category);
    return { category, hasVoted };
  }

  /**
   * Get vote summary (admin only)
   */
  @Get('votes/summary')
  async getVoteSummary(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.getVoteSummary();
  }

  /**
   * Get votes by category (admin only)
   */
  @Get('votes/category/:category')
  async getVotesByCategory(
    @Headers('authorization') authHeader: string,
    @Param('category') category: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.getVotesByCategory(category);
  }

  // =============================================
  // Pre-Registration: Admin Endpoints
  // =============================================

  @Get('registration-config/:seasonId')
  async getRegistrationConfig(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.getRegistrationConfig(seasonId);
  }

  @Put('registration-config/:seasonId')
  async upsertRegistrationConfig(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
    @Body() data: any,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.upsertRegistrationConfig(seasonId, data);
  }

  @Get('packages/:seasonId')
  async getPackages(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
  ) {
    await this.requireAdmin(authHeader);
    const packages = await this.worldFinalsService.getPackages(seasonId);
    // Load classes for each package
    return Promise.all(packages.map(pkg => this.worldFinalsService.getPackageWithClasses(pkg.id)));
  }

  @Post('packages')
  @HttpCode(HttpStatus.CREATED)
  async createPackage(
    @Headers('authorization') authHeader: string,
    @Body() data: any,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.createPackage(data);
  }

  @Put('packages/update/:id')
  async updatePackage(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.updatePackage(id, data);
  }

  @Delete('packages/delete/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePackage(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.worldFinalsService.deletePackage(id);
  }

  @Get('addon-items/:seasonId')
  async getAddonItems(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.getAddonItems(seasonId);
  }

  @Post('addon-items')
  @HttpCode(HttpStatus.CREATED)
  async createAddonItem(
    @Headers('authorization') authHeader: string,
    @Body() data: any,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.createAddonItem(data);
  }

  @Put('addon-items/:id')
  async updateAddonItem(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.updateAddonItem(id, data);
  }

  @Delete('addon-items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddonItem(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.worldFinalsService.deleteAddonItem(id);
  }

  @Get('preregistration-stats/:seasonId')
  async getPreRegistrationStats(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.getPreRegistrationStats(seasonId);
  }

  // =============================================
  // Pre-Registration: Public (Token-Gated) Endpoints
  // =============================================

  @Public()
  @Get('preregister/validate')
  async validatePreRegistration(@Query('token') token: string) {
    if (!token) throw new ForbiddenException('Registration token is required');
    return this.worldFinalsService.validatePreRegistrationToken(token);
  }

  @Public()
  @Post('preregister/checkout')
  @HttpCode(HttpStatus.OK)
  async preRegisterCheckout(@Body() data: any) {
    if (!data.token) throw new ForbiddenException('Registration token is required');
    if (!data.packageId) throw new ForbiddenException('Package selection is required');

    // Validate token
    const validation = await this.worldFinalsService.validatePreRegistrationToken(data.token);
    const selectedPkg = validation.packages.find((p: any) => p.id === data.packageId);
    if (!selectedPkg) throw new ForbiddenException('Invalid package selection');
    if (selectedPkg.alreadyRegistered) throw new ForbiddenException('You have already registered for this package');

    // Separate standard vs premium classes
    const standardClasses = (data.classes || []).filter((c: any) => !c.isPremium);
    const premiumClasses = (data.classes || []).filter((c: any) => c.isPremium);

    // Calculate pricing
    const pricing = this.worldFinalsService.calculatePreRegistrationPricing(
      selectedPkg,
      validation.pricingTier,
      standardClasses.length,
      premiumClasses.map((c: any) => ({ className: c.className, price: c.premiumPrice || 0 })),
      data.addonItems || [],
    );

    // Create registration
    const email = data.email || validation.competitor.email;
    const registration = await this.worldFinalsService.createPreRegistration({
      token: data.token,
      packageId: data.packageId,
      seasonId: validation.config.season_id,
      mecaId: validation.competitor.mecaId,
      email,
      firstName: data.firstName || validation.competitor.firstName,
      lastName: data.lastName || validation.competitor.lastName,
      phone: data.phone,
      classes: data.classes || [],
      addonItems: data.addonItems || [],
      tshirtSize: data.tshirtSize,
      ringSize: data.ringSize,
      hotelNeeded: data.hotelNeeded,
      hotelNotes: data.hotelNotes,
      guestCount: data.guestCount,
      pricingTier: validation.pricingTier,
      baseAmount: pricing.classTotal + pricing.premiumTotal,
      addonsAmount: pricing.addonsTotal,
      totalAmount: pricing.total,
      notes: data.notes,
      userId: data.userId,
    });

    // Create Stripe payment intent
    const amountInCents = Math.round(pricing.total * 100);
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: amountInCents,
      currency: 'usd',
      membershipTypeConfigId: 'world-finals-registration',
      membershipTypeName: `World Finals Registration: ${selectedPkg.name}`,
      email,
      metadata: {
        paymentType: StripePaymentType.WORLD_FINALS_REGISTRATION,
        registrationId: registration.id,
        seasonId: validation.config.season_id,
        mecaId: validation.competitor.mecaId,
        packageId: data.packageId,
        pricingTier: validation.pricingTier,
        classCount: String((data.classes || []).length),
      },
    });

    return {
      registrationId: registration.id,
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.paymentIntentId,
      pricing,
      totalAmount: pricing.total,
    };
  }

  @Public()
  @Get('preregister/confirmation/:id')
  async getPreRegistrationConfirmation(@Param('id') id: string) {
    const em = this.em.fork();
    const { FinalsRegistration } = await import('./finals-registration.entity');
    const reg = await em.findOne(FinalsRegistration, { id });
    if (!reg) throw new ForbiddenException('Registration not found');
    return reg;
  }
}
