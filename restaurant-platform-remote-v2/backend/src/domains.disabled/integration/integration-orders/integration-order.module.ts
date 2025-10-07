import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { IntegrationOrderService } from './integration-order.service';
import { OrderStateMachine } from './order-state.machine';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [IntegrationOrderService, OrderStateMachine, PrismaService],
  exports: [IntegrationOrderService, OrderStateMachine],
})
export class IntegrationOrderModule {}
