import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean, IsInt } from 'class-validator';
import { CreateTemplateDto } from './create-template.dto';

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  version?: number;
}