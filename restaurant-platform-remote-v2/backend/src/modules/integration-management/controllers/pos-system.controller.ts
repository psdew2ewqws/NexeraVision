import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { POSSystemService } from '../services/pos-system.service';
import { CreatePOSSystemDto } from '../dto/create-pos-system.dto';
import { UpdatePOSSystemDto } from '../dto/update-pos-system.dto';
import { TestPOSConnectionDto } from '../dto/test-pos-connection.dto';
import { POSSystemPaginationDto } from '../dto/pos-system-pagination.dto';

@ApiTags('POS Systems Management')
@ApiBearerAuth()
@Controller('integration-management/pos-systems')
@UseGuards(JwtAuthGuard, RolesGuard)
export class POSSystemController {
  constructor(private readonly posSystemService: POSSystemService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available POS systems with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'provider', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of POS systems retrieved successfully' })
  async getAllPOSSystems(
    @Query() pagination: POSSystemPaginationDto,
    @GetUser() user: any,
  ) {
    return this.posSystemService.findAll(pagination, user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get POS system by ID' })
  @ApiResponse({ status: 200, description: 'POS system found' })
  @ApiResponse({ status: 404, description: 'POS system not found' })
  async getPOSSystemById(@Param('id') id: string, @GetUser() user: any) {
    return this.posSystemService.findOne(id, user.companyId);
  }

  @Post()
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ summary: 'Create new POS system configuration' })
  @ApiResponse({ status: 201, description: 'POS system created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createPOSSystem(@Body() createDto: CreatePOSSystemDto, @GetUser() user: any) {
    return this.posSystemService.create(createDto, user.id);
  }

  @Put(':id')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ summary: 'Update POS system configuration' })
  @ApiResponse({ status: 200, description: 'POS system updated successfully' })
  @ApiResponse({ status: 404, description: 'POS system not found' })
  async updatePOSSystem(
    @Param('id') id: string,
    @Body() updateDto: UpdatePOSSystemDto,
    @GetUser() user: any,
  ) {
    return this.posSystemService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ summary: 'Delete POS system' })
  @ApiResponse({ status: 204, description: 'POS system deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePOSSystem(@Param('id') id: string, @GetUser() user: any) {
    await this.posSystemService.remove(id, user.companyId);
  }

  @Post(':id/test-connection')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Test POS system connection' })
  @ApiResponse({ status: 200, description: 'Connection test completed' })
  async testConnection(
    @Param('id') id: string,
    @Body() testDto: TestPOSConnectionDto,
    @GetUser() user: any,
  ) {
    return this.posSystemService.testConnection(id, testDto, user.companyId);
  }

  @Get(':id/supported-features')
  @ApiOperation({ summary: 'Get supported features for POS system' })
  @ApiResponse({ status: 200, description: 'Supported features retrieved' })
  async getSupportedFeatures(@Param('id') id: string, @GetUser() user: any) {
    return this.posSystemService.getSupportedFeatures(id);
  }

  @Get(':id/integration-templates')
  @ApiOperation({ summary: 'Get integration templates for POS system' })
  @ApiResponse({ status: 200, description: 'Integration templates retrieved' })
  async getIntegrationTemplates(@Param('id') id: string, @GetUser() user: any) {
    return this.posSystemService.getIntegrationTemplates(id);
  }

  @Post(':id/validate-credentials')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Validate API credentials for POS system' })
  @ApiResponse({ status: 200, description: 'Credentials validated successfully' })
  async validateCredentials(
    @Param('id') id: string,
    @Body('credentials') credentials: Record<string, any>,
    @GetUser() user: any,
  ) {
    return this.posSystemService.validateCredentials(id, credentials, user.companyId);
  }

  @Get(':id/sync-status')
  @ApiOperation({ summary: 'Get sync status for POS system integrations' })
  @ApiResponse({ status: 200, description: 'Sync status retrieved' })
  async getSyncStatus(@Param('id') id: string, @GetUser() user: any) {
    return this.posSystemService.getSyncStatus(id, user.companyId);
  }

  @Post(':id/force-sync')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Force synchronization with POS system' })
  @ApiResponse({ status: 200, description: 'Sync initiated successfully' })
  async forceSync(
    @Param('id') id: string,
    @Body('syncType') syncType: 'full' | 'incremental',
    @GetUser() user: any,
  ) {
    return this.posSystemService.forceSync(id, syncType, user.companyId, user.id);
  }
}