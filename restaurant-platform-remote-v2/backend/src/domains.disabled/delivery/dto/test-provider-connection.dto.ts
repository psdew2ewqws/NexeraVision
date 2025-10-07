import { IsUUID, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestProviderConnectionDto {
  @ApiProperty({ description: 'Company provider configuration ID' })
  @IsUUID()
  companyProviderConfigId: string;

  @ApiProperty({ 
    description: 'Test parameters (e.g., coordinates for delivery check)',
    example: {
      testLatitude: 31.905614,
      testLongitude: 35.922546,
      testAddress: 'Downtown Amman, Jordan',
      testOrderValue: 25.0
    }
  })
  @IsObject()
  @IsOptional()
  testParameters?: Record<string, any>;
}

export class CreateOrderWithProviderDto {
  @ApiProperty({ description: 'Branch provider mapping ID' })
  @IsUUID()
  branchProviderMappingId: string;

  @ApiProperty({ description: 'Internal order ID' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ 
    description: 'Order details for provider',
    example: {
      customerName: 'Mohammad Alawneh',
      customerPhone: '962776219747',
      customerAddress: 'Downtown Amman',
      deliveryLatitude: 31.905614,
      deliveryLongitude: 35.922546,
      orderTotal: 25.50,
      deliveryFee: 3.00,
      paymentMethod: 'cash',
      items: [
        { name: 'Chicken Shawarma', quantity: 2, price: 8.50 },
        { name: 'French Fries', quantity: 1, price: 4.50 }
      ],
      specialInstructions: 'Extra sauce, no onions'
    }
  })
  @IsObject()
  orderDetails: Record<string, any>;
}