import { IsEmail, IsString, IsOptional, IsEnum, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'User full name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'User first name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'User username for login' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'User phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'User password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'User PIN for quick access' })
  @IsOptional()
  @IsString()
  pin?: string;

  @ApiProperty({ 
    description: 'User role',
    enum: ['super_admin', 'company_owner', 'branch_manager', 'cashier', 'call_center']
  })
  @IsEnum(['super_admin', 'company_owner', 'branch_manager', 'cashier', 'call_center'])
  role: string;

  @ApiProperty({ 
    description: 'User status',
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended', 'pending'])
  status?: string;

  @ApiPropertyOptional({ description: 'Company ID (for super_admin only)' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'User language preference', default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'User timezone', default: 'Asia/Amman' })
  @IsOptional()
  @IsString()
  timezone?: string;
}