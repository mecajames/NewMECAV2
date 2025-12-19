import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Profile } from './profiles.entity';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { EmailService } from '../email/email.service';
import { generateSecurePassword, validatePassword, MIN_PASSWORD_STRENGTH } from '../utils/password-generator';
import { AccountType } from '@newmeca/shared';

export interface CreateUserWithPasswordDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  forcePasswordChange?: boolean;
  sendEmail?: boolean;
}

export interface ResetPasswordDto {
  newPassword: string;
  forcePasswordChange?: boolean;
  sendEmail?: boolean;
}

@Injectable()
export class ProfilesService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly emailService: EmailService,
  ) {}

  async findAll(page: number = 1, limit: number = 10): Promise<Profile[]> {
    const em = this.em.fork();
    const offset = (page - 1) * limit;
    return em.find(Profile, {}, {
      limit,
      offset
    });
  }

  async findById(id: string): Promise<Profile> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    return profile;
  }

  async findByEmail(email: string): Promise<Profile | null> {
    const em = this.em.fork();
    return em.findOne(Profile, { email });
  }

  /**
   * Generates the next MECA ID. New users start from 700800.
   * Existing users from old system may have different ID ranges.
   */
  async generateNextMecaId(): Promise<string> {
    const em = this.em.fork();

    // Get all profiles with MECA IDs
    const profiles = await em.find(Profile, {
      meca_id: { $ne: null }
    }, {
      fields: ['meca_id']
    });

    // Extract numeric MECA IDs
    const numericIds = profiles
      .map(p => parseInt(p.meca_id || '0', 10))
      .filter(id => !isNaN(id) && id >= 700800); // Only consider IDs in the new range

    // Find the highest ID in the new range
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 700799;

    // Return next ID
    return String(maxId + 1);
  }

  async create(data: Partial<Profile>): Promise<Profile> {
    // Auto-generate MECA ID if not provided
    if (!data.meca_id) {
      data.meca_id = await this.generateNextMecaId();
    }

    const em = this.em.fork();
    const profile = em.create(Profile, data as any);
    await em.persistAndFlush(profile);
    return profile;
  }

  async update(id: string, data: Partial<Profile>): Promise<Profile> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    em.assign(profile, data);
    await em.flush();
    return profile;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    await em.removeAndFlush(profile);
  }

  async getStats(): Promise<{ totalUsers: number; totalMembers: number }> {
    const em = this.em.fork();

    // Total users count
    const totalUsers = await em.count(Profile, {});

    // Total active members (membership_status = 'active')
    const totalMembers = await em.count(Profile, { membership_status: 'active' });

    return { totalUsers, totalMembers };
  }

  async findPublicProfiles(): Promise<Profile[]> {
    const em = this.em.fork();
    return em.find(Profile, { is_public: true }, {
      orderBy: { updated_at: 'DESC' }
    });
  }

  async findPublicById(id: string): Promise<Profile> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id, is_public: true });
    if (!profile) {
      throw new NotFoundException(`Public profile with ID ${id} not found`);
    }
    return profile;
  }

  /**
   * Search profiles by name, email, or MECA ID.
   * Returns up to 20 matching profiles for autocomplete.
   */
  async search(query: string, limit: number = 20): Promise<Profile[]> {
    const em = this.em.fork();
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    // Search by MECA ID (exact match or starts with)
    // Search by email (contains)
    // Search by first_name or last_name (contains)
    return em.find(Profile, {
      $or: [
        { meca_id: { $like: `${searchTerm}%` } },
        { email: { $like: `%${searchTerm}%` } },
        { first_name: { $ilike: `%${searchTerm}%` } },
        { last_name: { $ilike: `%${searchTerm}%` } },
      ],
    }, {
      limit,
      orderBy: { first_name: 'ASC', last_name: 'ASC' },
    });
  }

  /**
   * Creates a new user with password in Supabase Auth and creates corresponding profile.
   */
  async createWithPassword(dto: CreateUserWithPasswordDto): Promise<Profile> {
    // Validate password strength
    const validation = validatePassword(dto.password, MIN_PASSWORD_STRENGTH);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    // Check if email already exists
    const existingProfile = await this.findByEmail(dto.email);
    if (existingProfile) {
      throw new BadRequestException('A user with this email already exists');
    }

    // Create user in Supabase Auth
    const authResult = await this.supabaseAdmin.createUserWithPassword({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      forcePasswordChange: dto.forcePasswordChange ?? false,
    });

    if (!authResult.success || !authResult.userId) {
      throw new BadRequestException(authResult.error || 'Failed to create user in auth system');
    }

    // Create profile with the same ID as the Supabase user
    const em = this.em.fork();
    const mecaId = await this.generateNextMecaId();

    const now = new Date();
    const profile = em.create(Profile, {
      id: authResult.userId,
      email: dto.email,
      first_name: dto.firstName,
      last_name: dto.lastName,
      phone: dto.phone,
      role: dto.role || 'user',
      membership_status: 'inactive',
      meca_id: mecaId,
      force_password_change: dto.forcePasswordChange ?? false,
      account_type: AccountType.MEMBER,
      created_at: now,
      updated_at: now,
    });

    await em.persistAndFlush(profile);

    // Send email if requested
    if (dto.sendEmail) {
      await this.emailService.sendPasswordEmail({
        to: dto.email,
        firstName: dto.firstName,
        password: dto.password,
        isNewUser: true,
        forceChange: dto.forcePasswordChange ?? false,
      });
    }

    return profile;
  }

  /**
   * Resets the password for an existing user.
   */
  async resetPassword(userId: string, dto: ResetPasswordDto): Promise<{ success: boolean; emailSent: boolean }> {
    // Validate password strength
    const validation = validatePassword(dto.newPassword, MIN_PASSWORD_STRENGTH);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    // Verify user exists
    const profile = await this.findById(userId);

    // Reset password in Supabase Auth
    const result = await this.supabaseAdmin.resetPassword({
      userId,
      newPassword: dto.newPassword,
      forcePasswordChange: dto.forcePasswordChange ?? false,
    });

    if (!result.success) {
      throw new BadRequestException(result.error || 'Failed to reset password');
    }

    // Update force_password_change flag in profile
    const em = this.em.fork();
    const profileToUpdate = await em.findOne(Profile, { id: userId });
    if (profileToUpdate) {
      profileToUpdate.force_password_change = dto.forcePasswordChange ?? false;
      await em.flush();
    }

    // Send email if requested
    let emailSent = false;
    if (dto.sendEmail && profile.email) {
      const emailResult = await this.emailService.sendPasswordEmail({
        to: profile.email,
        firstName: profile.first_name,
        password: dto.newPassword,
        isNewUser: false,
        forceChange: dto.forcePasswordChange ?? false,
      });
      emailSent = emailResult.success;
    }

    return { success: true, emailSent };
  }

  /**
   * Clears the force password change flag after user has changed their password.
   */
  async clearForcePasswordChange(userId: string): Promise<void> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: userId });
    if (profile) {
      profile.force_password_change = false;
      await em.flush();
    }

    // Also update in Supabase user metadata
    await this.supabaseAdmin.setForcePasswordChange(userId, false);
  }

  /**
   * Generates a secure password that meets minimum strength requirements.
   */
  generatePassword(): string {
    return generateSecurePassword(14, MIN_PASSWORD_STRENGTH);
  }

  /**
   * Checks if email service is configured and ready to send emails.
   */
  isEmailServiceReady(): boolean {
    return this.emailService.isReady();
  }
}
