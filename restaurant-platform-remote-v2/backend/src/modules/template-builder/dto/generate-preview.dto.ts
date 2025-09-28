import { IsUUID, IsOptional, IsObject } from 'class-validator';

export class GeneratePreviewDto {
  @IsUUID()
  templateId: string;

  @IsOptional()
  @IsObject()
  sampleData?: any; // Sample data for preview rendering
}