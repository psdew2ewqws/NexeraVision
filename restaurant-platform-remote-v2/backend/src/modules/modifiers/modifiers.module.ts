import { Module } from '@nestjs/common';
import { ModifiersController } from './modifiers.controller';
import { ModifiersService } from './modifiers.service';
import { ModifierCategoriesController } from './modifier-categories.controller';
import { ModifierCategoriesService } from './modifier-categories.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ModifiersController, ModifierCategoriesController],
  providers: [ModifiersService, ModifierCategoriesService],
  exports: [ModifiersService, ModifierCategoriesService],
})
export class ModifiersModule {}