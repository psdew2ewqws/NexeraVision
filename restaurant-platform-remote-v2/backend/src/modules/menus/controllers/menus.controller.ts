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
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { MenusService } from '../services/menus.service';
import { MenuSyncService } from '../services/menu-sync.service';
import { CreateMenuDto } from '../dto/create-menu.dto';
import { UpdateMenuDto } from '../dto/update-menu.dto';
import { SyncMenuDto } from '../dto/sync-menu.dto';
import { MenuFiltersDto } from '../dto/menu-filters.dto';

@Controller('menus')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MenusController {
  constructor(
    private readonly menusService: MenusService,
    private readonly menuSyncService: MenuSyncService,
  ) {}

  @Post()
  @Roles('super_admin', 'company_owner', 'branch_manager')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateMenuDto, @CurrentUser() user: any) {
    return this.menusService.create(dto, user.id, user.companyId);
  }

  @Get()
  @Roles('super_admin', 'company_owner', 'branch_manager', 'cashier', 'call_center')
  async findAll(@Query() filters: MenuFiltersDto, @CurrentUser() user: any) {
    return this.menusService.findAll(filters, user.companyId);
  }

  @Get(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'cashier', 'call_center')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.menusService.findOne(id, user.companyId);
  }

  @Put(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMenuDto,
    @CurrentUser() user: any,
  ) {
    return this.menusService.update(id, dto, user.id, user.companyId);
  }

  @Delete(':id')
  @Roles('super_admin', 'company_owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.menusService.remove(id, user.id, user.companyId);
  }

  @Get(':id/sync-status')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getSyncStatus(@Param('id') id: string, @CurrentUser() user: any) {
    return this.menusService.getSyncStatus(id, user.companyId);
  }

  @Post(':id/sync')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async syncMenu(
    @Param('id') id: string,
    @Body() dto: SyncMenuDto,
    @CurrentUser() user: any,
  ) {
    return this.menuSyncService.syncToChannel(id, dto.channel, user.id, user.companyId);
  }
}
