import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../../shared/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/common/guards/roles.guard';
import { Roles } from '../../shared/common/decorators/roles.decorator';
import { CurrentUser } from '../../shared/common/decorators/current-user.decorator';
import { Public } from '../../shared/common/decorators/public.decorator';
import { CreateCompanyDto, UpdateCompanyDto, CompanyResponseDto } from './dto';

@ApiTags('Companies')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles('super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new restaurant company' })
  @ApiResponse({ 
    status: 201, 
    description: 'Company created successfully',
    type: CompanyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Company slug already exists' })
  async create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all companies with optional filters (public read access)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or slug' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of companies',
    type: [CompanyResponseDto],
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    return this.companiesService.findAll({
      skip,
      take: limitNum,
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('list')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Get simple companies list for dropdowns' })
  @ApiResponse({ 
    status: 200, 
    description: 'Simple list of companies',
  })
  async getCompaniesList() {
    return this.companiesService.getCompaniesList();
  }

  @Get('my')
  @Roles('company_owner', 'branch_manager', 'cashier', 'call_center')
  @ApiOperation({ summary: 'Get current user\'s company' })
  @ApiResponse({ 
    status: 200, 
    description: 'Current user\'s company',
    type: CompanyResponseDto,
  })
  async getMyCompany(@CurrentUser() user: any) {
    return this.companiesService.findOne(user.companyId);
  }

  @Get(':id')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ summary: 'Get company by ID or slug' })
  @ApiResponse({ 
    status: 200, 
    description: 'Company details',
    type: CompanyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Get(':id/statistics')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ summary: 'Get company statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Company statistics',
  })
  async getStatistics(@Param('id') id: string) {
    return this.companiesService.getStatistics(id);
  }

  @Patch(':id')
  @Roles('super_admin', 'company_owner')
  @ApiOperation({ summary: 'Update company information' })
  @ApiResponse({ 
    status: 200, 
    description: 'Company updated successfully',
    type: CompanyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async update(
    @Param('id') id: string, 
    @Body() updateCompanyDto: UpdateCompanyDto
  ) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @Roles('super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete company (soft delete)' })
  @ApiResponse({ status: 204, description: 'Company deleted successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async remove(@Param('id') id: string, @CurrentUser() currentUser: BaseUser) {
    await this.companiesService.remove(id, currentUser);
  }
}