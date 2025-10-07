import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './gateways/orders.gateway';
import { PrismaService } from '../../shared/database/prisma.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway, PrismaService],
  exports: [OrdersService, OrdersGateway],
})
export class OrdersModule {}
