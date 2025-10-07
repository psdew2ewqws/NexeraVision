import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('IntegrationService');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3002);

  // Security middleware
  app.use(helmet());

  // Enable CORS for main backend
  app.enableCors({
    origin: [
      'http://localhost:3001', // Main backend
      'http://localhost:3000', // Frontend (if needed)
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-AUTH'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  await app.listen(port);

  logger.log(`=€ Integration Service is running on: http://localhost:${port}/api`);
  logger.log(`=á Ready to receive webhooks from delivery providers`);
  logger.log(`= Connected to backend: ${configService.get('BACKEND_URL')}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Integration Service:', error);
  process.exit(1);
});