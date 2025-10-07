import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MenusController } from './controllers/menus.controller';
import { MenusService } from './services/menus.service';
import { MenuSyncService } from './services/menu-sync.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MenusController],
  providers: [MenusService, MenuSyncService],
  exports: [MenusService, MenuSyncService],
})
export class MenusModule {}
