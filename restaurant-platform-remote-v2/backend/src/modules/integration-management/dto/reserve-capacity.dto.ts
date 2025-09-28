import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReserveCapacityDto {
  @ApiProperty({ description: 'Vendor ID' })
  @IsString()
  vendorId: string;

  @ApiProperty({ description: 'Branch ID' })
  @IsString()
  branchId: string;

  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Number of delivery slots to reserve' })
  @Type(() => Number)
  @IsNumber()
  slots: number;

  @ApiProperty({ description: 'Start time for capacity reservation' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'End time for capacity reservation' })
  @IsDateString()
  endTime: string;
}