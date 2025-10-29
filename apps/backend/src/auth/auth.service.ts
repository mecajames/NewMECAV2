import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * AuthService - Wraps Supabase authentication
 *
 * This service centralizes all Supabase auth operations in the backend.
 * Frontend will call these endpoints instead of using Supabase directly.
 *
 * Future: Can be replaced with native JWT auth without changing frontend.
 */
@Injectable()
export class AuthService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;

      console.log('🔐 AuthService constructor - Loading Supabase config...');
      console.log('  SUPABASE_URL:', supabaseUrl);
      console.log('  SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'NOT SET');

      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase environment variables');
        console.log('AuthService will not be available');
        return;
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase client created successfully');
    } catch (error) {
      console.error('❌ Error creating Supabase client:', error);
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    if (!this.supabase) {
      return { user: null, session: null, error: 'Auth service not initialized' };
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, session: null, error: error.message };
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  }

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, firstName: string, lastName: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user) {
      return { user: null, error: error?.message || 'Sign up failed' };
    }

    // Create profile in database
    // Note: In production, this should use MikroORM
    const { error: profileError } = await this.supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role: 'user',
        membership_status: 'none',
      });

    if (profileError) {
      return { user: null, error: profileError.message };
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  }

  /**
   * Sign out current user
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  }

  /**
   * Get current session
   */
  async getSession(accessToken: string) {
    const { data, error } = await this.supabase.auth.getUser(accessToken);

    if (error) {
      return { user: null, error: error.message };
    }

    return {
      user: data.user,
      error: null,
    };
  }

  /**
   * Update user password
   */
  async updatePassword(accessToken: string, newPassword: string) {
    // Set the session first
    const { data: { user }, error: userError } = await this.supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return { error: 'Invalid session' };
    }

    // Update password
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string, redirectUrl: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  }

  /**
   * Verify access token and return user
   */
  async verifyToken(accessToken: string) {
    const { data, error } = await this.supabase.auth.getUser(accessToken);

    if (error) {
      return null;
    }

    return data.user;
  }
}
