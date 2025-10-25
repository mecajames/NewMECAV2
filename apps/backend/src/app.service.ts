import { Injectable } from '@nestjs/common';

/**
 * Root Application Service
 * Provides business logic for health check
 */
@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      architecture: 'NestJS',
      database: 'PostgreSQL (MikroORM)',
    };
  }
}
