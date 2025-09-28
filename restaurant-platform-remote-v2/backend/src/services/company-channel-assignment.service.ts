import { PrismaClient } from '@prisma/client';
import { Injectable } from '@nestjs/common';

/**
 * ENTIRE SERVICE DISABLED: Missing CompanyChannelAssignment model in schema
 * TODO: Re-enable all methods when companyChannelAssignment model is added to schema
 *
 * This service manages company-channel assignments but the required database model is missing.
 */
@Injectable()
export class CompanyChannelAssignmentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * DISABLED: Get all channel assignments for a company
   */
  async getCompanyChannelAssignments(companyId: string) {
    throw new Error('CompanyChannelAssignment model not found in schema - service disabled');
  }

  /**
   * DISABLED: Get specific channel assignment by ID
   */
  async getChannelAssignmentById(id: string, companyId: string) {
    throw new Error('CompanyChannelAssignment model not found in schema - service disabled');
  }

  /**
   * DISABLED: Create channel assignment
   */
  async createChannelAssignment(data: {
    companyId: string;
    channelId: string;
    credentials?: any;
    isActive?: boolean;
  }) {
    throw new Error('CompanyChannelAssignment model not found in schema - service disabled');
  }

  /**
   * DISABLED: Update channel assignment
   */
  async updateChannelAssignment(
    id: string,
    companyId: string,
    data: {
      credentials?: any;
      isActive?: boolean;
    }
  ) {
    throw new Error('CompanyChannelAssignment model not found in schema - service disabled');
  }

  /**
   * DISABLED: Soft delete a channel assignment
   */
  async deleteChannelAssignment(id: string, companyId: string, deletedBy?: string) {
    throw new Error('CompanyChannelAssignment model not found in schema - service disabled');
  }

  /**
   * DISABLED: Get sync status for a channel assignment
   */
  async getSyncStatus(assignmentId: string, companyId: string) {
    throw new Error('CompanyChannelAssignment model not found in schema - service disabled');
  }

  /**
   * DISABLED: Update sync status
   */
  async updateSyncStatus(
    assignmentId: string,
    companyId: string,
    status: 'active' | 'inactive' | 'error',
    lastSyncAt?: Date,
    errorMessage?: string
  ) {
    throw new Error('CompanyChannelAssignment model not found in schema - service disabled');
  }
}