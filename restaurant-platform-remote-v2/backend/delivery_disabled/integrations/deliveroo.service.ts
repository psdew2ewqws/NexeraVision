import { Injectable, Logger } from '@nestjs/common';
import { AbstractDeliveryProvider } from './delivery-provider.interface';
import { OrderRequest, OrderResponse, TrackingResponse } from './delivery-provider.interface';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class DeliverooService extends AbstractDeliveryProvider {
  private readonly logger = new Logger(DeliverooService.name);
  private readonly apiClient: AxiosInstance;
  private readonly baseUrl = 'https://api-sandbox.developers.deliveroo.com'; // From Picolinate analysis
  private readonly oauthUrl = 'https://auth-sandbox.developers.deliveroo.com'; // OAuth endpoint

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
    return 'deliveroo';
  }

  getDisplayName(): { en: string; ar: string } {
    return { 
      en: 'Deliveroo', 
      ar: 'ديليفيرو' 
    };
  }

  async createOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    try {
      this.logger.log(`Creating Deliveroo order for ${orderRequest.customerDetails.name}`);

      const deliverooOrderPayload = {
        external_order_id: orderRequest.orderNumber,
        restaurant: {
          id: orderRequest.branchDetails.externalId, // Deliveroo restaurant ID
        },
        customer: {
          first_name: orderRequest.customerDetails.name.split(' ')[0],
          last_name: orderRequest.customerDetails.name.split(' ').slice(1).join(' '),
          phone_number: orderRequest.customerDetails.phone,
          email: orderRequest.customerDetails.email,
        },
        delivery_address: {
          line_1: orderRequest.deliveryAddress.street,
          line_2: orderRequest.deliveryAddress.building ? `Building ${orderRequest.deliveryAddress.building}` : '',
          line_3: orderRequest.deliveryAddress.apartment ? `Apt ${orderRequest.deliveryAddress.apartment}` : '',
          city: orderRequest.deliveryAddress.city,
          postcode: orderRequest.deliveryAddress.postalCode || '',
          country: orderRequest.deliveryAddress.country || 'GB',
          location: {
            latitude: orderRequest.deliveryAddress.coordinates.lat,
            longitude: orderRequest.deliveryAddress.coordinates.lng
          }
        },
        items: orderRequest.items.map(item => ({
          external_id: item.externalId,
          name: item.name,
          quantity: item.quantity,
          price_including_tax: Math.round(item.price * 100), // Deliveroo uses pence/cents
          tax_rate: 0, // Tax rate in basis points (0 = 0%)
          modifiers: item.modifiers?.map(modifier => ({
            external_id: modifier.externalId,
            name: modifier.name,
            price_including_tax: Math.round(modifier.price * 100),
            tax_rate: 0
          })) || []
        })),
        payment: {
          type: orderRequest.paymentMethod === 'cash' ? 'cash' : 'card',
        },
        total_price_including_tax: Math.round(orderRequest.totalAmount * 100),
        delivery_fee: Math.round(orderRequest.deliveryFee * 100),
        special_instructions: orderRequest.specialInstructions,
        requested_for: orderRequest.scheduledTime ? 
          new Date(orderRequest.scheduledTime).toISOString() : undefined
      };

      const response = await this.apiClient.post('/v1/orders', deliverooOrderPayload);

      if (response.status === 201) {
        return {
          success: true,
          orderId: response.data.id,
          trackingNumber: response.data.tracking_reference,
          estimatedDeliveryTime: response.data.estimated_delivery_at,
          message: 'Order created successfully with Deliveroo'
        };
      } else {
        throw new Error('Failed to create Deliveroo order');
      }

    } catch (error) {
      this.logger.error(`Failed to create Deliveroo order: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async cancelOrder(orderId: string, reason?: string): Promise<OrderResponse> {
    try {
      this.logger.log(`Cancelling Deliveroo order ${orderId}`);

      const response = await this.apiClient.post(`/v1/orders/${orderId}/cancel`, {
        reason: reason || 'restaurant_cancellation'
      });

      if (response.status === 200) {
        return {
          success: true,
          orderId,
          message: 'Order cancelled successfully'
        };
      } else {
        throw new Error('Failed to cancel Deliveroo order');
      }

    } catch (error) {
      this.logger.error(`Failed to cancel Deliveroo order: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async trackOrder(orderId: string): Promise<TrackingResponse> {
    try {
      const response = await this.apiClient.get(`/v1/orders/${orderId}`);

      if (response.status === 200) {
        const orderData = response.data;
        
        // Map Deliveroo status to standard status
        const statusMapping = {
          'confirmed': 'accepted',
          'preparing': 'preparing', 
          'ready_for_pickup': 'ready',
          'picked_up': 'out_for_delivery',
          'delivered': 'delivered',
          'cancelled': 'cancelled'
        };

        return {
          success: true,
          orderId,
          status: statusMapping[orderData.status] || orderData.status,
          estimatedDeliveryTime: orderData.estimated_delivery_at,
          driverLocation: orderData.driver_location ? {
            lat: orderData.driver_location.latitude,
            lng: orderData.driver_location.longitude
          } : undefined,
          driverDetails: orderData.driver ? {
            name: orderData.driver.name,
            phone: orderData.driver.phone_number
          } : undefined
        };
      } else {
        throw new Error('Failed to track Deliveroo order');
      }

    } catch (error) {
      this.logger.error(`Failed to track Deliveroo order: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async validateDeliveryArea(coordinates: { lat: number; lng: number }): Promise<boolean> {
    try {
      // Check if coordinates are within Deliveroo's service areas
      const response = await this.apiClient.get('/v1/delivery/check', {
        params: {
          latitude: coordinates.lat,
          longitude: coordinates.lng
        }
      });

      return response.data.deliverable === true;

    } catch (error) {
      this.logger.error(`Failed to validate Deliveroo delivery area: ${error.message}`);
      // Fallback: Deliveroo operates in UK, Europe, Middle East, Asia, Australia
      // This is a very simplified check
      const { lat, lng } = coordinates;
      
      // UK bounds as primary market
      const ukBounds = { north: 61.0, south: 49.0, east: 2.0, west: -8.0 };
      const inUK = lat >= ukBounds.south && lat <= ukBounds.north && 
                   lng >= ukBounds.west && lng <= ukBounds.east;
      
      // UAE bounds (major Middle East market)
      const uaeBounds = { north: 26.5, south: 22.0, east: 56.5, west: 51.0 };
      const inUAE = lat >= uaeBounds.south && lat <= uaeBounds.north && 
                    lng >= uaeBounds.west && lng <= uaeBounds.east;

      return inUK || inUAE; // Simplified coverage check
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test Deliveroo API connection
      const response = await this.apiClient.get('/v1/restaurants/me');
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Deliveroo connection test failed: ${error.message}`);
      return false;
    }
  }

  async calculateDeliveryFee(
    pickupCoordinates: { lat: number; lng: number },
    deliveryCoordinates: { lat: number; lng: number },
    orderValue: number
  ): Promise<number> {
    try {
      const response = await this.apiClient.post('/v1/delivery/quote', {
        pickup_location: {
          latitude: pickupCoordinates.lat,
          longitude: pickupCoordinates.lng
        },
        delivery_location: {
          latitude: deliveryCoordinates.lat,
          longitude: deliveryCoordinates.lng
        },
        order_value: Math.round(orderValue * 100) // Convert to pence/cents
      });

      if (response.data.delivery_fee) {
        return response.data.delivery_fee / 100; // Convert back from pence
      }
      
      // Fallback to distance-based calculation
      const distance = this.calculateDistance(
        pickupCoordinates.lat, pickupCoordinates.lng,
        deliveryCoordinates.lat, deliveryCoordinates.lng
      );
      
      // Deliveroo typical UK pricing
      return 2.49 + (distance * 0.50); // £2.49 base + £0.50 per km

    } catch (error) {
      this.logger.error(`Failed to calculate Deliveroo delivery fee: ${error.message}`);
      // Return default UK fee
      return 3.49; // Default £3.49
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