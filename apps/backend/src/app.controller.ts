import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Root Application Controller
 * Provides health check endpoint
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint
   * GET /health
   */
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  /**
   * Root endpoint
   * GET /
   */
  @Get()
  getRoot() {
    return {
      message: 'MECA Backend API (NestJS)',
      version: '2.0.0',
      architecture: '3-tier (Database ← NestJS Backend ← Frontend)',
      documentation: 'See ONBOARDING.md',
      endpoints: {
        health: '/health',
        api: '/api/*',
      },
    };
  }
}
