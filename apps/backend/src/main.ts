import 'dotenv/config';
import 'reflect-metadata';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './all-exceptions.filter';

async function bootstrap() {
  // Parse CORS_ORIGIN to handle multiple origins
  if (!process.env.CORS_ORIGIN && process.env.NODE_ENV === 'production') {
    console.warn('WARNING: CORS_ORIGIN is not set in production. Defaulting to localhost:5173. Set CORS_ORIGIN environment variable.');
  }
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : 'http://localhost:5173';

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
    // Enable raw body parsing for Stripe webhooks
    rawBody: true,
  });

  // Security headers (CSP disabled to avoid breaking frontend asset loading)
  app.use(helmet({ contentSecurityPolicy: false }));

  // Global exception filter to catch and log all errors
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
}

bootstrap();
