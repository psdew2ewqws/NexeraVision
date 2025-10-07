import { IsString, IsArray, IsOptional, IsBoolean, IsNotEmpty, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  branchIds: string[];

  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
