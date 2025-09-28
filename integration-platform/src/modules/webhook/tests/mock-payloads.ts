import { EventProvider, EventType, OrderStatus } from '../dto/webhook-event.dto';
import { WebhookTestUtils } from './test-utils';

/**
 * Mock webhook payloads for all supported providers
 */
export class MockWebhookPayloads {
  /**
   * Generate mock Careem webhook payloads
   */
  static careem = {
    orderCreated: (clientId: string = WebhookTestUtils.generateClientId()) => ({
      eventId: WebhookTestUtils.generateEventId(),
      eventType: EventType.ORDER_CREATED,
      provider: EventProvider.CAREEM,
      clientId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      careemOrderId: `CAREEM-${Math.floor(Math.random() * 100000)}`,
      restaurantId: `rest-${clientId}`,
      data: {
        order: {
          id: `ORD-${Math.floor(Math.random() * 100000)}`,
          externalId: `CAREEM-${Math.floor(Math.random() * 100000)}`,
          status: OrderStatus.PENDING,
          totalAmount: 45.50,
          currency: 'AED',
          createdAt: new Date().toISOString(),
          expectedDeliveryAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
          customer: {
            id: `cust-${Math.floor(Math.random() * 10000)}`,
            name: 'Ahmed Al-Rashid',
            phone: '+971501234567',
            email: 'ahmed@example.com',
            address: {
              street: 'Sheikh Zayed Road, Building 123',
              city: 'Dubai',
              country: 'UAE',
              postalCode: '12345',
              coordinates: {
                latitude: 25.2048,
                longitude: 55.2708
              }
            }
          },
          items: [
            {
              id: 'item-001',
              name: 'Chicken Shawarma',
              quantity: 2,
              unitPrice: 15.00,
              totalPrice: 30.00,
              modifiers: [
                {
                  id: 'mod-001',
                  name: 'Extra Garlic',
                  price: 1.00
                }
              ],
              specialInstructions: 'No onions please'
            },
            {
              id: 'item-002',
              name: 'French Fries',
              quantity: 1,
              unitPrice: 10.00,
              totalPrice: 10.00
            }
          ],
          payment: {
            method: 'credit_card',
            status: 'paid',
            amount: 45.50,
            currency: 'AED',
            transactionId: 'txn_careem_123456',
            paidAt: new Date().toISOString()
          },
          deliveryFee: 5.00,
          serviceFee: 0.50,
          taxAmount: 2.27,
          notes: 'Please ring the bell twice'
        }
      },
      metadata: {
        source: 'careem_now',
        region: 'dubai',
        restaurant_branch: 'main'
      }
    }),

    orderUpdated: (clientId: string = WebhookTestUtils.generateClientId()) => ({
      eventId: WebhookTestUtils.generateEventId(),
      eventType: EventType.ORDER_UPDATED,
      provider: EventProvider.CAREEM,
      clientId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      careemOrderId: `CAREEM-${Math.floor(Math.random() * 100000)}`,
      restaurantId: `rest-${clientId}`,
      data: {
        order: {
          id: `ORD-${Math.floor(Math.random() * 100000)}`,
          status: OrderStatus.CONFIRMED,
          totalAmount: 45.50,
          currency: 'AED',
          createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          expectedDeliveryAt: new Date(Date.now() + 35 * 60 * 1000).toISOString()
        }
      },
      previousState: {
        status: OrderStatus.PENDING
      },
      metadata: {
        updateReason: 'restaurant_confirmed',
        estimatedPrepTime: 25
      }
    }),

    orderCancelled: (clientId: string = WebhookTestUtils.generateClientId()) => ({
      eventId: WebhookTestUtils.generateEventId(),
      eventType: EventType.ORDER_CANCELLED,
      provider: EventProvider.CAREEM,
      clientId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      careemOrderId: `CAREEM-${Math.floor(Math.random() * 100000)}`,
      restaurantId: `rest-${clientId}`,
      data: {
        order: {
          id: `ORD-${Math.floor(Math.random() * 100000)}`,
          status: OrderStatus.CANCELLED,
          totalAmount: 45.50,
          currency: 'AED',
          createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        },
        cancellationReason: 'customer_requested',
        refundAmount: 45.50,
        refundStatus: 'processing'
      },
      metadata: {
        cancelledBy: 'customer',
        refundProcessingTime: '3-5 business days'
      }
    })
  };

