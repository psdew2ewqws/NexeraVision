import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('NEXARA-Service');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Security middleware
    app.use(helmet());

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // CORS configuration for restaurant platform integration
    app.enableCors({
      origin: ['http://localhost:3001', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      credentials: true,
    });

    // API prefix
    app.setGlobalPrefix('api');

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('NEXARA Integration Platform')
      .setDescription('Multi-tenant delivery integration platform for restaurant management')
      .setVersion('1.0')
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
        },
        'api-key',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Start server on port 3002 (CRITICAL - restaurant expects NEXARA here)
    const port = process.env.PORT || 3002;
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 NEXARA Integration Platform running on http://localhost:${port}`);
    logger.log(`📚 API Documentation available at http://localhost:${port}/api/docs`);
    logger.log(`🔗 Ready to forward events to restaurant platform at http://localhost:3001`);

  } catch (error) {
    logger.error('Failed to start NEXARA Integration Platform', error);
    process.exit(1);
  }
}

bootstrap();