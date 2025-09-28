import { IsArray, IsUUID, IsOptional, IsInt, Min, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SavedMenuItemDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AddProductsToSavedMenuDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  productIds: string[];
}

export class RemoveProductsFromSavedMenuDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  productIds: string[];
}

export class UpdateSavedMenuItemsDto {
  @IsArray()
  @Type(() => SavedMenuItemDto)
  items: SavedMenuItemDto[];
}