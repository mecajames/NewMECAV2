import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Root Application Controller
 * Provides health check endpoint and dashboard statistics
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
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      architecture: 'NestJS',
      database: 'PostgreSQL (MikroORM)',
    };
  }

  /**
   * Dashboard statistics endpoint
   * GET /api/statistics
   */
  @Get('api/statistics')
  async getStatistics() {
    return this.appService.getStatistics();
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
        statistics: '/api/statistics',
      },
    };
  }
}
