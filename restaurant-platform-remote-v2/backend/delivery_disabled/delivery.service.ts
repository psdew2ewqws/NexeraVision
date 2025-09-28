import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor() {}

  // Placeholder method to allow module to load
  async getStatus() {
    return { status: 'ok', message: 'Delivery service is available' };
  }
}