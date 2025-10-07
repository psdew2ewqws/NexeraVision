import { IsString, IsArray, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class UpdateMenuDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  branchIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  channels?: string[];

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  productIds?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
