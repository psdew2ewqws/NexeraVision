import { Module, forwardRef } from '@nestjs/common';
import { PlatformsController } from './platforms.controller';
import { PlatformsService } from './platforms.service';
import { DatabaseModule } from '../database/database.module';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => MenuModule),
  ],
  controllers: [PlatformsController],
  providers: [PlatformsService],
  exports: [PlatformsService],
})
export class PlatformsModule {}