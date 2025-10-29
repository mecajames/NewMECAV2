import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { EntityManager } from '@mikro-orm/core';
import { Profile } from '../profiles/profiles.entity';

/**
 * AuthGuard - Verifies Supabase JWT and attaches user profile to request
 *
 * Usage:
 * @UseGuards(AuthGuard)
 *
 * After this guard passes, request.user will contain the Profile entity
 * Last updated: 2025-10-28
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private supabase;

  constructor(private readonly em: EntityManager) {
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      // Verify JWT with Supabase
      console.log('🔍 AuthGuard - Verifying token...');
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data.user) {
        console.log('❌ AuthGuard - Token verification failed:', error?.message);
        throw new UnauthorizedException('Invalid or expired token');
      }

      console.log('✅ AuthGuard - Token verified for user:', data.user.id);

      // Fetch user profile from database
      const profile = await this.em.findOne(Profile, { id: data.user.id });

      if (!profile) {
        console.log('❌ AuthGuard - User profile not found:', data.user.id);
        throw new UnauthorizedException('User profile not found');
      }

      console.log('✅ AuthGuard - Profile found:', profile.id);

      // Attach user to request for use in controllers
      request.user = profile;

      return true;
    } catch (error) {
      console.log('❌ AuthGuard - Unexpected error:', error.message);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
