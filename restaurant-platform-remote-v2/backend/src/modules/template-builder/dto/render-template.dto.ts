import { IsUUID, IsObject, IsOptional, IsString } from 'class-validator';

export class RenderTemplateDto {
  @IsUUID()
  templateId: string;

  @IsObject()
  data: any; // Real data for rendering

  @IsOptional()
  @IsString()
  format?: 'escpos' | 'text' | 'html'; // Output format

  @IsOptional()
  @IsString()
  printerId?: string; // Target printer ID
}