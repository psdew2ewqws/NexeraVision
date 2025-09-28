import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ModifiersService } from './modifiers.service';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';

@ApiTags('Modifiers (Add-ons)')
@Controller('modifiers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ModifiersController {
  constructor(private readonly modifiersService: ModifiersService) {}

  @Post()
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Create a new modifier' })
  @ApiResponse({ status: 201, description: 'Modifier created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() createDto: CreateModifierDto, @Req() req: any) {
    const userCompanyId = req.user?.companyId;
    return this.modifiersService.create(createDto, userCompanyId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all modifiers' })
  @ApiResponse({ status: 200, description: 'List of modifiers retrieved successfully' })
  @ApiQuery({ name: 'skip', required: false, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, description: 'Number of records to take' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by modifier category ID' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Company ID filter (super_admin only)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (1=active, 0=inactive)' })
  async findAll(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
  ) {
    // Super admin can filter by company, others use their own company
    const effectiveCompanyId = req.user?.role === 'super_admin' ? companyId : req.user?.companyId;

    return this.modifiersService.findAll({
      companyId: effectiveCompanyId,
      categoryId,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      search,
      status: status !== undefined ? parseInt(status) : undefined,
    });
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get modifiers by category ID' })
  @ApiResponse({ status: 200, description: 'Modifiers for category retrieved successfully' })
  async findByCategoryId(@Param('categoryId') categoryId: string, @Req() req: any) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.modifiersService.findByCategoryId(categoryId, userCompanyId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get modifiers statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Company ID filter (super_admin only)' })
  async getStatistics(@Req() req: any, @Query('companyId') companyId?: string) {
    const effectiveCompanyId = req.user?.role === 'super_admin' ? companyId : req.user?.companyId;
    return this.modifiersService.getStatistics(effectiveCompanyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get modifier by ID' })
  @ApiResponse({ status: 200, description: 'Modifier retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Modifier not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.modifiersService.findOne(id, userCompanyId);
  }

  @Patch(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Update modifier' })
  @ApiResponse({ status: 200, description: 'Modifier updated successfully' })
  @ApiResponse({ status: 404, description: 'Modifier not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateModifierDto,
    @Req() req: any,
  ) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.modifiersService.update(id, updateDto, userCompanyId);
  }

  @Patch(':id/status')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Update modifier status' })
  @ApiResponse({ status: 200, description: 'Modifier status updated successfully' })
  @ApiResponse({ status: 404, description: 'Modifier not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: number,
    @Req() req: any,
  ) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.modifiersService.updateStatus(id, status, userCompanyId);
  }

  @Post('bulk-status')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Bulk update modifier status' })
  @ApiResponse({ status: 200, description: 'Modifiers status updated successfully' })
  async bulkUpdateStatus(
    @Body('ids') ids: string[],
    @Body('status') status: number,
    @Req() req: any,
  ) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    const count = await this.modifiersService.bulkUpdateStatus(ids, status, userCompanyId);
    return { updated: count };
  }

  @Post('reorder/:categoryId')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Reorder modifiers within a category' })
  @ApiResponse({ status: 200, description: 'Modifiers reordered successfully' })
  async reorderModifiers(
    @Param('categoryId') categoryId: string,
    @Body('modifierIds') modifierIds: string[],
    @Req() req: any,
  ) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    await this.modifiersService.reorderModifiers(categoryId, modifierIds, userCompanyId);
    return { success: true };
  }

  @Delete(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete modifier' })
  @ApiResponse({ status: 200, description: 'Modifier deleted successfully' })
  @ApiResponse({ status: 404, description: 'Modifier not found' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.modifiersService.remove(id, userCompanyId);
  }
}