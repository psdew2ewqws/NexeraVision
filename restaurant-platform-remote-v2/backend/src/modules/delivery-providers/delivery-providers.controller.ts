import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DeliveryProvidersService } from './delivery-providers.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    companyId: string;
    role: string;
  };
}

@Controller('delivery-providers')
@UseGuards(JwtAuthGuard)
export class DeliveryProvidersController {
  private readonly logger = new Logger(DeliveryProvidersController.name);

  constructor(private deliveryProvidersService: DeliveryProvidersService) {}

  @Get()
  async getProviders(
    @Request() req: AuthenticatedRequest,
    @Query('branchId') branchId?: string,
  ) {
    try {
      this.logger.log(`Getting delivery providers for company ${req.user.companyId}`);

      const providers = await this.deliveryProvidersService.getProviders(
        req.user.companyId,
        branchId,
      );

      return {
        success: true,
        data: providers,
        meta: {
          total: providers.length,
          active: providers.filter(p => p.status === 'active').length,
          connected: providers.filter(p => p.connectionStatus === 'connected').length,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting delivery providers: ${error.message}`);
      throw new HttpException(
        'Failed to get delivery providers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':providerId')
  async getProvider(
    @Request() req: AuthenticatedRequest,
    @Param('providerId') providerId: string,
  ) {
    try {
      this.logger.log(`Getting delivery provider ${providerId} for company ${req.user.companyId}`);

      const provider = await this.deliveryProvidersService.getProvider(
        providerId,
        req.user.companyId,
      );

      if (!provider) {
        throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: provider,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error getting delivery provider: ${error.message}`);
      throw new HttpException(
        'Failed to get delivery provider',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':providerId/test-connection')
  async testConnection(
    @Request() req: AuthenticatedRequest,
    @Param('providerId') providerId: string,
  ) {
    try {
      this.logger.log(`Testing connection for provider ${providerId}, company ${req.user.companyId}`);

      const result = await this.deliveryProvidersService.testConnection(
        providerId,
        req.user.companyId,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error testing connection: ${error.message}`);
      throw new HttpException(
        'Failed to test connection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':providerId')
  async updateProvider(
    @Request() req: AuthenticatedRequest,
    @Param('providerId') providerId: string,
    @Body() updateData: any,
  ) {
    try {
      this.logger.log(`Updating delivery provider ${providerId} for company ${req.user.companyId}`);

      const updatedProvider = await this.deliveryProvidersService.updateProvider(
        providerId,
        req.user.companyId,
        updateData,
      );

      if (!updatedProvider) {
        throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: updatedProvider,
        message: 'Provider updated successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error updating delivery provider: ${error.message}`);
      throw new HttpException(
        'Failed to update delivery provider',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':providerId/settings')
  async getProviderSettings(
    @Request() req: AuthenticatedRequest,
    @Param('providerId') providerId: string,
  ) {
    try {
      this.logger.log(`Getting settings for provider ${providerId}, company ${req.user.companyId}`);

      const settings = await this.deliveryProvidersService.getProviderSettings(
        providerId,
        req.user.companyId,
      );

      if (!settings) {
        throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error getting provider settings: ${error.message}`);
      throw new HttpException(
        'Failed to get provider settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health/status')
  async getHealthStatus(@Request() req: AuthenticatedRequest) {
    try {
      this.logger.log(`Getting delivery providers health status for company ${req.user.companyId}`);

      const providers = await this.deliveryProvidersService.getProviders(req.user.companyId);

      const healthStatus = {
        totalProviders: providers.length,
        activeProviders: providers.filter(p => p.status === 'active').length,
        connectedProviders: providers.filter(p => p.connectionStatus === 'connected').length,
        providersWithErrors: providers.filter(p => p.lastError).length,
        overallHealth: 'healthy', // Simplified health calculation
        details: providers.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          status: p.status,
          connectionStatus: p.connectionStatus,
          lastSync: p.lastSync,
          hasError: !!p.lastError,
        })),
      };

      // Determine overall health
      if (healthStatus.connectedProviders === 0) {
        healthStatus.overallHealth = 'critical';
      } else if (healthStatus.providersWithErrors > 0) {
        healthStatus.overallHealth = 'warning';
      }

      return {
        success: true,
        data: healthStatus,
      };
    } catch (error) {
      this.logger.error(`Error getting health status: ${error.message}`);
      throw new HttpException(
        'Failed to get health status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}