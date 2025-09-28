import { PrismaClient } from '@prisma/client';
import { Injectable } from '@nestjs/common';

/**
 * ENTIRE SERVICE DISABLED: Missing DeliveryChannel model in schema
 * TODO: Re-enable all methods when deliveryChannel model is added to schema
 *
 * This service manages delivery channel configurations but the required
 * database model (deliveryChannel) is not present in the current schema.
 */
@Injectable()
export class ChannelService {
  constructor(private prisma: PrismaClient) {}

  /**
   * DISABLED: Get all available delivery channels
   */
  async getDeliveryChannels() {
    throw new Error('DeliveryChannel model not found in schema - service disabled');
  }

  /**
   * DISABLED: Get specific delivery channel by ID
   */
  async getDeliveryChannelById(id: string) {
    throw new Error('DeliveryChannel model not found in schema - service disabled');
  }

  /**
   * DISABLED: Create delivery channel
   */
  async createDeliveryChannel(data: any) {
    throw new Error('DeliveryChannel model not found in schema - service disabled');
  }

  /**
   * DISABLED: Update delivery channel
   */
  async updateDeliveryChannel(id: string, data: any) {
    throw new Error('DeliveryChannel model not found in schema - service disabled');
  }

  /**
   * DISABLED: Soft delete delivery channel
   */
  async deleteDeliveryChannel(id: string, deletedBy?: any) {
    throw new Error('DeliveryChannel model not found in schema - service disabled');
  }
}