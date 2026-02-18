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
   * Generates the next MECA ID. New memberships start from 701501 (after 701500).
   * Valid MECA ID range is 701500-799999 (NEW SYSTEM range).
   */
  async generateNextMecaId(): Promise<string> {
    const em = this.em.fork();

    // Get all profiles with MECA IDs
    const profiles = await em.find(Profile, {
      meca_id: { $ne: null }
    }, {
      fields: ['meca_id']
    });

    // Extract numeric MECA IDs - only consider NEW SYSTEM range (701500-799999)
    const numericIds = profiles
      .map(p => parseInt(p.meca_id || '0', 10))
      .filter(id => !isNaN(id) && id >= 701500 && id < 800000);

    // Find the highest ID in the new range
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 701500;

    // Return next ID (starts at 701501)
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

    // Ensure meca_id is always a string (frontend may send it as a number)
    if ('meca_id' in data) {
      if (data.meca_id === '' || data.meca_id === undefined || data.meca_id === null) {
        data.meca_id = profile.meca_id ?? undefined; // Keep existing value if blank sent
      } else {
        data.meca_id = String(data.meca_id);
      }
    }

    // Sync full_name when first_name or last_name changes
    const firstName = (data.first_name ?? profile.first_name ?? '').trim();
    const lastName = (data.last_name ?? profile.last_name ?? '').trim();
    if ('first_name' in data || 'last_name' in data) {
      data.full_name = [firstName, lastName].filter(Boolean).join(' ') || profile.full_name;
    }

    try {
      em.assign(profile, data);
      await em.flush();
      return profile;
    } catch (error: any) {
      this.logger.error(`Failed to update profile ${id}: ${error.message}`, error.stack);
      throw new BadRequestException(
        error.message?.includes('unique') || error.message?.includes('duplicate')
          ? 'A profile with this MECA ID already exists'
          : `Failed to update profile: ${error.message}`,
      );
    }
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

    // Use raw query to handle meca_id as integer with CAST to text
    // Search by MECA ID (starts with), email (contains), first_name, last_name, or full name (contains)
    const results = await em.getConnection().execute(
      `SELECT * FROM profiles
       WHERE CAST(meca_id AS TEXT) LIKE ?
          OR email LIKE ?
          OR first_name ILIKE ?
          OR last_name ILIKE ?
          OR CONCAT(first_name, ' ', last_name) ILIKE ?
       ORDER BY first_name ASC, last_name ASC
       LIMIT ?`,
      [`${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit],
    );

    // Return raw results - they have all the profile fields
    return results as Profile[];
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
        canApplyJudge: false,
        canApplyEventDirector: false,
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
      const errorMsg = result.error || 'Failed to reset password';
      // Provide more context if user doesn't exist in auth system
      if (errorMsg.toLowerCase().includes('not found') || errorMsg.toLowerCase().includes('user_not_found')) {
        throw new BadRequestException(`User does not exist in the authentication system. The profile may need to be re-created with a login. (${errorMsg})`);
      }
      throw new BadRequestException(errorMsg);
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
    try {
      const profile = await this.findById(targetUserId);
      if (!profile) {
        return {
          success: false,
          error: 'User profile not found in database',
        };
      }
    } catch {
      return {
        success: false,
        error: 'User profile not found in database',
      };
    }

    // Generate the impersonation link
    return this.supabaseAdmin.generateImpersonationLink(targetUserId, redirectTo);
  }

  // =============================================================================
  // Judge and Event Director Permission Management
  // =============================================================================

  /**
   * Updates judge permission for a profile.
   * When enabling, can optionally auto-complete the application.
   */
  async updateJudgePermission(
    profileId: string,
    adminId: string,
    data: {
      enabled: boolean;
      autoComplete?: boolean;
      expirationDate?: Date | null;
      judgeLevel?: string;
    },
  ): Promise<Profile> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: profileId });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${profileId} not found`);
    }

    const admin = await em.findOne(Profile, { id: adminId });
    if (!admin) {
      throw new NotFoundException(`Admin profile not found`);
    }

    // Update permission fields
    profile.canApplyJudge = data.enabled;

    if (data.enabled) {
      // Set audit trail when enabling
      profile.judgePermissionGrantedAt = new Date();
      profile.judgePermissionGrantedBy = admin;
    } else {
      // Clear audit trail when disabling (but keep the last values for history)
      // We don't clear grantedAt/grantedBy - they serve as historical record
    }

    // Update expiration date
    if (data.expirationDate !== undefined) {
      profile.judgeCertificationExpires = data.expirationDate || undefined;
    }

    await em.flush();

    return profile;
  }

  /**
   * Updates event director permission for a profile.
   * When enabling, can optionally auto-complete the application.
   */
  async updateEventDirectorPermission(
    profileId: string,
    adminId: string,
    data: {
      enabled: boolean;
      autoComplete?: boolean;
      expirationDate?: Date | null;
    },
  ): Promise<Profile> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: profileId });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${profileId} not found`);
    }

    const admin = await em.findOne(Profile, { id: adminId });
    if (!admin) {
      throw new NotFoundException(`Admin profile not found`);
    }

    // Update permission fields
    profile.canApplyEventDirector = data.enabled;

    if (data.enabled) {
      // Set audit trail when enabling
      profile.edPermissionGrantedAt = new Date();
      profile.edPermissionGrantedBy = admin;
    }

    // Update expiration date
    if (data.expirationDate !== undefined) {
      profile.edCertificationExpires = data.expirationDate || undefined;
    }

    await em.flush();

    return profile;
  }

  /**
   * Gets the combined Judge/ED status for a profile.
   * Returns permission status, application status, records, and event history.
   */
  async getJudgeEdStatus(profileId: string): Promise<{
    judge: {
      permissionEnabled: boolean;
      status: string;
      grantedAt: Date | null;
      grantedBy: { id: string; name: string } | null;
      expirationDate: Date | null;
      judgeRecord: { id: string; level: string; isActive: boolean } | null;
      application: { id: string; status: string; submittedAt: Date } | null;
    };
    eventDirector: {
      permissionEnabled: boolean;
      status: string;
      grantedAt: Date | null;
      grantedBy: { id: string; name: string } | null;
      expirationDate: Date | null;
      edRecord: { id: string; isActive: boolean } | null;
      application: { id: string; status: string; submittedAt: Date } | null;
    };
    eventsJudged: Array<{ id: string; name: string; date: Date }>;
    eventsDirected: Array<{ id: string; name: string; date: Date }>;
  }> {
    const em = this.em.fork();

    // Get profile with permission granted by relationships
    const profile = await em.findOne(Profile, { id: profileId }, {
      populate: ['judgePermissionGrantedBy', 'edPermissionGrantedBy'],
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${profileId} not found`);
    }

    // Get judge record if exists
    const judgeRecord = await em.getConnection().execute(
      `SELECT id, level, is_active FROM judges WHERE user_id = ?`,
      [profileId],
    );

    // Get judge application if exists
    const judgeApplication = await em.getConnection().execute(
      `SELECT id, status, application_date FROM judge_applications WHERE user_id = ? ORDER BY application_date DESC LIMIT 1`,
      [profileId],
    );

    // Get ED record if exists
    const edRecord = await em.getConnection().execute(
      `SELECT id, is_active FROM event_directors WHERE user_id = ?`,
      [profileId],
    );

    // Get ED application if exists
    const edApplication = await em.getConnection().execute(
      `SELECT id, status, application_date FROM event_director_applications WHERE user_id = ? ORDER BY application_date DESC LIMIT 1`,
      [profileId],
    );

    // Get events judged
    const eventsJudged = await em.getConnection().execute(
      `SELECT e.id, e.title as name, e.event_date as date
       FROM event_judge_assignments eja
       JOIN events e ON eja.event_id = e.id
       JOIN judges j ON eja.judge_id = j.id
       WHERE j.user_id = ? AND eja.status IN ('accepted', 'confirmed', 'completed')
       ORDER BY e.event_date DESC
       LIMIT 20`,
      [profileId],
    );

    // Get events directed
    const eventsDirected = await em.getConnection().execute(
      `SELECT e.id, e.title as name, e.event_date as date
       FROM event_director_assignments eda
       JOIN events e ON eda.event_id = e.id
       JOIN event_directors ed ON eda.event_director_id = ed.id
       WHERE ed.user_id = ? AND eda.status IN ('accepted', 'confirmed', 'completed')
       ORDER BY e.event_date DESC
       LIMIT 20`,
      [profileId],
    );

    // Calculate judge status
    const judgeStatus = this.calculateJudgeStatus(
      profile.canApplyJudge,
      profile.judgeCertificationExpires,
      judgeRecord[0],
      judgeApplication[0],
    );

    // Calculate ED status
    const edStatus = this.calculateEdStatus(
      profile.canApplyEventDirector,
      profile.edCertificationExpires,
      edRecord[0],
      edApplication[0],
    );

    return {
      judge: {
        permissionEnabled: profile.canApplyJudge,
        status: judgeStatus,
        grantedAt: profile.judgePermissionGrantedAt || null,
        grantedBy: profile.judgePermissionGrantedBy
          ? {
              id: profile.judgePermissionGrantedBy.id,
              name: profile.judgePermissionGrantedBy.full_name ||
                    `${profile.judgePermissionGrantedBy.first_name || ''} ${profile.judgePermissionGrantedBy.last_name || ''}`.trim() ||
                    'Unknown',
            }
          : null,
        expirationDate: profile.judgeCertificationExpires || null,
        judgeRecord: judgeRecord[0]
          ? {
              id: judgeRecord[0].id,
              level: judgeRecord[0].level,
              isActive: judgeRecord[0].is_active,
            }
          : null,
        application: judgeApplication[0]
          ? {
              id: judgeApplication[0].id,
              status: judgeApplication[0].status,
              submittedAt: judgeApplication[0].application_date,
            }
          : null,
      },
      eventDirector: {
        permissionEnabled: profile.canApplyEventDirector,
        status: edStatus,
        grantedAt: profile.edPermissionGrantedAt || null,
        grantedBy: profile.edPermissionGrantedBy
          ? {
              id: profile.edPermissionGrantedBy.id,
              name: profile.edPermissionGrantedBy.full_name ||
                    `${profile.edPermissionGrantedBy.first_name || ''} ${profile.edPermissionGrantedBy.last_name || ''}`.trim() ||
                    'Unknown',
            }
          : null,
        expirationDate: profile.edCertificationExpires || null,
        edRecord: edRecord[0]
          ? {
              id: edRecord[0].id,
              isActive: edRecord[0].is_active,
            }
          : null,
        application: edApplication[0]
          ? {
              id: edApplication[0].id,
              status: edApplication[0].status,
              submittedAt: edApplication[0].application_date,
            }
          : null,
      },
      eventsJudged: eventsJudged.map((e: any) => ({
        id: e.id,
        name: e.name,
        date: e.date,
      })),
      eventsDirected: eventsDirected.map((e: any) => ({
        id: e.id,
        name: e.name,
        date: e.date,
      })),
    };
  }

  /**
   * Calculates the display status for judge permissions
   */
  private calculateJudgeStatus(
    permissionEnabled: boolean,
    certificationExpires: Date | undefined,
    judgeRecord: any,
    application: any,
  ): string {
    if (!permissionEnabled) return 'Disabled';
    if (certificationExpires && certificationExpires < new Date()) return 'Expired';
    if (judgeRecord?.is_active) return 'Approved';
    if (application?.status === 'pending' || application?.status === 'under_review') return 'Pending';
    if (application?.status === 'rejected') return 'Rejected';
    return 'Not Applied';
  }

  /**
   * Calculates the display status for event director permissions
   */
  private calculateEdStatus(
    permissionEnabled: boolean,
    certificationExpires: Date | undefined,
    edRecord: any,
    application: any,
  ): string {
    if (!permissionEnabled) return 'Disabled';
    if (certificationExpires && certificationExpires < new Date()) return 'Expired';
    if (edRecord?.is_active) return 'Approved';
    if (application?.status === 'pending' || application?.status === 'under_review') return 'Pending';
    if (application?.status === 'rejected') return 'Rejected';
    return 'Not Applied';
  }
}
