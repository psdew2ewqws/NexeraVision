import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import helmet from 'helmet';
import * as compression from 'compression';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SocketIoAdapter } from './common/adapters/socket-io.adapter';
import { EnvValidationService } from './config/env-validation';

async function bootstrap() {
  // Validate environment before creating the app
  const envValidation = new EnvValidationService();
  const envConfig = envValidation.getConfig();
  
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Enhanced security middleware for production
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for file uploads
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  // Compression
  app.use(compression());

  // Development-friendly rate limiting - much more permissive for development
  const isDevelopment = envConfig.NODE_ENV === 'development';
  
  const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 50 : 5, // Allow more attempts in development
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip, // Use IP as key
    skip: (req) => isDevelopment && req.path.includes('/health'), // Skip health checks in dev
  });

  const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 100, // Much higher limit for development
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isDevelopment && req.path.includes('/health'), // Skip health checks in dev
  });

  // Apply stricter rate limiting to auth endpoints
  app.use('/api/v1/auth/login', authRateLimit);
  app.use('/api/v1/auth/register', authRateLimit);
  app.use('/api/v1/auth/refresh', authRateLimit);
  
  // General rate limiting for all other endpoints
  app.use(generalRateLimit);

  // CORS configuration for restaurant frontends
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:8080',
      'https://admin.restaurantplatform.com',
      'https://pos.restaurantplatform.com',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-ID', 'X-Branch-ID'],
    credentials: true,
  });

  // Global validation pipe (strict validation like Picolinate)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Serve static files for uploaded images
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // API prefix for versioning
  app.setGlobalPrefix('api/v1');

  // Swagger documentation (like Picolinate's API docs)
  const config = new DocumentBuilder()
    .setTitle('Restaurant Management Platform API')
    .setDescription('Enterprise Restaurant Management System - Inspired by Picolinate architecture but built with modern NestJS')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Companies', 'Restaurant company management')
    .addTag('Branches', 'Restaurant branch operations')
    .addTag('Orders', 'Order processing and management')
    .addTag('Customers', 'Customer relationship management')
    .addTag('Menu', 'Menu and inventory management')
    .addTag('Analytics', 'Business intelligence and reporting')
    .addTag('Integrations', 'POS and delivery partner integrations')
    .addTag('Real-time', 'WebSocket connections and live updates')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Configure Socket.io adapter for WebSocket connections with CORS
  const socketAdapter = new SocketIoAdapter(app);
  app.useWebSocketAdapter(socketAdapter);

  // Start server
  const port = configService.get('PORT', 3001);
  await app.listen(port);

  logger.log(`🚀 Restaurant Platform API is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🏗️  Architecture: NestJS + PostgreSQL + Redis`);
  logger.log(`🎯 Inspired by: Picolinate production patterns`);
}

bootstrap().catch((error) => {
  console.error('Failed to start the application:', error);
  process.exit(1);
});