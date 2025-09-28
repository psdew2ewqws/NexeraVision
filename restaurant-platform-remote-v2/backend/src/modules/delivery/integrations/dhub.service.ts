import { 
  DeliveryProviderService, 
  DeliveryProviderConfig, 
  DeliveryRequest, 
  DeliveryResponse, 
  DeliveryStatusUpdate 
} from './delivery-provider.interface';

export class DHUBDeliveryService extends DeliveryProviderService {
  constructor(config: DeliveryProviderConfig) {
    super(config, 'DHUB');
  }

  async createDeliveryOrder(request: DeliveryRequest): Promise<DeliveryResponse> {
    try {
      // DHUB API specific payload structure
      const payload = {
        external_order_id: request.orderId,
        pickup: {
          lat: request.pickupLocation.lat,
          lng: request.pickupLocation.lng,
          address: request.pickupLocation.address,
          contact_name: request.pickupLocation.contactName,
          contact_phone: request.pickupLocation.contactPhone,
          instructions: request.pickupLocation.instructions || '',
        },
        dropoff: {
          lat: request.dropoffLocation.lat,
          lng: request.dropoffLocation.lng,
          address: request.dropoffLocation.address,
          contact_name: request.dropoffLocation.contactName,
          contact_phone: request.dropoffLocation.contactPhone,
          instructions: request.dropoffLocation.instructions || '',
        },
        order_value: request.orderDetails.totalAmount,
        currency: request.orderDetails.currency,
        items: request.orderDetails.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        special_instructions: request.orderDetails.specialInstructions || '',
        preparation_time: request.orderDetails.preparationTime || 15,
        scheduled_time: request.scheduledTime?.toISOString(),
        priority: request.priority === 'urgent' ? 'high' : 'normal'
      };

      const response = await this.makeRequest('/api/v1/orders', 'POST', payload);

      return {
        success: true,
        providerOrderId: response.order_id,
        trackingUrl: `${this.config.baseUrl}/track/${response.order_id}`,
        estimatedDeliveryTime: response.estimated_delivery_minutes || 30,
        deliveryFee: parseFloat(response.delivery_fee || '0'),
        status: this.mapDHUBStatus(response.status),
        driverInfo: response.driver ? {
          name: response.driver.name,
          phone: response.driver.phone,
          vehicleType: response.driver.vehicle_type,
          location: response.driver.location ? {
            lat: response.driver.location.lat,
            lng: response.driver.location.lng
          } : undefined
        } : undefined
      };
    } catch (error) {
      console.error('[DHUB] Order creation failed:', error);
      return {
        success: false,
        providerOrderId: '',
        deliveryFee: 0,
        status: 'rejected',
        error: error.message
      };
    }
  }

  async cancelDeliveryOrder(orderId: string, providerOrderId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/api/v1/orders/${providerOrderId}/cancel`, 'POST', {
        reason: 'cancelled_by_merchant',
        external_order_id: orderId
      });
      return true;
    } catch (error) {
      console.error('[DHUB] Order cancellation failed:', error);
      return false;
    }
  }

  async getDeliveryStatus(providerOrderId: string): Promise<DeliveryStatusUpdate> {
    try {
      const response = await this.makeRequest(`/api/v1/orders/${providerOrderId}`, 'GET');
      
      return {
        orderId: response.external_order_id,
        providerOrderId: response.order_id,
        status: this.mapDHUBStatus(response.status),
        timestamp: new Date(response.updated_at),
        location: response.driver?.location ? {
          lat: response.driver.location.lat,
          lng: response.driver.location.lng
        } : undefined,
        estimatedArrival: response.estimated_arrival ? new Date(response.estimated_arrival) : undefined,
        driverInfo: response.driver ? {
          name: response.driver.name,
          phone: response.driver.phone,
          vehicleType: response.driver.vehicle_type
        } : undefined,
        reason: response.cancellation_reason
      };
    } catch (error) {
      console.error('[DHUB] Status check failed:', error);
      throw error;
    }
  }

  async calculateDeliveryFee(pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number): Promise<number> {
    try {
      const payload = {
        pickup: { lat: pickupLat, lng: pickupLng },
        dropoff: { lat: dropoffLat, lng: dropoffLng }
      };

      const response = await this.makeRequest('/api/v1/quote', 'POST', payload);
      return parseFloat(response.delivery_fee || '0');
    } catch (error) {
      console.error('[DHUB] Fee calculation failed:', error);
      // Fallback calculation based on distance
      const distance = this.calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
      return Math.max(2.50, distance * 0.50); // Base fee + distance-based fee
    }
  }

  validateWebhook(payload: any, signature?: string): boolean {
    // DHUB webhook validation logic
    if (!signature) return false;
    
    try {
      // Implement DHUB's signature validation
      const expectedSignature = this.generateDHUBSignature(payload);
      return signature === expectedSignature;
    } catch (error) {
      console.error('[DHUB] Webhook validation failed:', error);
      return false;
    }
  }

  processWebhookUpdate(payload: any): DeliveryStatusUpdate {
    return {
      orderId: payload.external_order_id,
      providerOrderId: payload.order_id,
      status: this.mapDHUBStatus(payload.status),
      timestamp: new Date(payload.timestamp),
      location: payload.driver_location ? {
        lat: payload.driver_location.lat,
        lng: payload.driver_location.lng
      } : undefined,
      estimatedArrival: payload.estimated_arrival ? new Date(payload.estimated_arrival) : undefined,
      driverInfo: payload.driver ? {
        name: payload.driver.name,
        phone: payload.driver.phone,
        vehicleType: payload.driver.vehicle_type
      } : undefined,
      reason: payload.reason
    };
  }

  private mapDHUBStatus(dhubStatus: string): 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed' {
    const statusMap: Record<string, any> = {
      'pending': 'accepted',
      'confirmed': 'accepted',
      'driver_assigned': 'accepted',
      'driver_at_pickup': 'picked_up',
      'picked_up': 'picked_up',
      'in_transit': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'failed': 'failed'
    };

    return statusMap[dhubStatus] || 'accepted';
  }

  private generateDHUBSignature(payload: any): string {
    // Implement DHUB's signature generation algorithm
    // This would typically involve HMAC-SHA256 with their secret
    const crypto = require('crypto');
    const secret = this.config.apiSecret || '';
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}