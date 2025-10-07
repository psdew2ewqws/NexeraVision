import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RetryQueueService } from './services/retry-queue.service';
import { RetryProcessorService } from './services/retry-processor.service';
import { BackendCommunicationModule } from '../backend-communication/backend-communication.module';

@Module({
  imports: [ScheduleModule, BackendCommunicationModule],
  providers: [RetryQueueService, RetryProcessorService],
  exports: [RetryQueueService],
})
export class RetryQueueModule {}