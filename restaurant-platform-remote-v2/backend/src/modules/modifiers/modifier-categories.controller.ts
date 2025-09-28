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
import { ModifierCategoriesService } from './modifier-categories.service';
import { CreateModifierCategoryDto } from './dto/create-modifier-category.dto';
import { UpdateModifierCategoryDto } from './dto/update-modifier-category.dto';

@ApiTags('Modifier Categories (Add-ons)')
@Controller('modifier-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ModifierCategoriesController {
  constructor(private readonly modifierCategoriesService: ModifierCategoriesService) {}

  @Post()
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Create a new modifier category' })
  @ApiResponse({ status: 201, description: 'Modifier category created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() createDto: CreateModifierCategoryDto, @Req() req: any) {
    const userCompanyId = req.user?.companyId;
    return this.modifierCategoriesService.create(createDto, userCompanyId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all modifier categories' })
  @ApiResponse({ status: 200, description: 'List of modifier categories retrieved successfully' })
  @ApiQuery({ name: 'skip', required: false, description: 'Number of records to skip' })
  @ApiQuery({ name: 'take', required: false, description: 'Number of records to take' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Company ID filter (super_admin only)' })
  async findAll(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
  ) {
    // Super admin can filter by company, others use their own company
    const effectiveCompanyId = req.user?.role === 'super_admin' ? companyId : req.user?.companyId;

    return this.modifierCategoriesService.findAll({
      companyId: effectiveCompanyId,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      search,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get modifier categories statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Company ID filter (super_admin only)' })
  async getStatistics(@Req() req: any, @Query('companyId') companyId?: string) {
    const effectiveCompanyId = req.user?.role === 'super_admin' ? companyId : req.user?.companyId;
    return this.modifierCategoriesService.getStatistics(effectiveCompanyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get modifier category by ID' })
  @ApiResponse({ status: 200, description: 'Modifier category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Modifier category not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.modifierCategoriesService.findOne(id, userCompanyId);
  }

  @Patch(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @ApiOperation({ summary: 'Update modifier category' })
  @ApiResponse({ status: 200, description: 'Modifier category updated successfully' })
  @ApiResponse({ status: 404, description: 'Modifier category not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateModifierCategoryDto,
    @Req() req: any,
  ) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.modifierCategoriesService.update(id, updateDto, userCompanyId);
  }

  @Delete(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete modifier category' })
  @ApiResponse({ status: 200, description: 'Modifier category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Modifier category not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete category in use by products' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const userCompanyId = req.user?.role === 'super_admin' ? undefined : req.user?.companyId;
    return this.modifierCategoriesService.remove(id, userCompanyId);
  }
}