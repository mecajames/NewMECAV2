import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Parse CORS_ORIGIN to handle multiple origins
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : 'http://localhost:5173';

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
}

bootstrap();
