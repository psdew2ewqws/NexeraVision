import { Injectable, Logger } from '@nestjs/common';
import { AbstractDeliveryProvider } from './delivery-provider.interface';
import { OrderRequest, OrderResponse, TrackingResponse } from './delivery-provider.interface';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class JahezService extends AbstractDeliveryProvider {
  private readonly logger = new Logger(JahezService.name);
  private readonly apiClient: AxiosInstance;
  private readonly baseUrl = 'https://integration-api-staging.jahez.net'; // From Picolinate analysis

  constructor() {
    super();
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  getName(): string {
    return 'jahez';
  }

  getDisplayName(): { en: string; ar: string } {
    return { 
      en: 'Jahez', 
      ar: 'جاهز' 
    };
  }

  async createOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    try {
      this.logger.log(`Creating Jahez order for ${orderRequest.customerDetails.name}`);

      const jahezOrderPayload = {
        order: {
          external_order_id: orderRequest.orderNumber,
          restaurant_id: orderRequest.branchDetails.externalId, // Jahez restaurant ID
          customer: {
            name: orderRequest.customerDetails.name,
            phone: orderRequest.customerDetails.phone,
            email: orderRequest.customerDetails.email,
          },
          delivery_address: {
            street: orderRequest.deliveryAddress.street,
            building: orderRequest.deliveryAddress.building,
            floor: orderRequest.deliveryAddress.floor,
            apartment: orderRequest.deliveryAddress.apartment,
            city: orderRequest.deliveryAddress.city,
            district: orderRequest.deliveryAddress.district,
            coordinates: {
              lat: orderRequest.deliveryAddress.coordinates.lat,
              lng: orderRequest.deliveryAddress.coordinates.lng
            }
          },
          items: orderRequest.items.map(item => ({
            external_id: item.externalId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            modifiers: item.modifiers?.map(modifier => ({
              name: modifier.name,
              price: modifier.price
            })) || []
          })),
          payment_method: orderRequest.paymentMethod,
          total_amount: orderRequest.totalAmount,
          delivery_fee: orderRequest.deliveryFee,
          notes: orderRequest.specialInstructions,
          scheduled_time: orderRequest.scheduledTime
        }
      };

      const response = await this.apiClient.post('/api/orders/create', jahezOrderPayload);

      if (response.data.success) {
        return {
          success: true,
          orderId: response.data.data.order_id,
          trackingNumber: response.data.data.tracking_number,
          estimatedDeliveryTime: response.data.data.estimated_delivery_time,
          message: 'Order created successfully with Jahez'
        };
      } else {
        throw new Error(response.data.message || 'Failed to create Jahez order');
      }

    } catch (error) {
      this.logger.error(`Failed to create Jahez order: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async cancelOrder(orderId: string, reason?: string): Promise<OrderResponse> {
    try {
      this.logger.log(`Cancelling Jahez order ${orderId}`);

      const response = await this.apiClient.post(`/api/orders/${orderId}/cancel`, {
        reason: reason || 'Restaurant cancellation'
      });

      if (response.data.success) {
        return {
          success: true,
          orderId,
          message: 'Order cancelled successfully'
        };
      } else {
        throw new Error(response.data.message || 'Failed to cancel order');
      }

    } catch (error) {
      this.logger.error(`Failed to cancel Jahez order: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async trackOrder(orderId: string): Promise<TrackingResponse> {
    try {
      const response = await this.apiClient.get(`/api/orders/${orderId}/status`);

      if (response.data.success) {
        const orderData = response.data.data;
        
        // Map Jahez status to standard status
        const statusMapping = {
          'N': 'created',      // New
          'A': 'accepted',     // Accepted
          'P': 'preparing',    // Preparing
          'R': 'ready',        // Ready
          'O': 'out_for_delivery', // Out for delivery
          'D': 'delivered',    // Delivered
          'C': 'cancelled',    // Cancelled
          'R': 'rejected',     // Rejected
          'T': 'timed_out'     // Timed-out
        };

        return {
          success: true,
          orderId,
          status: statusMapping[orderData.status] || 'unknown',
          estimatedDeliveryTime: orderData.estimated_delivery_time,
          driverLocation: orderData.driver_location ? {
            lat: orderData.driver_location.lat,
            lng: orderData.driver_location.lng
          } : undefined,
          driverDetails: orderData.driver ? {
            name: orderData.driver.name,
            phone: orderData.driver.phone
          } : undefined
        };
      } else {
        throw new Error(response.data.message || 'Failed to track order');
      }

    } catch (error) {
      this.logger.error(`Failed to track Jahez order: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async validateDeliveryArea(coordinates: { lat: number; lng: number }): Promise<boolean> {
    try {
      // Jahez primarily serves Saudi Arabia and Gulf region
      // This is a simplified check - in production, call Jahez's coverage API
      const { lat, lng } = coordinates;
      
      // Saudi Arabia approximate bounds
      const saudiBounds = {
        north: 32.5,
        south: 16.0,
        east: 55.7,
        west: 34.5
      };

      return lat >= saudiBounds.south && 
             lat <= saudiBounds.north && 
             lng >= saudiBounds.west && 
             lng <= saudiBounds.east;

    } catch (error) {
      this.logger.error(`Failed to validate Jahez delivery area: ${error.message}`);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test Jahez API connection with a simple health check
      const response = await this.apiClient.get('/api/health');
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Jahez connection test failed: ${error.message}`);
      return false;
    }
  }

  async calculateDeliveryFee(
    pickupCoordinates: { lat: number; lng: number },
    deliveryCoordinates: { lat: number; lng: number },
    orderValue: number
  ): Promise<number> {
    try {
      const response = await this.apiClient.post('/api/delivery/calculate-fee', {
        pickup: pickupCoordinates,
        delivery: deliveryCoordinates,
        order_value: orderValue
      });

      if (response.data.success) {
        return response.data.data.delivery_fee;
      }
      
      // Fallback to distance-based calculation
      const distance = this.calculateDistance(
        pickupCoordinates.lat, pickupCoordinates.lng,
        deliveryCoordinates.lat, deliveryCoordinates.lng
      );
      
      // Jahez typical pricing: base fee + per km rate
      return 5.00 + (distance * 1.50); // 5 SAR base + 1.5 SAR per km

    } catch (error) {
      this.logger.error(`Failed to calculate Jahez delivery fee: ${error.message}`);
      // Return default fee structure
      return 8.00; // Default 8 SAR
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}