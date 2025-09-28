import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ReleaseCapacityDto {
  @ApiProperty({ description: 'Reservation ID to release' })
  @IsString()
  reservationId: string;

  @ApiProperty({ description: 'Vendor ID' })
  @IsString()
  vendorId: string;

  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId: string;
}