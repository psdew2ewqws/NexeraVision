import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import * as helmet from 'helmet';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ErrorsInterceptor } from './common/interceptors/errors.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>('API_PORT') || 4000;
    const apiPrefix = configService.get<string>('API_PREFIX') || 'api/v1';

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // Compression
    app.use(compression());

    // CORS configuration
    app.enableCors({
      origin: process.env.NODE_ENV === 'production'
        ? ['https://your-domain.com']
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Organization-ID',
        'X-Correlation-ID'
      ],
      credentials: true,
    });

    // Global prefix
    app.setGlobalPrefix(apiPrefix);

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: process.env.NODE_ENV === 'production',
        validationError: {
          target: false,
          value: false,
        },
      }),
    );

    // Global interceptors
    app.useGlobalInterceptors(
      new ResponseInterceptor(),
      new LoggingInterceptor(),
      new ErrorsInterceptor()
    );

    // Swagger API documentation
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
      const config = new DocumentBuilder()
        .setTitle('Integration Platform API')
        .setDescription('Enterprise Integration Platform for Restaurant POS and Delivery Systems')
        .setVersion('1.0.0')
        .addBearerAuth(
          {
            description: 'JWT Authorization header',
            name: 'Authorization',
            bearerFormat: 'Bearer',
            scheme: 'Bearer',
            type: 'http',
            in: 'Header'
          },
          'access-token',
        )
        .addApiKey(
          {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
            description: 'API Key for service-to-service authentication'
          },
          'api-key',
        )
        .addTag('Authentication', 'User authentication and authorization')
        .addTag('Organizations', 'Multi-tenant organization management')
        .addTag('Users', 'User management and profiles')
        .addTag('Integration Providers', 'POS and delivery platform providers')
        .addTag('Integration Connections', 'Active integrations management')
        .addTag('Webhooks', 'Webhook configuration and management')
        .addTag('Menu Sync', 'Menu synchronization across platforms')
        .addTag('Order Sync', 'Order synchronization and management')
        .addTag('Analytics', 'Integration performance and insights')
        .addTag('Health', 'System health and monitoring')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: 'none',
          filter: true,
          showRequestHeaders: true,
          tryItOutEnabled: true,
        },
        customSiteTitle: 'Integration Platform API Documentation',
        customfavIcon: '/favicon.ico',
        customCss: '.swagger-ui .topbar { display: none }',
      });

      logger.log(`📚 API Documentation available at http://localhost:${port}/${apiPrefix}/docs`);
    }

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'integration-platform-api',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      });
    });

    // Start server
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 Integration Platform API running on port ${port}`);
    logger.log(`🔗 API Endpoint: http://localhost:${port}/${apiPrefix}`);
    logger.log(`📊 Health Check: http://localhost:${port}/health`);
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();