  /**
   * Generate mock Talabat webhook payloads
   */
  static talabat = {
    orderCreated: (clientId: string = WebhookTestUtils.generateClientId()) => ({
      eventId: WebhookTestUtils.generateEventId(),
      eventType: EventType.ORDER_CREATED,
      provider: EventProvider.TALABAT,
      clientId,
      timestamp: new Date().toISOString(),
      version: '2.0',
      talabatOrderId: `TLB-${Math.floor(Math.random() * 100000)}`,
      branchId: `branch-${clientId}`,
      data: {
        order_id: `TLB-${Math.floor(Math.random() * 100000)}`,
        restaurant_id: clientId,
        status: 'new',
        total_amount: 67.25,
        currency: 'KWD',
        created_at: new Date().toISOString(),
        estimated_delivery_time: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
        customer_info: {
          name: 'Fatima Al-Zahra',
          phone: '+96599887766',
          address: 'Salmiya Block 4, Street 15, Building 8',
          area: 'Salmiya',
          city: 'Kuwait City',
          notes: 'Apartment 12, second floor'
        },
        items: [
          {
            id: 'tlb-item-001',
            name: 'Mixed Grill Platter',
            quantity: 1,
            price: 25.500,
            total: 25.500,
            options: [
              {
                name: 'Rice Type',
                value: 'Basmati Rice',
                price: 0
              }
            ]
          },
          {
            id: 'tlb-item-002',
            name: 'Fresh Orange Juice',
            quantity: 2,
            price: 3.250,
            total: 6.500
          }
        ],
        payment_info: {
          method: 'cash_on_delivery',
          status: 'pending',
          amount: 67.25
        },
        delivery_fee: 2.000,
        service_charge: 1.250,
        discount: 0.000,
        vat: 3.362
      },
      metadata: {
        platform: 'talabat_kuwait',
        order_source: 'mobile_app',
        delivery_type: 'standard'
      }
    }),

    orderUpdated: (clientId: string = WebhookTestUtils.generateClientId()) => ({
      eventId: WebhookTestUtils.generateEventId(),
      eventType: EventType.ORDER_UPDATED,
      provider: EventProvider.TALABAT,
      clientId,
      timestamp: new Date().toISOString(),
      version: '2.0',
      talabatOrderId: `TLB-${Math.floor(Math.random() * 100000)}`,
      branchId: `branch-${clientId}`,
      data: {
        order_id: `TLB-${Math.floor(Math.random() * 100000)}`,
        status: 'accepted',
        preparation_time: 20,
        updated_at: new Date().toISOString(),
        status_history: [
          {
            status: 'new',
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
          },
          {
            status: 'accepted',
            timestamp: new Date().toISOString()
          }
        ]
      },
      previousState: {
        status: 'new'
      }
    }),

    menuUpdated: (clientId: string = WebhookTestUtils.generateClientId()) => ({
      eventId: WebhookTestUtils.generateEventId(),
      eventType: EventType.MENU_UPDATED,
      provider: EventProvider.TALABAT,
      clientId,
      timestamp: new Date().toISOString(),
      version: '2.0',
      branchId: `branch-${clientId}`,
      data: {
        menu_items: [
          {
            id: 'tlb-menu-001',
            name: 'Grilled Chicken',
            is_available: false,
            unavailability_reason: 'out_of_stock',
            updated_at: new Date().toISOString()
          },
          {
            id: 'tlb-menu-002',
            name: 'Beef Burger',
            is_available: true,
            price: 8.750,
            updated_at: new Date().toISOString()
          }
        ]
      }
    })
  };

