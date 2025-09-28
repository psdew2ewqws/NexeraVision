import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { VendorSelectionService } from '../services/vendor-selection.service';
import { SelectOptimalVendorDto } from '../dto/select-optimal-vendor.dto';
import { GetCostQuotesDto } from '../dto/get-cost-quotes.dto';
import { ReserveCapacityDto } from '../dto/reserve-capacity.dto';
import { ReleaseCapacityDto } from '../dto/release-capacity.dto';

@ApiTags('Vendor Selection & Cost Optimization')
@ApiBearerAuth()
@Controller('integration-management/vendor-selection')
@UseGuards(JwtAuthGuard)
export class VendorSelectionController {
  constructor(private readonly vendorSelectionService: VendorSelectionService) {}

  @Post('select-optimal-vendor')
  @ApiOperation({ summary: 'Select optimal delivery vendor using multi-criteria algorithm' })
  @ApiResponse({ status: 200, description: 'Optimal vendor selected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid selection criteria' })
  async selectOptimalVendor(
    @Body() selectionDto: SelectOptimalVendorDto,
    @GetUser() user: any,
  ) {
    return this.vendorSelectionService.selectOptimalVendor({
      ...selectionDto,
      companyId: user.companyId,
    });
  }

  @Post('cost-quotes')
  @ApiOperation({ summary: 'Get cost quotes from all available providers' })
  @ApiResponse({ status: 200, description: 'Cost quotes retrieved successfully' })
  async getCostQuotes(
    @Body() quotesDto: GetCostQuotesDto,
    @GetUser() user: any,
  ) {
    return this.vendorSelectionService.getCostQuotes({
      ...quotesDto,
      companyId: user.companyId,
    });
  }

  @Get('availability')
  @ApiOperation({ summary: 'Get real-time availability for all providers' })
  @ApiResponse({ status: 200, description: 'Provider availability retrieved' })
  async getProviderAvailability(
    @Query('branchId') branchId?: string,
    @Query('providerType') providerType?: string,
    @GetUser() user?: any,
  ) {
    return this.vendorSelectionService.getProviderAvailability({
      companyId: user.companyId,
      branchId,
      providerType,
    });
  }

  @Get('performance/:providerType')
  @ApiOperation({ summary: 'Get performance metrics for specific provider' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved' })
  async getProviderPerformance(
    @Param('providerType') providerType: string,
    @Query('branchId') branchId?: string,
    @Query('days') days: number = 30,
    @GetUser() user?: any,
  ) {
    return this.vendorSelectionService.getProviderPerformance({
      companyId: user.companyId,
      providerType,
      branchId,
      days,
    });
  }

  @Post('reserve-capacity')
  @ApiOperation({ summary: 'Reserve provider capacity for order' })
  @ApiResponse({ status: 200, description: 'Capacity reserved successfully' })
  async reserveCapacity(
    @Body() reserveDto: ReserveCapacityDto,
    @GetUser() user: any,
  ) {
    return this.vendorSelectionService.reserveProviderCapacity({
      ...reserveDto,
      companyId: user.companyId,
    });
  }

  @Post('release-capacity')
  @ApiOperation({ summary: 'Release reserved provider capacity' })
  @ApiResponse({ status: 200, description: 'Capacity released successfully' })
  async releaseCapacity(
    @Body() releaseDto: ReleaseCapacityDto,
    @GetUser() user: any,
  ) {
    return this.vendorSelectionService.releaseProviderCapacity({
      ...releaseDto,
      companyId: user.companyId,
    });
  }

  @Post('calculate-distance')
  @ApiOperation({ summary: 'Calculate distance and delivery time' })
  @ApiResponse({ status: 200, description: 'Distance calculated successfully' })
  async calculateDistance(
    @Body() body: {
      branchLocation: { lat: number; lng: number };
      customerLocation: { lat: number; lng: number };
      considerTraffic?: boolean;
      weatherConditions?: 'normal' | 'rain' | 'heavy_rain';
    },
    @GetUser() user: any,
  ) {
    return this.vendorSelectionService.calculateDeliveryRoute(body);
  }

  @Get('cost-optimization')
  @ApiOperation({ summary: 'Get cost optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Cost optimization suggestions retrieved' })
  async getCostOptimization(
    @Query('branchId') branchId?: string,
    @Query('period') period: 'weekly' | 'monthly' = 'monthly',
    @GetUser() user?: any,
  ) {
    return this.vendorSelectionService.getCostOptimizationSuggestions({
      companyId: user.companyId,
      branchId,
      period,
    });
  }

  @Post('performance/compare')
  @ApiOperation({ summary: 'Compare performance across multiple providers' })
  @ApiResponse({ status: 200, description: 'Performance comparison completed' })
  async comparePerformance(
    @Body() body: {
      providerTypes: string[];
      branchId?: string;
      timeRange: { from: string; to: string };
    },
    @GetUser() user: any,
  ) {
    return this.vendorSelectionService.compareProviderPerformance({
      ...body,
      companyId: user.companyId,
    });
  }

  @Get('availability/statistics')
  @ApiOperation({ summary: 'Get availability statistics and trends' })
  @ApiResponse({ status: 200, description: 'Availability statistics retrieved' })
  async getAvailabilityStatistics(
    @Query('branchId') branchId?: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'weekly',
    @GetUser() user?: any,
  ) {
    return this.vendorSelectionService.getAvailabilityStatistics({
      companyId: user.companyId,
      branchId,
      period,
    });
  }

  @Post('availability/predict')
  @ApiOperation({ summary: 'Predict provider availability for future time' })
  @ApiResponse({ status: 200, description: 'Availability prediction completed' })
  async predictAvailability(
    @Body() body: {
      providerType: string;
      predictedTime: string;
      branchId?: string;
    },
    @GetUser() user: any,
  ) {
    return this.vendorSelectionService.predictProviderAvailability({
      ...body,
      companyId: user.companyId,
    });
  }

  @Get('recommendations/provider-mix')
  @ApiOperation({ summary: 'Get optimal provider mix recommendations' })
  @ApiResponse({ status: 200, description: 'Provider mix recommendations retrieved' })
  async getProviderMixRecommendations(
    @Query('branchId') branchId?: string,
    @Query('targetSavings') targetSavings?: number,
    @GetUser() user?: any,
  ) {
    return this.vendorSelectionService.getProviderMixRecommendations({
      companyId: user.companyId,
      branchId,
      targetSavings,
    });
  }
}