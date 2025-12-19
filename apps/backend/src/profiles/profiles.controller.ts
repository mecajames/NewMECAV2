import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ProfilesService, CreateUserWithPasswordDto, ResetPasswordDto } from './profiles.service';
import { Profile } from './profiles.entity';
import { calculatePasswordStrength, MIN_PASSWORD_STRENGTH } from '../utils/password-generator';

@Controller('api/profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  async listProfiles(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<Profile[]> {
    return this.profilesService.findAll(page, limit);
  }

  @Get('search')
  async searchProfiles(
    @Query('q') query: string,
    @Query('limit') limit: number = 20,
  ): Promise<Profile[]> {
    return this.profilesService.search(query, limit);
  }

  @Get('stats')
  async getStats(): Promise<{ totalUsers: number; totalMembers: number }> {
    return this.profilesService.getStats();
  }

  @Get('public')
  async getPublicProfiles(): Promise<Profile[]> {
    return this.profilesService.findPublicProfiles();
  }

  @Get('public/:id')
  async getPublicProfile(@Param('id') id: string): Promise<Profile> {
    return this.profilesService.findPublicById(id);
  }

  @Get(':id')
  async getProfile(@Param('id') id: string): Promise<Profile> {
    return this.profilesService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProfile(@Body() data: Partial<Profile>): Promise<Profile> {
    return this.profilesService.create(data);
  }

  @Put(':id')
  async updateProfile(
    @Param('id') id: string,
    @Body() data: Partial<Profile>,
  ): Promise<Profile> {
    return this.profilesService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@Param('id') id: string): Promise<void> {
    return this.profilesService.delete(id);
  }

  // ===== Admin Password Management Endpoints =====

  /**
   * Creates a new user with password (admin only)
   */
  @Post('admin/create-with-password')
  @HttpCode(HttpStatus.CREATED)
  async createUserWithPassword(@Body() dto: CreateUserWithPasswordDto): Promise<Profile> {
    return this.profilesService.createWithPassword(dto);
  }

  /**
   * Generates a secure password that meets minimum strength requirements
   */
  @Get('admin/generate-password')
  async generatePassword(): Promise<{ password: string; strength: ReturnType<typeof calculatePasswordStrength> }> {
    const password = this.profilesService.generatePassword();
    const strength = calculatePasswordStrength(password);
    return { password, strength };
  }

  /**
   * Checks password strength
   */
  @Post('admin/check-password-strength')
  async checkPasswordStrength(@Body() body: { password: string }): Promise<{
    strength: ReturnType<typeof calculatePasswordStrength>;
    meetsMinimum: boolean;
    minimumRequired: number;
  }> {
    const strength = calculatePasswordStrength(body.password);
    return {
      strength,
      meetsMinimum: strength.score >= MIN_PASSWORD_STRENGTH,
      minimumRequired: MIN_PASSWORD_STRENGTH,
    };
  }

  /**
   * Checks if email service is configured
   */
  @Get('admin/email-service-status')
  async getEmailServiceStatus(): Promise<{ configured: boolean }> {
    return { configured: this.profilesService.isEmailServiceReady() };
  }

  /**
   * Resets a user's password (admin only)
   */
  @Post(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<{ success: boolean; emailSent: boolean }> {
    return this.profilesService.resetPassword(id, dto);
  }

  /**
   * Clears the force password change flag after user changes their password
   */
  @Post(':id/clear-force-password-change')
  async clearForcePasswordChange(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.profilesService.clearForcePasswordChange(id);
    return { success: true };
  }
}
