import { 
  DeliveryProviderService, 
  DeliveryProviderConfig, 
  DeliveryRequest, 
  DeliveryResponse, 
  DeliveryStatusUpdate 
} from './delivery-provider.interface';

export class CareemDeliveryService extends DeliveryProviderService {
  constructor(config: DeliveryProviderConfig) {
    super(config, 'Careem');
  }

  async createDeliveryOrder(request: DeliveryRequest): Promise<DeliveryResponse> {
    try {
      // Careem API specific payload structure
      const payload = {
        merchant_order_id: request.orderId,
        pickup_location: {
          latitude: request.pickupLocation.lat,
          longitude: request.pickupLocation.lng,
          address: request.pickupLocation.address,
          contact_person: {
            name: request.pickupLocation.contactName,
            phone: request.pickupLocation.contactPhone
          },
          notes: request.pickupLocation.instructions || ''
        },
        delivery_location: {
          latitude: request.dropoffLocation.lat,
          longitude: request.dropoffLocation.lng,
          address: request.dropoffLocation.address,
          contact_person: {
            name: request.dropoffLocation.contactName,
            phone: request.dropoffLocation.contactPhone
          },
          notes: request.dropoffLocation.instructions || ''
        },
        order_details: {
          total_amount: request.orderDetails.totalAmount,
          currency_code: request.orderDetails.currency,
          items: request.orderDetails.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit_price: item.price
          })),
          preparation_time_minutes: request.orderDetails.preparationTime || 15,
          special_instructions: request.orderDetails.specialInstructions || ''
        },
        delivery_type: request.priority === 'urgent' ? 'express' : 'standard',
        scheduled_pickup_time: request.scheduledTime?.toISOString()
      };

      const response = await this.makeRequest('/v1/deliveries', 'POST', payload);

      return {
        success: true,
        providerOrderId: response.delivery_id,
        trackingUrl: `${this.config.baseUrl}/track/${response.delivery_id}`,
        estimatedDeliveryTime: response.estimated_delivery_time_minutes || 35,
        deliveryFee: parseFloat(response.delivery_fee || '0'),
        status: this.mapCareemStatus(response.status),
        driverInfo: response.captain ? {
          name: response.captain.name,
          phone: response.captain.phone,
          vehicleType: response.captain.vehicle_info?.type || 'motorcycle',
          location: response.captain.current_location ? {
            lat: response.captain.current_location.latitude,
            lng: response.captain.current_location.longitude
          } : undefined
        } : undefined
      };
    } catch (error) {
      console.error('[Careem] Order creation failed:', error);
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
      await this.makeRequest(`/v1/deliveries/${providerOrderId}/cancel`, 'POST', {
        cancellation_reason: 'merchant_request',
        merchant_order_id: orderId
      });
      return true;
    } catch (error) {
      console.error('[Careem] Order cancellation failed:', error);
      return false;
    }
  }

  async getDeliveryStatus(providerOrderId: string): Promise<DeliveryStatusUpdate> {
    try {
      const response = await this.makeRequest(`/v1/deliveries/${providerOrderId}`, 'GET');
      
      return {
        orderId: response.merchant_order_id,
        providerOrderId: response.delivery_id,
        status: this.mapCareemStatus(response.status),
        timestamp: new Date(response.last_updated),
        location: response.captain?.current_location ? {
          lat: response.captain.current_location.latitude,
          lng: response.captain.current_location.longitude
        } : undefined,
        estimatedArrival: response.estimated_arrival_time ? new Date(response.estimated_arrival_time) : undefined,
        driverInfo: response.captain ? {
          name: response.captain.name,
          phone: response.captain.phone,
          vehicleType: response.captain.vehicle_info?.type || 'motorcycle'
        } : undefined,
        reason: response.cancellation_reason
      };
    } catch (error) {
      console.error('[Careem] Status check failed:', error);
      throw error;
    }
  }

  async calculateDeliveryFee(pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number): Promise<number> {
    try {
      const payload = {
        pickup_location: { latitude: pickupLat, longitude: pickupLng },
        delivery_location: { latitude: dropoffLat, longitude: dropoffLng },
        delivery_type: 'standard'
      };

      const response = await this.makeRequest('/v1/quote', 'POST', payload);
      return parseFloat(response.delivery_fee || '0');
    } catch (error) {
      console.error('[Careem] Fee calculation failed:', error);
      // Fallback calculation based on distance
      const distance = this.calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
      return Math.max(3.00, distance * 0.60); // Base fee + distance-based fee
    }
  }

  validateWebhook(payload: any, signature?: string): boolean {
    // Careem webhook validation logic
    if (!signature) return false;
    
    try {
      // Implement Careem's signature validation
      const expectedSignature = this.generateCareemSignature(payload);
      return signature === expectedSignature;
    } catch (error) {
      console.error('[Careem] Webhook validation failed:', error);
      return false;
    }
  }

  processWebhookUpdate(payload: any): DeliveryStatusUpdate {
    return {
      orderId: payload.merchant_order_id,
      providerOrderId: payload.delivery_id,
      status: this.mapCareemStatus(payload.status),
      timestamp: new Date(payload.timestamp),
      location: payload.captain_location ? {
        lat: payload.captain_location.latitude,
        lng: payload.captain_location.longitude
      } : undefined,
      estimatedArrival: payload.estimated_arrival ? new Date(payload.estimated_arrival) : undefined,
      driverInfo: payload.captain_info ? {
        name: payload.captain_info.name,
        phone: payload.captain_info.phone,
        vehicleType: payload.captain_info.vehicle_type
      } : undefined,
      reason: payload.reason
    };
  }

  private mapCareemStatus(careemStatus: string): 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed' {
    const statusMap: Record<string, any> = {
      'created': 'accepted',
      'confirmed': 'accepted',
      'captain_assigned': 'accepted',
      'captain_arriving': 'accepted',
      'captain_arrived': 'picked_up',
      'order_picked_up': 'picked_up',
      'on_the_way': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'failed': 'failed',
      'expired': 'cancelled'
    };

    return statusMap[careemStatus] || 'accepted';
  }

  private generateCareemSignature(payload: any): string {
    // Implement Careem's signature generation algorithm
    const crypto = require('crypto');
    const secret = this.config.apiSecret || '';
    const timestamp = Date.now().toString();
    const stringToSign = `${timestamp}.${JSON.stringify(payload)}`;
    
    return crypto
      .createHmac('sha256', secret)
      .update(stringToSign)
      .digest('hex');
  }
}