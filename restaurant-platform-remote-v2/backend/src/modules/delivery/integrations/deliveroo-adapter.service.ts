import { 
  DeliveryProviderService, 
  DeliveryProviderConfig, 
  DeliveryRequest, 
  DeliveryResponse, 
  DeliveryStatusUpdate 
} from './delivery-provider.interface';
import { DeliverooService } from './deliveroo.service';

export class DeliverooDeliveryService extends DeliveryProviderService {
  private deliverooService: DeliverooService;

  constructor(config: DeliveryProviderConfig) {
    super(config, 'Deliveroo');
    this.deliverooService = new DeliverooService();
  }

  async createDeliveryOrder(request: DeliveryRequest): Promise<DeliveryResponse> {
    try {
      // Convert the old interface request to new interface
      const orderRequest = {
        orderNumber: request.orderId,
        branchDetails: {
          id: request.branchId || '',
          externalId: request.branchId || '',
          name: 'Restaurant Branch'
        },
        customerDetails: {
          name: request.customerName || 'Customer',
          phone: request.customerPhone || '',
          email: request.customerEmail || ''
        },
        deliveryAddress: {
          street: request.dropoffAddress || '',
          building: '',
          floor: '',
          apartment: '',
          city: 'City',
          district: 'District',
          coordinates: request.dropoffLocation,
          postalCode: '',
          country: 'GB' // Deliveroo default to UK
        },
        items: request.items || [],
        paymentMethod: request.paymentMethod || 'card',
        totalAmount: request.orderValue || 0,
        deliveryFee: request.deliveryFee || 0,
        specialInstructions: request.instructions
      };

      const response = await this.deliverooService.createOrder(orderRequest);

      return {
        success: response.success,
        orderId: response.orderId || request.orderId,
        trackingId: response.trackingNumber,
        estimatedDeliveryTime: response.estimatedDeliveryTime,
        message: response.message,
        error: response.error
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cancelDeliveryOrder(orderId: string, reason?: string): Promise<DeliveryResponse> {
    const response = await this.deliverooService.cancelOrder(orderId, reason);
    
    return {
      success: response.success,
      orderId: response.orderId,
      message: response.message,
      error: response.error
    };
  }

  async trackDeliveryOrder(orderId: string): Promise<DeliveryStatusUpdate> {
    const response = await this.deliverooService.trackOrder(orderId);
    
    return {
      orderId,
      status: response.status || 'unknown',
      location: response.driverLocation,
      estimatedDeliveryTime: response.estimatedDeliveryTime,
      driverInfo: response.driverDetails,
      lastUpdated: new Date().toISOString()
    };
  }

  async validateDeliveryAddress(lat: number, lng: number): Promise<boolean> {
    return this.deliverooService.validateDeliveryArea({ lat, lng });
  }

  async calculateDeliveryFee(
    pickupLat: number, 
    pickupLng: number, 
    dropoffLat: number, 
    dropoffLng: number,
    orderValue: number
  ): Promise<number> {
    return this.deliverooService.calculateDeliveryFee(
      { lat: pickupLat, lng: pickupLng },
      { lat: dropoffLat, lng: dropoffLng },
      orderValue
    );
  }

  async testConnection(): Promise<boolean> {
    return this.deliverooService.testConnection();
  }
}