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
  Request,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { PlatformsService } from './platforms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CompanyGuard } from '../../common/guards/company.guard';
import { Roles } from '../../common/decorators/roles.decorator';

interface PlatformFiltersDto {
  search?: string;
  status?: number;
  platformType?: string;
  companyId?: string;
}

interface CreatePlatformDto {
  name: string;
  displayName: { en: string; ar?: string };
  platformType: string;
  configuration?: any;
  companyId?: string;
}

interface UpdatePlatformDto {
  name?: string;
  displayName?: { en: string; ar?: string };
  platformType?: string;
  configuration?: any;
  status?: number;
}

interface BulkAssignProductsDto {
  productIds: string[];
  platformIds: string[];
  action: 'assign' | 'unassign';
}

@Controller('platforms')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  // Get platforms with role-based filtering
  @Get()
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getPlatforms(@Request() req, @Query() query: PlatformFiltersDto) {
    return this.platformsService.getPlatforms(req.user, query);
  }

  // Create platform (restricted to admin roles)
  @Post()
  @Roles('super_admin', 'company_owner')
  @HttpCode(HttpStatus.CREATED)
  async createPlatform(@Body() createDto: CreatePlatformDto, @Request() req) {
    return this.platformsService.createPlatform(createDto, req.user);
  }

  // Update platform
  @Put(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updatePlatform(
    @Param('id') id: string,
    @Body() updateDto: UpdatePlatformDto,
    @Request() req
  ) {
    return this.platformsService.updatePlatform(id, updateDto, req.user);
  }

  // Delete platform (admin only)
  @Delete(':id')
  @Roles('super_admin', 'company_owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlatform(@Param('id') id: string, @Request() req) {
    return this.platformsService.deletePlatform(id, req.user);
  }

  // Bulk assign/unassign products to platforms
  @Post('bulk-assign')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async bulkAssignProducts(
    @Body() assignDto: BulkAssignProductsDto,
    @Request() req
  ) {
    return this.platformsService.bulkAssignProducts(assignDto, req.user);
  }

  // Get platforms for user (simplified for dropdowns)
  @Get('for-user')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getPlatformsForUser(@Request() req) {
    return this.platformsService.getPlatformsForUser(req.user);
  }

  // Get product platform assignments
  @Post('assignments')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getProductAssignments(
    @Body() body: { productIds: string[] },
    @Request() req
  ) {
    return this.platformsService.getProductAssignments(body.productIds, req.user);
  }

  // Temporary endpoint to get platform menus data
  @Get('menu-platforms')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getPlatformMenus(@Request() req) {
    return this.platformsService.getPlatformMenus(req.user);
  }
}