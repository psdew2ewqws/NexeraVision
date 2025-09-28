import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('POSAdapterService');

  try {
    // Create the main HTTP application
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const port = configService.get<number>('SERVICE_PORT') || 4002;

    // Global validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // CORS for service communication
    app.enableCors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    });

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('POS Adapter Service')
      .setDescription('Universal POS Systems Integration Adapter')
      .setVersion('1.0.0')
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
        },
        'api-key',
      )
      .addTag('POS Adapters', 'POS system integration adapters')
      .addTag('Menu Sync', 'Menu synchronization operations')
      .addTag('Order Sync', 'Order synchronization operations')
      .addTag('Inventory', 'Inventory management operations')
      .addTag('Health', 'Service health and monitoring')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Create microservice
    const microservice = app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: port + 1000, // TCP port: 5002
      },
    });

    // Start both HTTP and TCP services
    await app.startAllMicroservices();
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 POS Adapter Service running on port ${port}`);
    logger.log(`🔗 HTTP API: http://localhost:${port}`);
    logger.log(`🔗 TCP Service: localhost:${port + 1000}`);
    logger.log(`📚 Documentation: http://localhost:${port}/api/docs`);

  } catch (error) {
    logger.error('❌ Failed to start POS Adapter Service:', error);
    process.exit(1);
  }
}

bootstrap();