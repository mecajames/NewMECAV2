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
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private supabase;

  constructor(private readonly em: EntityManager) {
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      process.env.SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
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
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data.user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Fetch user profile from database
      const profile = await this.em.findOne(Profile, { id: data.user.id });

      if (!profile) {
        throw new UnauthorizedException('User profile not found');
      }

      // Attach user to request for use in controllers
      request.user = profile;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
