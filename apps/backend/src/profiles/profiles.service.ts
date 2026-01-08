import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
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
  mecaId?: string; // Optional - use existing MECA ID for migrated users from old system
}

export interface ResetPasswordDto {
  newPassword: string;
  forcePasswordChange?: boolean;
  sendEmail?: boolean;
}

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

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
      .filter(id => !isNaN(id) && id >= 701500); // Only consider IDs in the new range (starting from 701500)

    // Find the highest ID in the new range
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 701499;

    // Return next ID (starts at 701500)
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
   * Uses atomic operation - if profile creation fails, the auth user is rolled back.
   */
  async createWithPassword(dto: CreateUserWithPasswordDto): Promise<Profile> {
    // Validate password strength first (no side effects)
    const validation = validatePassword(dto.password, MIN_PASSWORD_STRENGTH);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    // Check if email already exists in profiles table
    const existingProfile = await this.findByEmail(dto.email);
    if (existingProfile) {
      throw new BadRequestException('A user with this email already exists');
    }

    // Check if email already exists in Supabase Auth (orphaned user)
    const existingAuthUser = await this.supabaseAdmin.findUserByEmail(dto.email);
    if (existingAuthUser.userId) {
      throw new BadRequestException('A user with this email address has already been registered');
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
    // Wrap in try-catch to rollback auth user if profile creation fails
    try {
      const em = this.em.fork();

      // Use provided MECA ID (for migrated users) or generate a new one
      let mecaId: string;
      if (dto.mecaId) {
        // Validate format - must be 6 digits
        if (!/^\d{6}$/.test(dto.mecaId)) {
          throw new BadRequestException('MECA ID must be exactly 6 digits');
        }
        // Check if MECA ID is already in use
        const existingWithMecaId = await em.findOne(Profile, { meca_id: dto.mecaId });
        if (existingWithMecaId) {
          throw new BadRequestException(`MECA ID ${dto.mecaId} is already assigned to another user`);
        }
        mecaId = dto.mecaId;
      } else {
        mecaId = await this.generateNextMecaId();
      }

      const now = new Date();
      const fullName = [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim() || dto.email;
      const profile = em.create(Profile, {
        id: authResult.userId,
        email: dto.email,
        first_name: dto.firstName,
        last_name: dto.lastName,
        full_name: fullName,
        phone: dto.phone,
        role: dto.role || 'user',
        membership_status: 'none',
        meca_id: mecaId,
        force_password_change: dto.forcePasswordChange ?? false,
        account_type: AccountType.MEMBER,
        created_at: now,
        updated_at: now,
      });

      await em.persistAndFlush(profile);

      // Send email if requested (after successful profile creation)
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
    } catch (error) {
      // Rollback: delete the Supabase Auth user since profile creation failed
      this.logger.error(`Profile creation failed, rolling back auth user: ${error}`);
      await this.supabaseAdmin.deleteUser(authResult.userId);
      throw error;
    }
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

  /**
   * Fully deletes a user from both the profiles table AND Supabase Auth.
   * Use this for complete user removal.
   */
  async deleteUserCompletely(userId: string): Promise<{ success: boolean; message: string }> {
    const em = this.em.fork();

    // First get the profile to check if it exists
    const profile = await em.findOne(Profile, { id: userId });

    // Delete from Supabase Auth (do this first since it's harder to recover)
    const authDeleteResult = await this.supabaseAdmin.deleteUser(userId);
    if (!authDeleteResult.success) {
      this.logger.warn(`Failed to delete user from auth: ${authDeleteResult.error}`);
      // Continue anyway - user might not exist in auth
    }

    // Delete from profiles table
    if (profile) {
      await em.removeAndFlush(profile);
      this.logger.log(`Deleted user ${userId} from profiles table`);
    }

    return {
      success: true,
      message: `User deleted from ${profile ? 'profiles and ' : ''}auth system`,
    };
  }

  /**
   * Finds a user by email and fully deletes them from both profiles table AND Supabase Auth.
   */
  async deleteUserCompletelyByEmail(email: string): Promise<{ success: boolean; message: string }> {
    const em = this.em.fork();

    // Find the profile by email
    const profile = await em.findOne(Profile, { email });

    // Also check Supabase Auth
    const authUser = await this.supabaseAdmin.findUserByEmail(email);

    if (!profile && !authUser.userId) {
      return {
        success: false,
        message: 'User not found in profiles or auth system',
      };
    }

    // Delete from Supabase Auth first
    if (authUser.userId) {
      const authDeleteResult = await this.supabaseAdmin.deleteUser(authUser.userId);
      if (!authDeleteResult.success) {
        this.logger.warn(`Failed to delete user from auth: ${authDeleteResult.error}`);
      } else {
        this.logger.log(`Deleted user ${email} from Supabase Auth`);
      }
    }

    // Delete from profiles table
    if (profile) {
      await em.removeAndFlush(profile);
      this.logger.log(`Deleted user ${email} from profiles table`);
    }

    return {
      success: true,
      message: `User ${email} deleted from ${profile ? 'profiles' : ''}${profile && authUser.userId ? ' and ' : ''}${authUser.userId ? 'auth system' : ''}`,
    };
  }

  /**
   * Cleans up an orphaned auth user (exists in Supabase Auth but not in profiles table).
   * This can happen if user creation fails partway through.
   */
  async cleanupOrphanedAuthUser(email: string): Promise<{ success: boolean; message: string }> {
    // First check if user exists in profiles table
    const existingProfile = await this.findByEmail(email);
    if (existingProfile) {
      return {
        success: false,
        message: 'User exists in profiles table - this is not an orphaned user',
      };
    }

    // Check if user exists in Supabase Auth
    const authUser = await this.supabaseAdmin.findUserByEmail(email);
    if (!authUser.userId) {
      return {
        success: false,
        message: 'User not found in auth system',
      };
    }

    // Delete the orphaned auth user
    const deleteResult = await this.supabaseAdmin.deleteUser(authUser.userId);
    if (!deleteResult.success) {
      return {
        success: false,
        message: `Failed to delete auth user: ${deleteResult.error}`,
      };
    }

    this.logger.log(`Cleaned up orphaned auth user: ${email}`);
    return {
      success: true,
      message: 'Orphaned auth user deleted successfully',
    };
  }

  /**
   * Fully deletes a user by ID from profiles, memberships, and Supabase Auth.
   * This is the comprehensive delete for admin use.
   */
  async deleteUserCompletelyById(userId: string): Promise<{
    success: boolean;
    message: string;
    deletedMemberships?: number;
  }> {
    const em = this.em.fork();

    // Get the profile first
    const profile = await em.findOne(Profile, { id: userId });

    // Delete all memberships for this user
    const membershipsResult = await em.getConnection().execute(
      'DELETE FROM memberships WHERE user_id = ? RETURNING id',
      [userId]
    );
    const deletedMemberships = membershipsResult.length;

    if (deletedMemberships > 0) {
      this.logger.log(`Deleted ${deletedMemberships} memberships for user ${userId}`);
    }

    // Delete from Supabase Auth
    const authDeleteResult = await this.supabaseAdmin.deleteUser(userId);
    if (!authDeleteResult.success) {
      this.logger.warn(`Failed to delete user from auth: ${authDeleteResult.error}`);
    } else {
      this.logger.log(`Deleted user ${userId} from Supabase Auth`);
    }

    // Delete from profiles table
    if (profile) {
      await em.removeAndFlush(profile);
      this.logger.log(`Deleted user ${userId} from profiles table`);
    }

    return {
      success: true,
      message: `User deleted successfully`,
      deletedMemberships,
    };
  }

  /**
   * Generates an impersonation link for admin to view the app as another user.
   * Returns a magic link that signs the admin in as the target user.
   */
  async generateImpersonationLink(
    targetUserId: string,
    redirectTo: string,
  ): Promise<{ success: boolean; link?: string; error?: string }> {
    // Verify the target user exists in profiles
    const profile = await this.findById(targetUserId);
    if (!profile) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Generate the impersonation link
    return this.supabaseAdmin.generateImpersonationLink(targetUserId, redirectTo);
  }
}
