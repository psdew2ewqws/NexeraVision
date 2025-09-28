import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsEmail, MinLength } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'Main Branch', description: 'Branch name in English' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'الفرع الرئيسي', description: 'Branch name in Arabic' })
  @IsString()
  @MinLength(1)
  nameAr: string;

  @ApiProperty({ example: '+962791234567', description: 'Branch phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'branch@restaurant.com', description: 'Branch email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '123 Main Street, Amman', description: 'Branch address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Amman', description: 'City', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Jordan', description: 'Country', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 31.9520, description: 'Latitude coordinate', required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ example: 35.9330, description: 'Longitude coordinate', required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ example: '08:00', description: 'Opening time', required: false })
  @IsOptional()
  @IsString()
  openTime?: string;

  @ApiProperty({ example: '22:00', description: 'Closing time', required: false })
  @IsOptional()
  @IsString()
  closeTime?: string;

  @ApiProperty({ example: true, description: 'Whether branch is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: true, description: 'Whether branch allows online orders', required: false })
  @IsOptional()
  @IsBoolean()
  allowsOnlineOrders?: boolean;

  @ApiProperty({ example: true, description: 'Whether branch allows delivery', required: false })
  @IsOptional()
  @IsBoolean()
  allowsDelivery?: boolean;

  @ApiProperty({ example: true, description: 'Whether branch allows pickup', required: false })
  @IsOptional()
  @IsBoolean()
  allowsPickup?: boolean;

  @ApiProperty({ example: 'Asia/Amman', description: 'Branch timezone', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ example: 'company-id', description: 'Company ID (for super_admin only)', required: false })
  @IsOptional()
  @IsString()
  companyId?: string;
}

export class UpdateBranchDto extends PartialType(CreateBranchDto) {}

export class BranchResponseDto {
  @ApiProperty({ example: 'branch-id' })
  id: string;

  @ApiProperty({ example: 'Main Branch' })
  name: string;

  @ApiProperty({ example: 'الفرع الرئيسي' })
  nameAr: string;

  @ApiProperty({ example: '+962791234567', required: false })
  phone?: string;

  @ApiProperty({ example: 'branch@restaurant.com', required: false })
  email?: string;

  @ApiProperty({ example: '123 Main Street, Amman', required: false })
  address?: string;

  @ApiProperty({ example: 'Amman', required: false })
  city?: string;

  @ApiProperty({ example: 'Jordan', required: false })
  country?: string;

  @ApiProperty({ example: 31.9520, required: false })
  latitude?: number;

  @ApiProperty({ example: 35.9330, required: false })
  longitude?: number;

  @ApiProperty({ example: '08:00', required: false })
  openTime?: string;

  @ApiProperty({ example: '22:00', required: false })
  closeTime?: string;

  @ApiProperty({ example: false })
  isDefault: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  allowsOnlineOrders: boolean;

  @ApiProperty({ example: true })
  allowsDelivery: boolean;

  @ApiProperty({ example: true })
  allowsPickup: boolean;

  @ApiProperty({ example: 'Asia/Amman' })
  timezone: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } })
  company: {
    id: string;
    name: string;
  };
}