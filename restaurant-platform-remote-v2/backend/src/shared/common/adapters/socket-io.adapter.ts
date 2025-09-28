import { INestApplication, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  private readonly logger = new Logger(SocketIoAdapter.name);
  
  constructor(private app: INestApplication) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    // Get the underlying HTTP server from NestJS
    const httpServer = this.app.getHttpServer();
    
    const server = new SocketIOServer(httpServer, {
      ...options,
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3002',
          'http://localhost:3003',
        ],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      allowEIO3: true,
      transports: ['websocket', 'polling'],
    });
    
    this.logger.log(`Socket.io server attached to HTTP server`);
    return server;
  }
}