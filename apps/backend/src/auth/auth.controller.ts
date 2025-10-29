import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * AuthController - Handles authentication endpoints
 *
 * Provides REST API for authentication operations.
 * Frontend calls these instead of using Supabase directly.
 */
@Controller('api/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {
    console.log('🔧 AuthController constructor called');
    console.log('  authService:', this.authService ? 'PRESENT' : 'UNDEFINED');
    console.log('  authService type:', typeof this.authService);
  }

  /**
   * Sign in with email/password
   * POST /api/auth/signin
   */
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() body: { email: string; password: string },
  ) {
    const { email, password } = body;

    console.log('🔐 SignIn attempt:', email);

    if (!email || !password) {
      throw new UnauthorizedException('Email and password required');
    }

    const result = await this.authService.signIn(email, password);

    if (result.error) {
      console.log('❌ SignIn failed:', result.error);
      throw new UnauthorizedException(result.error);
    }

    console.log('✅ SignIn successful:', email);
    return {
      user: result.user,
      session: result.session,
    };
  }

  /**
   * Sign up new user
   * POST /api/auth/signup
   */
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signUp(
    @Body() body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    },
  ) {
    const { email, password, firstName, lastName } = body;

    if (!email || !password || !firstName || !lastName) {
      throw new UnauthorizedException('All fields required');
    }

    const result = await this.authService.signUp(
      email,
      password,
      firstName,
      lastName,
    );

    if (result.error) {
      throw new UnauthorizedException(result.error);
    }

    return {
      user: result.user,
      session: result.session,
    };
  }

  /**
   * Sign out current user
   * POST /api/auth/signout
   */
  @Post('signout')
  @HttpCode(HttpStatus.OK)
  async signOut() {
    const result = await this.authService.signOut();

    if (result.error) {
      throw new UnauthorizedException(result.error);
    }

    return { message: 'Signed out successfully' };
  }

  /**
   * Get current session
   * GET /api/auth/session
   */
  @Get('session')
  async getSession(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No valid authorization header');
    }

    const token = authHeader.substring(7);
    const result = await this.authService.getSession(token);

    if (result.error) {
      throw new UnauthorizedException(result.error);
    }

    return { user: result.user };
  }

  /**
   * Update password
   * POST /api/auth/update-password
   */
  @Post('update-password')
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @Headers('authorization') authHeader: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No valid authorization header');
    }

    const token = authHeader.substring(7);
    const { newPassword } = body;

    if (!newPassword) {
      throw new UnauthorizedException('New password required');
    }

    // Verify current password by re-authenticating
    // This is handled client-side for now

    const result = await this.authService.updatePassword(token, newPassword);

    if (result.error) {
      throw new UnauthorizedException(result.error);
    }

    return { message: 'Password updated successfully' };
  }

  /**
   * Request password reset
   * POST /api/auth/reset-password
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: { email: string; redirectUrl: string },
  ) {
    const { email, redirectUrl } = body;

    if (!email) {
      throw new UnauthorizedException('Email required');
    }

    const result = await this.authService.resetPassword(
      email,
      redirectUrl || `${process.env.FRONTEND_URL}/reset-password`,
    );

    if (result.error) {
      throw new UnauthorizedException(result.error);
    }

    return { message: 'Password reset email sent' };
  }

  /**
   * Verify token (for middleware/guards)
   * GET /api/auth/verify
   */
  @Get('verify')
  async verifyToken(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No valid authorization header');
    }

    const token = authHeader.substring(7);
    const user = await this.authService.verifyToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return { valid: true, user };
  }
}
