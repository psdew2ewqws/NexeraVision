import { IsString, IsOptional, IsObject, IsUUID, IsInt, IsNumber } from 'class-validator';

export class CreateComponentDto {
  @IsUUID()
  templateId: string;

  @IsString()
  type: string; // 'text', 'image', 'barcode', 'qr', 'table', 'line', 'space'

  @IsString()
  name: string;

  @IsObject()
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  @IsObject()
  properties: any; // Component-specific properties

  @IsOptional()
  @IsObject()
  style?: any; // CSS-like styling

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  dataBinding?: string; // Dynamic data binding expression
}