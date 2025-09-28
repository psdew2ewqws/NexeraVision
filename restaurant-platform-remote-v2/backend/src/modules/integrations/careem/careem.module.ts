import { Module } from '@nestjs/common';
import { CareemController } from './careem.controller';
import { CareemService } from './careem.service';
import { CareemWebhookService } from './careem-webhook.service';
import { OrdersModule } from '../../orders/orders.module';
import { PrintingModule } from '../../printing/printing.module';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [OrdersModule, PrintingModule],
  controllers: [CareemController],
  providers: [CareemService, CareemWebhookService, PrismaService],
  exports: [CareemService, CareemWebhookService],
})
export class CareemModule {}