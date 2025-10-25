import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * NestJS Application Bootstrap
 *
 * This is the new entry point for the NestJS backend.
 * It replaces the old Express server in index.ts
 *
 * To use this instead of the old server:
 * - Update package.json "main" field to point to dist/main.js
 * - Or run: npm run dev:nestjs (once script is added)
 */
async function bootstrap() {
  try {
    // Create NestJS application
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Enable CORS
    app.enableCors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    });

    // Get port from environment (use 3002 temporarily to avoid conflicts)
    const port = process.env.PORT || 3002;

    // Start server
    await app.listen(port);

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║  🚀 NestJS Backend Server Running                         ║');
    console.log('║                                                           ║');
    console.log(`║  📍 URL: http://localhost:${port}                         ║`);
    console.log(`║  🏥 Health: http://localhost:${port}/health               ║`);
    console.log('║  📚 API: http://localhost:' + port + '/api/*                     ║');
    console.log('║                                                           ║');
    console.log('║  ✨ Using NestJS with decorators & dependency injection  ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to start NestJS server:', error);
    process.exit(1);
  }
}

bootstrap();