  /**
   * Generate mock Deliveroo webhook payloads
   */
  static deliveroo = {
    orderCreated: (clientId: string = WebhookTestUtils.generateClientId()) => ({
      eventId: WebhookTestUtils.generateEventId(),
      eventType: EventType.ORDER_CREATED,
      provider: EventProvider.DELIVEROO,
      clientId,
      timestamp: new Date().toISOString(),
      version: '1.2',
      deliverooOrderId: `DEL-${Math.floor(Math.random() * 100000)}`,
      restaurantReference: `resto-${clientId}`,
      data: {
        order: {
          id: `DEL-${Math.floor(Math.random() * 100000)}`,
          reference: `#${Math.floor(Math.random() * 10000)}`,
          status: 'placed',
          total_price_cents: 3275, // £32.75 in cents
          currency: 'GBP',
          created_at: new Date().toISOString(),
          delivery_time: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
          customer: {
            first_name: 'James',
            last_name: 'Thompson',
            phone_number: '+447912345678',
            delivery_address: {
              line_1: '123 Oxford Street',
              line_2: 'Flat 4B',
              city: 'London',
              postcode: 'W1D 1LL',
              country: 'UK'
            }
          },
          items: [
            {
              plu: 'del-001',
              name: 'Fish and Chips',
              quantity: 1,
              price_cents: 1450,
              modifiers: [
                {
                  plu: 'mod-001',
                  name: 'Mushy Peas',
                  quantity: 1,
                  price_cents: 250
                }
              ]
            },
            {
              plu: 'del-002',
              name: 'Coca Cola',
              quantity: 1,
              price_cents: 180
            }
          ],
          payment: {
            method: 'card',
            status: 'paid',
            amount_cents: 3275
          },
          delivery_fee_cents: 299,
          service_charge_cents: 196,
          rider_tip_cents: 300
        }
      },
      metadata: {
        restaurant_id: clientId,
        zone: 'central_london',
        order_type: 'delivery'
      }
    }),

    orderPickedUp: (clientId: string = WebhookTestUtils.generateClientId()) => ({
      eventId: WebhookTestUtils.generateEventId(),
      eventType: EventType.ORDER_PICKED_UP,
      provider: EventProvider.DELIVEROO,
      clientId,
      timestamp: new Date().toISOString(),
      version: '1.2',
      deliverooOrderId: `DEL-${Math.floor(Math.random() * 100000)}`,
      restaurantReference: `resto-${clientId}`,
      data: {
        order_id: `DEL-${Math.floor(Math.random() * 100000)}`,
        status: 'picked_up',
        picked_up_at: new Date().toISOString(),
        rider_info: {
          name: 'Alex',
          phone: '+447987654321',
          vehicle_type: 'bicycle'
        },
        estimated_delivery_time: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      }
    }),

    connectionTest: (clientId: string = WebhookTestUtils.generateClientId()) => ({
      eventId: WebhookTestUtils.generateEventId(),
      eventType: EventType.CONNECTION_TEST,
      provider: EventProvider.DELIVEROO,
      clientId,
      timestamp: new Date().toISOString(),
      version: '1.2',
      isTest: true,
      data: {
        test_message: 'Deliveroo webhook connection test',
        restaurant_id: clientId,
        timestamp: new Date().toISOString()
      }
    })
  };

  /**
   * Generate mock Jahez webhook payloads
   */
  static jahez = {
    orderCreated: (clientId: string = WebhookTestUtils.generateClientId()) => ({
      eventId: WebhookTestUtils.generateEventId(),
      eventType: EventType.ORDER_CREATED,
      provider: EventProvider.JAHEZ,
      clientId,
      timestamp: new Date().toISOString(),
      version: '3.0',
      jahezOrderId: `JHZ-${Math.floor(Math.random() * 100000)}`,
      restaurantCode: `rest-${clientId}`,
      data: {
        order_details: {
          order_id: `JHZ-${Math.floor(Math.random() * 100000)}`,
          order_number: `#${Math.floor(Math.random() * 10000)}`,
          status: 'pending_acceptance',
          total_amount: 145.75,
          currency: 'SAR',
          created_timestamp: new Date().toISOString(),
          delivery_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          customer_details: {
            customer_id: `cust-${Math.floor(Math.random() * 10000)}`,
            name: 'Mohammed Al-Saud',
            mobile: '+966551234567',
            email: 'mohammed@example.com',
            delivery_address: {
              building_number: '1234',
              street_name: 'King Fahd Road',
              district: 'Al-Olaya',
              city: 'Riyadh',
              postal_code: '12345',
              additional_number: '5678',
              unit_number: 'Apt 25'
            }
          },
          order_items: [
            {
              item_id: 'jhz-001',
              item_name: 'Kabsa with Chicken',
              item_name_ar: 'كبسة دجاج',
              quantity: 2,
              unit_price: 35.00,
              total_price: 70.00,
              customizations: [
                {
                  customization_id: 'custom-001',
                  name: 'Extra Rice',
                  name_ar: 'رز إضافي',
                  price: 5.00
                }
              ]
            },
            {
              item_id: 'jhz-002',
              item_name: 'Fresh Lemon Mint',
              item_name_ar: 'ليمون نعناع',
              quantity: 3,
              unit_price: 12.00,
              total_price: 36.00
            }
          ],
          payment_details: {
            payment_method: 'cash',
            payment_status: 'pending',
            total_amount: 145.75,
            breakdown: {
              subtotal: 111.00,
              delivery_fee: 15.00,
              service_fee: 5.56,
              vat: 14.19
            }
          }
        }
      },
      metadata: {
        branch_id: clientId,
        city_code: 'RUH',
        delivery_zone: 'zone_1',
        order_source: 'jahez_app'
      }
    }),

    orderAccepted: (clientId: string = WebhookTestUtils.generateClientId()) => ({
      eventId: WebhookTestUtils.generateEventId(),
      eventType: EventType.ORDER_CONFIRMED,
      provider: EventProvider.JAHEZ,
      clientId,
      timestamp: new Date().toISOString(),
      version: '3.0',
      jahezOrderId: `JHZ-${Math.floor(Math.random() * 100000)}`,
      restaurantCode: `rest-${clientId}`,
      data: {
        order_id: `JHZ-${Math.floor(Math.random() * 100000)}`,
        status: 'accepted',
        acceptance_time: new Date().toISOString(),
        estimated_preparation_time: 30,
        preparation_instructions: 'Handle with care - fragile items'
      },
      previousState: {
        status: 'pending_acceptance'
      }
    }),

    itemAvailabilityChanged: (clientId: string = WebhookTestUtils.generateClientId()) => ({
      eventId: WebhookTestUtils.generateEventId(),
      eventType: EventType.ITEM_AVAILABILITY_CHANGED,
      provider: EventProvider.JAHEZ,
      clientId,
      timestamp: new Date().toISOString(),
      version: '3.0',
      restaurantCode: `rest-${clientId}`,
      data: {
        menu_updates: [
          {
            item_id: 'jhz-menu-001',
            item_name: 'Grilled Salmon',
            item_name_ar: 'سلمون مشوي',
            is_available: false,
            reason: 'ingredients_unavailable',
            reason_ar: 'المكونات غير متوفرة',
            updated_at: new Date().toISOString()
          },
          {
            item_id: 'jhz-menu-002',
            item_name: 'Chicken Biryani',
            item_name_ar: 'برياني دجاج',
            is_available: true,
            price: 42.50,
            updated_at: new Date().toISOString()
          }
        ]
      }
    })
  };

