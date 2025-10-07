import { 
  DeliveryProviderService, 
  DeliveryProviderConfig, 
  DeliveryRequest, 
  DeliveryResponse, 
  DeliveryStatusUpdate 
} from './delivery-provider.interface';

export class TalabatDeliveryService extends DeliveryProviderService {
  constructor(config: DeliveryProviderConfig) {
    super(config, 'Talabat');
  }

  async createDeliveryOrder(request: DeliveryRequest): Promise<DeliveryResponse> {
    try {
      // Talabat API specific payload structure
      const payload = {
        order_reference: request.orderId,
        pickup: {
          coordinates: {
            lat: request.pickupLocation.lat,
            lng: request.pickupLocation.lng
          },
          address: request.pickupLocation.address,
          contact: {
            name: request.pickupLocation.contactName,
            phone_number: request.pickupLocation.contactPhone
          },
          instructions: request.pickupLocation.instructions || '',
          ready_time: request.scheduledTime?.toISOString() || new Date().toISOString()
        },
        delivery: {
          coordinates: {
            lat: request.dropoffLocation.lat,
            lng: request.dropoffLocation.lng
          },
          address: request.dropoffLocation.address,
          contact: {
            name: request.dropoffLocation.contactName,
            phone_number: request.dropoffLocation.contactPhone
          },
          instructions: request.dropoffLocation.instructions || ''
        },
        order: {
          value: request.orderDetails.totalAmount,
          currency: request.orderDetails.currency,
          items: request.orderDetails.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          notes: request.orderDetails.specialInstructions || '',
          preparation_duration: request.orderDetails.preparationTime || 20
        },
        service_type: request.priority === 'urgent' ? 'priority' : 'standard'
      };

      const response = await this.makeRequest('/api/orders', 'POST', payload);

      return {
        success: true,
        providerOrderId: response.order_id,
        trackingUrl: `${this.config.baseUrl}/tracking/${response.order_id}`,
        estimatedDeliveryTime: response.estimated_delivery_minutes || 40,
        deliveryFee: parseFloat(response.delivery_cost || '0'),
        status: this.mapTalabatStatus(response.order_status),
        driverInfo: response.rider ? {
          name: response.rider.name,
          phone: response.rider.phone,
          vehicleType: response.rider.vehicle_type,
          location: response.rider.location ? {
            lat: response.rider.location.lat,
            lng: response.rider.location.lng
          } : undefined
        } : undefined
      };
    } catch (error) {
      console.error('[Talabat] Order creation failed:', error);
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
      await this.makeRequest(`/api/orders/${providerOrderId}/cancel`, 'POST', {
        reason: 'restaurant_request',
        order_reference: orderId
      });
      return true;
    } catch (error) {
      console.error('[Talabat] Order cancellation failed:', error);
      return false;
    }
  }

  async getDeliveryStatus(providerOrderId: string): Promise<DeliveryStatusUpdate> {
    try {
      const response = await this.makeRequest(`/api/orders/${providerOrderId}/status`, 'GET');
      
      return {
        orderId: response.order_reference,
        providerOrderId: response.order_id,
        status: this.mapTalabatStatus(response.order_status),
        timestamp: new Date(response.updated_at),
        location: response.rider?.location ? {
          lat: response.rider.location.lat,
          lng: response.rider.location.lng
        } : undefined,
        estimatedArrival: response.estimated_delivery_time ? new Date(response.estimated_delivery_time) : undefined,
        driverInfo: response.rider ? {
          name: response.rider.name,
          phone: response.rider.phone,
          vehicleType: response.rider.vehicle_type
        } : undefined,
        reason: response.cancellation_reason
      };
    } catch (error) {
      console.error('[Talabat] Status check failed:', error);
      throw error;
    }
  }

  async calculateDeliveryFee(pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number): Promise<number> {
    try {
      const payload = {
        pickup_coordinates: { lat: pickupLat, lng: pickupLng },
        delivery_coordinates: { lat: dropoffLat, lng: dropoffLng },
        service_type: 'standard'
      };

      const response = await this.makeRequest('/api/quote', 'POST', payload);
      return parseFloat(response.delivery_cost || '0');
    } catch (error) {
      console.error('[Talabat] Fee calculation failed:', error);
      // Fallback calculation based on distance
      const distance = this.calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
      return Math.max(3.50, distance * 0.40); // Base fee + distance-based fee
    }
  }

  validateWebhook(payload: any, signature?: string): boolean {
    // Talabat webhook validation logic
    if (!signature) return false;
    
    try {
      // Implement Talabat's signature validation
      const expectedSignature = this.generateTalabatSignature(payload);
      return signature === expectedSignature;
    } catch (error) {
      console.error('[Talabat] Webhook validation failed:', error);
      return false;
    }
  }

  processWebhookUpdate(payload: any): DeliveryStatusUpdate {
    return {
      orderId: payload.order_reference,
      providerOrderId: payload.order_id,
      status: this.mapTalabatStatus(payload.order_status),
      timestamp: new Date(payload.event_time),
      location: payload.rider_location ? {
        lat: payload.rider_location.lat,
        lng: payload.rider_location.lng
      } : undefined,
      estimatedArrival: payload.estimated_arrival ? new Date(payload.estimated_arrival) : undefined,
      driverInfo: payload.rider_info ? {
        name: payload.rider_info.name,
        phone: payload.rider_info.phone,
        vehicleType: payload.rider_info.vehicle_type
      } : undefined,
      reason: payload.reason
    };
  }

  private mapTalabatStatus(talabatStatus: string): 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed' {
    const statusMap: Record<string, any> = {
      'pending': 'accepted',
      'accepted': 'accepted',
      'rider_assigned': 'accepted',
      'rider_at_restaurant': 'picked_up',
      'order_collected': 'picked_up',
      'on_route': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'rejected': 'cancelled',
      'failed': 'failed'
    };

    return statusMap[talabatStatus] || 'accepted';
  }

  private generateTalabatSignature(payload: any): string {
    // Implement Talabat's signature generation algorithm
    const crypto = require('crypto');
    const secret = this.config.apiSecret || '';
    const timestamp = payload.timestamp || Date.now().toString();
    
    return crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${JSON.stringify(payload)}`)
      .digest('hex');
  }
}