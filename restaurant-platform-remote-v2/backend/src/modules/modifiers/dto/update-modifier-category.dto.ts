import { PartialType } from '@nestjs/swagger';
import { CreateModifierCategoryDto } from './create-modifier-category.dto';

export class UpdateModifierCategoryDto extends PartialType(CreateModifierCategoryDto) {}