  /**
   * Get mock payload by provider and event type
   */
  static getPayload(provider: EventProvider, eventType: EventType, clientId?: string): any {
    const providerPayloads = this[provider.toLowerCase()];

    if (!providerPayloads) {
      throw new Error(`No mock payloads defined for provider: ${provider}`);
    }

    const eventKey = this.getEventKey(eventType);
    const payloadGenerator = providerPayloads[eventKey];

    if (!payloadGenerator || typeof payloadGenerator !== 'function') {
      throw new Error(`No mock payload defined for ${provider} ${eventType}`);
    }

    return payloadGenerator(clientId);
  }

  /**
   * Get all available payloads for a provider
   */
  static getAllPayloadsForProvider(provider: EventProvider, clientId?: string): any[] {
    const providerPayloads = this[provider.toLowerCase()];

    if (!providerPayloads) {
      return [];
    }

    return Object.keys(providerPayloads)
      .map(key => providerPayloads[key](clientId));
  }

  /**
   * Convert event type to payload key
   */
  private static getEventKey(eventType: EventType): string {
    const eventMap = {
      [EventType.ORDER_CREATED]: 'orderCreated',
      [EventType.ORDER_UPDATED]: 'orderUpdated',
      [EventType.ORDER_CANCELLED]: 'orderCancelled',
      [EventType.ORDER_DELIVERED]: 'orderDelivered',
      [EventType.ORDER_CONFIRMED]: 'orderAccepted',
      [EventType.ORDER_PREPARED]: 'orderPrepared',
      [EventType.ORDER_PICKED_UP]: 'orderPickedUp',
      [EventType.MENU_UPDATED]: 'menuUpdated',
      [EventType.ITEM_AVAILABILITY_CHANGED]: 'itemAvailabilityChanged',
      [EventType.CONNECTION_TEST]: 'connectionTest',
    };

    return eventMap[eventType] || 'orderCreated';
  }

  /**
   * Generate batch payloads for performance testing
   */
  static generateBatchPayloads(
    provider: EventProvider,
    eventType: EventType,
    count: number,
    clientId?: string
  ): any[] {
    const payloads = [];
    for (let i = 0; i < count; i++) {
      const payload = this.getPayload(provider, eventType, clientId);
      // Make each payload unique
      payload.eventId = WebhookTestUtils.generateEventId();
      payload.timestamp = new Date(Date.now() + i * 1000).toISOString();
      payloads.push(payload);
    }
    return payloads;
  }

  /**
   * Generate invalid payloads for error testing
   */
  static getInvalidPayloads() {
    return {
      missingEventId: {
        eventType: EventType.ORDER_CREATED,
        provider: EventProvider.CAREEM,
        clientId: 'test-client',
        timestamp: new Date().toISOString(),
        data: {}
      },
      invalidProvider: {
        eventId: WebhookTestUtils.generateEventId(),
        eventType: EventType.ORDER_CREATED,
        provider: 'invalid_provider',
        clientId: 'test-client',
        timestamp: new Date().toISOString(),
        data: {}
      },
      malformedJson: '{"eventId": "123", "eventType":}',
      emptyPayload: {},
      nullPayload: null,
      stringPayload: 'invalid-json-string'
    };
  }
}