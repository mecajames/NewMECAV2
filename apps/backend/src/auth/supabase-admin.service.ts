import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateSecurePassword, validatePassword, MIN_PASSWORD_STRENGTH } from '../utils/password-generator';

export interface CreateUserWithPasswordDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  forcePasswordChange?: boolean;
}

export interface ResetPasswordDto {
  userId: string;
  newPassword: string;
  forcePasswordChange?: boolean;
}

export interface CreateUserResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  error?: string;
}

@Injectable()
export class SupabaseAdminService {
  private readonly logger = new Logger(SupabaseAdminService.name);
  private supabaseAdmin: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      this.logger.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
      throw new Error('Supabase configuration missing');
    }

    this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Creates a new user in Supabase Auth with a password
   */
  async createUserWithPassword(dto: CreateUserWithPasswordDto): Promise<CreateUserResult> {
    try {
      // Validate password strength
      const validation = validatePassword(dto.password, MIN_PASSWORD_STRENGTH);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // Create user in Supabase Auth
      const { data, error } = await this.supabaseAdmin.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true, // Auto-confirm email since admin is creating the user
        user_metadata: {
          first_name: dto.firstName,
          last_name: dto.lastName,
          force_password_change: dto.forcePasswordChange ?? false,
        },
      });

      if (error) {
        this.logger.error(`Failed to create user: ${error.message}`);
        return {
          success: false,
          error: error.message,
        };
      }

      this.logger.log(`Created user ${dto.email} with ID: ${data.user.id}`);
      return {
        success: true,
        userId: data.user.id,
      };
    } catch (error) {
      this.logger.error(`Error creating user: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Resets a user's password (admin operation)
   */
  async resetPassword(dto: ResetPasswordDto): Promise<ResetPasswordResult> {
    try {
      // Validate password strength
      const validation = validatePassword(dto.newPassword, MIN_PASSWORD_STRENGTH);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // Update user password
      const { error: updateError } = await this.supabaseAdmin.auth.admin.updateUserById(
        dto.userId,
        {
          password: dto.newPassword,
          user_metadata: {
            force_password_change: dto.forcePasswordChange ?? false,
          },
        }
      );

      if (updateError) {
        this.logger.error(`Failed to reset password: ${updateError.message}`);
        return {
          success: false,
          error: updateError.message,
        };
      }

      this.logger.log(`Password reset for user ID: ${dto.userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error resetting password: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sets or clears the force password change flag for a user
   */
  async setForcePasswordChange(userId: string, force: boolean): Promise<ResetPasswordResult> {
    try {
      const { error } = await this.supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          force_password_change: force,
        },
      });

      if (error) {
        this.logger.error(`Failed to update force password change: ${error.message}`);
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error updating force password change: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gets user metadata from Supabase Auth
   */
  async getUserMetadata(userId: string): Promise<{ forcePasswordChange?: boolean } | null> {
    try {
      const { data, error } = await this.supabaseAdmin.auth.admin.getUserById(userId);

      if (error || !data.user) {
        return null;
      }

      return {
        forcePasswordChange: data.user.user_metadata?.force_password_change ?? false,
      };
    } catch {
      return null;
    }
  }

  /**
   * Generates a secure password that meets minimum strength requirements
   */
  generatePassword(length: number = 14): string {
    return generateSecurePassword(length, MIN_PASSWORD_STRENGTH);
  }

  /**
   * Deletes a user from Supabase Auth
   */
  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        this.logger.error(`Failed to delete user: ${error.message}`);
        return {
          success: false,
          error: error.message,
        };
      }

      this.logger.log(`Deleted user with ID: ${userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting user: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
